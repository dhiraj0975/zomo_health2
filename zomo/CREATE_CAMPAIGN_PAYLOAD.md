# Create Campaign API - Complete Payload Documentation

## Endpoint
```
POST /communication/email-campaign-requests/create
```

## Headers
```javascript
{
  "Authorization": "Bearer JWT_TOKEN",
  "lang": "eng" // or "es"
}
```

## Request Format
**FormData** (multipart/form-data) - File upload ke liye zaroori hai

---

## Option 0: File Upload

### Required Fields
```javascript
FormData:
  with_option: "0"
  campaign_title: "My Campaign Name"
  from_email_id: 1
  subject: "Email Subject Line"
  file: File (CSV/Excel file)
```

### File Requirements
- **Format:** CSV (.csv) or Excel (.xlsx, .xls)
- **Max Size:** 10MB
- **Max Contacts:** 2000 rows (including header)
- **Required Column:** Must have "Email" column (case-insensitive)
- **Structure:** First row = Headers, Remaining rows = Data

### Example CSV Format
```csv
Name,Email,Mobile Number,Date of Birth,Address
John Doe,john@example.com,1234567890,01-01-1990,123 Main St
Jane Smith,jane@example.com,9876543210,02-02-1991,456 Oak Ave
```

### Complete Payload Example
```javascript
const formData = new FormData();
formData.append('with_option', '0');
formData.append('campaign_title', 'My Test Campaign');
formData.append('from_email_id', 1);
formData.append('subject', 'Welcome to Our Campaign');
formData.append('file', fileInput.files[0]); // File object from input

// Send request
fetch('/communication/email-campaign-requests/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'lang': 'eng'
  },
  body: formData
});
```

---

## Option 1: Organization Users

### Required Fields
```javascript
FormData:
  with_option: "1"
  campaign_title: "My Campaign Name"
  from_email_id: 1
  subject: "Email Subject Line"
  for_org_id: 123
```

### Optional Filter Fields
```javascript
FormData:
  department: "1,2,3"           // Optional - Department IDs (comma-separated)
  location: "5,6"               // Optional - Location IDs (comma-separated)
  gender: "all"                 // Optional - "Male", "Female", or "all"
  on_health_plan: "Yes"          // Optional - "Yes", "No", or "2" (all)
  health_plan_name: "Plan A,Plan B"  // Optional - Health plan names (comma-separated)
  terminated: "0"                // Optional - "0" (active) or "1" (terminated)
  eligibility: "7"               // Optional - Default: "7"
```

### Complete Payload Example
```javascript
const formData = new FormData();
formData.append('with_option', '1');
formData.append('campaign_title', 'Organization Campaign');
formData.append('from_email_id', 1);
formData.append('subject', 'Important Update');
formData.append('for_org_id', 123);

// Optional filters
formData.append('department', '1,2,3');
formData.append('location', '5,6');
formData.append('gender', 'all');
formData.append('on_health_plan', 'Yes');
formData.append('health_plan_name', 'Plan A,Plan B');
formData.append('terminated', '0');
formData.append('eligibility', '7');

// Send request
fetch('/communication/email-campaign-requests/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'lang': 'eng'
  },
  body: formData
});
```

---

## Option 2: Email Group

### Required Fields
```javascript
FormData:
  with_option: "2"
  campaign_title: "My Campaign Name"
  from_email_id: 1
  subject: "Email Subject Line"
  group_id: 5
  use_def_tem_id: 10  // Optional but recommended (can be 0)
```

### Complete Payload Example
```javascript
const formData = new FormData();
formData.append('with_option', '2');
formData.append('campaign_title', 'Group Campaign');
formData.append('from_email_id', 1);
formData.append('subject', 'Group Email Campaign');
formData.append('group_id', 5);
formData.append('use_def_tem_id', 10); // Optional

// Send request
fetch('/communication/email-campaign-requests/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'lang': 'eng'
  },
  body: formData
});
```

---

## Response Format

### Success Response (201)
```json
{
  "statusCode": 201,
  "success": 1,
  "error": 0,
  "data": {
    "id": 123,
    "hash": "abc123def456hash"
  },
  "message": "Request created successfully."
}
```

### Error Response (400)
```json
{
  "statusCode": 401,
  "success": 0,
  "error": 1,
  "message": "Error message here",
  "data": null
}
```

---

## Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `with_option` | string | ✅ **YES** | Recipient selection: "0" (File), "1" (Org), "2" (Group) |
| `campaign_title` | string | ✅ **YES** | Campaign ka naam |
| `from_email_id` | number | ✅ **YES** | Email config table se ID (get-from-emails API se milega) |
| `subject` | string | ✅ **YES** | Email subject line |
| `file` | File | ✅ **YES** (Option 0) | CSV/Excel file |
| `for_org_id` | number | ✅ **YES** (Option 1) | Organization ID |
| `group_id` | number | ✅ **YES** (Option 2) | Email group ID |
| `use_def_tem_id` | number | ✅ **YES** (Option 2) | Default template ID (0 bhi chalega) |
| `department` | string | ❌ Optional (Option 1) | Comma-separated department IDs |
| `location` | string | ❌ Optional (Option 1) | Comma-separated location IDs |
| `gender` | string | ❌ Optional (Option 1) | "Male", "Female", or "all" |
| `on_health_plan` | string | ❌ Optional (Option 1) | "Yes", "No", or "2" |
| `health_plan_name` | string | ❌ Optional (Option 1) | Comma-separated health plan names |
| `terminated` | string | ❌ Optional (Option 1) | "0" (active) or "1" (terminated) |
| `eligibility` | string | ❌ Optional (Option 1) | Default: "7" |

---

## Validation Rules

### Option 0 (File Upload)
- ✅ File must be uploaded
- ✅ File must be CSV or Excel format
- ✅ File must have "Email" column
- ✅ Max 2000 contacts (rows)
- ✅ All rows must have email value

### Option 1 (Organization Users)
- ✅ `for_org_id` must be provided
- ✅ At least one user must match filters
- ✅ If filters applied, matching users must exist

### Option 2 (Email Group)
- ✅ `group_id` must be provided
- ✅ Group must exist
- ✅ Group must have organizations selected
- ✅ Each organization must have at least one user

---

## Common Errors

### Error Messages
- `"ERR_REQUIRED_PARAM_MISSING"` - Required field missing
- `"Email column is missing in the file."` - File mein Email column nahi hai
- `"No. of contacts must be less than or equal to 2000 contacts."` - Contacts limit exceed
- `"Your filter according user not found."` - Filters ke according users nahi mile
- `"Your selected group not exist."` - Group exist nahi karta
- `"Sorry! This group in not selected any organization."` - Group mein organizations nahi hain

---

## Important Notes

1. **FormData Use Karein:** File upload ke liye FormData zaroori hai
2. **Save ID & Hash:** Response se `id` aur `hash` save karein - next steps ke liye zaroori hai
3. **File Validation:** Frontend pe file validate karein (size, format, email column)
4. **Error Handling:** `success === 0` check karein errors ke liye
5. **Headers:** Authorization aur lang headers zaroori hain

---

## Complete Example (React)

```javascript
// Create Campaign Function
const createCampaign = async (formData) => {
  try {
    const data = new FormData();
    
    // Common required fields
    data.append('with_option', formData.with_option);
    data.append('campaign_title', formData.campaign_title);
    data.append('from_email_id', formData.from_email_id);
    data.append('subject', formData.subject);
    
    // Option-specific fields
    if (formData.with_option === '0') {
      // File Upload
      if (!formData.file) {
        throw new Error('File is required');
      }
      data.append('file', formData.file);
      
    } else if (formData.with_option === '1') {
      // Organization Users
      if (!formData.for_org_id) {
        throw new Error('Organization ID is required');
      }
      data.append('for_org_id', formData.for_org_id);
      
      // Optional filters
      if (formData.department) {
        data.append('department', formData.department);
      }
      if (formData.location) {
        data.append('location', formData.location);
      }
      if (formData.gender) {
        data.append('gender', formData.gender);
      }
      if (formData.on_health_plan) {
        data.append('on_health_plan', formData.on_health_plan);
      }
      if (formData.health_plan_name) {
        data.append('health_plan_name', formData.health_plan_name);
      }
      if (formData.terminated) {
        data.append('terminated', formData.terminated);
      }
      if (formData.eligibility) {
        data.append('eligibility', formData.eligibility);
      }
      
    } else if (formData.with_option === '2') {
      // Email Group
      if (!formData.group_id) {
        throw new Error('Group ID is required');
      }
      data.append('group_id', formData.group_id);
      data.append('use_def_tem_id', formData.use_def_tem_id || 0);
    }
    
    // API Call
    const response = await fetch('/communication/email-campaign-requests/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'lang': 'eng'
      },
      body: data
    });
    
    const result = await response.json();
    
    if (result.success === 1) {
      // Save id and hash for next steps
      localStorage.setItem('campaign_id', result.data.id);
      localStorage.setItem('campaign_hash', result.data.hash);
      
      console.log('Campaign created:', result.data);
      return result.data;
    } else {
      throw new Error(result.message || 'Campaign creation failed');
    }
    
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
};

// Usage Example
const handleSubmit = async () => {
  const formData = {
    with_option: '0',
    campaign_title: 'My Campaign',
    from_email_id: 1,
    subject: 'Test Email',
    file: fileInput.files[0]
  };
  
  try {
    const result = await createCampaign(formData);
    // Navigate to next step with id and hash
  } catch (error) {
    // Show error message
  }
};
```

---

## Quick Reference

### Minimum Payload (Option 0)
```javascript
{
  with_option: "0",
  campaign_title: "Campaign Name",
  from_email_id: 1,
  subject: "Subject",
  file: File
}
```

### Minimum Payload (Option 1)
```javascript
{
  with_option: "1",
  campaign_title: "Campaign Name",
  from_email_id: 1,
  subject: "Subject",
  for_org_id: 123
}
```

### Minimum Payload (Option 2)
```javascript
{
  with_option: "2",
  campaign_title: "Campaign Name",
  from_email_id: 1,
  subject: "Subject",
  group_id: 5,
  use_def_tem_id: 10
}
```

---

**End of Documentation**
