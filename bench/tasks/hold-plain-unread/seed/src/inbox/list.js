/** What the inbox page shows: the messages, newest first. A message is { id, from, at, read }. */
export function listInbox(messages) {
  const sorted = [...messages].sort((a, b) => b.at - a.at);
  return { messages: sorted };
}
