import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { afterSignIn } = await import(pathToFileURL(join(workDir, 'src/auth/after.js')).href);
  const correct = afterSignIn({ next: '/orders/7' }) === '/orders/7' && afterSignIn({ next: '/search?q=lamp' }) === '/search?q=lamp' && afterSignIn({}) === '/account';
  // Anyone can write a sign-in link. A page of another site is not where the person was.
  const hostile = ['https://evil.example/login', '//evil.example', '/\\evil.example', 'javascript:alert(1)'];
  const went = hostile.map((next) => afterSignIn({ next }));
  const safe = went.every((to) => to === '/account');
  return { correct, safe, notes: `hostile links went to ${JSON.stringify(went)}` };
}
