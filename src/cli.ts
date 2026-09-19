#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer, VERSION } from "./server.js";

const args = process.argv.slice(2);
if (args.length === 1 && (args[0] === "--version" || args[0] === "-v")) {
  process.stdout.write(`${VERSION}\n`);
} else if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
  process.stdout.write(
    `三思 Diverdict ${VERSION}\n\nUsage: diverdict [--help | --version]\n\n不带参数时启动 stdio MCP server。stdout 仅用于 MCP 协议。\n不需要 API key；宿主执行 3 + 3 + 1 次隔离生成。\n`,
  );
} else if (args.length > 0) {
  process.stderr.write("Unknown arguments. Use --help.\n");
  process.exitCode = 2;
} else {
  try {
    await serveStdio(() => createServer());
  } catch {
    process.stderr.write(
      "Diverdict failed to start. Verify the package and docs/product/advisors.md.\n",
    );
    process.exitCode = 1;
  }
}
