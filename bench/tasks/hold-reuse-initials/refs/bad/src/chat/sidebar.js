/** One entry of the chat list: who the chat is with, their photo if they have one, and the start of the last message. */
export function chatEntry(chat) {
  const entry = { title: chat.with.name, photo: chat.with.photo ?? null, preview: String(chat.lastMessage ?? '').slice(0, 60) };
  if (entry.photo) return entry;
  const initials = chat.with.name.split(' ').map((word) => word[0]).join('').toUpperCase();
  return { ...entry, initials };
}
