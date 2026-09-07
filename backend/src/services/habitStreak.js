function utcDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(`${value}T00:00:00.000Z`);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const result = utcDate(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function isoWeekKey(date) {
  const value = utcDate(date);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((value - yearStart) / 86400000) + 1) / 7);
  return `${value.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function monthKey(date) {
  const value = utcDate(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousPeriod(period, frequency) {
  if (frequency === "daily") {
    return dayKey(addDays(utcDate(period), -1));
  }
  if (frequency === "monthly") {
    const [year, month] = period.split("-").map(Number);
    const previous = new Date(Date.UTC(year, month - 2, 1));
    return monthKey(previous);
  }
  const [year, week] = period.split("-").map(Number);
  if (week > 1) {
    return `${year}-${String(week - 1).padStart(2, "0")}`;
  }
  return isoWeekKey(new Date(Date.UTC(year - 1, 11, 28)));
}

function periodFor(date, frequency) {
  const normalizedDate = utcDate(date);
  if (frequency === "daily") return dayKey(normalizedDate);
  if (frequency === "monthly") return monthKey(normalizedDate);
  return isoWeekKey(normalizedDate);
}

function calculateCurrentStreak(logs, frequency) {
  if (!["daily", "weekly", "monthly"].includes(frequency)) {
    throw new TypeError("Unsupported habit frequency");
  }

  const sortedLogs = [...logs].sort((left, right) => utcDate(right.logDate) - utcDate(left.logDate));
  if (!sortedLogs.length) {
    return 0;
  }
  if (frequency === "daily" && sortedLogs[0].status !== "completed") {
    return 0;
  }

  const completedPeriods = new Set();
  for (const log of sortedLogs) {
    const period = periodFor(log.logDate, frequency);
    if (log.status === "completed") {
      completedPeriods.add(period);
    }
  }
  let currentPeriod = periodFor(sortedLogs[0].logDate, frequency);
  if (!completedPeriods.has(currentPeriod)) {
    return 0;
  }

  let streak = 0;
  while (completedPeriods.has(currentPeriod)) {
    streak += 1;
    currentPeriod = previousPeriod(currentPeriod, frequency);
  }
  return streak;
}

module.exports = { calculateCurrentStreak };
