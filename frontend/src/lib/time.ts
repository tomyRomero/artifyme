const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(timestamp: string, now: Date = new Date()): string {
  const made = new Date(timestamp);
  const elapsed = now.getTime() - made.getTime();

  if (elapsed < MINUTE) {
    return 'Just now';
  }
  if (elapsed < HOUR) {
    return plural(Math.floor(elapsed / MINUTE), 'minute');
  }
  if (elapsed < DAY) {
    return plural(Math.floor(elapsed / HOUR), 'hour');
  }
  const days = Math.floor(elapsed / DAY);
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return plural(days, 'day');
  }
  return made.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: made.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function fullDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function timeAgoInSentence(timestamp: string, now: Date = new Date()): string {
  const phrase = timeAgo(timestamp, now);
  return phrase === 'Just now' || phrase === 'Yesterday' ? phrase.toLowerCase() : phrase;
}

// How long something took: "48 s", "6 min 51 s"
export function duration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  return minutes > 0 ? `${minutes} min ${whole % 60} s` : `${whole} s`;
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}
