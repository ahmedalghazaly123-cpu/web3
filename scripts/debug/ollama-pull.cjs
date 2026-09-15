// helper: pull an Ollama model detached with output redirected to a log.
// usage: node scripts/debug/ollama-pull.cjs [model]   (default: qwen2.5:3b)
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const model = process.argv[2] || 'qwen2.5:3b';
const logFile = path.join(__dirname, 'ollama-pull.log');
const out = fs.openSync(logFile, 'w');
fs.writeSync(out, 'CMD: ollama pull ' + model + '\n---\n');

const child = spawn('ollama', ['pull', model], { detached: true, windowsHide: true, stdio: ['ignore', out, out] });
child.unref();
console.log(`pulling ${model} in background (pid=${child.pid})`);
console.log(`log: ${logFile}`);