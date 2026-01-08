export function formatDateTimeHumanCZ(date, timeZone) {
  try {
    const dt = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dt.getTime())) return String(date);

    // Datum + čas: "7. února 2026 03:45"
    const dateTime = new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(dt);

    // Den v týdnu: "sobota"
    const weekday = new Intl.DateTimeFormat("cs-CZ", {
      weekday: "long",
      timeZone,
    }).format(dt);

    // Spojení s denním názvem v závorkách
    return `${dateTime} (${weekday})`;
  } catch {
    const fallback = date instanceof Date ? date : new Date(date);
    return fallback instanceof Date && !Number.isNaN(fallback.getTime())
        ? fallback.toISOString()
        : String(date);
  }
}

export function splitCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return { days, hours, minutes, seconds };
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}
