# Email Campaign API - CURL Commands for Testing

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

---

## 1. Get From Emails
**UI Feature:** From Email selection buttons

**Kya kaam karta hai:**
- Database se available "From Email" addresses ki list fetch karta hai
- UI mein jo email buttons dikhte hain (support@preventioncloud.com, etc.), unka data yahan se aata hai
- User campaign create karte time inme se ek email select kar sakta hai

**Kaise kaam karta hai:**
1. Backend `s_email_configs` table se emails fetch karta hai
2. Sirf active emails (`status = 1`) aur source = 0 wale emails return karta hai
3. Response mein email id, email address, aur related details aate hain

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/get-from-emails" \
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
  "data": [
    {
      "id": 1,
      "email": "support@preventioncloud.com",
      "status": 1
    },
    {
      "id": 2,
      "email": "pcithrives@preventioncloud.com",
      "status": 1
    }
  ]
}
```

---

## 2. Get Default Templates
**UI Feature:** Template Details section

**Kya kaam karta hai:**
- Database se available email templates ki list fetch karta hai
- UI mein "Template Details" section mein jo templates dikhte hain (jaise "Harris"), unka data yahan se aata hai
- User template select kar sakta hai campaign ke liye

**Kaise kaam karta hai:**
1. `with_option` ke basis par templates filter karta hai:
   - `with_option = "0"`: File upload - Global templates (temp_type 1,2)
   - `with_option = "1"` ya `"2"`: Organization specific templates
2. Role-based filtering: Role 38, 39 ko global templates dikhte hain
3. Response mein template id, subject, content, aur type aata hai

**Parameters:**
- `with_option`: "0" (File), "1" (Org Users), "2" (Group)
- `for_org_id`: Organization ID (option 1,2 ke liye)

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/get-default-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "with_option": "0",
    "for_org_id": 0
  }'
```

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": [
    {
      "id": 1,
      "subject": "Harris Template",
      "template_content": "<html>...</html>",
      "temp_type": 1
    }
  ]
}
```

---

## 3. Create Campaign (Step 1)
**UI Feature:** Recipients data, From Email, Template selection

**Kya kaam karta hai:**
- Campaign create karta hai database mein
- Recipients select karta hai (File, Organization, ya Group se)
- Campaign ka basic info save karta hai (title, from email, subject)
- Response mein `id` aur `hash` return karta hai jo next steps ke liye use hota hai

**Kaise kaam karta hai:**
1. Role Guard check: Database/file se permission verify karta hai
2. Access Guard check: Organization restrictions verify karta hai
3. Recipients process:
   - **Option 0:** CSV/Excel file read karke contacts extract karta hai
   - **Option 1:** Organization ke users filter karta hai
   - **Option 2:** Group ke users fetch karta hai
4. Campaign record create karta hai `s_com_email_campaigns_requests` table mein
5. File upload ho to file save karta hai

**Important:** Response mein `id` aur `hash` save karein, next steps ke liye zaroori hai!

---

### Option 0: Upload CSV/Excel File
**Kya hai:** CSV ya Excel file se contacts import karein

**Kaise kaam karta hai:**
1. File upload hota hai (CSV ya Excel format)
2. Backend file read karta hai aur validate karta hai
3. Email column check karta hai (required)
4. Max 2000 contacts allowed
5. File save hota hai aur contacts extract hote hain

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/create" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "with_option=0" \
  -F "campaign_title=Test Campaign" \
  -F "from_email_id=1" \
  -F "subject=Test Subject" \
  -F "file=@/path/to/contacts.csv"
```

**Required Fields:**
- `with_option`: "0" (File upload)
- `campaign_title`: Campaign ka naam
- `from_email_id`: Selected from email ka ID
- `subject`: Email subject
- `file`: CSV/Excel file path

---

### Option 1: Organization Users
**Kya hai:** Specific organization ke users ko recipients banayein

**Kaise kaam karta hai:**
1. `for_org_id` se organization identify hota hai
2. Organization ke active users fetch hote hain
3. Filters apply ho sakte hain (department, location, etc.)
4. Users automatically recipients ban jate hain

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "with_option": "1",
    "campaign_title": "Test Campaign",
    "for_org_id": 123,
    "from_email_id": 1,
    "subject": "Test Subject"
  }'
```

**Required Fields:**
- `with_option`: "1" (Organization users)
- `campaign_title`: Campaign ka naam
- `for_org_id`: Organization ID
- `from_email_id`: Selected from email ka ID
- `subject`: Email subject

---

### Option 2: Default Template with Group
**Kya hai:** Pre-defined template aur group ke users use karein

**Kaise kaam karta hai:**
1. `use_def_tem_id` se default template load hota hai
2. `group_id` se mailing group identify hota hai
3. Group ke users automatically recipients ban jate hain
4. Template content pre-filled ho jata hai

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "with_option": "2",
    "campaign_title": "Test Campaign",
    "group_id": 1,
    "use_def_tem_id": 1,
    "for_org_id": 123,
    "from_email_id": 1,
    "subject": "Test Subject"
  }'
```

**Required Fields:**
- `with_option`: "2" (Group with template)
- `campaign_title`: Campaign ka naam
- `group_id`: Mailing group ID
- `use_def_tem_id`: Default template ID
- `for_org_id`: Organization ID
- `from_email_id`: Selected from email ka ID
- `subject`: Email subject

**Response Example:**
```json
{
  "statusCode": 201,
  "success": 1,
  "data": {
    "id": 123,
    "hash": "abc123def456hash"
  }
}
```
**Important:** `id` aur `hash` save karein, next steps ke liye zaroori hai!

---

## 4. Get Email Contacts (Recipients Data)
**UI Feature:** Recipients data table

**Kya kaam karta hai:**
- Campaign ke recipients (contacts) ki list fetch karta hai
- UI mein jo table dikhta hai (Name, Email, Mobile, DOB, Address), uska data yahan se aata hai
- Pagination support hai - page by page data milta hai

**Kaise kaam karta hai:**
1. Campaign `id` aur `hash` se campaign identify hota hai
2. `with_option` ke basis par contacts fetch hote hain:
   - **Option 0:** CSV/Excel file se contacts read hote hain
   - **Option 1:** Organization users fetch hote hain
   - **Option 2:** Group users fetch hote hain
3. Pagination apply hota hai (page, limit)
4. Response mein contacts list, total count, aur pagination info aata hai

**Parameters:**
- `id`: Campaign ID (create response se mila)
- `hash`: Campaign hash (create response se mila)
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 25)

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/get-email-contects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "id": 123,
    "hash": "campaign_hash_here",
    "page": 1,
    "limit": 25
  }'
```

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "list": [
      {
        "Name": "Test User",
        "Email": "testmail@mailinator.com",
        "Mobile Number": "1234567890",
        "Date of Birth": "11-12-2022",
        "Address": "Test Address"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 25,
    "pages": 1
  }
}
```

---

## 5. Step Two (Content, Attachment, Test Mail)
**UI Feature:** Rich text editor, Attachment, Send test mail

**Kya kaam karta hai:**
- Campaign ka content (HTML email body) save karta hai
- Attachments upload karta hai (max 4 files)
- Test email address save karta hai
- Schedule date/time set karta hai
- Approval workflow handle karta hai

**Kaise kaam karta hai:**
1. Campaign `id` aur `hash` se existing campaign fetch hota hai
2. **Template Content:** HTML content save hota hai (rich text editor se)
3. **Merge Tags:** `{Name}`, `{Email}`, `{Mobile Number}` replace hote hain actual data se
4. **Attachments:** Files upload hote hain (max 4 PDF files)
5. **Test Email:** Test email address save hota hai
6. **Schedule:** Date/time aur timezone save hota hai
7. **Approval:** Role-based approval workflow trigger hota hai

**Merge Tags (Personalize emails):**
- `{Name}` → Contact ka naam
- `{Email}` → Contact ka email
- `{Mobile Number}` → Contact ka mobile
- `{Date of Birth}` → Contact ka DOB
- `{Address}` → Contact ka address
- Aur bhi columns jo CSV mein hain

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/step-two" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "id=123" \
  -F "hash=campaign_hash_here" \
  -F "template_content=<html><body><h1>Test Campaign</h1><p>Hello {Name}</p></body></html>" \
  -F "testemail=test@example.com" \
  -F "schedule_datetime=2026-01-25 05:45:00" \
  -F "timezone=UTC" \
  -F "attachment=@/path/to/file.pdf"
```

**Parameters:**
- `id`: Campaign ID (required)
- `hash`: Campaign hash (required)
- `template_content`: HTML email content (rich text editor se)
- `testemail`: Test email address (optional)
- `schedule_datetime`: Schedule date/time (format: "YYYY-MM-DD HH:mm:ss")
- `timezone`: Timezone (e.g., "UTC", "America/Chicago")
- `attachment`: PDF file path (max 4 files: attachment, attachment1, attachment2, attachment3)
- `actionType`: "1" (Save Draft), "2" (Schedule), "3" (Update), "4" (Update)

**Multiple Attachments:**
```bash
-F "attachment=@/path/to/file1.pdf" \
-F "attachment1=@/path/to/file2.pdf" \
-F "attachment2=@/path/to/file3.pdf" \
-F "attachment3=@/path/to/file4.pdf"
```

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "message": "Campaign updated successfully"
}
```

---

## 6. Send Test Mail
**UI Feature:** Send test mail button

**Kya kaam karta hai:**
- Campaign ka test email send karta hai specified email address par
- User ko preview milta hai ke final email kaisa dikhega
- Merge tags actual data se replace hote hain
- Test email send hone ke baad status update hota hai

**Kaise kaam karta hai:**
1. Campaign `id` aur `hash` se campaign fetch hota hai
2. Template content load hota hai
3. Test user data se merge tags replace hote hain:
   - `{Name}` → Test user ka naam
   - `{Email}` → Test user ka email
   - `{Mobile Number}` → Test user ka mobile
4. Email send hota hai test email address par
5. `sendtestmailstatus` = 1 set hota hai (test mail sent)
6. `testemail` field mein email address save hota hai

**Important:**
- Test email `@preventioncloud.com` domain par send nahi hota (blocked)
- Email format validate hota hai
- Test mail send hone ke baad hi campaign schedule kar sakte hain

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/send-test-mail" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "id=123" \
  -F "hash=campaign_hash_here" \
  -F "testemail=test@example.com"
```

**Parameters:**
- `id`: Campaign ID (required)
- `hash`: Campaign hash (required)
- `testemail`: Test email address (required, valid email format)

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "message": "Test email sent successfully"
}
```

---

## 7. Get One Campaign (View Campaign)
**UI Feature:** Campaign details view

**Kya kaam karta hai:**
- Campaign ki complete details fetch karta hai
- UI mein campaign view/edit page par data load karne ke liye use hota hai
- All campaign fields return hote hain (title, content, schedule, status, etc.)

**Kaise kaam karta hai:**
1. Campaign `id` aur `hash` se campaign fetch hota hai
2. Database se complete campaign record load hota hai
3. Template content, attachments, schedule info, approval status sab return hota hai
4. Company logo append hota hai template content mein
5. Next/Previous campaign navigation bhi milta hai (group campaigns ke liye)

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/get-one" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "id": 123,
    "hash": "campaign_hash_here"
  }'
```

**Parameters:**
- `id`: Campaign ID (required)
- `hash`: Campaign hash (required)

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "data": {
    "id": 123,
    "hash": "abc123hash",
    "campaign_title": "Test Campaign",
    "subject": "Test Subject",
    "template_content": "<html>...</html>",
    "from_email_id": 1,
    "schedule_datetime": "2026-01-25 05:45:00",
    "timezone": "UTC",
    "request_status": 0,
    "approval_status": 0,
    "attachment": "[{\"file\":\"path/to/file.pdf\"}]",
    "testemail": "test@example.com",
    "sendtestmailstatus": 1
  }
}
```

---

## 8. Schedule Campaign (Final Step)
**UI Feature:** Schedule Date & Time, Schedule Campaign button

**Kya kaam karta hai:**
- Campaign ko schedule karta hai specified date/time par
- Campaign status update hota hai (scheduled)
- Approval workflow trigger hota hai (agar required hai)
- Campaign queue mein add hota hai sending ke liye

**Kaise kaam karta hai:**
1. Campaign `id` aur `hash` se campaign fetch hota hai
2. `schedule_datetime` aur `timezone` validate aur save hote hain
3. UTC conversion hota hai schedule time ka
4. `actionType=2` se campaign schedule hota hai
5. Approval check:
   - Agar approval required hai to approval workflow start hota hai
   - Agar approval nahi chahiye to directly scheduled ho jata hai
6. Campaign status update hota hai
7. Cron job scheduled time par emails send karega

**Action Types:**
- `actionType=1`: Save as Draft (campaign save hota hai, schedule nahi)
- `actionType=2`: Schedule Campaign (campaign schedule hota hai)
- `actionType=3`: Update Campaign (existing campaign update)
- `actionType=4`: Update Campaign (existing campaign update)

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/step-two" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "id=123" \
  -F "hash=campaign_hash_here" \
  -F "schedule_datetime=2026-01-25 05:45:00" \
  -F "timezone=UTC" \
  -F "actionType=2"
```

**Parameters:**
- `id`: Campaign ID (required)
- `hash`: Campaign hash (required)
- `schedule_datetime`: Schedule date/time (format: "YYYY-MM-DD HH:mm:ss")
- `timezone`: Timezone (e.g., "UTC", "America/Chicago")
- `actionType`: "2" (Schedule Campaign)

**Response Example:**
```json
{
  "statusCode": 200,
  "success": 1,
  "message": "Campaign scheduled successfully"
}
```

**Important:**
- Schedule time future mein hona chahiye
- Test mail send karna zaroori hai pehle (approval workflow ke liye)
- UTC timezone conversion automatically hota hai

---

## Complete Flow Example

Yeh complete flow dikhata hai ke kaise step-by-step campaign create karein:

---

### Step 1: Create Campaign
**Kya hota hai:** Campaign create hota hai, recipients select hote hain

**Kaise:**
1. CSV file upload karein ya organization/group select karein
2. Campaign title, from email, subject set karein
3. Response mein `id` aur `hash` milta hai

```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/create" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "with_option=0" \
  -F "campaign_title=My Test Campaign" \
  -F "from_email_id=1" \
  -F "subject=Test Email Subject" \
  -F "file=@contacts.csv"
```

**Response se `id` aur `hash` save karein!**

---

### Step 2: Add Content & Test Mail
**Kya hota hai:** Email content (HTML), attachments, aur test email address save hota hai

**Kaise:**
1. Rich text editor se HTML content paste karein
2. Merge tags use karein: `{Name}`, `{Email}`, `{Mobile Number}`
3. Attachments upload karein (optional)
4. Test email address set karein

```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/step-two" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "id=123" \
  -F "hash=abc123hash" \
  -F "template_content=<html><body><h1>Hello {Name}</h1><p>Your email: {Email}</p><p>Mobile: {Mobile Number}</p></body></html>" \
  -F "testemail=your-email@example.com"
```

---

### Step 3: Send Test Mail
**Kya hota hai:** Test email send hota hai preview ke liye

**Kaise:**
1. Test email address par email send hota hai
2. Merge tags actual data se replace hote hain
3. User ko preview milta hai ke final email kaisa dikhega
4. Status update hota hai (test mail sent)

```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/send-test-mail" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "id=123" \
  -F "hash=abc123hash" \
  -F "testemail=your-email@example.com"
```

**Important:** Test mail send karna zaroori hai approval workflow ke liye!

---

### Step 4: Schedule Campaign
**Kya hota hai:** Campaign schedule hota hai specified date/time par

**Kaise:**
1. Schedule date/time set karein
2. Timezone select karein
3. `actionType=2` se campaign schedule karein
4. Approval workflow trigger hota hai (agar required)
5. Scheduled time par emails automatically send honge

```bash
curl -X POST "http://localhost:3000/communication/email-campaign-requests/step-two" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "id=123" \
  -F "hash=abc123hash" \
  -F "schedule_datetime=2026-01-25 05:45:00" \
  -F "timezone=UTC" \
  -F "actionType=2"
```

**Flow Complete!** Campaign scheduled ho gaya, scheduled time par emails send honge.

---

## Test CSV File Format

Create a file `contacts.csv`:
```csv
Name,Email,Mobile Number,Date of Birth,Address
Test User,testmail@mailinator.com,1234567890,11-12-2022,Test Address
John Doe,john@example.com,9876543210,01-01-1990,123 Main St
```

**Important:** Email column required hai!

---

## Common Headers

Sabhi requests mein yeh headers add karein:
```bash
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "lang: eng"
```

File upload ke liye:
```bash
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "lang: eng"
```
*(Content-Type automatically set hoga multipart/form-data)*

---

## Error Handling

Agar error aaye to check karein:
1. Token valid hai ya nahi
2. Role Guard permission check (database/file se)
3. Required fields missing to nahi
4. File format correct hai ya nahi (CSV/Excel)
5. Email column CSV mein hai ya nahi

---

## Notes

- **Token:** Login ke baad milne wala JWT token use karein
- **Base URL:** Apna actual backend URL use karein
- **File Path:** Absolute path use karein file upload ke liye
- **Merge Tags:** Template mein `{Name}`, `{Email}`, `{Mobile Number}` use kar sakte hain
- **Permissions:** Role Guard se check hoga - UI mein checkbox tick karein
