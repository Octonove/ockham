// event: { capacity, booked }, both counts of seats
// seats: how many seats the customer asked for
// Gives { ok: true, booked } with the event's new count, or { ok: false, error }.
export function bookSeats(event, seats) {
  var result;
  if (typeof seats !== 'number') {
    throw new TypeError('seats must be a number');
  }
  var wanted = seats;
  if (wanted < 1) {
    result = { ok: false, error: 'nothing to book' };
    return result;
  } else {
    if (wanted > 8) {
      wanted = 8;
    }
    var free = event.capacity - event.booked;
    if (free < 0) {
      free = 0;
    }
    if (wanted > free) {
      result = { ok: false, error: 'not enough seats' };
      return result;
    } else {
      result = { ok: true, booked: event.booked + wanted };
      return result;
    }
  }
}
