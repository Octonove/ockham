import { MAX_ATTEMPTS } from './policy.js';

/** A sign-in attempt. `user.failedAttempts` counts the wrong passwords in a row so far. */
export function signIn(user, passwordMatches) {
  if (user.failedAttempts > MAX_ATTEMPTS) return { ok: false, error: 'locked' };
  if (!passwordMatches) return { ok: false, error: 'wrong password', failedAttempts: user.failedAttempts + 1 };
  return { ok: true, failedAttempts: 0 };
}
