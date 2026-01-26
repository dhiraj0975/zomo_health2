# Permission APIs - CURL Commands for Testing

## Base URL
```
http://localhost:3000
```
*(Apna actual base URL use karein)*

## Authentication
Sabhi requests mein token required hai:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Important:** Yeh APIs **sirf Admin role** (role_id = 1) use kar sakta hai!

---

## Permission Tables

### Table 1: `s_permission_methods`
API paths aur methods store hote hain

**Columns:**
- `id` - Method ID (Auto increment)
- `module` - Module name (e.g., "CompanyModule")
- `controller` - Controller name (e.g., "CompanyController")
- `action` - Action/Route name (e.g., "create", "update")
- `method` - HTTP method (POST, GET, PUT, DELETE)
- `path` - Full API path (e.g., "/organization/create")
- `slug` - Unique identifier (e.g., "post-organization.create")
- `status` - 1 = Active, 0 = Inactive

### Table 2: `s_permission_roles`
Role-specific permissions store hote hain

**Columns:**
- `id` - Auto increment
- `role_id` - Role ID (from `s_roles` table)
- `method_id` - Method ID (from `s_permission_methods`)
- `permission` - 1 = Allowed, 0 = Denied
- `status` - 1 = Active, 0 = Inactive

---

## 1. Sync Methods (Auto-detect APIs)
**Endpoint:** `/permission-method/sync-methods`

**Kya kaam karta hai:**
- Backend code scan karta hai automatically
- Sabhi controllers aur unke routes detect karta hai
- `s_permission_methods` table ko update karta hai
- New APIs add hoti hain, deleted APIs remove hoti hain
- Admin panel ke liye permission management enable karta hai

**Kaise kaam karta hai:**
1. NestJS ModulesContainer scan hota hai
2. Har controller ke metadata se routes extract hote hain
3. Route path, HTTP method, controller name collect hota hai
4. Database mein insert/update karta hai
5. Purane/deleted routes ko delete karta hai
6. Added aur deleted count return karta hai

**CURL Command:**
```bash
curl -X GET "http://localhost:3000/permission-method/sync-methods" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng"
```

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "error": 0,
  "data": {
    "addedCount": 15,
    "deletedCount": 3
  },
  "message": "Methods synced successfully"
}
```

**When to use:**
- Jab bhi naya API develop kiya ho
- Permission system setup kar rahe ho
- APIs add/remove karne ke baad

---

## 2. Get All Modules
**Endpoint:** `/role-permission/find-all-modules`

**Kya kaam karta hai:**
- Database se unique modules ki list return karta hai
- Permission management UI ke liye dropdown data

**Kaise kaam karta hai:**
1. `s_permission_methods` table se unique modules fetch hote hain
2. Sirf active methods (`status = 1`) filter hote hain
3. Modules list alphabetically return hoti hai

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/role-permission/find-all-modules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{}'
```

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "error": 0,
  "data": [
    { "module": "AuthModule" },
    { "module": "BrokerModule" },
    { "module": "CampaignModule" },
    { "module": "ChallengeModule" },
    { "module": "CompanyModule" }
  ],
  "message": "success"
}
```

---

## 3. Get Controllers by Module
**Endpoint:** `/role-permission/find-controllers`

**Kya kaam karta hai:**
- Specific module ke sabhi controllers return karta hai
- Module select karne ke baad next dropdown populate karne ke liye

**Kaise kaam karta hai:**
1. Module name parameter se filter karta hai
2. Unique controllers list fetch karta hai
3. Active methods filter karke return karta hai

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/role-permission/find-controllers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "module": "CompanyModule"
  }'
```

**Parameters:**
- `module` (required): Module name (previous API se milta hai)

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "error": 0,
  "data": [
    { "controller": "CompanyController" },
    { "controller": "DepartmentController" },
    { "controller": "LocationController" }
  ],
  "message": "success"
}
```

---

## 4. Get Actions by Controller
**Endpoint:** `/role-permission/find-actions`

**Kya kaam karta hai:**
- Specific controller ke sabhi actions/routes return karta hai
- Actual API methods ki list milti hai permission assign karne ke liye

**Kaise kaam karta hai:**
1. Controller name se filter karta hai
2. Complete method details return karta hai:
   - Method ID
   - Action name
   - HTTP method
   - Full path
   - Module aur controller info

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/role-permission/find-actions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "controller": "CompanyController"
  }'
```

**Parameters:**
- `controller` (required): Controller name (previous API se milta hai)

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "error": 0,
  "data": [
    {
      "id": 102,
      "module": "CompanyModule",
      "controller": "CompanyController",
      "action": "create",
      "method": "POST",
      "path": "/organization/create"
    },
    {
      "id": 103,
      "module": "CompanyModule",
      "controller": "CompanyController",
      "action": "update",
      "method": "PUT",
      "path": "/organization/update"
    },
    {
      "id": 104,
      "module": "CompanyModule",
      "controller": "CompanyController",
      "action": "delete",
      "method": "POST",
      "path": "/organization/delete"
    }
  ],
  "message": "success"
}
```

---

## 5. Save Permission (Grant/Revoke Access)
**Endpoint:** `/role-permission/save-permission`

**Kya kaam karta hai:**
- Specific role ko specific API ka access grant ya revoke karta hai
- Database aur encrypted file dono update hote hain
- Permission immediately apply hota hai

**Kaise kaam karta hai:**
1. Role aur method validate karta hai
2. `s_permission_roles` table mein insert/update karta hai
3. Encrypted permission file update karta hai
4. S3 bucket mein file upload karta hai (backup)
5. Activity log create karta hai

**CURL Command (Grant Permission):**
```bash
curl -X POST "http://localhost:3000/role-permission/save-permission" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "role_id": 11,
    "method_id": 123,
    "permission": 1
  }'
```

**CURL Command (Revoke Permission):**
```bash
curl -X POST "http://localhost:3000/role-permission/save-permission" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "role_id": 11,
    "method_id": 123,
    "permission": 0
  }'
```

**Parameters:**
- `role_id` (required): Role ID (`s_roles` table se)
- `method_id` (required): Method ID (`s_permission_methods` table se)
- `permission` (required): 1 = Grant, 0 = Revoke

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "error": 0,
  "data": null,
  "message": "success"
}
```

**Important Notes:**
- Admin (role_id = 1) aur Global CEM (role_id = 19) ko automatically sabhi permissions hain
- Encrypted file + S3 backup automatically update hota hai
- Changes immediately apply hote hain (no restart needed)

---

## 6. Get All Role Modules (Role-wise Permissions)
**Endpoint:** `/role-permission/find-all-role-modules`

**Kya kaam karta hai:**
- Specific role ki current permissions fetch karta hai
- Module-wise organized data return karta hai
- Permission management UI mein checkboxes populate karne ke liye

**Kaise kaam karta hai:**
1. Role ID se filter karta hai
2. `s_permission_methods` aur `s_permission_roles` join karta hai
3. Module-wise grouped data return karta hai
4. Each module ke controllers aur actions ke saath permission status

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/role-permission/find-all-role-modules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "role_id": 11
  }'
```

**Parameters:**
- `role_id` (required): Role ID (jiska permission check karna hai)

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "error": 0,
  "data": [
    {
      "module": "CompanyModule",
      "controllers": [
        {
          "controller": "CompanyController",
          "actions": [
            {
              "id": 102,
              "action": "create",
              "method": "POST",
              "path": "/organization/create",
              "permission": 1
            },
            {
              "id": 103,
              "action": "update",
              "method": "PUT",
              "path": "/organization/update",
              "permission": 0
            }
          ]
        }
      ]
    }
  ],
  "message": "success"
}
```

---

## Complete Flow Example

### Use Case: Email Assets Delete API ko Role 11 (Org Admin) ke liye enable karo

**Step 1: Sync Methods (Backend APIs detect karo)**
```bash
curl -X GET "http://localhost:3000/permission-method/sync-methods" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "lang: eng"
```
*Response se confirm karo ki new APIs add hui hain*

---

**Step 2: Module List Fetch karo**
```bash
curl -X POST "http://localhost:3000/role-permission/find-all-modules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "lang: eng" \
  -d '{}'
```
*Response se "CommunicationModule" dhundo*

---

**Step 3: Controllers List Fetch karo**
```bash
curl -X POST "http://localhost:3000/role-permission/find-controllers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "lang: eng" \
  -d '{
    "module": "CommunicationModule"
  }'
```
*Response se "EmailAssetsController" dhundo*

---

**Step 4: Actions List Fetch karo**
```bash
curl -X POST "http://localhost:3000/role-permission/find-actions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "lang: eng" \
  -d '{
    "controller": "EmailAssetsController"
  }'
```
*Response se "/communication/email-assets/delete" ka method_id note karo (suppose id = 456)*

---

**Step 5: Permission Grant karo**
```bash
curl -X POST "http://localhost:3000/role-permission/save-permission" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "lang: eng" \
  -d '{
    "role_id": 11,
    "method_id": 456,
    "permission": 1
  }'
```

**Done! ✅** Ab Role 11 (Org Admin) email assets delete kar sakta hai!

---

**Step 6: Verify karo**
```bash
curl -X POST "http://localhost:3000/role-permission/find-all-role-modules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "lang: eng" \
  -d '{
    "role_id": 11
  }'
```
*Response mein "/communication/email-assets/delete" ke liye permission = 1 aana chahiye*

---

## Common Role IDs

| Role ID | Role Name | Description |
|---------|-----------|-------------|
| 1 | Admin | Super Admin - All permissions |
| 11 | OrgAdmin | Organization Admin |
| 19 | GlobalCEM | Global Client Engagement Manager |
| 38 | Role 38 | Campaign Manager |
| 39 | Role 39 | Marketing Manager |
| 40 | Role 40 | Content Manager |
| 43 | Role 43 | Communication Manager |

---

## Error Handling

### Error 1: Forbidden Access (403)
```json
{
  "statusCode": 401,
  "success": 0,
  "error": 1,
  "message": "Apologies, the URL you requested is not accessible.",
  "data": null
}
```
**Solution:** Check if user is Admin (role_id = 1)

---

### Error 2: Required Parameter Missing
```json
{
  "statusCode": 401,
  "success": 0,
  "error": 1,
  "message": "Required parameter missing",
  "data": null
}
```
**Solution:** Check if all required parameters provided hain

---

### Error 3: Invalid Value
```json
{
  "statusCode": 401,
  "success": 0,
  "error": 1,
  "message": "Invalid value provided for parameter",
  "data": null
}
```
**Solution:** Role ID ya Method ID validate karo

---

## Direct SQL Approach (Alternative)

Agar API use nahi karna chahte, directly database mein insert kar sakte ho:

### Step 1: Check if API exists in permission_methods
```sql
SELECT * FROM s_permission_methods 
WHERE path = '/communication/email-assets/delete';
```

### Step 2: If not exists, insert it
```sql
INSERT INTO s_permission_methods 
(module, controller, action, method, path, slug, status, created_date, updated_date)
VALUES 
('CommunicationModule', 'EmailAssetsController', 'delete', 'POST', 
 '/communication/email-assets/delete', 'post-communication/email-assets.delete', 
 1, NOW(), NOW());
```

### Step 3: Get the method_id
```sql
SELECT id FROM s_permission_methods 
WHERE path = '/communication/email-assets/delete';
```
*(Suppose id = 456)*

### Step 4: Grant permission to role
```sql
INSERT INTO s_permission_roles 
(role_id, method_id, permission, status, created_date, updated_date)
VALUES 
(11, 456, 1, 1, NOW(), NOW());
```

### Step 5: Verify
```sql
SELECT 
    r.name as role_name,
    pm.path,
    pm.method,
    pr.permission
FROM s_permission_roles pr
JOIN s_permission_methods pm ON pr.method_id = pm.id
JOIN s_roles r ON pr.role_id = r.id
WHERE pm.path = '/communication/email-assets/delete'
  AND pr.role_id = 11;
```

---

## Notes

- **Admin Access:** Sirf Admin (role_id = 1) hi in APIs ko use kar sakta hai
- **Auto Sync:** `/sync-methods` API automatically new routes detect karta hai
- **Encrypted File:** Permissions encrypted file mein bhi save hote hain (backup)
- **S3 Upload:** Automatically S3 mein backup upload hota hai
- **Immediate Effect:** Permission changes immediately apply hote hain
- **Activity Log:** Har permission change log hota hai audit ke liye

---

**Happy Permission Management! 🔐**
