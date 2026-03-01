export async function sendNotification(topic, title, message) {
  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: { 'Title': title },
    body: message,
  });
  return res.ok;
}

export async function remindSlackers(statusList, title = 'Chore Reminder', body = 'Hey {name}, you haven\'t logged a chore today!') {
  const results = [];
  for (const person of statusList) {
    if (!person.done) {
      const personalBody = body.replace(/\{name\}/g, person.name);
      const ok = await sendNotification(
        person.ntfy_topic,
        title,
        personalBody
      );
      results.push({ name: person.name, notified: ok });
    }
  }
  return results;
}
