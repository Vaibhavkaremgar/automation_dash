## INSURANCE FILTER FIX - GHI/GPA and PA Product Types

### PROBLEM IDENTIFIED
The filter for GHI/GPA and PA health insurance product types is not working because:
1. Using exact match (=) instead of pattern match (LIKE)
2. Not handling NULL product_type values with COALESCE
3. Searching for exact values 'ghi', 'gpa', 'pa' but data may have 'GHI', 'GPA', 'PA' or variations

### SOLUTION
Replace all three filter locations in `/server/src/routes/insurance.js` with LIKE pattern matching and COALESCE.

### LOCATIONS TO FIX

#### LOCATION 1: GET /customers endpoint (Line ~80)
**FIND:**
```javascript
} else if (vertical === 'health-base') {
  query += ' AND LOWER(vertical) = ? AND LOWER(product_type) LIKE ?';
  params.push('health', '%health base%');
} else if (vertical === 'health-topup') {
  query += ' AND LOWER(vertical) = ? AND LOWER(product_type) LIKE ?';
  params.push('health', '%topup%');
} else if (vertical === 'ghi-gpa') {
  query += ' AND LOWER(vertical) = ? AND (LOWER(product_type) = ? OR LOWER(product_type) = ?)';
  params.push('health', 'ghi', 'gpa');
} else if (vertical === 'pa') {
  query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
  params.push('health', 'pa');
```

**REPLACE WITH:**
```javascript
} else if (vertical === 'health-base') {
  query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
  params.push('health', '%base%');
} else if (vertical === 'health-topup') {
  query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
  params.push('health', '%topup%');
} else if (vertical === 'ghi-gpa') {
  query += ' AND LOWER(vertical) = ? AND (LOWER(COALESCE(product_type, "")) LIKE ? OR LOWER(COALESCE(product_type, "")) LIKE ?)';
  params.push('health', '%ghi%', '%gpa%');
} else if (vertical === 'pa') {
  query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
  params.push('health', '%pa%');
```

#### LOCATION 2: GET /reports endpoint (Line ~1100)
**FIND:** Same pattern as above but with `whereClause +=` instead of `query +=`

**REPLACE WITH:** Same replacement but with `whereClause +=`

#### LOCATION 3: GET /analytics endpoint (Line ~1400)
**FIND:** Same pattern as above but with `whereClause +=` instead of `query +=`

**REPLACE WITH:** Same replacement but with `whereClause +=`

### KEY CHANGES EXPLAINED
1. **COALESCE(product_type, "")** - Handles NULL values by treating them as empty strings
2. **LIKE '%ghi%'** - Pattern matching instead of exact match, catches 'GHI', 'ghi', 'GHI/GPA', etc.
3. **LIKE '%base%'** - Catches 'Base', 'base', 'Health Base', etc.
4. **LIKE '%pa%'** - Catches 'PA', 'pa', 'PA Insurance', etc.

### RESULT
After applying these fixes:
- GHI/GPA filter will show all customers with product_type containing 'ghi' or 'gpa' (case-insensitive)
- PA filter will show all customers with product_type containing 'pa' (case-insensitive)
- Health Base filter will show all customers with product_type containing 'base'
- Health Topup filter will show all customers with product_type containing 'topup'
- All filters will work correctly in dashboard, reports, and analytics endpoints
