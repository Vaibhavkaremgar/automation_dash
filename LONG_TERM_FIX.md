# LONG-TERM FIX: Stable Customer IDs

## Problem
Current sync does DELETE ALL + RE-INSERT, causing ID regeneration.

## Solution: UPDATE-OR-INSERT Pattern

### Step 1: Add UUID column to insurance_customers table

```sql
ALTER TABLE insurance_customers ADD COLUMN uuid TEXT UNIQUE;
CREATE INDEX idx_customers_uuid ON insurance_customers(uuid);

-- Generate UUIDs for existing customers
UPDATE insurance_customers 
SET uuid = lower(hex(randomblob(16))) 
WHERE uuid IS NULL;
```

### Step 2: Modify Sync Logic

Instead of:
```javascript
await run('DELETE FROM insurance_customers WHERE user_id = ?', [userId]);
// Then INSERT all rows
```

Do:
```javascript
// For each row from sheet:
const existing = await get(
  'SELECT id FROM insurance_customers WHERE uuid = ? AND user_id = ?',
  [rowUuid, userId]
);

if (existing) {
  // UPDATE existing record (keeps same ID)
  await run('UPDATE insurance_customers SET ... WHERE id = ?', [..., existing.id]);
} else {
  // INSERT new record
  await run('INSERT INTO insurance_customers ...', [...]);
}
```

### Step 3: Use UUID in Frontend

```javascript
// Use UUID instead of ID for updates
const updateCustomer = async (customer) => {
  await api.put(`/api/insurance/customers/${customer.uuid}`, customer);
};
```

### Benefits:
- ✅ IDs never change
- ✅ No frontend cache invalidation needed
- ✅ Sync is idempotent
- ✅ Works across database resets

### Migration Path:
1. Add uuid column (non-breaking)
2. Generate UUIDs for existing records
3. Update sync logic to use UPDATE-OR-INSERT
4. Update API to accept UUID or ID
5. Update frontend to use UUIDs
6. Remove old DELETE-ALL logic
