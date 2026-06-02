/**
 * Cross-platform launcher for Darf UI.
 * Prints the welcome banner, auto-opens the browser, then runs `npm run dev`.
 * Works on Windows, Mac, and Linux — no shell scripts needed.
 */
const { spawn, execSync } = require('child_process');

// --- Banner ---
console.log('\x1b[35m'); // magenta
console.log('===================================================================');
console.log('                            ✦ DARF UI ✦');
console.log('===================================================================');
console.log('');
console.log(' [SYSTEM]: Launching backend (FastAPI) and frontend (Vite)...');
console.log(' [SYSTEM]: Labeled logs will appear below shortly.');
console.log('');
console.log(' [TIP]: Keep this terminal open while you play!');
console.log(' [TIP]: Press Ctrl+C in this window to stop all servers.');
console.log('');
console.log('===================================================================');
console.log('\x1b[0m'); // reset

// --- Auto-open browser after 2 seconds ---
setTimeout(() => {
  const url = 'http://localhost:5173';
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      execSync(`start ${url}`);
    } else if (platform === 'darwin') {
      execSync(`open ${url}`);
    } else {
      execSync(`xdg-open ${url}`);
    }
  } catch {
    // Non-fatal — user can open manually
  }
}, 2000);

// --- Launch npm run dev ---
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

const dev = spawn(npm, ['run', 'dev'], {
  stdio: 'inherit',
  shell: false,
});

dev.on('error', (err) => {
  console.error(`\n[launcher] Failed to run npm: ${err.message}`);
  process.exit(1);
});

dev.on('exit', (code) => {
  process.exit(code ?? 0);
});
