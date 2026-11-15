/** A copy of the settings for the editor to change; the real ones only change on Save. */
export function createDraft(settings) {
  return structuredClone(settings);
}
