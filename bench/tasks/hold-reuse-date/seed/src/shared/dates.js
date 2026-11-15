const MADRID = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * A date as every page shows it: 05/03/2026. Takes a Date or an ISO string.
 * The day is the one it is in Madrid, where the shop is, not the one on the server's clock.
 */
export function formatDate(value) {
  const parts = MADRID.formatToParts(value instanceof Date ? value : new Date(value));
  const pick = (type) => parts.find((part) => part.type === type).value;
  return `${pick('day')}/${pick('month')}/${pick('year')}`;
}
