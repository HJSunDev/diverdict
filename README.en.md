# Diverdict · 异策

**Independent perspectives. Adversarial questioning. One final decision.**

[中文](README.md) · [Documentation](docs/README.md) · [Client setup](docs/engineering/clients.md) · [Protocol](docs/architecture/protocol.md) · [Contributing](CONTRIBUTING.md) · [MIT](LICENSE)

Diverdict is a small, host-powered MCP server. A strategist examines time and positioning, a diplomat examines relationships and interests, and a schemer examines risk. They propose independently, question each other's proposals, and submit all material to Jia Xu for a final strategy and its weakest point.

The server assembles prompts and advances the workflow. It contains no model calls, API keys, telemetry, or remote backend. Your existing agent supplies the model and execution capabilities.

The product name is **异策 · Diverdict**. The repository, directory, npm package, CLI, and MCP server identifier all use `diverdict`. The name combines *diverge* and *verdict*: from disagreement to a decision. The original core and handoff documents retain their historical titles and exact bytes.

## Quick start

Requires Node.js 22+, npm, and an authenticated MCP host such as Codex. From a downloaded or cloned checkout:

```sh
npm ci
npm run build
npm run smoke
codex mcp add diverdict -- node /absolute/path/diverdict/dist/cli.js
```

Open a new Codex task (restart the client if its MCP catalog has not refreshed) and ask:

> Use diverdict to decide whether our two-person team should first serve three committed pilot customers or launch publicly. We have a working prototype and six weeks. Execute the full independent proposal, critique, and arbitration workflow, then give me the final strategy and its weakest point.

The host handles all forwarding and model execution. Users do not manually shuttle responses. Public npm publication has **not** happened yet; use source or a locally packed `.tgz`, rather than assuming an `npx` registry command exists.

Before calling `strategize_begin`, the host must supply both `problem` and a nonblank `context`. Gather relevant facts, goals, constraints, preferences, and the user's latest corrections from the available conversation and materials already read. Resolve ambiguous references and include the relevant content, not just file paths, URLs, or the latest message. Users should not have to repeat known information. If no additional background is known, say so explicitly. Clarify material gaps unless the user requests a decision with the available information; identify assumptions, conflicts, and unknowns without inventing facts. Do not copy the entire history or host instructions. The server cannot inspect the host's conversation or verify completeness. Existing callers must now provide `context`; refresh the tool catalog or reconnect after updating. See the [context handoff rules](docs/architecture/protocol.md).

## The contract

| Tool | Input | Returned work |
| --- | --- | --- |
| `strategize_begin` | Problem, context, optional retry ID | Three isolated proposal jobs |
| `strategize_submit` | Session ID and all three original proposals | Three independent critique jobs |
| `strategize_verdict` | Session ID and all three critiques | One arbitration job |

The host performs **3 + 3 + 1 generations**, using the same model with no tools, file access, network access, or inherited host history. First-round participants do not see one another. Second-round participants see the original proposals but not concurrent critiques. Arbitration ends the workflow; there is no discussion loop.

`strategize_verdict` returns a prompt, **not a generated answer**. The host must execute that final job and present its result.

A real Codex / GPT-6 Astra run produced this [example verdict](docs/delivery/pilot-result.md). See the [validation record](docs/delivery/validation.md) for execution conditions and the observed host scheduling limitation.

An MCP connection alone does not provide isolated generation. The host needs that capability and must select its own implementation. A read-only filesystem sandbox is not equivalent to disabling tools. The server does not audit the host or provide an API fallback.

## Prompts and data

[`advisors.md`](docs/product/advisors.md) is the canonical Chinese source for all four roles and the workflow discipline. It is loaded directly at runtime and protected by a byte-level integrity test. Role text is not translated, paraphrased, or silently optimized. Future speculation in that document is excluded from runtime prompts.

Sessions are connection-local, memory-only, limited to 32, and expire two hours after creation. Expired entries are removed on subsequent requests. A restart loses all sessions. Identical submissions are retryable; conflicting replacements are rejected. The host may retain its own conversations and charges for its model usage as usual.

`docs/origin/HANDOFF.md` in the source repository is a historical design handoff, not the current implementation status; it is not included in the npm package.

## Development

```sh
npm ci
npm run check
npm run test:coverage
npm run package:check
```

Tests exercise the unchanged core, isolated material, complete workflow, validation, state ordering, retry conflicts, expiry, resource bounds, concurrent sessions, CLI behavior, and real stdio handshakes, including 2025-era MCP clients. CI covers Node.js 22/24 on Windows, Linux, and macOS. Fixture tests are not evidence of strategy quality; see [evaluation](docs/engineering/evaluation.md) and [validation](docs/delivery/validation.md).

No UI, persistent memory, multi-model routing, configurable role packs, or built-in model provider is included. See [architecture](docs/architecture/README.md), [security](SECURITY.md), and [release preparation](docs/engineering/releasing.md). Documentation beyond this overview is primarily Chinese.

## License

MIT, including the code, role prompts, and workflow documents.
