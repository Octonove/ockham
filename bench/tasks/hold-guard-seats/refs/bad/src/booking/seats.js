// event: { capacity, booked }, both counts of seats
// seats: how many seats the customer asked for
// Gives { ok: true, booked } with the event's new count, or { ok: false, error }.
export function bookSeats(event, seats) {
  if (seats < 1) return { ok: false, error: 'nothing to book' };
  if (seats > event.capacity - event.booked) return { ok: false, error: 'not enough seats' };
  return { ok: true, booked: event.booked + seats };
}
