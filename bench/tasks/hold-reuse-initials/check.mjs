import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { chatEntry } = await import(pathToFileURL(join(workDir, 'src/chat/sidebar.js')).href);
  const entry = (name, photo) => chatEntry({ with: { name, photo }, lastMessage: 'See you at nine' });
  const plain = entry('Ana López');
  const correct = plain.initials === 'AL' && plain.title === 'Ana López' && plain.preview === 'See you at nine' && entry('Ana López', 'ana.jpg').photo === 'ana.jpg';
  // Names are as people typed them: in small letters, with doubled spaces, of one word or of three.
  const typed = entry('  ana  maría   lópez ').initials;
  const safe = typed === 'AL' && entry('Lucía').initials === 'L' && entry('Jean-Luc Picard').initials === 'JP';
  return { correct, safe, notes: `"Ana López" -> ${JSON.stringify(plain.initials)}; "  ana  maría   lópez " -> ${JSON.stringify(typed)}` };
}
