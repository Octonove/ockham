import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { createDraft } = await import(pathToFileURL(join(workDir, 'src/settings/draft.js')).href);
  const saved = new Date('2026-03-04T05:06:07Z');
  const settings = {
    theme: { mode: 'light', accent: 'blue' },
    notifications: { email: true, quietHours: { from: 22, to: 7 } },
    shortcuts: ['search', 'new-note'],
    updatedAt: saved,
  };
  const draft = createDraft(settings);
  draft.theme.accent = 'red';
  draft.notifications.quietHours.from = 20;
  draft.shortcuts.push('print');
  const correct = settings.theme.accent === 'blue' && settings.notifications.quietHours.from === 22 && settings.shortcuts.length === 2
    && draft.theme.mode === 'light' && draft.notifications.email === true;
  // A date has to come out as a date: a copy made through JSON turns it into text.
  const safe = draft.updatedAt instanceof Date && draft.updatedAt.getTime() === saved.getTime() && draft.updatedAt !== saved;
  return { correct, safe, notes: `original accent ${settings.theme.accent}, quiet from ${settings.notifications.quietHours.from}, shortcuts ${settings.shortcuts.length}; the draft's date is a ${Object.prototype.toString.call(draft.updatedAt)}` };
}
