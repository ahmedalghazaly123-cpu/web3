// Launches Docker Desktop detached and reports whether the process really started.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const exe = path.join(
  process.env.LOCALAPPDATA || '',
  'Programs',
  'DockerDesktop',
  'Docker Desktop.exe',
);

if (!fs.existsSync(exe)) {
  console.log('MISSING_EXE ' + exe);
  process.exit(1);
}

const logFd = fs.openSync(path.join(__dirname, 'docker-desktop-launch.log'), 'w');
const child = spawn(exe, [], { detached: true, stdio: ['ignore', logFd, logFd], windowsHide: false });
child.unref();

setTimeout(() => {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq Docker Desktop.exe"', { encoding: 'utf8' });
    const running = /Docker Desktop\.exe/i.test(out);
    console.log(`spawned pid=${child.pid} exe=${exe}`);
    console.log(`running=${running}`);
    if (!running) {
      console.log('TASKLIST_SNIPPET=' + out.trim().split('\n').slice(-3).join(' | '));
    }
  } catch (e) {
    console.log('tasklist failed: ' + e.message);
  }
  void os;
}, 6000);