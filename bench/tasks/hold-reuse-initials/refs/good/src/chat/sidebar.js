import { initials } from '../people/initials.js';

/** One entry of the chat list: who the chat is with, their photo if they have one, and the start of the last message. */
export function chatEntry(chat) {
  const entry = { title: chat.with.name, photo: chat.with.photo ?? null, preview: String(chat.lastMessage ?? '').slice(0, 60) };
  return entry.photo ? entry : { ...entry, initials: initials(chat.with.name) };
}
