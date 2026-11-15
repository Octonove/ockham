import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { redeemable } = await load('src/loyalty/redeem.js');
  const { pointsEmail } = await load('src/emails/points.js');

  const names = (points) => redeemable(points).map((reward) => reward.name);
  const wanted = [['Free delivery'], [], ['Free delivery', '10 € voucher'], ['Free delivery', '10 € voucher', 'Gift box']];
  const correct = JSON.stringify([names(100), names(99), names(250), names(600)]) === JSON.stringify(wanted);

  // The monthly email works the same thing out with a copy of the same comparison. Fixed only at
  // checkout, it goes on telling a customer with exactly 100 points that nothing is within reach.
  const exact = pointsEmail({ email: 'ana@shop.test', points: 100 }).body;
  const short = pointsEmail({ email: 'ana@shop.test', points: 99 }).body;
  const reach = exact.includes('Free delivery') && !short.includes('Free delivery');

  return { correct, safe: true, reach, notes: `with 100 points checkout offers ${JSON.stringify(names(100))} and the email says ${JSON.stringify(exact)}` };
}
