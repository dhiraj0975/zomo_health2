# Email Campaign - Simple Payload Guide

## 📋 Overview
Yeh guide bahut simple hai - har step me exactly kya dena hai, kis file ko kab upload karna hai.

---

## 🎯 Step 1: Campaign Create Karna

### Option 1: Sheet Upload (with_option = "0")

**Kya Karna Hai:**
1. User "With Sheet Upload" select karega
2. Campaign Name enter karega
3. CSV/XLSX file upload karega

**Payload Me Kya Dena Hai:**
```javascript
const formData = new FormData();

// ✅ REQUIRED - Har baar dena hai
formData.append('with_option', '0');  // Fixed value
formData.append('campaign_title', 'My Campaign');  // User se input

// ✅ REQUIRED - File upload (CSV/XLSX/XLS)
formData.append('file', fileInput.files[0]);  // File object

// ✅ REQUIRED - Abhi empty, baad me fill hoga
formData.append('subject', '');  // Empty string
formData.append('template_content', '');  // Empty string
formData.append('from_email_id', '');  // Empty string
formData.append('schedule_datetime', '');  // Empty string
formData.append('timezone', '');  // Empty string

// ✅ REQUIRED - Default values
formData.append('use_def_tem_id', '0');
formData.append('attachment', '');

// API Call
fetch('/communication/email-campaign-requests/create', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: formData
});
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "hash": "abc123"
  }
}
```

**Important:** `id` aur `hash` save karo, baad me use hoga!

---

### Option 2: With Organizations (with_option = "1")

**Kya Karna Hai:**
1. User "With Organizations" select karega
2. Campaign Name enter karega
3. Organization select karega
4. Filters select karega (optional)

**Payload Me Kya Dena Hai:**
```javascript
const formData = new FormData();

// ✅ REQUIRED - Har baar dena hai
formData.append('with_option', '1');  // Fixed value
formData.append('campaign_title', 'My Campaign');  // User se input
formData.append('for_org_id', '123');  // Organization dropdown se ID

// ❌ OPTIONAL - Filters (agar select kiye ho to)
formData.append('department', 'IT,Sales');  // Comma-separated
formData.append('location', 'Mumbai,Delhi');  // Comma-separated
formData.append('on_health_plan', '2');  // "2" = All, "1" = Yes, "0" = No
formData.append('gender', 'all');  // "all", "Male", "Female"
formData.append('terminated', '1');  // "1" = Include, "0" = Exclude
formData.append('eligibility', '7');  // "7" = User

// ✅ REQUIRED - Abhi empty, baad me fill hoga
formData.append('subject', '');  // Empty string
formData.append('template_content', '');  // Empty string
formData.append('from_email_id', '');  // Empty string
formData.append('schedule_datetime', '');  // Empty string
formData.append('timezone', '');  // Empty string

// ✅ REQUIRED - Default values
formData.append('use_def_tem_id', '0');
formData.append('attachment', '');

// API Call
fetch('/communication/email-campaign-requests/create', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: formData
});
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "hash": "abc123"
  }
}
```

**Important:** `id` aur `hash` save karo!

---

## 🎯 Step 2: Campaign Details Update Karna

**Kya Karna Hai:**
1. Recipients data dekho
2. From Email select karo
3. Subject enter karo
4. Template content enter karo

### 2.1 Recipients Data Get Karna

**API:**
```
POST /communication/email-campaign-requests/get-email-contects
```

**Payload:**
```javascript
{
  "id": 1,  // Step 1 se mila hua ID
  "hash": "abc123",  // Step 1 se mila hua hash
  "page": 1,
  "limit": 25
}
```

**File Upload:** ❌ Nahi

---

### 2.2 From Email List Get Karna

**API:**
```
POST /communication/email-campaign-requests/get-from-emails
```

**Payload:**
```javascript
{}  // Empty object
```

**File Upload:** ❌ Nahi

---

### 2.3 Campaign Update - From Email, Subject, Content

**API:**
```
PUT /communication/email-campaign-requests/update
```

**Payload Me Kya Dena Hai:**
```javascript
const formData = new FormData();

// ✅ REQUIRED - Step 1 se mila hua
formData.append('id', '1');  // Step 1 se save kiya hua ID
formData.append('hash', 'abc123');  // Step 1 se save kiya hua hash

// ✅ REQUIRED - Abhi fill karna hai
formData.append('from_email_id', '1');  // From Email dropdown se selected ID
formData.append('subject', 'My Email Subject');  // Subject field se
formData.append('template_content', '<html>Email content</html>');  // Content editor se

// ✅ REQUIRED - Step 1 se same values
formData.append('with_option', '0');  // Ya '1' jo Step 1 me select kiya
formData.append('campaign_title', 'My Campaign');  // Same as Step 1

// ✅ REQUIRED - Abhi empty, Step 3 me fill hoga
formData.append('schedule_datetime', '');  // Empty string
formData.append('timezone', '');  // Empty string

// ✅ REQUIRED - Default values
formData.append('use_def_tem_id', '0');
formData.append('attachment', '');

// API Call
fetch('/communication/email-campaign-requests/update', {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: formData
});
```

**File Upload:** ❌ Nahi (abhi nahi)

---

## 🎯 Step 3: Final Step - Test Mail, Attachments, Schedule

### 3.1 Test Mail Send Karna

**API:**
```
POST /communication/email-campaign-requests/send-test-mail
```

**Payload Me Kya Dena Hai:**
```javascript
const formData = new FormData();

// ✅ REQUIRED - Har baar dena hai
formData.append('id', '1');  // Step 1 se save kiya hua ID
formData.append('hash', 'abc123');  // Step 1 se save kiya hua hash
formData.append('testemail', 'test@example.com');  // Test email input se

// ❌ OPTIONAL - Current campaign data (agar update kiya ho to)
formData.append('from_email_id', '1');  // Current from email ID
formData.append('subject', 'My Email Subject');  // Current subject
formData.append('template_content', '<html>Content</html>');  // Current content

// ❌ OPTIONAL - New attachments (agar add kiye ho to)
// Maximum 3 files, har file max 10MB
formData.append('attachaments', file1);  // File 1
formData.append('attachaments', file2);  // File 2
formData.append('attachaments', file3);  // File 3

// ❌ OPTIONAL - Existing attachments from S3
formData.append('selectedattchementfile', JSON.stringify([
  'communication/attachments/file1.pdf',
  'communication/attachments/file2.pdf'
]));

// API Call
fetch('/communication/email-campaign-requests/send-test-mail', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: formData
});
```

**File Upload:** ✅ Haan (agar new attachments add kar rahe ho to)
- Field name: `attachaments` (typo hai backend me, use as-is)
- Max files: 3
- Max size per file: 10MB

---

### 3.2 Final Update - Content, Attachments, Schedule

**API:**
```
PUT /communication/email-campaign-requests/update
```

**Payload Me Kya Dena Hai:**
```javascript
const formData = new FormData();

// ✅ REQUIRED - Step 1 se mila hua
formData.append('id', '1');  // Step 1 se save kiya hua ID
formData.append('hash', 'abc123');  // Step 1 se save kiya hua hash

// ✅ REQUIRED - Final content
formData.append('template_content', '<html>Final email content</html>');  // Rich text editor se

// ✅ REQUIRED - Subject aur From Email (agar update kiya ho to)
formData.append('subject', 'My Email Subject');  // Current subject
formData.append('from_email_id', '1');  // Current from email ID

// ✅ REQUIRED - Schedule (agar schedule karna ho to)
formData.append('schedule_datetime', '2026-01-27 19:33:00');  // Format: "YYYY-MM-DD HH:mm:ss"
formData.append('timezone', 'UTC');  // Timezone dropdown se

// ✅ REQUIRED - Step 1 se same values
formData.append('with_option', '0');  // Ya '1' jo Step 1 me select kiya
formData.append('campaign_title', 'My Campaign');  // Same as Step 1

// ❌ OPTIONAL - Attachments (agar add kiye ho to)
// Note: Attachments ko pehle S3 me upload karke path milna hoga
formData.append('attachment', 'file1.pdf,file2.pdf');  // Comma-separated filenames

// ✅ REQUIRED - Default values
formData.append('use_def_tem_id', '0');

// API Call
fetch('/communication/email-campaign-requests/update', {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: formData
});
```

**File Upload:** ❌ Nahi (attachments ka path string me dena hai)

---

## 📊 Quick Reference Table

| Step | API Endpoint | File Upload? | Required Fields |
|------|-------------|--------------|----------------|
| **Step 1** | `POST /create` | ✅ **Haan** (only for with_option="0") | `with_option`, `campaign_title`, `file` (if sheet upload) |
| **Step 2.1** | `POST /get-email-contects` | ❌ Nahi | `id`, `hash` |
| **Step 2.2** | `POST /get-from-emails` | ❌ Nahi | None |
| **Step 2.3** | `PUT /update` | ❌ Nahi | `id`, `hash`, `from_email_id`, `subject`, `template_content` |
| **Step 3.1** | `POST /send-test-mail` | ✅ **Haan** (optional, max 3 files) | `id`, `hash`, `testemail` |
| **Step 3.2** | `PUT /update` | ❌ Nahi | `id`, `hash`, `schedule_datetime`, `timezone` |

---

## 🔑 Important Points

### File Upload Kab Karna Hai:

1. **Step 1 (with_option="0"):**
   - ✅ **Haan** - Recipient file upload karna hai
   - Field: `file`
   - Format: CSV, XLS, XLSX
   - Max size: 10MB
   - Max contacts: 2000

2. **Step 3.1 (Test Mail):**
   - ✅ **Optional** - New attachments add kar sakte ho
   - Field: `attachaments` (typo hai, use as-is)
   - Max files: 3
   - Max size per file: 10MB
   - Format: PDF (as per image)

3. **Step 3.2 (Final Update):**
   - ❌ **Nahi** - File upload nahi, sirf path string me dena hai
   - Field: `attachment`
   - Format: Comma-separated filenames (e.g., "file1.pdf,file2.pdf")

### Har Step Me Kya Required Hai:

**Step 1:**
- `with_option` (always)
- `campaign_title` (always)
- `file` (only if with_option="0")
- `for_org_id` (only if with_option="1")
- Baaki sab empty strings

**Step 2:**
- `id` aur `hash` (Step 1 se)
- `from_email_id` (user se select)
- `subject` (user se input)
- `template_content` (user se input)

**Step 3:**
- `id` aur `hash` (Step 1 se)
- `testemail` (for test mail)
- `schedule_datetime` (for schedule)
- `timezone` (for schedule)
- `template_content` (final content)

---

## 📝 Complete Example - Sheet Upload Flow

```javascript
// Step 1: Create Campaign
const step1FormData = new FormData();
step1FormData.append('with_option', '0');
step1FormData.append('campaign_title', 'My Campaign');
step1FormData.append('file', fileInput.files[0]);  // ✅ FILE UPLOAD
step1FormData.append('subject', '');
step1FormData.append('template_content', '');
step1FormData.append('from_email_id', '');
step1FormData.append('schedule_datetime', '');
step1FormData.append('timezone', '');
step1FormData.append('use_def_tem_id', '0');
step1FormData.append('attachment', '');

const step1Response = await fetch('/communication/email-campaign-requests/create', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: step1FormData
});
const { id, hash } = (await step1Response.json()).data;

// Step 2: Update with From Email & Subject
const step2FormData = new FormData();
step2FormData.append('id', id);
step2FormData.append('hash', hash);
step2FormData.append('from_email_id', '1');
step2FormData.append('subject', 'My Email Subject');
step2FormData.append('template_content', '<html>Initial content</html>');
step2FormData.append('with_option', '0');
step2FormData.append('campaign_title', 'My Campaign');
step2FormData.append('schedule_datetime', '');
step2FormData.append('timezone', '');
step2FormData.append('use_def_tem_id', '0');
step2FormData.append('attachment', '');

await fetch('/communication/email-campaign-requests/update', {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: step2FormData
});

// Step 3: Send Test Mail
const step3FormData = new FormData();
step3FormData.append('id', id);
step3FormData.append('hash', hash);
step3FormData.append('testemail', 'test@example.com');
// Optional: Add attachments
if (attachmentFiles.length > 0) {
  attachmentFiles.forEach(file => {
    step3FormData.append('attachaments', file);  // ✅ FILE UPLOAD (optional)
  });
}

await fetch('/communication/email-campaign-requests/send-test-mail', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: step3FormData
});

// Step 4: Final Update with Schedule
const step4FormData = new FormData();
step4FormData.append('id', id);
step4FormData.append('hash', hash);
step4FormData.append('template_content', '<html>Final content</html>');
step4FormData.append('subject', 'My Email Subject');
step4FormData.append('from_email_id', '1');
step4FormData.append('schedule_datetime', '2026-01-27 19:33:00');
step4FormData.append('timezone', 'UTC');
step4FormData.append('with_option', '0');
step4FormData.append('campaign_title', 'My Campaign');
step4FormData.append('use_def_tem_id', '0');
step4FormData.append('attachment', 'file1.pdf');  // String, not file upload

await fetch('/communication/email-campaign-requests/update', {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: step4FormData
});
```

---

## ✅ Checklist

### Step 1 Checklist:
- [ ] `with_option` set kiya
- [ ] `campaign_title` user se liya
- [ ] `file` upload kiya (if with_option="0")
- [ ] `for_org_id` select kiya (if with_option="1")
- [ ] Baaki sab empty strings

### Step 2 Checklist:
- [ ] `id` aur `hash` Step 1 se save kiye
- [ ] Recipients data get kiya
- [ ] From Email list get kiya
- [ ] `from_email_id` select kiya
- [ ] `subject` enter kiya
- [ ] `template_content` enter kiya

### Step 3 Checklist:
- [ ] Test mail send kiya (optional)
- [ ] `schedule_datetime` set kiya
- [ ] `timezone` select kiya
- [ ] Final `template_content` update kiya

---

**Last Updated:** January 28, 2026
