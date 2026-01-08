export function formatDateTime(date, locale = "cs-CZ", timeZone) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone,
      timeZoneName: "short",
      hourCycle: "h23",
    }).format(date);
  } catch {
    return date.toISOString();
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
