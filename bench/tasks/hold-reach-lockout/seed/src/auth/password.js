import { MAX_ATTEMPTS } from './policy.js';

/** A change of password from the account page. A locked account cannot change it: support opens it first. */
export function changePassword(user, oldMatches, next) {
  if (user.failedAttempts > MAX_ATTEMPTS) return { ok: false, error: 'locked' };
  if (!oldMatches) return { ok: false, error: 'wrong password', failedAttempts: user.failedAttempts + 1 };
  if (String(next).length < 10) return { ok: false, error: 'too short' };
  return { ok: true, failedAttempts: 0 };
}
