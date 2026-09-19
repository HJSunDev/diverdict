import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { LIMITS, ROLE_IDS } from "../dist/index.js";

test("stdio transports maximum Unicode material without truncation or pipe deadlock", {
  timeout: 20_000,
}, async (t) => {
  const client = new Client({ name: "large-packet-test", version: "1" });
  t.after(() => client.close());
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL("../dist/cli.js", import.meta.url))],
      stderr: "pipe",
    }),
  );
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError);
    return result.structuredContent;
  };
  const first = await call("strategize_begin", {
    problem: "问".repeat(LIMITS.problem),
    context: "背景".repeat(LIMITS.context / 2),
  });
  const proposals = Object.fromEntries(
    ROLE_IDS.map((role) => [role, "策".repeat(LIMITS.response)]),
  );
  const critiques = Object.fromEntries(
    ROLE_IDS.map((role) => [role, "质".repeat(LIMITS.response)]),
  );
  const second = await call("strategize_submit", {
    session_id: first.session_id,
    proposals,
  });
  const final = await call("strategize_verdict", {
    session_id: first.session_id,
    critiques,
  });
  assert.equal(second.jobs.length, 3);
  const material = JSON.parse(
    final.jobs[0].user_prompt.slice(final.jobs[0].user_prompt.indexOf("{\n")),
  );
  assert.deepEqual(material.proposals, proposals);
  assert.deepEqual(material.critiques, critiques);
});
