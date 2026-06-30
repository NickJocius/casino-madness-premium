import { readFileSync } from 'node:fs';

let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }

const fp = data?.tool_input?.file_path || '';
if (!/\.(ts|tsx)$/.test(fp)) process.exit(0);
if (/\.test\.(ts|tsx)$/.test(fp)) process.exit(0); // don't nag on test files themselves

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext:
      `Source file changed: ${fp}. Per CLAUDE.md workflow: this change is not done until you have delegated to the tester subagent (not self-verified) to write/run tests against the acceptance criteria, AND delegated to the reviewer subagent to review the diff. Self-running npm test in this session does not satisfy the tester requirement — it must be the dedicated subagent. Do not propose a commit message until both subagents have run.`
  }
}));
process.exit(0);
