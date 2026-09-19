# Repository instructions

- Read README.md and docs/architecture/README.md before changing behavior.
- Preserve docs/product/advisors.md and docs/origin/HANDOFF.md byte-for-byte unless the user explicitly requests a core/design-history change. Do not silently update the integrity hash.
- This server assembles prompts and advances a fixed proposal → critique → verdict workflow. No model API, API key, persistence, UI, model routing, discussion loop, or host self-audit.
- Keep host instructions separate from each isolated job. First-round jobs cannot contain other roles or host history. The last tool returns a job, not a generated verdict.
- Use TypeScript strict mode and the official MCP SDK. stdout is reserved for MCP, except explicit help/version commands.
- Use npm ci, npm run check, and npm run package:check. Tests must not consume model quota. Describe live model evaluations separately.
- Do not add fabricated repository URLs, badges, account owners, benchmark results, or release claims. Never include local credentials or private conversation logs in packages.
- README.md is Chinese-first; update README.en.md for user-visible changes. Keep documentation proportional to the feature.
