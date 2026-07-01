import { readFileSync } from "node:fs";

let raw = "";
try {
  raw = readFileSync(0, "utf8");
} catch {}

let data = {};
try {
  data = JSON.parse(raw || "{}");
} catch {
  process.exit(0);
}

const fp = data?.tool_input?.file_path;
if (!fp) process.exit(0);

const segs = String(fp).replace(/\\/g, "/").split("/").filter(Boolean);
const base = segs[segs.length - 1] || "";
const has = (name) => segs.includes(name);

let reason = null;
if (/^\.env(\..*)?$/.test(base) && base !== ".env.example")
  reason = "Editing .env* is forbidden — secrets live there.";
else if (has("generated"))
  reason = "generated/ is build output. Regenerate with `npm run db:generate`, never hand-edit.";
else if (has("prisma") && has("migrations"))
  reason = "prisma/migrations/ is Prisma-managed. Never hand-edit migration files.";
else if (has(".claude"))
  reason =
    "Editing .claude/ (agent, hook, and settings config) is forbidden mid-session. Change it by hand in a normal terminal.";

if (reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}
process.exit(0);
