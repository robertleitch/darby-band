// Sends due alerts from _alerts/alerts.json to every phone signed up for Darby alerts.
import fs from 'fs';
const F = '_alerts/alerts.json';
const L = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : [];
const now = Date.now();
const isDue = a => a.status === 'scheduled' && Date.parse(a.at) <= now + 60e3;
if (process.argv.includes('--check')) {
  const yes = L.some(isDue);
  console.log(yes ? 'Alerts due' : 'Nothing due');
  fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `due=${yes ? 'yes' : 'no'}\n`);
  process.exit(0);
}
const { VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, FIREBASE_SECRET } = process.env;
const DB = 'https://darbyseating-default-rtdb.firebaseio.com';
const save = () => fs.writeFileSync(F, JSON.stringify(L, null, 1) + '\n');
const due = L.filter(isDue);
if (!VAPID_PUBLIC || !VAPID_PRIVATE || !FIREBASE_SECRET) {
  for (const a of due) { a.status = 'error'; a.result = { error: 'Alert keys are missing in GitHub secrets.' }; }
  save(); console.log('Missing secrets'); process.exit(0);
}
const webpush = (await import('web-push')).default;
webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:alerts@darbybandscores.org', VAPID_PUBLIC, VAPID_PRIVATE);
const r = await fetch(`${DB}/push.json?auth=${FIREBASE_SECRET}`);
if (!r.ok) {
  for (const a of due) { a.status = 'error'; a.result = { error: `Couldn't read the alert list (${r.status}). Check the FIREBASE_SECRET.` }; }
  save(); process.exit(0);
}
const subs = (await r.json()) || {};
const gone = new Set();
for (const a of due) {
  if (now - Date.parse(a.at) > 3 * 3600e3) { a.status = 'skipped'; a.result = { error: 'More than 3 hours late, so it was not sent.' }; continue; }
  const targets = Object.entries(subs).filter(([id, s]) =>
    s && s.ep && (a.only ? a.only.includes(id) : !(s.topics && s.topics[a.topic || 'news'] === false)));
  const payload = JSON.stringify({ title: a.title || 'Darby Band', body: a.body || '', url: a.url || '/', tag: a.id });
  let ok = 0, fail = 0, dead = 0;
  await Promise.all(targets.map(async ([id, s]) => {
    try {
      await webpush.sendNotification({ endpoint: s.ep, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 4 * 3600, urgency: 'high' });
      ok++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { dead++; gone.add(id); } else { fail++; console.log('fail', e.statusCode, e.body); }
    }
  }));
  a.status = 'sent'; a.sent = new Date().toISOString(); a.result = { phones: targets.length, delivered: ok, expired: dead, failed: fail };
  console.log(a.id, a.result);
}
for (const id of gone) await fetch(`${DB}/push/${id}.json?auth=${FIREBASE_SECRET}`, { method: 'DELETE' }).catch(() => {});
save();
