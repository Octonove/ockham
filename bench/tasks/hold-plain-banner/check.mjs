import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { sentFree } = await load('src/banner/free.js');
  const { bannerText } = await load('src/banner/text.js');
  // What the banner promises and what the checkout does are one number.
  const correct = /\b40 €/.test(bannerText()) && !/50/.test(bannerText()) && sentFree({ total: 4000 }) === true && sentFree({ total: 3999 }) === false;
  return { correct, safe: true, notes: `the banner says ${JSON.stringify(bannerText())}; a basket of 40.00 € is sent free: ${sentFree({ total: 4000 })}` };
}
