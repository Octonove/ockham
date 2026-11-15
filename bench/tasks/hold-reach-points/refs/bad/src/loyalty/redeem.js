export const REWARDS = [
  { name: 'Free delivery', cost: 100 },
  { name: '10 € voucher', cost: 250 },
  { name: 'Gift box', cost: 600 },
];

/** The rewards a customer can pay for at checkout with the points they have. */
export function redeemable(points) {
  return REWARDS.filter((reward) => points >= reward.cost);
}
