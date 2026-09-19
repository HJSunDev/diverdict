import { readFileSync } from "node:fs";
import { type AdvisorRole, ROLE_NAMES } from "./contracts.js";

export interface Core {
  readonly roles: Readonly<Record<AdvisorRole | "arbiter", string>>;
  readonly discipline: string;
}

export function parseCore(markdown: string): Core {
  const source = markdown.replace(/\r\n/g, "\n");
  const roles = {} as Record<AdvisorRole | "arbiter", string>;
  for (const [id, heading] of Object.entries(ROLE_NAMES)) {
    const marker = `## ${heading}\n`;
    if (source.split(marker).length !== 2) {
      throw new Error(
        `Core document must contain exactly one ${heading} section.`,
      );
    }
    const section = source.split(marker)[1]?.split(/\n## |\n---/)[0] ?? "";
    const lines = section.trim().split("\n");
    if (!lines.length || lines.some((line) => !line.startsWith(">"))) {
      throw new Error(`Core role ${heading} must be a Markdown blockquote.`);
    }
    roles[id as AdvisorRole | "arbiter"] = lines
      .map((line) => line.replace(/^> ?/, ""))
      .join("\n");
  }
  const marker = "## 纪律(质询轮的防趋同闸门)\n";
  const discipline = source.split(marker)[1]?.split("\n---")[0]?.trim();
  if (source.split(marker).length !== 2 || !discipline) {
    throw new Error("Core document is missing its unique discipline section.");
  }
  return Object.freeze({ roles: Object.freeze(roles), discipline });
}

export function loadCore(): Core {
  return parseCore(
    readFileSync(
      new URL("../docs/product/advisors.md", import.meta.url),
      "utf8",
    ),
  );
}
