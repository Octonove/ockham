/** Whether someone born on `birth` may open an account on the day `today`. Both are Dates. The shop sells to adults only. */
export function oldEnough(birth, today) {
  const years = today.getFullYear() - birth.getFullYear();
  const hadBirthday = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  return (hadBirthday ? years : years - 1) >= 18;
}
