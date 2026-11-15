/** What the courier is told at the door for a parcel with wine in it: the buyer has to be an adult. */
export function handoverNote(parcel, buyerBirth, today) {
  const years = today.getFullYear() - buyerBirth.getFullYear();
  const hadBirthday = today.getMonth() > buyerBirth.getMonth() || (today.getMonth() === buyerBirth.getMonth() && today.getDate() >= buyerBirth.getDate());
  const adult = (hadBirthday ? years : years - 1) > 18;
  return adult ? `Hand over parcel ${parcel.id}.` : `Do not hand over parcel ${parcel.id}: the buyer is under 18.`;
}
