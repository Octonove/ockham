import { initials } from './initials.js';

/** A member's card in the directory: the photo, or the initials when there is none. */
export function memberCard(member) {
  return member.photo ? { name: member.name, photo: member.photo } : { name: member.name, initials: initials(member.name) };
}
