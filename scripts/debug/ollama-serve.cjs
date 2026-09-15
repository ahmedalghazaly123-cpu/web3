// helper: start the local Ollama daemon detached (survives the caller).
// usage: node scripts/debug/ollama-serve.cjs
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'ollama-serve.log');
const out = fs.openSync(logFile, 'w');
const exe = process.env.OLLAMA_EXE || path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
if (!fs.existsSync(exe)) {
  console.error('ollama.exe not found at ' + exe);
  process.exit(1);
}
const child = spawn(exe, ['serve'], { detached: true, windowsHide: true, stdio: ['ignore', out, out] });
child.unref();
console.log('ollama serve spawned pid=' + child.pid + ' log=' + logFile);