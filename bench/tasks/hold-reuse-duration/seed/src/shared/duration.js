/**
 * A length of time as the app shows it everywhere: "45 s", "3 min 05 s", "1 h 05 min".
 * Takes seconds, which may come with decimals; from an hour up the seconds are left out.
 */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  if (minutes) return `${minutes} min ${String(rest).padStart(2, '0')} s`;
  return `${rest} s`;
}
