/** The day that is `days` working days after `from`: Saturdays and Sundays do not count. Gives a new Date. */
export function addWorkingDays(from, days) {
  const date = new Date(from);
  for (let left = days; left > 0;) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) left--;
  }
  return date;
}
