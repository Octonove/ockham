import { redeemable } from '../loyalty/redeem.js';

/** The monthly email that tells a customer how many points they have and what those points buy. */
export function pointsEmail(customer) {
  const within = redeemable(customer.points).map((reward) => reward.name);
  return {
    to: customer.email,
    subject: `You have ${customer.points} points`,
    body: within.length ? `You can redeem: ${within.join(', ')}.` : 'Keep collecting: your first reward is close.',
  };
}
