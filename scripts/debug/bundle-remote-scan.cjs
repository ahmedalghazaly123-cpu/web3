// Remote bundle scan — what API base is *actually* baked into a deployed SPA?
// usage:
//   node scripts/debug/bundle-remote-scan.cjs                      (defaults to the Vercel link)
//   node scripts/debug/bundle-remote-scan.cjs https://my-site.app
const WEB = (process.argv[2] || process.env.WEB_BASE || 'https://web3-1-five.vercel.app').replace(/\/$/, '');

// Hosts that must never appear in a deployed bundle / that reveal the API base.
const INTERESTING = /railway\.app|vercel\.app|localhost|127\.0\.0\.1|\/api\/v1/;

(async () => {
  const home = await (await fetch(WEB)).text();
  const assets = [...home.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  console.log(`web    : ${WEB}`);
  console.log(`assets : ${assets.length}\n`);

  for (const a of assets) {
    const body = await (await fetch(/^https?:/.test(a) ? a : WEB + a)).text();
    const refs = [...new Set([...body.matchAll(/https?:\/\/[A-Za-z0-9._:-]+/g)].map((m) => m[0]))]
      .filter((u) => INTERESTING.test(u));
    const bare = [...new Set([...body.matchAll(/["'`](\/api\/v1)["'`]/g)].map((m) => m[1]))];
    console.log(`${a}  (${Math.round(body.length / 1024)} KB)`);
    console.log(`  absolute api bases : ${refs.length ? refs.join(', ') : '(none)'}`);
    console.log(`  same-origin bases  : ${bare.length ? bare.join(', ') : '(none)'}`);
    console.log(`  has localhost refs : ${refs.some((u) => /localhost|127\.0\.0\.1/.test(u)) ? 'YES (breaks for friends)' : 'no'}`);
  }
})();