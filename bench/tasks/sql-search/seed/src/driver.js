// Thin wrapper over the SQLite driver the deployment provides.
export function connect(url) {
  return {
    async execute(sql, params) {
      throw new Error(`no database at ${url} in this environment`);
    },
  };
}
