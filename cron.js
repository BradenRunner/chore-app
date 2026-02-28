const cron = require('node-cron');
const { getTodayStatus } = require('./src/lib/db');
const { remindSlackers } = require('./src/lib/notify');

console.log('Chore reminder cron started. Will check daily at 6:00 PM.');

// Run at 6:00 PM every day
cron.schedule('0 18 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];
  console.log(`[${new Date().toLocaleString()}] Checking chore status for ${today}...`);

  const status = getTodayStatus(today);
  const incomplete = status.filter((p) => !p.done);

  if (incomplete.length === 0) {
    console.log('  Everyone has done their chores!');
    return;
  }

  console.log(`  ${incomplete.length} person(s) haven't logged a chore. Sending reminders...`);
  const results = await remindSlackers(status);

  for (const r of results) {
    console.log(`  Notified ${r.name}: ${r.notified ? 'success' : 'FAILED'}`);
  }
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nCron stopped.');
  process.exit(0);
});
