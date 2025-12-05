# Change Password Feature & Admin Controls

## ✅ Features Implemented

### 1. **Client Change Password Permission**
- Added `can_change_password` column to users table (default: 1/enabled)
- Clients can only change password if permission is enabled
- Admins can always change their password regardless of permission

### 2. **Admin Permission Control**
- Admins can enable/disable password change for any client
- Permission control available in Admin Dashboard → Users
- Update via PATCH `/api/admin/users/:id` with `can_change_password: true/false`

### 3. **Admin Sync from Sheets**
- Admins can sync any client's data from their Google Sheets
- Endpoint: POST `/api/admin/users/:id/sync-from-sheet`
- Automatically detects client type (HR or Insurance)
- Uses correct sync service based on client type

---

## 🔧 API Endpoints

### Change Password (Client)
```
POST /api/auth/change-password
Authorization: Bearer <token>

Body:
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}

Response:
{
  "message": "Password changed successfully"
}

Error (if disabled):
{
  "error": "Password change is disabled for your account. Contact administrator."
}
```

### Update User Permissions (Admin Only)
```
PATCH /api/admin/users/:id
Authorization: Bearer <admin_token>

Body:
{
  "can_change_password": true  // or false to disable
}

Response:
{
  "id": 16,
  "email": "client@example.com",
  "name": "Client Name",
  "role": "client",
  "status": "open",
  "can_change_password": 1
}
```

### Admin Sync Client Data
```
POST /api/admin/users/:id/sync-from-sheet
Authorization: Bearer <admin_token>

Response (HR Client):
{
  "success": true,
  "imported": 150,
  "updated": 50,
  "clientType": "hr"
}

Response (Insurance Client):
{
  "success": true,
  "imported": 75,
  "updated": 0,
  "clientType": "insurance"
}
```

---

## 📊 Database Changes

### New Column: `can_change_password`
```sql
ALTER TABLE users ADD COLUMN can_change_password INTEGER DEFAULT 1;
```

**Values:**
- `1` = Enabled (default) - Client can change password
- `0` = Disabled - Client cannot change password

---

## 🎯 User Flow

### Client Changing Password:

1. **Client logs in**
2. **Navigates to Settings/Profile**
3. **Clicks "Change Password"**
4. **Enters current password and new password**
5. **System checks:**
   - Is user an admin? → Allow
   - Is `can_change_password = 1`? → Allow
   - Otherwise → Deny with error message
6. **Password updated successfully**

### Admin Controlling Permission:

1. **Admin logs in**
2. **Goes to Admin Dashboard → Users**
3. **Selects a client**
4. **Toggles "Can Change Password" switch**
5. **System updates `can_change_password` column**
6. **Client immediately affected**

### Admin Syncing Client Data:

1. **Admin logs in**
2. **Goes to Admin Dashboard → Users**
3. **Selects a client**
4. **Clicks "Sync from Sheets" button**
5. **System:**
   - Detects client type (HR or Insurance)
   - Gets Google Sheet URL from user record
   - For Insurance: Uses client-specific config (KMG/Joban)
   - For HR: Uses standard candidate sync
   - Imports/updates data
6. **Shows sync result**

---

## 🔐 Security Features

### Permission Checks:
- ✅ Admins bypass permission check
- ✅ Clients must have `can_change_password = 1`
- ✅ Current password verification required
- ✅ Minimum 6 characters for new password
- ✅ Password hashed with bcrypt

### Admin Controls:
- ✅ Only admins can modify permissions
- ✅ Only admins can sync client data
- ✅ Role-based access control enforced
- ✅ Audit trail via updated_at timestamp

---

## 💻 Frontend Integration

### User Info Response:
```javascript
GET /api/auth/me

Response:
{
  "id": 16,
  "email": "client@example.com",
  "name": "Client Name",
  "role": "client",
  "canChangePassword": true,  // ← New field
  "mustChangePassword": false,
  "balance": 50000,
  // ... other fields
}
```

### Show/Hide Change Password Button:
```javascript
// In Settings/Profile component
{user.canChangePassword && (
  <Button onClick={openChangePasswordModal}>
    Change Password
  </Button>
)}

// Or show disabled state
<Button 
  onClick={openChangePasswordModal}
  disabled={!user.canChangePassword}
  title={!user.canChangePassword ? "Password change disabled by administrator" : ""}
>
  Change Password
</Button>
```

### Admin User List:
```javascript
// In Admin Dashboard
{users.map(user => (
  <tr key={user.id}>
    <td>{user.name}</td>
    <td>{user.email}</td>
    <td>
      <Switch
        checked={user.can_change_password === 1}
        onChange={(enabled) => updateUserPermission(user.id, enabled)}
      />
    </td>
    <td>
      <Button onClick={() => syncClientData(user.id)}>
        Sync from Sheets
      </Button>
    </td>
  </tr>
))}
```

---

## 🧪 Testing Checklist

### Change Password Feature:
- [ ] Client with permission enabled can change password
- [ ] Client with permission disabled gets error
- [ ] Admin can always change password
- [ ] Current password validation works
- [ ] New password minimum length enforced
- [ ] Password successfully updated in database
- [ ] User can login with new password

### Admin Permission Control:
- [ ] Admin can enable password change for client
- [ ] Admin can disable password change for client
- [ ] Permission change reflects immediately
- [ ] Non-admin cannot access permission endpoint
- [ ] Permission persists after logout/login

### Admin Sync:
- [ ] Admin can sync HR client data
- [ ] Admin can sync Insurance client (KMG)
- [ ] Admin can sync Insurance client (Joban)
- [ ] Sync uses correct spreadsheet ID
- [ ] Sync uses correct tab name
- [ ] Error handling for missing sheet URL
- [ ] Error handling for invalid sheet URL

---

## 🚀 Deployment Notes

### Database Migration:
```bash
# Already executed locally
sqlite3 data/hirehero.db "ALTER TABLE users ADD COLUMN can_change_password INTEGER DEFAULT 1;"
```

### Railway Deployment:
1. Push changes to repository
2. Railway will auto-deploy
3. Database migration will run automatically
4. All existing users will have `can_change_password = 1` (enabled)

### Post-Deployment:
1. Test change password with enabled permission
2. Test change password with disabled permission
3. Test admin permission toggle
4. Test admin sync for HR client
5. Test admin sync for Insurance clients

---

## 📝 Usage Examples

### Disable Password Change for Specific Client:
```bash
curl -X PATCH https://your-api.com/api/admin/users/16 \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"can_change_password": false}'
```

### Enable Password Change:
```bash
curl -X PATCH https://your-api.com/api/admin/users/16 \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"can_change_password": true}'
```

### Admin Sync Client Data:
```bash
curl -X POST https://your-api.com/api/admin/users/16/sync-from-sheet \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## ✨ Benefits

### For Clients:
- ✅ Can change password when needed
- ✅ Clear error message if disabled
- ✅ Secure password change process

### For Admins:
- ✅ Full control over client permissions
- ✅ Can sync any client's data
- ✅ Automatic client type detection
- ✅ Easy permission management

### For Security:
- ✅ Granular access control
- ✅ Admin oversight
- ✅ Audit trail
- ✅ Prevents unauthorized changes

---

## 🔄 Future Enhancements

Potential additions:
- Password change history log
- Email notification on password change
- Password strength requirements
- Password expiry policy
- Two-factor authentication
- Bulk permission updates
- Permission change audit log
