// order: { total } in cents
// discount: { type: 'percent' | 'fixed', value, expires } or nothing; expires is a 'YYYY-MM-DD' date or nothing
// today: a 'YYYY-MM-DD' date
export function applyDiscount(order, discount, today) {
  var result;
  var total = order.total;
  if (discount == null) {
    result = total;
    return result;
  } else {
    if (discount.expires != null) {
      if (today > discount.expires) {
        result = total;
        return result;
      }
    }
    if (discount.type == 'percent') {
      var pct = discount.value;
      if (pct > 100) {
        pct = 100;
      }
      if (pct < 0) {
        pct = 0;
      }
      var off = Math.round(total * pct / 100);
      result = total - off;
      return result;
    } else {
      if (discount.type == 'fixed') {
        var off2 = discount.value;
        if (off2 < 0) {
          off2 = 0;
        }
        result = total - off2;
        if (result < 0) {
          result = 0;
        }
        return result;
      } else {
        result = total;
        return result;
      }
    }
  }
}
