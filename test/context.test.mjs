import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Council, loadCore } from "../dist/index.js";

test("missing or blank background cannot create a session; explicit unknowns can", () => {
  const council = new Council({ maxSessions: 1 });
  for (const context of [undefined, null, "", " \n\t"]) {
    assert.throws(() =>
      council.begin({ problem: "先试点还是公开发布？", context }),
    );
  }
  const packet = council.begin({
    problem: "先试点还是公开发布？",
    context: "用户要求直接判断。无额外已知背景；团队规模与预算未知。",
  });
  assert.equal(packet.jobs.length, 3);
});

test("MCP advertises background before invocation and preserves it across all seven jobs", {
  timeout: 20_000,
}, async (t) => {
  const client = new Client({ name: "context-handoff-test", version: "1" });
  t.after(() => client.close());
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL("../dist/cli.js", import.meta.url))],
      stderr: "pipe",
    }),
  );
  const { tools } = await client.listTools();
  const begin = tools.find((tool) => tool.name === "strategize_begin");
  assert.ok(begin.inputSchema.required.includes("context"));
  assert.equal(begin.inputSchema.properties.context.minLength, 1);
  assert.equal(begin.inputSchema.properties.context.default, undefined);
  // These rules must be visible before begin, not only in a returned job.
  assert.match(client.getInstructions().slice(0, 512), /背景 context/);
  assert.match(begin.description, /已读材料/);
  assert.match(
    begin.inputSchema.properties.context.description,
    /用户最新更正/,
  );
  for (const args of [
    { problem: "先试点还是公开发布？" },
    { problem: "先试点还是公开发布？", context: "" },
    { problem: "先试点还是公开发布？", context: " \n\t" },
  ]) {
    const result = await client.callTool({
      name: "strategize_begin",
      arguments: args,
    });
    assert.equal(result.isError, true);
  }
  const problem = "先服务三家试点客户，还是公开发布现有原型？";
  const context = [
    "已知：团队两人。用户最新更正交付期限为四周，替代此前的六周。",
    "已读访谈摘录：三家客户同意试用，但尚未承诺付费。",
    "用户目标：验证付费意愿；偏好控制维护成本，不能接受长期定制。",
    "推测：公开发布可能带来更多反馈，尚未验证。预算未知。",
    "另有材料称客户已付款，与访谈冲突，尚未核实。",
  ].join("\n");
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    return result.structuredContent;
  };
  const first = await call("strategize_begin", {
    problem,
    context,
    request_id: "context",
  });
  const answers = {
    strategist: "方略 S",
    diplomat: "方略 D",
    schemer: "方略 R",
  };
  const second = await call("strategize_submit", {
    session_id: first.session_id,
    proposals: answers,
  });
  const third = await call("strategize_verdict", {
    session_id: first.session_id,
    critiques: answers,
  });
  const core = loadCore();
  const jobs = [first, second, third].flatMap((packet) => packet.jobs);
  assert.equal(jobs.length, 7);
  for (const job of jobs) {
    const material = JSON.parse(
      job.user_prompt.slice(job.user_prompt.indexOf("{\n")),
    );
    assert.equal(material.problem, problem);
    assert.equal(material.context, context);
    assert.equal(job.system_prompt, core.roles[job.role]);
    assert.ok(!job.user_prompt.includes(client.getInstructions()));
  }
  const conflict = await client.callTool({
    name: "strategize_begin",
    arguments: {
      problem,
      context: "用户补充了不同背景。",
      request_id: "context",
    },
  });
  assert.equal(conflict.isError, true);
  assert.equal(
    JSON.parse(conflict.content[0].text).error.code,
    "REQUEST_CONFLICT",
  );
});
