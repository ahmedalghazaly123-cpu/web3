// helper: sleep for N milliseconds (cmd's `timeout` breaks under this shell's
// redirection rules, so this is the portable replacement).
// usage: node scripts/debug/sleep.cjs 20000
const ms = Number(process.argv[2]) || 1000;
setTimeout(() => console.log(`slept ${ms}ms`), ms);