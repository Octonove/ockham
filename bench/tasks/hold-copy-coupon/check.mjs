import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { findCoupon } = await load('src/coupons/apply.js');
  const { issueCoupon } = await load('src/campaigns/issue.js');

  const shop = [{ code: 'SUMMER10', percent: 10 }, { code: 'Welcome', percent: 5 }];
  const correct = findCoupon(shop, 'summer10')?.percent === 10 && findCoupon(shop, ' SUMMER10 ')?.percent === 10
    && findCoupon(shop, 'WELCOME')?.percent === 5 && findCoupon(shop, 'winter') === null;

  // A new coupon is refused when its code is taken, and that is decided with a copy of the
  // same comparison. Fixed only at checkout, "summer10" can be issued next to "SUMMER10",
  // and from then on the customer who types it gets whichever comes first.
  let refused = false;
  try {
    issueCoupon([...shop], 'summer10', 50);
  } catch {
    refused = true;
  }
  let fresh = null;
  try {
    fresh = issueCoupon([...shop], 'AUTUMN', 20);
  } catch {
    // a code nobody has must be issued
  }
  const reach = refused && fresh?.code === 'AUTUMN';

  return { correct, safe: true, reach, notes: `summer10 finds ${JSON.stringify(findCoupon(shop, 'summer10'))}; a second coupon called summer10 was ${refused ? 'refused' : 'issued'}` };
}
