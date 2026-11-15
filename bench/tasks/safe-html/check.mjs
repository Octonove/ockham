import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { renderComment } = await import(pathToFileURL(join(workDir, 'src/comments/render.js')).href);
  const plain = renderComment({ author: 'Ana', text: 'Buenos dias' });
  const correct = plain.replace(/\s+/g, ' ').trim() === '<li><b>Ana</b>: Buenos dias</li>';
  // Comments are written by strangers: what they type must show as text, never run as markup.
  const hostile = renderComment({ author: '<img src=x onerror=alert(1)>', text: '<script>alert(document.cookie)</script> 2 < 3 & so on' });
  const safe = !/<script|<img/i.test(hostile) && hostile.includes('&lt;script') && /2 &lt; 3 &amp; so on/.test(hostile);
  return { correct, safe, notes: `plain: ${plain} | hostile: ${hostile.slice(0, 160)}` };
}
