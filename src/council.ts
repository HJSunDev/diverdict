import { randomUUID } from "node:crypto";
import {
  beginSchema,
  CouncilError,
  LIMITS,
  type Packet,
  type Responses,
  ROLE_IDS,
  submitSchema,
  verdictSchema,
} from "./contracts.js";
import { type Core, loadCore } from "./core.js";
import {
  critiqueJobs,
  HOST_INSTRUCTIONS,
  proposalJobs,
  verdictJobs,
} from "./prompts.js";

interface Session {
  id: string;
  problem: string;
  context: string;
  expiresAt: number;
  requestId: string | undefined;
  proposals?: Responses;
  critiques?: Responses;
}

export interface CouncilOptions {
  core?: Core;
  now?: () => number;
  ttlMs?: number;
  maxSessions?: number;
}

function equal(a: Responses, b: Responses): boolean {
  return ROLE_IDS.every((role) => a[role] === b[role]);
}

/** A connection-local, bounded, ephemeral state machine. No model or I/O calls. */
export class Council {
  readonly #sessions = new Map<string, Session>();
  readonly #requests = new Map<string, string>();
  readonly #core: Core;
  readonly #now: () => number;
  readonly #ttlMs: number;
  readonly #maxSessions: number;

  constructor(options: CouncilOptions = {}) {
    this.#core = options.core ?? loadCore();
    this.#now = options.now ?? Date.now;
    this.#ttlMs = options.ttlMs ?? LIMITS.ttlMs;
    this.#maxSessions = options.maxSessions ?? LIMITS.sessions;
    if (
      !Number.isSafeInteger(this.#ttlMs) ||
      this.#ttlMs < 1 ||
      !Number.isSafeInteger(this.#maxSessions) ||
      this.#maxSessions < 1
    ) {
      throw new Error("ttlMs and maxSessions must be positive safe integers.");
    }
  }

  begin(input: unknown): Packet {
    const { problem, context, request_id } = beginSchema.parse(input);
    this.#sweep();
    const priorId = request_id ? this.#requests.get(request_id) : undefined;
    const prior = priorId ? this.#sessions.get(priorId) : undefined;
    if (prior) {
      if (prior.problem !== problem || prior.context !== context) {
        throw new CouncilError(
          "REQUEST_CONFLICT",
          "request_id 已用于不同的材料。新问题请使用新的 request_id。",
        );
      }
      // Replaying begin always reproduces the proposal packet, even after advancement.
      return this.#packet(prior, "proposal");
    }
    if (this.#sessions.size >= this.#maxSessions) {
      throw new CouncilError(
        "CAPACITY_EXCEEDED",
        "本连接的临时会话已满；请等待会话过期或在独立连接开始新合议。",
      );
    }
    const session: Session = {
      id: randomUUID(),
      problem,
      context,
      expiresAt: this.#now() + this.#ttlMs,
      requestId: request_id,
    };
    this.#sessions.set(session.id, session);
    if (request_id) this.#requests.set(request_id, session.id);
    return this.#packet(session, "proposal");
  }

  submit(input: unknown): Packet {
    const { session_id, proposals } = submitSchema.parse(input);
    const session = this.#get(session_id);
    if (session.proposals && !equal(session.proposals, proposals)) {
      throw new CouncilError(
        "PROPOSALS_CONFLICT",
        "本会话已接收另一组方略；不能覆盖已用于后续质询的材料。更换材料请重新 begin。",
      );
    }
    session.proposals = proposals;
    return this.#packet(session, "critique");
  }

  verdict(input: unknown): Packet {
    const { session_id, critiques } = verdictSchema.parse(input);
    const session = this.#get(session_id);
    if (!session.proposals) {
      throw new CouncilError(
        "WRONG_STAGE",
        "先通过 strategize_submit 提交三家方略，再独立完成三家质询。",
      );
    }
    if (session.critiques && !equal(session.critiques, critiques)) {
      throw new CouncilError(
        "CRITIQUES_CONFLICT",
        "本会话已接收另一组质询。贾诩终审，无二审；新材料请重新 begin。",
      );
    }
    session.critiques = critiques;
    return this.#packet(session, "verdict");
  }

  #get(id: string): Session {
    this.#sweep();
    const session = this.#sessions.get(id);
    if (!session) {
      throw new CouncilError(
        "SESSION_NOT_FOUND",
        "会话不存在、已过期或服务已重启。请在当前连接用 strategize_begin 重新开始；不要虚构缺失材料。",
      );
    }
    return session;
  }

  #sweep(): void {
    const now = this.#now();
    for (const [id, session] of this.#sessions) {
      if (session.expiresAt <= now) {
        this.#sessions.delete(id);
        if (session.requestId) this.#requests.delete(session.requestId);
      }
    }
  }

  #packet(session: Session, stage: Packet["stage"]): Packet {
    const { id, problem, context, proposals, critiques } = session;
    const base = {
      session_id: id,
      expires_at: new Date(session.expiresAt).toISOString(),
      stage,
    };
    if (stage === "proposal") {
      return {
        ...base,
        instructions: `${HOST_INSTRUCTIONS}\n\n现在并行执行三个出策 job；全部完成后调用 strategize_submit，传入 session_id 与按角色组织的 proposals。`,
        jobs: proposalJobs(this.#core, problem, context),
        next_tool: "strategize_submit",
      };
    }
    if (stage === "critique" && proposals) {
      return {
        ...base,
        instructions: `${HOST_INSTRUCTIONS}\n\n现在并行执行三个质询 job；全部完成后调用 strategize_verdict，传入 session_id 与按角色组织的 critiques。`,
        jobs: critiqueJobs(this.#core, problem, context, proposals),
        next_tool: "strategize_verdict",
      };
    }
    if (proposals && critiques) {
      return {
        ...base,
        instructions: `${HOST_INSTRUCTIONS}\n\n现在将唯一的 job 交给独立的贾诩实例，直接向用户呈现其最终方略。next_tool 为 null 只表示无需再调用本服务，不表示答案已经生成。不要复议或再开一轮。`,
        jobs: verdictJobs(this.#core, problem, context, proposals, critiques),
        next_tool: null,
      };
    }
    throw new Error("Invalid internal council state.");
  }
}
