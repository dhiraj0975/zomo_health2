# Email Campaign Requests - Complete API Documentation

## Base URL
```
/communication/email-campaign-requests
```

## Common Headers (Sab APIs ke liye)
```javascript
{
  "Authorization": "Bearer JWT_TOKEN",
  "lang": "eng" // or "es"
}
```

---

## 1. Paginate Campaigns
**Endpoint:** `POST /paginate`

**Purpose:** Campaign list with pagination

**Request Body:**
```javascript
{
  "page": 1,                    // Optional, default: 1
  "limit": 10,                  // Optional
  "search_str": "search",       // Optional - search in subject/campaign_title
  "status": 5,                  // Optional - filter by status
  "date": "2024-01-25",         // Optional - filter by date
  "created_by": 123             // Optional - filter by creator
}
```

**Status Values:**
- `5` = Pending Approval (approval_status=0, request_status=0)
- `6` = Rejected (approval_status=3)
- `8` = Approved (approval_status=1)
- `7` = Approved (approval_status=1)
- `4` = Completed (request_status=4)
- `9` = Scheduled (request_status=3)
- `10` = Failed (request_status=5)

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "list": [...],
    "total": 100,
    "pages": 10,
    "page": 1,
    "limit": 10,
    "createdByList": [...] // Only on page 1
  }
}
```

---

## 2. Get One Campaign
**Endpoint:** `POST /get-one`

**Purpose:** Single campaign details fetch

**Request Body:**
```javascript
{
  "id": 123,                    // Required
  "subcamphash": "hash123"      // Optional - for Option 2 (Group campaigns)
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "campaignRequests": {
      "id": 123,
      "hash": "abc123",
      "campaign_title": "...",
      "subject": "...",
      "template_content": "...",
      "with_option": "0",
      // ... other fields
    },
    "nextCampaignId": "hash456",  // Only for Option 2
    "prevCampaignId": "hash789"    // Only for Option 2
  }
}
```

---

## 3. Create Campaign
**Endpoint:** `POST /create`

**Purpose:** Create new email campaign

**Request Format:** FormData (file upload support)

### Option 0: File Upload
```javascript
FormData:
  - with_option: "0"
  - campaign_title: "Campaign Name"
  - from_email_id: 1
  - subject: "Email Subject"
  - file: File (CSV/Excel, max 10MB, max 2000 contacts)
```

### Option 1: Organization Users
```javascript
FormData:
  - with_option: "1"
  - campaign_title: "Campaign Name"
  - from_email_id: 1
  - subject: "Email Subject"
  - for_org_id: 123
  - department: "1,2,3" (optional, comma-separated)
  - location: "5,6" (optional, comma-separated)
  - gender: "all" (optional: "Male", "Female", "all")
  - on_health_plan: "Yes" (optional: "Yes", "No", "2")
  - health_plan_name: "Plan A" (optional, comma-separated)
  - terminated: "0" (optional: "0" or "1")
  - eligibility: "7" (optional, default: "7")
```

### Option 2: Email Group
```javascript
FormData:
  - with_option: "2"
  - campaign_title: "Campaign Name"
  - from_email_id: 1
  - subject: "Email Subject"
  - group_id: 5
  - use_def_tem_id: 10 (optional, can be 0)
```

**Response:**
```json
{
  "statusCode": 201,
  "success": 1,
  "data": {
    "id": 123,
    "hash": "abc123hash"
  },
  "message": "Request created successfully."
}
```

---

## 4. Step Two (Update Content & Schedule)
**Endpoint:** `POST /step-two`

**Purpose:** Update campaign content, attachments, schedule

**Request Format:** FormData (multiple file upload support)

**Request Body:**
```javascript
FormData:
  - id: 123                    // Required
  - hash: "abc123hash"         // Required
  - template_content: "<html>...</html>"  // Optional - HTML content
  - subject: "Email Subject"   // Optional
  - testemail: "test@example.com"  // Optional - test email address
  - schedule_datetime: "2024-01-25 10:00:00"  // Optional - schedule time
  - timezone: "UTC"            // Optional - timezone
  - actionType: "1"             // Required: "1"=Draft, "2"=Schedule, "3"/"4"=Update
  - from_email_id: 1           // Optional
  - attachaments: File[]        // Optional - max 3 files, 10MB each
  - template_type: 0            // Optional
  - template_item_id: 0         // Optional
  - template_item_sub_id: ""    // Optional
  - details_type: 0            // Optional
  - currentCampHash: "hash"     // Optional - for Option 2
  - nextprevHash: "hash"       // Optional - for Option 2
```

**Action Types:**
- `"1"` = Save as Draft (request_status = 4)
- `"2"` = Schedule Campaign (request_status = 0, triggers approval)
- `"3"` = Update Campaign
- `"4"` = Update Campaign

**Response:**
```json
{
  "statusCode": 201,
  "success": 1,
  "message": "Campaign saved successfully."
}
```

---

## 5. Send Test Mail
**Endpoint:** `POST /send-test-mail`

**Purpose:** Send test email to verify campaign

**Request Format:** FormData

**Request Body:**
```javascript
FormData:
  - id: 123                    // Required
  - hash: "abc123hash"         // Required
  - testemail: "test@example.com"  // Required
  - from_email_id: 1           // Optional
  - template_content: "<html>...</html>"  // Optional
  - subject: "Email Subject"   // Optional
  - attachaments: File[]        // Optional - max 3 files
  - template_type: 0            // Optional
  - template_item_id: 0         // Optional
  - template_item_sub_id: ""    // Optional
  - details_type: 0            // Optional
  - cam_org_id: 123            // Optional
  - currentID: "hash"          // Optional - for Option 2
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "message": "Test mail sent successfully."
}
```

---

## 6. View Campaign (Recipients List)
**Endpoint:** `POST /view-campaign`

**Purpose:** Get campaign recipients list with pagination

**Request Body:**
```javascript
{
  "id": 123,                    // Required
  "hash": "abc123hash",         // Required
  "searchEmail": "test@",       // Optional - search by email
  "npid": null,                 // Optional - next page ID
  "pid": null,                  // Optional - previous page ID
  "type": null                  // Optional
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "schedulelist": [...],       // Array of recipients
    "EmailScheduleCount": 100,   // Total count
    "npid": "nextPageId",       // Next page identifier
    "pid": "prevPageId"         // Previous page identifier
  }
}
```

---

## 7. Details Campaign (Single Recipient)
**Endpoint:** `POST /details-campaign`

**Purpose:** Get single recipient details

**Request Body:**
```javascript
{
  "id": 123,                    // Required - campaign ID
  "hash": "abc123hash",         // Required - campaign hash
  "sid": 5,                     // Required - recipient index/ID
  "subhash": "hash456"          // Optional - for Option 2
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "MailScheduler": [...],     // Recipient data array
    "emailDetails": {...},       // Email details
    "RequestData": {...}         // Campaign request data
  }
}
```

---

## 8. Update Campaign
**Endpoint:** `PUT /update`

**Purpose:** Update existing campaign

**Request Format:** FormData

**Request Body:**
```javascript
FormData:
  - id: 123                    // Required
  - hash: "abc123hash"         // Required
  - campaign_title: "..."      // Optional
  - subject: "..."             // Optional
  - template_content: "..."    // Optional
  - from_email_id: 1           // Optional
  - testemail: "..."           // Optional
  - schedule_datetime: "..."    // Optional
  - timezone: "UTC"            // Optional
  - file: File                 // Optional - only for Option 0
  - with_option: "0"            // Optional
  - for_org_id: 123            // Optional - for Option 1
  - group_id: 5                // Optional - for Option 2
  // ... other fields same as create
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "message": "Campaign updated successfully."
}
```

---

## 9. Request Send to Approval
**Endpoint:** `POST /request-send-to-approval`

**Purpose:** Send campaign for approval

**Request Body:**
```javascript
{
  "id": 123,                    // Required
  "hash": "abc123hash"          // Required
}
```

**Response:**
```json
{
  "statusCode": 201,
  "success": 1,
  "message": "Request successfully sent for approval."
}
```

---

## 10. Request Verify Status
**Endpoint:** `POST /request-verify-status`

**Purpose:** Verify/Approve campaign items

**Request Body:**
```javascript
{
  "id": 123,                    // Required
  "hash": "abc123hash",         // Required
  "source": "all",              // Required: "all" or "single"
  "status": "2",                // Required: "2"=Approved, "3"=Rejected
  "types": "campaign_name"      // Required if source="single"
}
```

**Types (for source="single"):**
- `campaign_name`
- `user_sheet`
- `from_email`
- `subject`
- `mail_content`
- `attchament`
- `send_test_mail`
- `schedule_datetime`
- `timezone`

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "message": "Status updated successfully."
}
```

---

## 11. Change Status
**Endpoint:** `POST /change-status`

**Purpose:** Change campaign status (pause, resume, etc.)

**Request Body:**
```javascript
{
  "id": 123,                    // Required
  "hash": "abc123hash",         // Required
  "status": 1                   // Required - status value
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "message": "Status changed successfully."
}
```

---

## 12. List Campaigns
**Endpoint:** `POST /list`

**Purpose:** Get all campaigns (no pagination)

**Request Body:**
```javascript
{}  // Empty or any filters
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": [...]
}
```

---

## 13. Get Email Contacts
**Endpoint:** `POST /get-email-contects`

**Purpose:** Get campaign recipients with pagination

**Request Body:**
```javascript
{
  "id": 123,                    // Required
  "hash": "abc123hash",         // Required
  "page": 1,                    // Optional, default: 1
  "limit": 25                   // Optional, default: 25
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "list": [...],
    "total": 100,
    "pages": 4,
    "page": 1,
    "limit": 25
  }
}
```

---

## 14. Get From Emails
**Endpoint:** `POST /get-from-emails`

**Purpose:** Get list of available "From" email addresses

**Request Body:**
```javascript
{}  // Empty
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": [
    {
      "id": 1,
      "first_name": "Zomo",
      "last_name": "Health",
      "email": "noreply@zomohealth.com",
      "status": 1
    }
  ]
}
```

---

## 15. Get Default Templates
**Endpoint:** `POST /get-default-templates`

**Purpose:** Get available email templates

**Request Body:**
```javascript
{
  "with_option": "0",            // Required: "0", "1", or "2"
  "for_org_id": 123              // Optional - for Option 1 or 2
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": [
    {
      "id": 1,
      "subject": "Template Subject",
      "template_content": "<html>...</html>",
      "temp_type": 1,
      "details_type": 0
    }
  ]
}
```

---

## 16. Get Default Template Items
**Endpoint:** `POST /get-default-template-items`

**Purpose:** Get template items (challenges, quizzes, events, campaigns)

**Request Body:**
```javascript
{
  "id": 10,                      // Required - template ID
  "template_type": "3",          // Required: "3"=Challenge, "4"=Campaign, "5"=Quiz, "6"=Event, "7"=Challenge
  "org_id": 123                  // Required
}
```

**Template Types:**
- `"3"` = Challenge (Type A, B, H)
- `"4"` = Campaign
- `"5"` = Quiz
- `"6"` = Event
- `"7"` = Challenge

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "datas": [...],
    "tags": ["Name", "Start Date", "End Date", ...]
  }
}
```

---

## 17. Get Default Template Sub Items
**Endpoint:** `POST /get-default-template-sub-items`

**Purpose:** Get template sub-items (campaign rewards)

**Request Body:**
```javascript
{
  "template_type": "4",          // Required: "4" = Campaign
  "item_id": 5,                  // Required - campaign ID
  "org_id": 123                  // Required
}
```

**Response:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "datas": [
      {
        "id": 1,
        "reward_name": "Reward Name"
      }
    ]
  }
}
```

---

## Important Notes for Frontend Developer

### 1. File Upload Requirements
- **Max Size:** 10MB per file
- **Max Files:** 1 for campaign file, 3 for attachments
- **Formats:** CSV, XLSX, XLS
- **Max Contacts:** 2000 rows

### 2. Required Fields Summary
- **Create:** `with_option`, `campaign_title`, `from_email_id`, `subject`
- **Get One:** `id`
- **Step Two:** `id`, `hash`, `actionType`
- **Send Test Mail:** `id`, `hash`, `testemail`
- **View Campaign:** `id`, `hash`
- **Details Campaign:** `id`, `hash`, `sid`

### 3. Status Flow
```
Draft (4) → Pending Approval (0) → Approved (2) → Scheduled (3) → Completed (4)
```

### 4. Option Types
- `"0"` = File Upload
- `"1"` = Organization Users
- `"2"` = Email Group

### 5. Response Format
All APIs return:
```json
{
  "statusCode": 200/201/401,
  "success": 1/0,
  "error": 0/1,
  "data": {...},
  "message": "..."
}
```

### 6. Error Handling
- Check `success === 0` for errors
- Display `message` field for error text
- Handle `statusCode: 401` as validation errors

---

## Complete Integration Flow

### Step 1: Create Campaign
```javascript
POST /create
→ Save {id, hash}
```

### Step 2: Get Campaign Details
```javascript
POST /get-one
→ Display campaign form
```

### Step 3: Update Content
```javascript
POST /step-two (actionType="1")
→ Save as draft
```

### Step 4: Send Test Mail
```javascript
POST /send-test-mail
→ Verify email preview
```

### Step 5: Schedule Campaign
```javascript
POST /step-two (actionType="2")
→ Campaign scheduled
```

### Step 6: View Recipients
```javascript
POST /view-campaign
→ Show recipient list
```

---

## Example Code (React/Angular)

```javascript
// Create Campaign
const createCampaign = async (formData) => {
  const data = new FormData();
  data.append('with_option', formData.with_option);
  data.append('campaign_title', formData.campaign_title);
  data.append('from_email_id', formData.from_email_id);
  data.append('subject', formData.subject);
  
  if (formData.with_option === '0') {
    data.append('file', formData.file);
  } else if (formData.with_option === '1') {
    data.append('for_org_id', formData.for_org_id);
  } else if (formData.with_option === '2') {
    data.append('group_id', formData.group_id);
  }
  
  const response = await fetch('/communication/email-campaign-requests/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'lang': 'eng'
    },
    body: data
  });
  
  return await response.json();
};
```

---

**End of Documentation**
