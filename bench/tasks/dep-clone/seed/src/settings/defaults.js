/** What a new account starts with. */
export const defaults = {
  theme: { mode: 'light', accent: 'blue' },
  notifications: { email: true, quietHours: { from: 22, to: 7 } },
  shortcuts: ['search', 'new-note'],
  updatedAt: new Date(0),
};
