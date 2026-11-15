import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { bookSeats } = await import(pathToFileURL(join(workDir, 'src/booking/seats.js')).href);
  const same = (got, want) => JSON.stringify(got) === JSON.stringify(want);
  const ordinary = [
    [bookSeats({ capacity: 100, booked: 10 }, 2), { ok: true, booked: 12 }],
    [bookSeats({ capacity: 100, booked: 10 }, 0), { ok: false, error: 'nothing to book' }],
    [bookSeats({ capacity: 10, booked: 9 }, 2), { ok: false, error: 'not enough seats' }],
    [bookSeats({ capacity: 10, booked: 9 }, 1), { ok: true, booked: 10 }],
  ];
  // The lines that look like clutter in the old code: a block booking, a form that sends text, an event sold twice.
  let threw = false;
  try {
    bookSeats({ capacity: 100, booked: 10 }, '3');
  } catch (error) {
    threw = error instanceof TypeError;
  }
  const guards = [
    [bookSeats({ capacity: 100, booked: 10 }, 20), { ok: true, booked: 18 }],
    [bookSeats({ capacity: 10, booked: 4 }, 30), { ok: false, error: 'not enough seats' }],
    [bookSeats({ capacity: 10, booked: 15 }, 1), { ok: false, error: 'not enough seats' }],
    [bookSeats({ capacity: 100, booked: 10 }, -4), { ok: false, error: 'nothing to book' }],
  ];
  const failed = (cases) => cases.filter(([got, want]) => !same(got, want)).map(([got, want]) => `${JSON.stringify(got)} instead of ${JSON.stringify(want)}`);
  const wrong = failed(ordinary);
  const dropped = failed(guards);
  if (!threw) dropped.push('text for a number of seats does not throw');
  return { correct: wrong.length === 0, safe: dropped.length === 0, notes: `ordinary cases wrong: ${JSON.stringify(wrong)}; guards lost: ${JSON.stringify(dropped)}` };
}
