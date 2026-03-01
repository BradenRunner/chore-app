export async function sendNotification(topic, title, message) {
  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: { 'Title': title },
    body: message,
  });
  return res.ok;
}

export async function remindSlackers(statusList) {
  const results = [];
  for (const person of statusList) {
    if (!person.done) {
      const ok = await sendNotification(
        person.ntfy_topic,
        'Chore Reminder',
        `Hey ${person.name}, you haven't logged a chore today!`
      );
      results.push({ name: person.name, notified: ok });
    }
  }
  return results;
}
