import assert from "node:assert/strict";
import { test } from "node:test";
import { Council, LIMITS, packetSchema, ROLE_IDS } from "../dist/index.js";

test("maximum-size material remains intact through all three stages", () => {
  const council = new Council();
  const problem = "问".repeat(LIMITS.problem);
  const context = "背".repeat(LIMITS.context);
  const proposals = Object.fromEntries(
    ROLE_IDS.map((role, i) => [role, String(i).repeat(LIMITS.response)]),
  );
  const critiques = Object.fromEntries(
    ROLE_IDS.map((role, i) => [role, String(i + 3).repeat(LIMITS.response)]),
  );
  const first = council.begin({ problem, context });
  const second = council.submit({ session_id: first.session_id, proposals });
  const final = council.verdict({ session_id: first.session_id, critiques });
  for (const packet of [first, second, final]) packetSchema.parse(packet);
  const material = JSON.parse(
    final.jobs[0].user_prompt.slice(final.jobs[0].user_prompt.indexOf("{\n")),
  );
  assert.deepEqual(material, { problem, context, proposals, critiques });
});

test("many interleaved decisions preserve each decision's causal material", () => {
  const council = new Council();
  const decisions = Array.from({ length: LIMITS.sessions }, (_, i) => {
    const problem = `problem-${i}`;
    return {
      packet: council.begin({ problem, context: `context-${i}` }),
      problem,
      proposals: Object.fromEntries(
        ROLE_IDS.map((role) => [role, `${problem}-${role}`]),
      ),
    };
  });
  for (const decision of [...decisions].reverse()) {
    council.submit({
      session_id: decision.packet.session_id,
      proposals: decision.proposals,
    });
  }
  for (const decision of decisions) {
    const final = council.verdict({
      session_id: decision.packet.session_id,
      critiques: decision.proposals,
    });
    const material = JSON.parse(
      final.jobs[0].user_prompt.slice(final.jobs[0].user_prompt.indexOf("{\n")),
    );
    assert.equal(material.problem, decision.problem);
    assert.deepEqual(material.proposals, decision.proposals);
  }
});
