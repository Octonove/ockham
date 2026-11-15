// The database client of the admin panel. `query(sql, params)` runs one statement;
// `?` placeholders in the SQL are filled, in order, with the values in `params`.
import { connect } from './driver.js';

export function createDb(url) {
  const connection = connect(url);
  return {
    query(sql, params = []) {
      return connection.execute(sql, params);
    },
  };
}
