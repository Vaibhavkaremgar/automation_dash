function applyHealthFilter(whereClause, params, vertical) {
  if (vertical === 'health-all') {
    whereClause += ' AND LOWER(vertical) = ?';
    params.push('health');
  } else if (vertical === 'health-base') {
    whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) = ?';
    params.push('health', 'health base');
  } else if (vertical === 'health-topup') {
    whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) = ?';
    params.push('health', 'topup');
  } else if (vertical === 'health-pa') {
    whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) = ?';
    params.push('health', 'pa');
  } else if (vertical === 'health-ghi-gpa') {
    whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) IN (?, ?)';
    params.push('health', 'ghi', 'gpa');
  } else if (vertical === 'health') {
    whereClause += ' AND LOWER(vertical) = ?';
    params.push('health');
  }
  return { whereClause, params };
}

module.exports = { applyHealthFilter };
