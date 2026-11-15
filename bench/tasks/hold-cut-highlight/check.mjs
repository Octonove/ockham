import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { highlight } = await import(pathToFileURL(join(workDir, 'src/search/highlight.js')).href);
  const plain = highlight('Red shoes and red hats', 'red');
  const correct = plain === '<mark>Red</mark> shoes and <mark>red</mark> hats' && highlight('Blue hat', 'green') === 'Blue hat';

  // What people type in a search box has dots, pluses and brackets in it, and sometimes nothing at all.
  const cases = [
    ['C++ and c++ books', 'c++', '<mark>C++</mark> and <mark>c++</mark> books'],
    ['v1.5 and v125', '1.5', 'v<mark>1.5</mark> and v125'],
    ['Size (L) only', '(L)', 'Size <mark>(L)</mark> only'],
    ['Blue hat', '', 'Blue hat'],
  ];
  const broken = cases.filter(([text, term, wanted]) => {
    try {
      return highlight(text, term) !== wanted;
    } catch {
      return true;
    }
  }).map(([, term]) => term);
  return { correct, safe: broken.length === 0, notes: broken.length ? `wrong or crashed for the terms ${JSON.stringify(broken)}` : 'every odd term was marked as typed' };
}
