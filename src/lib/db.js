import { supabase } from './supabase';
import crypto from 'crypto';

export async function getAllPeople() {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

export async function getTodayStatus(dateStr) {
  const { data: people, error: pErr } = await supabase
    .from('people')
    .select('*')
    .order('id');
  if (pErr) throw pErr;

  const { data: completions, error: cErr } = await supabase
    .from('completions')
    .select('*')
    .eq('date', dateStr);
  if (cErr) throw cErr;

  const { data: skips, error: sErr } = await supabase
    .from('skip_reasons')
    .select('*')
    .eq('date', dateStr);
  if (sErr) throw sErr;

  return people.map((person) => {
    const personCompletions = completions.filter((c) => c.person_id === person.id);
    const skip = skips.find((s) => s.person_id === person.id);
    return {
      id: person.id,
      name: person.name,
      ntfy_topic: person.ntfy_topic,
      token_balance: person.token_balance || 0,
      done: personCompletions.length > 0 || !!skip,
      completions: personCompletions.map((c) => ({
        id: c.id,
        description: c.description,
      })),
      skipReason: skip?.reason || null,
    };
  });
}

export async function getStreak(personId, todayStr) {
  const { data, error } = await supabase
    .from('completions')
    .select('date')
    .eq('person_id', personId)
    .order('date', { ascending: false });
  if (error) throw error;

  const dates = new Set(data.map((r) => r.date));
  let streak = 0;
  let date = new Date(todayStr + 'T00:00:00');

  while (true) {
    const ds = date.toISOString().split('T')[0];
    if (dates.has(ds)) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export async function getWeeklyCount(personId, todayStr) {
  const today = new Date(todayStr + 'T00:00:00');
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('completions')
    .select('date')
    .eq('person_id', personId)
    .gte('date', mondayStr)
    .lte('date', todayStr);
  if (error) throw error;

  const uniqueDates = new Set(data.map((r) => r.date));
  return uniqueDates.size;
}

export async function logChore(personId, description, dateStr) {
  const { error } = await supabase
    .from('completions')
    .insert({ person_id: personId, description, date: dateStr });
  if (error) throw error;

  return { success: true };
}

export async function getHistory(days) {
  const today = new Date();
  const since = new Date(today);
  since.setDate(today.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('completions')
    .select('*, people(name)')
    .gte('date', sinceStr)
    .order('date', { ascending: false });
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    person_id: row.person_id,
    description: row.description,
    date: row.date,
    created_at: row.created_at,
    name: row.people.name,
  }));
}

export async function getAllChores() {
  const { data, error } = await supabase
    .from('chores')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

export async function addChore(name, tokenValue) {
  const row = { name };
  if (tokenValue !== undefined) row.token_value = tokenValue;
  const { error } = await supabase.from('chores').insert(row);
  if (error) throw error;
}

export async function deleteChore(id) {
  const { error } = await supabase.from('chores').delete().eq('id', id);
  if (error) throw error;
}

export async function addPerson(name, pin) {
  const suffix = crypto.randomBytes(4).toString('hex');
  const topic = `chores-${name.toLowerCase()}-${suffix}`;
  const row = { name, ntfy_topic: topic };
  if (pin) row.pin = pin;
  const { error } = await supabase.from('people').insert(row);
  if (error) throw error;
}

export async function updatePerson(id, fields) {
  const updates = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.ntfy_topic !== undefined) updates.ntfy_topic = fields.ntfy_topic;
  if (fields.pin !== undefined) updates.pin = fields.pin;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from('people').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deletePerson(id) {
  // skip_reasons and logins cascade on delete, but completions don't
  const { error: cErr } = await supabase
    .from('completions')
    .delete()
    .eq('person_id', id);
  if (cErr) throw cErr;

  const { error: pErr } = await supabase.from('people').delete().eq('id', id);
  if (pErr) throw pErr;
}

export async function deleteCompletion(id) {
  const { error } = await supabase.from('completions').delete().eq('id', id);
  if (error) throw error;
}

export async function verifyPin(personId, pin) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', personId)
    .single();
  if (error) throw error;
  if (!data || data.pin !== pin) return null;
  return data;
}

export async function logLogin(personId) {
  const { error } = await supabase
    .from('logins')
    .insert({ person_id: personId });
  if (error) throw error;
}

export async function submitSkipReason(personId, reason, dateStr) {
  const { error } = await supabase
    .from('skip_reasons')
    .upsert(
      { person_id: personId, date: dateStr, reason },
      { onConflict: 'person_id,date' }
    );
  if (error) throw error;
}

// ---- Token Functions ----

export async function getTokenBalance(personId) {
  const { data, error } = await supabase
    .from('people')
    .select('token_balance')
    .eq('id', personId)
    .single();
  if (error) throw error;
  return data.token_balance || 0;
}

export async function adjustTokenBalance(personId, amount, type, description, referenceId) {
  // Update cached balance
  const current = await getTokenBalance(personId);
  const newBalance = current + amount;
  const { error: upErr } = await supabase
    .from('people')
    .update({ token_balance: newBalance })
    .eq('id', personId);
  if (upErr) throw upErr;

  // Log transaction
  const row = { person_id: personId, amount, type, description };
  if (referenceId !== undefined) row.reference_id = referenceId;
  const { error: txErr } = await supabase
    .from('token_transactions')
    .insert(row);
  if (txErr) throw txErr;

  return newBalance;
}

export async function getTokenTransactions(personId) {
  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function getChoreByName(name) {
  const { data, error } = await supabase
    .from('chores')
    .select('*')
    .eq('name', name)
    .single();
  if (error) throw error;
  return data;
}

export async function updateChoreTokenValue(id, tokenValue) {
  const { error } = await supabase
    .from('chores')
    .update({ token_value: tokenValue })
    .eq('id', id);
  if (error) throw error;
}

// ---- Rewards Functions ----

export async function getAllRewards() {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

export async function addReward(name, tokenCost) {
  const { error } = await supabase
    .from('rewards')
    .insert({ name, token_cost: tokenCost });
  if (error) throw error;
}

export async function updateReward(id, fields) {
  const updates = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.token_cost !== undefined) updates.token_cost = fields.token_cost;
  if (fields.active !== undefined) updates.active = fields.active;
  const { error } = await supabase.from('rewards').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteReward(id) {
  const { error } = await supabase.from('rewards').delete().eq('id', id);
  if (error) throw error;
}

export async function redeemReward(personId, rewardId) {
  // Look up reward
  const { data: reward, error: rErr } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single();
  if (rErr) throw rErr;
  if (!reward || !reward.active) throw new Error('Reward not found or inactive');

  // Check balance
  const balance = await getTokenBalance(personId);
  if (balance < reward.token_cost) throw new Error('Insufficient tokens');

  // Deduct tokens
  await adjustTokenBalance(
    personId,
    -reward.token_cost,
    'redemption',
    `Redeemed: ${reward.name}`,
    rewardId
  );

  // Log redemption
  const { error: redErr } = await supabase
    .from('reward_redemptions')
    .insert({ person_id: personId, reward_id: rewardId, token_cost: reward.token_cost });
  if (redErr) throw redErr;

  return { reward: reward.name, cost: reward.token_cost };
}

// ---- Punishment Functions ----

export async function getAllPunishmentItems() {
  const { data, error } = await supabase
    .from('punishment_items')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

export async function addPunishmentItem(name, tokenDeduction) {
  const { error } = await supabase
    .from('punishment_items')
    .insert({ name, token_deduction: tokenDeduction || 0 });
  if (error) throw error;
}

export async function updatePunishmentItem(id, fields) {
  const updates = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.token_deduction !== undefined) updates.token_deduction = fields.token_deduction;
  if (fields.active !== undefined) updates.active = fields.active;
  const { error } = await supabase.from('punishment_items').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deletePunishmentItem(id) {
  const { error } = await supabase.from('punishment_items').delete().eq('id', id);
  if (error) throw error;
}

// ---- Notification Schedule Functions ----

export async function getNotificationSchedule() {
  const { data, error } = await supabase
    .from('notification_schedule')
    .select('*')
    .order('time');
  if (error) throw error;
  return data;
}

export function getEligibleScheduleEntries(schedule, currentHours, currentMinutes) {
  const currentMinuteOfDay = currentHours * 60 + currentMinutes;
  return schedule.filter((entry) => {
    const [h, m] = entry.time.split(':').map(Number);
    const entryMinuteOfDay = h * 60 + m;
    const diff = currentMinuteOfDay - entryMinuteOfDay;
    if (diff < 0) return false;
    if (diff > 120) return false;
    const interval = entry.repeat_interval || 0;
    if (interval === 0) return diff === 0;
    return diff % interval === 0;
  });
}

export async function addNotificationTime(time, title, body, repeatInterval) {
  const row = { time };
  if (title) row.title = title;
  if (body) row.body = body;
  if (repeatInterval !== undefined) row.repeat_interval = repeatInterval;
  const { error } = await supabase
    .from('notification_schedule')
    .insert(row);
  if (error) throw error;
}

export async function updateNotificationMessage(id, title, body, repeatInterval) {
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (body !== undefined) updates.body = body;
  if (repeatInterval !== undefined) updates.repeat_interval = repeatInterval;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase
    .from('notification_schedule')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNotificationTime(id) {
  const { error } = await supabase
    .from('notification_schedule')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function hasNotificationBeenSent(timeSlot, date) {
  const { data, error } = await supabase
    .from('notification_sent')
    .select('id')
    .eq('time_slot', timeSlot)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function markNotificationSent(timeSlot, date, reminded) {
  const { error } = await supabase
    .from('notification_sent')
    .insert({ time_slot: timeSlot, date, reminded });
  if (error) throw error;
}

export async function logPunishment(personId, punishmentItemId, dateStr) {
  // Look up punishment item
  const { data: item, error: iErr } = await supabase
    .from('punishment_items')
    .select('*')
    .eq('id', punishmentItemId)
    .single();
  if (iErr) throw iErr;

  const deduction = item.token_deduction || 0;

  // Deduct tokens if applicable
  if (deduction > 0) {
    await adjustTokenBalance(
      personId,
      -deduction,
      'punishment',
      `Punishment: ${item.name}`,
      punishmentItemId
    );
  }

  // Log punishment
  const { error: logErr } = await supabase
    .from('punishment_log')
    .insert({
      person_id: personId,
      punishment_item_id: punishmentItemId,
      token_deduction: deduction,
      date: dateStr,
    });
  if (logErr) throw logErr;

  return { punishment: item.name, deduction };
}
