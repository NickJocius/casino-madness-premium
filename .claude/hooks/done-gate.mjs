import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

let data = {};
try { data = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }

// Loop guard: if we're already inside a stop-block cycle, let it finish.
if (data.stop_hook_active) process.exit(0);

function run(label, cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
    return { label, ok: true, out: '' };
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`.trim();
    return { label, ok: false, out };
  }
}

const typecheck = run('typecheck', 'npm run typecheck');
const test = run('test', 'npm run test');
const lint = run('lint', 'npm run lint'); // report-only

const blockers = [typecheck, test].filter(r => !r.ok);

if (blockers.length > 0) {
  const detail = blockers
    .map(r => `### ${r.label} FAILED\n${r.out.slice(-1500)}`)
    .join('\n\n');
  const lintNote = lint.ok ? '' : `\n\n(lint also reported issues, non-blocking:\n${lint.out.slice(-600)})`;
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason:
      'Definition of Done not met — fix these before finishing:\n\n' +
      detail + lintNote +
      '\n\nRe-run the checks after fixing. Do not declare the task complete until typecheck and tests pass.'
  }));
  process.exit(0);
}

// All clear — let the agent stop.
process.exit(0);
