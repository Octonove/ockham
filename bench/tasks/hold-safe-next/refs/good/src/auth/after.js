/** Where a person goes once signed in. `query` is the sign-in page's query, as an object. */
export function afterSignIn(query) {
  const next = typeof query?.next === 'string' ? query.next : '';
  // A path of this site only: browsers read "//host" and "/\host" as another site.
  return /^\/(?![/\\])/.test(next) ? next : '/account';
}
