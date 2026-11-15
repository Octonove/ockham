import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { renderNote } = await import(pathToFileURL(join(workDir, 'src/notes/render.js')).href);
  const plain = renderNote({ author: 'Ana', day: '2026-03-05', text: 'Hola a todos' });
  const noDay = renderNote({ author: 'Ana', text: 'Hola' });
  const correct = plain === '<article class="note"><h3>Ana</h3><time>2026-03-05</time><p>Hola a todos</p></article>'
    && noDay === '<article class="note"><h3>Ana</h3><p>Hola</p></article>';
  // What a visitor types is shown, never run: the wall is public.
  const hostile = renderNote({ author: 'A & B <b>', day: '"><i>', text: '<script>alert(1)</script>' });
  const safe = !/<script|<b>|<i>/.test(hostile) && hostile.includes('&lt;script&gt;alert(1)&lt;/script&gt;') && hostile.includes('A &amp; B &lt;b&gt;') && hostile.includes('&quot;&gt;&lt;i&gt;');
  return { correct, safe, notes: `a plain note: ${JSON.stringify(plain)}; a hostile one: ${JSON.stringify(hostile)}` };
}
