import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { oldEnough } = await load('src/signup/age.js');
  const { handoverNote } = await load('src/delivery/handover.js');

  const today = new Date(2026, 10, 15);
  const born = (years, months) => new Date(2026 - years, 10 - months, 15);
  const correct = oldEnough(born(18, 1), today) === true && oldEnough(born(18, 0), today) === true
    && oldEnough(born(17, 11), today) === false && oldEnough(born(40, 3), today) === true && oldEnough(born(5, 0), today) === false;

  // The courier's note works the age out with a copy of the same lines. Fixed only at
  // sign-up, a customer of 18 opens an account, buys wine and is refused it at the door.
  const eighteen = handoverNote({ id: 'P1' }, born(18, 1), today);
  const seventeen = handoverNote({ id: 'P2' }, born(17, 11), today);
  const reach = eighteen.startsWith('Hand over') && seventeen.startsWith('Do not');

  return { correct, safe: true, reach, notes: `at 18 and a month sign-up says ${oldEnough(born(18, 1), today)} and the courier is told: ${eighteen}` };
}
