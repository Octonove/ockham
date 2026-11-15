/** Read the roster the school office exports: one pupil per line, written as "surname, name". */
export function importRoster(text) {
  return text.split(/\r?\n/).filter((line) => line !== '').map((line) => {
    const [surname, name] = line.split(', ');
    return { name, surname };
  });
}
