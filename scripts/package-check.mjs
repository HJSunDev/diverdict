import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const temp = mkdtempSync(join(tmpdir(), "diverdict-package-"));
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "Run this script through npm run package:check.");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    `${command} failed: ${result.error?.message ?? ""}\n${result.stderr}\n${result.stdout}`,
  );
  return result.stdout;
}

try {
  run(process.execPath, [npmCli, "pack", "--pack-destination", temp], root);
  const archives = readdirSync(temp).filter((name) => name.endsWith(".tgz"));
  assert.equal(archives.length, 1);
  writeFileSync(
    join(temp, "package.json"),
    '{"private":true,"type":"module"}\n',
  );
  run(
    process.execPath,
    [
      npmCli,
      "install",
      "--ignore-scripts",
      "--omit=dev",
      "--no-audit",
      "--no-fund",
      join(temp, archives[0]),
    ],
    temp,
  );
  const installed = join(temp, "node_modules", "diverdict");
  const metadata = JSON.parse(
    readFileSync(join(installed, "package.json"), "utf8"),
  );
  for (const required of [
    "docs/product/advisors.md",
    "LICENSE",
    "README.md",
    "README.en.md",
    "assets/brand/hero.svg",
    "assets/brand/hero-en.svg",
    "dist/cli.js",
    "dist/index.d.ts",
    "docs/README.md",
    "docs/architecture/protocol.md",
    "docs/delivery/pilot-result.md",
  ]) {
    assert.ok(
      readFileSync(join(installed, required)).length > 0,
      `Missing ${required}`,
    );
  }
  for (const unwanted of [
    "work",
    "test",
    "node_modules",
    ".git",
    ".env",
    "HANDOFF.md",
    "docs/origin",
    ".agents",
  ]) {
    assert.ok(
      !existsSync(join(installed, unwanted)),
      `Unexpected package entry: ${unwanted}`,
    );
  }
  assert.deepEqual(
    readFileSync(join(installed, "docs/product/advisors.md")),
    readFileSync(join(root, "docs/product/advisors.md")),
    "The installed core must match the original source bytes.",
  );
  assert.equal(
    run(
      process.execPath,
      [join(installed, "dist", "cli.js"), "--version"],
      temp,
    ).trim(),
    metadata.version,
  );
  const smoke = run(
    process.execPath,
    [join(root, "scripts", "smoke.mjs"), join(installed, "dist", "cli.js")],
    temp,
  );
  console.log(smoke.trim());
  console.log(
    `PASS: ${archives[0]} installs independently with production dependencies and no lifecycle scripts.`,
  );
} finally {
  // Only delete the unique directory created above, never a caller-provided path.
  const within = relative(resolve(tmpdir()), resolve(temp));
  assert.ok(
    !within.startsWith("..") && basename(temp).startsWith("diverdict-package-"),
  );
  rmSync(temp, { recursive: true, force: true });
}
