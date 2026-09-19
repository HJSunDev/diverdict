import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/server";
import { ZodError } from "zod/v4";
import {
  beginSchema,
  CouncilError,
  type Packet,
  packetSchema,
  submitSchema,
  verdictSchema,
} from "./contracts.js";
import { Council, type CouncilOptions } from "./council.js";
import { HOST_INSTRUCTIONS } from "./prompts.js";

export const VERSION: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

function result(run: () => Packet) {
  try {
    const packet = run();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(packet) }],
      structuredContent: packet,
    };
  } catch (error) {
    const code =
      error instanceof CouncilError
        ? error.code
        : error instanceof ZodError
          ? "INVALID_INPUT"
          : "INTERNAL_ERROR";
    const message =
      error instanceof CouncilError
        ? error.message
        : error instanceof ZodError
          ? error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; ")
          : "内部错误；请重试或重新开始会话。";
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: { code, message } }),
        },
      ],
    };
  }
}

export function createServer(options: CouncilOptions = {}): McpServer {
  const council = new Council(options);
  const server = new McpServer(
    { name: "diverdict", version: VERSION },
    {
      instructions: `异策 Diverdict：独立出策 → 交叉质询 → 贾诩收敛。服务本身不调用模型。\n${HOST_INSTRUCTIONS}`,
    },
  );
  const annotations = {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  };
  server.registerTool(
    "strategize_begin",
    {
      title: "开始异策：独立出策",
      description:
        "对重要决策启动三家独立出策。返回三个独立 job 和宿主执行指令；宿主执行后调用 strategize_submit。服务不生成策略，不需 API key。",
      inputSchema: beginSchema,
      outputSchema: packetSchema,
      annotations: { ...annotations, idempotentHint: false },
    },
    (input) => result(() => council.begin(input)),
  );
  server.registerTool(
    "strategize_submit",
    {
      title: "提交三家方略，进入质询",
      description:
        "接收完整三家方略，返回三份并行质询 job。逐一转交给独立实例，收齐质询后调用 strategize_verdict。相同输入可安全重试。",
      inputSchema: submitSchema,
      outputSchema: packetSchema,
      annotations: { ...annotations, idempotentHint: true },
    },
    (input) => result(() => council.submit(input)),
  );
  server.registerTool(
    "strategize_verdict",
    {
      title: "提交质询，交贾诩收敛",
      description:
        "接收完整三家质询，返回贾诩的独立生成 job。宿主仍须执行该 job，再向用户交付最终方略与最脆弱一环；此后无二审。相同输入可安全重试。",
      inputSchema: verdictSchema,
      outputSchema: packetSchema,
      annotations: { ...annotations, idempotentHint: true },
    },
    (input) => result(() => council.verdict(input)),
  );
  return server;
}
