// Is the role bound into the Google OAuth start redirect? Works against the live API.
const API = process.env.API_URL || 'http://localhost:4000';

async function start(role) {
  const url = `${API}/api/v1/auth/google${role ? `?role=${role}` : ''}`;
  const res = await fetch(url, { redirect: 'manual' });
  const location = res.headers.get('location') || '';
  let state = '';
  try {
    state = new URL(location).searchParams.get('state') || '';
  } catch {
    /* no location */
  }
  const cookie = res.headers.getSetCookie ? res.headers.getSetCookie().join('; ') : '';
  console.log(
    `start role=${(role || '(none)').padEnd(7)} status=${res.status} boundRole="${state.split(':')[1] ?? ''}" stateBound=${/:[a-z]*$/.test(state)}`,
  );
  if (location) console.log(`   -> ${location.slice(0, 90)}...`);
  if (cookie) console.log(`   cookie Max-Age=${/Max-Age=\d+/.exec(cookie)?.[0] ?? '(none)'}`);
}

(async () => {
  await start('');
  await start('teacher');
  await start('owner');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});