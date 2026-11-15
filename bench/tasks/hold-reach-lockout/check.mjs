import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { signIn } = await load('src/auth/login.js');
  const { changePassword } = await load('src/auth/password.js');

  const correct = signIn({ failedAttempts: 5 }, true).error === 'locked' && signIn({ failedAttempts: 4 }, true).ok === true
    && signIn({ failedAttempts: 4 }, false).failedAttempts === 5 && signIn({ failedAttempts: 0 }, true).ok === true;

  // A change of password checks the lock with a copy of the same line. Fixed only at
  // sign-in, an account that is locked can still have its password changed.
  const reach = changePassword({ failedAttempts: 5 }, true, 'a much longer one').error === 'locked'
    && changePassword({ failedAttempts: 4 }, true, 'a much longer one').ok === true;

  return { correct, safe: true, reach, notes: `after 5 wrong passwords, sign-in says ${JSON.stringify(signIn({ failedAttempts: 5 }, true))} and a change of password says ${JSON.stringify(changePassword({ failedAttempts: 5 }, true, 'a much longer one'))}` };
}
