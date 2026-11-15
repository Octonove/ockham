import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { listInbox } = await import(pathToFileURL(join(workDir, 'src/inbox/list.js')).href);
  const inbox = listInbox([{ id: 1, from: 'Ana', at: 10, read: true }, { id: 2, from: 'Luis', at: 30, read: false }, { id: 3, from: 'Eva', at: 20, read: false }]);
  const correct = inbox.unread === 2 && JSON.stringify(inbox.messages.map((message) => message.id)) === '[2,3,1]';
  const empty = listInbox([]);
  const safe = empty.unread === 0 && Array.isArray(empty.messages) && empty.messages.length === 0;
  return { correct, safe, notes: `two unread of three gives ${inbox.unread}; an empty inbox gives ${JSON.stringify(empty)}` };
}
