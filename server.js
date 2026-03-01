const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const cron = require('node-cron');
// notify.js is ESM, so we dynamic-import it in the cron callback

const port = parseInt(process.env.PORT, 10) || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  }).listen(port, '0.0.0.0', () => {
    console.log(`> Server listening on port ${port}`);
  });

  // Dynamic notification schedule — tick every 15 minutes, check DB for configured times
  cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0');
    const currentSlot = `${hours}:${minutes}`;
    const today = now.toISOString().split('T')[0];

    try {
      const {
        getNotificationSchedule,
        hasNotificationBeenSent,
        markNotificationSent,
        getTodayStatus,
      } = await import('./src/lib/db.js');
      const { remindSlackers } = await import('./src/lib/notify.js');

      const schedule = await getNotificationSchedule();
      const match = schedule.find((s) => s.time === currentSlot);
      if (!match) return;

      const alreadySent = await hasNotificationBeenSent(currentSlot, today);
      if (alreadySent) return;

      console.log(`[${now.toLocaleString()}] Scheduled notification for ${currentSlot}...`);
      const status = await getTodayStatus(today);
      const incomplete = status.filter((p) => !p.done);

      if (incomplete.length === 0) {
        console.log('  Everyone has done their chores!');
        await markNotificationSent(currentSlot, today, 0);
        return;
      }

      console.log(`  ${incomplete.length} person(s) need reminders...`);
      const results = await remindSlackers(status, match.title, match.body);

      for (const r of results) {
        console.log(`  Notified ${r.name}: ${r.notified ? 'success' : 'FAILED'}`);
      }

      await markNotificationSent(currentSlot, today, results.length);
    } catch (err) {
      console.error('  Cron error:', err);
    }
  });

  console.log('> Cron scheduled: checking every 15 minutes against notification schedule');
});
