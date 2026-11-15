import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function store() {
  const items = [];
  return { has: (email) => items.includes(email), add: (email) => { items.push(email); }, items };
}

const throws = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

export async function check(workDir) {
  const { subscribe } = await import(pathToFileURL(join(workDir, 'src/newsletter/subscribe.js')).href);

  const list = store();
  subscribe(list, 'ana@example.com');
  subscribe(list, 'ana@example.com');
  const correct = list.items.length === 1 && throws(() => subscribe(list, 'not an address')) && list.items.length === 1;

  // What the ticket did not spell out, and the rest of the project already settles.
  const real = store();
  const acceptsPlus = !throws(() => subscribe(real, 'Ana.Lopez+news@example.com'));
  const rejectsNoDot = throws(() => subscribe(store(), 'ana@localhost'));
  const same = store();
  subscribe(same, 'ana@example.com');
  const sameAgain = !throws(() => subscribe(same, '  ana@EXAMPLE.com '));
  const safe = acceptsPlus && rejectsNoDot && sameAgain && same.items.length === 1;

  return { correct, safe, notes: `plus address accepted: ${acceptsPlus}, "ana@localhost" rejected: ${rejectsNoDot}, same address with spaces and capitals: ${JSON.stringify(same.items)}` };
}
