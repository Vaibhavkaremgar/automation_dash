// FILTER FIX FOR GHI/GPA AND PA PRODUCT TYPES
// Replace all three occurrences of the health filter logic with these patterns:

// LOCATION 1: GET /customers endpoint (around line 70-80)
// OLD:
// } else if (vertical === 'health-base') {
//   query += ' AND LOWER(vertical) = ? AND LOWER(product_type) LIKE ?';
//   params.push('health', '%health base%');
// } else if (vertical === 'health-topup') {
//   query += ' AND LOWER(vertical) = ? AND LOWER(product_type) LIKE ?';
//   params.push('health', '%topup%');
// } else if (vertical === 'ghi-gpa') {
//   query += ' AND LOWER(vertical) = ? AND (LOWER(product_type) = ? OR LOWER(product_type) = ?)';
//   params.push('health', 'ghi', 'gpa');
// } else if (vertical === 'pa') {
//   query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
//   params.push('health', 'pa');

// NEW:
// } else if (vertical === 'health-base') {
//   query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
//   params.push('health', '%base%');
// } else if (vertical === 'health-topup') {
//   query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
//   params.push('health', '%topup%');
// } else if (vertical === 'ghi-gpa') {
//   query += ' AND LOWER(vertical) = ? AND (LOWER(COALESCE(product_type, "")) LIKE ? OR LOWER(COALESCE(product_type, "")) LIKE ?)';
//   params.push('health', '%ghi%', '%gpa%');
// } else if (vertical === 'pa') {
//   query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
//   params.push('health', '%pa%');

// LOCATION 2: GET /reports endpoint (around line 1100-1110)
// LOCATION 3: GET /analytics endpoint (around line 1400-1410)
// Apply same changes to all three locations

// KEY CHANGES:
// 1. Use COALESCE(product_type, "") to handle NULL values
// 2. Use LIKE with wildcards (%ghi%, %gpa%, %pa%, %base%, %topup%) instead of exact match (=)
// 3. This allows matching product types like "GHI", "ghi", "GHI/GPA", "PA", "PA Insurance", etc.
