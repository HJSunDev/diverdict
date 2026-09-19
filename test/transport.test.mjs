import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { packetSchema, VERSION } from "../dist/index.js";

const entry = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const answers = {
  strategist: "独立方略 S",
  diplomat: "独立方略 D",
  schemer: "独立方略 R",
};

async function connect(t) {
  const client = new Client({
    name: "diverdict-test",
    version: "1.0.0",
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry],
    stderr: "pipe",
  });
  t.after(() => client.close());
  await client.connect(transport);
  return client;
}

test("real stdio server advertises three tools and completes the protocol round trip", {
  timeout: 20_000,
}, async (t) => {
  const client = await connect(t);
  assert.equal(client.getServerVersion().version, VERSION);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ["strategize_begin", "strategize_submit", "strategize_verdict"],
  );
  assert.ok(tools.every((tool) => tool.outputSchema));
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    const packet = packetSchema.parse(result.structuredContent);
    assert.deepEqual(JSON.parse(result.content[0].text), packet);
    return packet;
  };
  const first = await call("strategize_begin", {
    problem: "是否发布？",
    request_id: "stdio-test",
  });
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
});

test("protocol errors are recoverable and do not expose submitted material", {
  timeout: 20_000,
}, async (t) => {
  const client = await connect(t);
  const missing = await client.callTool({
    name: "strategize_submit",
    arguments: { session_id: randomUUID(), proposals: answers },
  });
  assert.equal(missing.isError, true);
  assert.equal(
    JSON.parse(missing.content[0].text).error.code,
    "SESSION_NOT_FOUND",
  );
  assert.ok(!JSON.stringify(missing).includes(answers.strategist));
  const invalid = await client.callTool({
    name: "strategize_begin",
    arguments: { problem: "" },
  });
  assert.equal(invalid.isError, true);
  const valid = await client.callTool({
    name: "strategize_begin",
    arguments: { problem: "正常问题" },
  });
  assert.ok(!valid.isError);
});

test("simultaneous sessions on one MCP connection remain independent", {
  timeout: 20_000,
}, async (t) => {
  const client = await connect(t);
  const results = await Promise.all(
    ["alpha-only", "beta-only", "gamma-only"].map((problem) =>
      client.callTool({ name: "strategize_begin", arguments: { problem } }),
    ),
  );
  assert.equal(
    new Set(results.map((result) => result.structuredContent.session_id)).size,
    3,
  );
  for (const [i, result] of results.entries()) {
    const packet = result.structuredContent;
    assert.ok(
      packet.jobs.every((job) =>
        job.user_prompt.includes(["alpha-only", "beta-only", "gamma-only"][i]),
      ),
    );
  }
});

test("2025-06-18 clients can initialize and call tools without a v2 probe", {
  timeout: 15_000,
}, async (t) => {
  const child = spawn(process.execPath, [entry], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  t.after(() => {
    child.stdin.end();
    child.kill();
  });
  let buffer = "";
  const pending = new Map();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    for (;;) {
      const newline = buffer.indexOf("\n");
      if (newline < 0) break;
      const message = JSON.parse(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      if (message.id !== undefined) {
        pending.get(message.id)?.(message);
        pending.delete(message.id);
      }
    }
  });
  const request = (id, method, params) =>
    new Promise((resolve) => {
      pending.set(id, resolve);
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
    });
  const initialized = await request(1, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "legacy-smoke", version: "1" },
  });
  assert.equal(initialized.result.protocolVersion, "2025-06-18");
  child.stdin.write(
    `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
  );
  const listed = await request(2, "tools/list", {});
  assert.equal(listed.result.tools.length, 3);
  const called = await request(3, "tools/call", {
    name: "strategize_begin",
    arguments: { problem: "legacy client" },
  });
  assert.equal(called.result.structuredContent.jobs.length, 3);
});

test("CLI help/version are explicit, unknown flags fail without contaminating protocol stdout", () => {
  const version = spawnSync(process.execPath, [entry, "--version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), VERSION);
  const help = spawnSync(process.execPath, [entry, "--help"], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /stdio MCP/);
  const invalid = spawnSync(process.execPath, [entry, "--bad-argument"], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(invalid.status, 2);
  assert.equal(invalid.stdout, "");
  assert.match(invalid.stderr, /Unknown arguments/);
});
