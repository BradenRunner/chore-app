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

  // Start cron — 6 PM daily (uses TZ env var for timezone)
  cron.schedule('0 18 * * *', async () => {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[${new Date().toLocaleString()}] Checking chore status for ${today}...`);

    try {
      const { getTodayStatus } = await import('./src/lib/db.js');
      const { remindSlackers } = await import('./src/lib/notify.js');
      const status = await getTodayStatus(today);
      const incomplete = status.filter((p) => !p.done);

      if (incomplete.length === 0) {
        console.log('  Everyone has done their chores!');
        return;
      }

      console.log(`  ${incomplete.length} person(s) need reminders...`);
      const results = await remindSlackers(status);

      for (const r of results) {
        console.log(`  Notified ${r.name}: ${r.notified ? 'success' : 'FAILED'}`);
      }
    } catch (err) {
      console.error('  Cron error:', err);
    }
  });

  console.log('> Cron scheduled: daily at 6:00 PM');
});
