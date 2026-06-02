/**
 * Cross-platform uvicorn launcher.
 * Resolves the correct venv binary path on Windows vs Mac/Linux.
 */
const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';

const python = isWin
  ? path.join('venv', 'Scripts', 'python')
  : path.join('venv', 'bin', 'python');

const args = [
  '-m', 'uvicorn',
  'app.main:app',
  '--host', '127.0.0.1',
  '--port', '8000',
  '--reload',
  '--reload-dir', 'app',
];

const proc = spawn(python, args, {
  stdio: 'inherit',
  shell: false,
});

proc.on('error', (err) => {
  console.error(`\n[api] Failed to start uvicorn: ${err.message}`);
  console.error('[api] Make sure you have created and populated your Python venv.');
  console.error('[api] Run: python -m venv venv && pip install -r requirements.txt');
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
