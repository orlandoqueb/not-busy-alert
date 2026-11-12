export const colors = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  text: '#1F2328',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#1A73E8',
  bar: '#8AB4F8',
  live: '#E8453C',
  good: '#188038',
};

export function busynessColor(score: number | null) {
  if (score == null) return colors.muted;
  if (score < 40) return colors.good;
  if (score < 70) return '#E37400';
  return colors.live;
}

// Day of week (0 = Sunday) and hour in a given IANA time zone.
export function localDayHour(timeZone: string | null) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone ?? undefined, weekday: 'short', hour: 'numeric', hour12: false,
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd), hour };
}
