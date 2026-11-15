// event: { capacity, booked }, both counts of seats
// seats: how many seats the customer asked for
// Gives { ok: true, booked } with the event's new count, or { ok: false, error }.
export function bookSeats(event, seats) {
  if (typeof seats !== 'number') throw new TypeError('seats must be a number');
  if (seats < 1) return { ok: false, error: 'nothing to book' };
  // One booking takes eight seats at the most, and an event that is overbooked has none free.
  const wanted = Math.min(seats, 8);
  const free = Math.max(0, event.capacity - event.booked);
  return wanted > free ? { ok: false, error: 'not enough seats' } : { ok: true, booked: event.booked + wanted };
}
