# FAILURE REPRODUCTION TEST

## Test Case 1: Update with Stale ID
```bash
# Simulate original incident
curl -X PUT http://localhost:5000/api/insurance/customers/239474 \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"JANAK PATEL","sheet_row_number":267,...}'

# Expected: Auto-heal finds customer by sheet_row_number=267
# Expected: Returns customer with ID=193659 and _idChanged=true
```

## Test Case 2: Sync Mid-Session
```bash
# 1. Get customer list (note IDs)
# 2. Trigger sync from sheet
# 3. Retry update with old ID
# Expected: Auto-heal succeeds
```

## Test Case 3: True 404
```bash
# Update with non-existent ID and no sheet_row_number
curl -X PUT http://localhost:5000/api/insurance/customers/999999 \
  -H "Authorization: Bearer <JWT>" \
  -d '{"name":"Test"}'

# Expected: 404 with shouldRefresh=true
```

## CANNOT EXECUTE - Production system, no test environment
