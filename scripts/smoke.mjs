import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

// An optional entry path lets CI exercise an installed tarball, not the checkout.
const entry = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const client = new Client({ name: "diverdict-smoke", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [entry],
  stderr: "pipe",
});
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 3);
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    return result.structuredContent;
  };
  const first = await call("strategize_begin", {
    problem: "协议烟测：是否先验证需求？",
  });
  const answers = {
    strategist: "测试夹具：长期价值",
    diplomat: "测试夹具：关系利益",
    schemer: "测试夹具：风险退路",
  };
  const second = await call("strategize_submit", {
    session_id: first.session_id,
    proposals: answers,
  });
  const third = await call("strategize_verdict", {
    session_id: first.session_id,
    critiques: answers,
  });
  assert.deepEqual(
    [first.jobs.length, second.jobs.length, third.jobs.length],
    [3, 3, 1],
  );
  assert.equal(third.next_tool, null);
  console.log(
    "PASS: stdio handshake, tools/list, three-stage 3+3+1 flow. Fixture data only; no model-quality claim.",
  );
} finally {
  await client.close();
}
