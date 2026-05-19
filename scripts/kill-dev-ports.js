const { execFileSync } = require('node:child_process');

const ports = [4000, 5173];

function getListenerPids(port) {
  const output = execFileSync('netstat', ['-aon'], { encoding: 'utf8' });
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes(`:${port}`) || !line.includes('LISTENING')) {
      continue;
    }

    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }

  return [...pids];
}

function killPid(pid) {
  try {
    execFileSync('taskkill', ['/PID', pid, '/F'], { stdio: 'inherit' });
  } catch (error) {
    // Ignore race conditions where the process exits before taskkill runs.
  }
}

for (const port of ports) {
  for (const pid of getListenerPids(port)) {
    killPid(pid);
  }
}
