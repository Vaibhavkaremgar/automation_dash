// Helper function to apply vertical filters
function applyVerticalFilter(query, params, vertical) {
  if (!vertical || vertical === 'all') return query;
  
  if (vertical === 'general' || vertical === 'general-all') {
    query += ' AND LOWER(vertical) IN (?, ?, ?)';
    params.push('motor', 'health', 'non-motor');
  } else if (vertical === 'motor-all' || vertical === 'motor') {
    query += ' AND LOWER(vertical) = ?';
    params.push('motor');
  } else if (vertical === '2-wheeler') {
    query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
    params.push('motor', '%2%');
  } else if (vertical === '4-wheeler') {
    query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
    params.push('motor', '%4%');
  } else if (vertical === 'health-all') {
    query += ' AND LOWER(vertical) = ?';
    params.push('health');
  } else if (vertical === 'health-base') {
    query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) = ?';
    params.push('health', 'health base');
  } else if (vertical === 'health-topup') {
    query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) = ?';
    params.push('health', 'topup');
  } else if (vertical === 'health-pa') {
    query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) = ?';
    params.push('health', 'pa');
  } else if (vertical === 'health-ghi-gpa') {
    query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) IN (?, ?)';
    params.push('health', 'ghi', 'gpa');
  } else if (vertical === 'health') {
    query += ' AND LOWER(vertical) = ?';
    params.push('health');
  } else if (vertical === 'non-motor-all' || vertical === 'non-motor') {
    query += ' AND LOWER(vertical) = ?';
    params.push('non-motor');
  } else if (vertical === 'marine') {
    query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
    params.push('non-motor', 'marine');
  } else if (vertical === 'fire') {
    query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
    params.push('non-motor', 'fire');
  } else if (vertical === 'burglary') {
    query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
    params.push('non-motor', 'burglary');
  } else if (vertical === 'non-motor-others') {
    query += ' AND LOWER(vertical) = ? AND LOWER(product_type) NOT IN (?, ?, ?)';
    params.push('non-motor', 'marine', 'fire', 'burglary');
  } else if (vertical === 'life') {
    query += ' AND LOWER(vertical) = ?';
    params.push('life');
  } else {
    query += ' AND LOWER(vertical) = ?';
    params.push(vertical.toLowerCase());
  }
  
  return query;
}

module.exports = { applyVerticalFilter };
