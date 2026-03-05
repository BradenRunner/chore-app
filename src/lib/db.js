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

  const { data: punishments, error: punErr } = await supabase
    .from('punishment_log')
    .select('person_id')
    .eq('date', dateStr);
  if (punErr) throw punErr;

  const punishedSet = new Set(punishments.map((p) => p.person_id));

  return people.map((person) => {
    const personCompletions = completions.filter((c) => c.person_id === person.id);
    const skip = skips.find((s) => s.person_id === person.id);
    const hasSkip = !!skip;
    const skipVoteResult = skip?.vote_result || null;
    // done = has completions OR (has skip AND vote not rejected)
    const done = personCompletions.length > 0 || (hasSkip && skipVoteResult !== 'invalid');
    return {
      id: person.id,
      name: person.name,
      ntfy_topic: person.ntfy_topic,
      token_balance: person.token_balance || 0,
      done,
      completions: personCompletions.map((c) => ({
        id: c.id,
        description: c.description,
      })),
      skipReason: skip?.reason || null,
      skipReasonId: skip?.id || null,
      skipVoteResult,
      punishedToday: punishedSet.has(person.id),
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
  // Check if there's an existing skip reason (for vote reset)
  const { data: existing } = await supabase
    .from('skip_reasons')
    .select('id')
    .eq('person_id', personId)
    .eq('date', dateStr)
    .maybeSingle();

  const { error } = await supabase
    .from('skip_reasons')
    .upsert(
      { person_id: personId, date: dateStr, reason, vote_result: null },
      { onConflict: 'person_id,date' }
    );
  if (error) throw error;

  // If re-submitting, delete existing votes so voting restarts
  if (existing) {
    await supabase
      .from('skip_votes')
      .delete()
      .eq('skip_reason_id', existing.id);
  }
}

// ---- Skip Vote Functions ----

export async function castSkipVote(skipReasonId, voterId, vote) {
  const { error } = await supabase
    .from('skip_votes')
    .upsert(
      { skip_reason_id: skipReasonId, voter_id: voterId, vote },
      { onConflict: 'skip_reason_id,voter_id' }
    );
  if (error) throw error;

  // Auto-resolve if all votes are in
  return resolveSkipVoteIfComplete(skipReasonId);
}

export async function resolveSkipVoteIfComplete(skipReasonId) {
  // Get the skip reason to find the skipper
  const { data: skipReason, error: srErr } = await supabase
    .from('skip_reasons')
    .select('*')
    .eq('id', skipReasonId)
    .single();
  if (srErr) throw srErr;

  // Get all people (eligible voters = everyone except the skipper)
  const { data: allPeople, error: pErr } = await supabase
    .from('people')
    .select('id')
    .order('id');
  if (pErr) throw pErr;

  const eligibleVoters = allPeople.filter((p) => p.id !== skipReason.person_id);

  // Get current votes
  const { data: votes, error: vErr } = await supabase
    .from('skip_votes')
    .select('*')
    .eq('skip_reason_id', skipReasonId);
  if (vErr) throw vErr;

  // Check if all eligible voters have voted
  if (votes.length < eligibleVoters.length) {
    return { resolved: false, votesIn: votes.length, totalVoters: eligibleVoters.length };
  }

  // All votes in — tally
  const invalidCount = votes.filter((v) => v.vote === 'invalid').length;
  const validCount = votes.filter((v) => v.vote === 'valid').length;
  // invalid > valid → 'invalid', else → 'valid' (ties = valid)
  const result = invalidCount > validCount ? 'invalid' : 'valid';

  // Cache result
  const { error: upErr } = await supabase
    .from('skip_reasons')
    .update({ vote_result: result })
    .eq('id', skipReasonId);
  if (upErr) throw upErr;

  return { resolved: true, result, validCount, invalidCount };
}

export async function getPendingSkipVotesForVoter(voterId, dateStr) {
  // Get today's skip reasons from OTHER people that are still unresolved
  const { data: skips, error: sErr } = await supabase
    .from('skip_reasons')
    .select('*, people(name)')
    .eq('date', dateStr)
    .is('vote_result', null)
    .neq('person_id', voterId);
  if (sErr) throw sErr;

  // Get this voter's existing votes
  const skipIds = skips.map((s) => s.id);
  if (skipIds.length === 0) return [];

  const { data: existingVotes, error: vErr } = await supabase
    .from('skip_votes')
    .select('skip_reason_id')
    .eq('voter_id', voterId)
    .in('skip_reason_id', skipIds);
  if (vErr) throw vErr;

  const votedSet = new Set(existingVotes.map((v) => v.skip_reason_id));

  // Return only skips this voter hasn't voted on yet
  return skips
    .filter((s) => !votedSet.has(s.id))
    .map((s) => ({
      id: s.id,
      personName: s.people.name,
      reason: s.reason,
      date: s.date,
    }));
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

export async function updateChoreName(id, name) {
  const { error } = await supabase
    .from('chores')
    .update({ name })
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

// ---- Supply Functions ----

export async function getAllSupplies() {
  const { data, error } = await supabase
    .from('supplies')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

export async function addSupply(name, daysDuration, alertDaysBefore, alertIntervalDays) {
  const row = { name, days_duration: daysDuration };
  if (alertDaysBefore !== undefined) row.alert_days_before = alertDaysBefore;
  if (alertIntervalDays !== undefined) row.alert_interval_days = alertIntervalDays;
  const { error } = await supabase.from('supplies').insert(row);
  if (error) throw error;
}

export async function updateSupply(id, fields) {
  const updates = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.days_duration !== undefined) updates.days_duration = fields.days_duration;
  if (fields.alert_days_before !== undefined) updates.alert_days_before = fields.alert_days_before;
  if (fields.alert_interval_days !== undefined) updates.alert_interval_days = fields.alert_interval_days;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from('supplies').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteSupply(id) {
  const { error } = await supabase.from('supplies').delete().eq('id', id);
  if (error) throw error;
}

export async function restockSupply(id) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('supplies')
    .update({ last_restocked: today, last_alert_date: null })
    .eq('id', id);
  if (error) throw error;
}

export async function getSuppliesDueForAlert(todayStr) {
  const { data, error } = await supabase
    .from('supplies')
    .select('*');
  if (error) throw error;

  const today = new Date(todayStr + 'T00:00:00');
  return data.filter((s) => {
    const emptyDate = new Date(s.last_restocked + 'T00:00:00');
    emptyDate.setDate(emptyDate.getDate() + s.days_duration);
    const alertStartDate = new Date(emptyDate);
    alertStartDate.setDate(alertStartDate.getDate() - s.alert_days_before);

    if (today < alertStartDate) return false;

    if (s.last_alert_date) {
      const lastAlert = new Date(s.last_alert_date + 'T00:00:00');
      const nextAlertDate = new Date(lastAlert);
      nextAlertDate.setDate(nextAlertDate.getDate() + s.alert_interval_days);
      if (today < nextAlertDate) return false;
    }

    return true;
  });
}

export async function markSupplyAlerted(id, dateStr) {
  const { error } = await supabase
    .from('supplies')
    .update({ last_alert_date: dateStr })
    .eq('id', id);
  if (error) throw error;
}

// ---- Meal Functions ----

export async function getMealsForWeek(weekOf) {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('week_of', weekOf)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addMeal(name, link, weekOf, addedBy) {
  const row = { name, week_of: weekOf };
  if (link) row.link = link;
  if (addedBy) row.added_by = addedBy;
  const { error } = await supabase.from('meals').insert(row);
  if (error) throw error;
}

export async function updateMeal(id, fields) {
  const updates = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.link !== undefined) updates.link = fields.link;
  if (fields.cooked !== undefined) updates.cooked = fields.cooked;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from('meals').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteMeal(id) {
  const { error } = await supabase.from('meals').delete().eq('id', id);
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

// ---- House Zone Functions ----

export async function getAllZones() {
  const { data, error } = await supabase
    .from('house_zones')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function updateZoneGridCells(id, gridCells) {
  const { error } = await supabase
    .from('house_zones')
    .update({ grid_cells: gridCells })
    .eq('id', id);
  if (error) throw error;
}

export async function getLatestZoneCompletions(choreType) {
  const { data: zones, error: zErr } = await supabase
    .from('house_zones')
    .select('*')
    .order('sort_order');
  if (zErr) throw zErr;

  const { data: completions, error: cErr } = await supabase
    .from('zone_completions')
    .select('zone_id, date')
    .eq('chore_type', choreType)
    .order('date', { ascending: false });
  if (cErr) throw cErr;

  // Build map of zone_id -> most recent date
  const latestMap = {};
  for (const c of completions) {
    if (!latestMap[c.zone_id]) {
      latestMap[c.zone_id] = c.date;
    }
  }

  return zones.map((z) => ({
    ...z,
    lastCleaned: latestMap[z.id] || null,
  }));
}

export async function logZoneCompletions(zoneIds, choreType, personId, dateStr) {
  const rows = zoneIds.map((zoneId) => ({
    zone_id: zoneId,
    chore_type: choreType,
    person_id: personId,
    date: dateStr,
  }));
  const { error } = await supabase.from('zone_completions').insert(rows);
  if (error) throw error;
}
