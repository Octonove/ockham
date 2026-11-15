import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const same = (got, wanted) => JSON.stringify(Object.entries(got ?? {}).sort()) === JSON.stringify(Object.entries(wanted).sort());

export async function check(workDir) {
  const { parseLabels } = await import(pathToFileURL(join(workDir, 'src/labels/parse.js')).href);
  const correct = same(parseLabels('cart.title = Your cart\ncart.empty = Nothing here yet'), { 'cart.title': 'Your cart', 'cart.empty': 'Nothing here yet' });

  // What translators really save: a text with an equals sign in it, a link with one, Windows line
  // ends, an empty line between groups, and one label typed with no spaces round the sign.
  const real = 'promo = Buy 2 = pay 1\r\n\r\nhelp.link=https://shop.test/help?from=cart\r\ncart.title = Your cart\r\n';
  let got;
  try {
    got = parseLabels(real);
  } catch (error) {
    got = { crashed: String(error) };
  }
  const safe = same(got, { promo: 'Buy 2 = pay 1', 'help.link': 'https://shop.test/help?from=cart', 'cart.title': 'Your cart' });
  return { correct, safe, notes: `the translators' file read as ${JSON.stringify(got)}` };
}
