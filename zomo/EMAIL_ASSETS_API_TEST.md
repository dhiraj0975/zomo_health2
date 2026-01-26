# Email Assets API - CURL Commands for Testing

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

## 1. Paginate (List Assets)
**UI Feature:** Gallery view - Assets list with pagination

**Endpoint:** `/communication/email-assets/paginate`

**Kya kaam karta hai:**
- S3 bucket se uploaded assets (images/videos) ki list fetch karta hai
- Pagination support hai - continuationToken se next page load hota hai
- Role-based filtering: Role 11 ko sirf org-specific assets dikhte hain, baaki ko global assets
- Search functionality available hai

**Kaise kaam karta hai:**
1. Role check hota hai (`role_id = 11` ko org-specific, baaki ko global)
2. Search string provided hai to specific folders mein search hota hai
3. S3 bucket se assets list fetch hoti hai (max 20 items per page)
4. Assets ko modification date ke basis par sort kiya jata hai (latest first)
5. Each asset ka full URL append hota hai response mein

**CURL Command (No Search):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/paginate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{}'
```

**CURL Command (With Search):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/paginate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "searchstr": "campaign_image"
  }'
```

**CURL Command (With Pagination):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/paginate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "continuationToken": "CONTINUATION_TOKEN_FROM_PREVIOUS_RESPONSE"
  }'
```

**Parameters:**
- `searchstr` (optional): Search keyword for filtering assets
- `continuationToken` (optional): Token for next page (previous response se milta hai)

**Response Example:**
```json
{
  "statusCode": 201,
  "success": 1,
  "error": 0,
  "data": {
    "datas": [
      {
        "Key": "zhGloImg/38/0/campaign_image.png",
        "LastModified": "2026-01-25T12:30:00.000Z",
        "Size": 15234,
        "url": "https://s3-bucket-url.com/zhGloImg/38/0/campaign_image.png"
      }
    ],
    "NextContinuationToken": "token_for_next_page"
  },
  "message": "Assets successfully uploaded"
}
```

---

## 2. Create (Upload Multiple Assets)
**UI Feature:** Bulk upload - Multiple images upload karein

**Endpoint:** `/communication/email-assets/create`

**Kya kaam karta hai:**
- Multiple files (images/videos) ko ek saath S3 bucket mein upload karta hai
- Files ko appropriate folder structure mein save karta hai
- Role-based folder organization (global ya org-specific)
- Special characters ko filename se remove karta hai

**Kaise kaam karta hai:**
1. `org_id` provided hai to org-specific folder mein save hota hai
2. Role check: Role 11 = org folder, baaki = global folder
3. Folder path generate hota hai: `zhOrgImg/11/123` ya `zhGloImg/38/0`
4. Each file ko process karta hai:
   - Special characters replace karta hai filename se
   - Folder prefix add karta hai
   - S3 bucket mein upload karta hai
5. Error handling: Access denied, file too large, etc.

**Folder Structure:**
- **Organization Assets:** `zhOrgImg/{role_id}/{org_id}/filename.png`
- **Global Assets:** `zhGloImg/{role_id}/0/filename.png`

**CURL Command (Global Upload):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/create" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "files=@/path/to/image1.png" \
  -F "files=@/path/to/image2.jpg" \
  -F "files=@/path/to/image3.gif"
```

**CURL Command (Organization Upload):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/create" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "org_id=123" \
  -F "files=@/path/to/image1.png" \
  -F "files=@/path/to/image2.jpg"
```

**Parameters:**
- `files` (required): Array of files to upload (image/video files)
- `org_id` (optional): Organization ID - agar provide kiya to org-specific folder mein save hoga

**Allowed File Types:**
- Images: PNG, JPG, JPEG, GIF
- Videos: MP4, AVI, MOV

**Response Example:**
```json
{
  "statusCode": 201,
  "success": 1,
  "error": 0,
  "message": "Assets successfully uploaded",
  "data": [
    "zhGloImg/38/0/campaign_banner.png",
    "zhGloImg/38/0/email_header.jpg",
    "zhGloImg/38/0/footer_logo.gif"
  ]
}
```

**Error Response Example:**
```json
{
  "statusCode": 413,
  "success": 0,
  "error": 1,
  "message": "File is too large to upload",
  "data": null
}
```

---

## 3. Delete (Remove Asset)
**UI Feature:** Delete button - Gallery se asset delete karein

**Endpoint:** `/communication/email-assets/delete`

**Kya kaam karta hai:**
- S3 bucket se specific asset ko delete karta hai
- Role-based permission check karta hai
- Sirf authorized users hi assets delete kar sakte hain

**Kaise kaam karta hai:**
1. Asset key (file path) required hai
2. User ka role check hota hai
3. Asset ka role extract hota hai key se (e.g., `zhGloImg/38/0/file.png` → role 38)
4. Permission matrix check:
   - Role 1: All access (roles: 1,8,11,19,20,25,37,38,39,40,41,42,43)
   - Role 38/43: Can delete (38,43,39,40,41,11)
   - Role 39: Can delete (39,40,41,11)
   - Role 40/41/11: Can delete only own role
5. Agar permission hai to S3 se file delete hoti hai

**CURL Command:**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/delete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "key": "zhGloImg/38/0/campaign_image.png"
  }'
```

**Parameters:**
- `key` (required): S3 asset key/path to delete (previous API responses se milta hai)

**Response Example (Success):**
```json
{
  "success": 1,
  "error": 0,
  "message": "Asset successfully deleted",
  "data": null
}
```

**Response Example (No Permission):**
```json
{
  "statusCode": 403,
  "success": 0,
  "error": 1,
  "message": "You do not have permission to delete this asset",
  "data": null
}
```

---

## 4. Get Gallery (Organized Gallery View)
**UI Feature:** Categorized gallery - Icon, Video, Image galleries

**Endpoint:** `/communication/email-assets/getgallery`

**Kya kaam karta hai:**
- Specific type ke assets fetch karta hai (icon, video, image)
- Global ya organization assets filter karta hai
- Pagination support (max 24 items per page)

**Kaise kaam karta hai:**
1. `ImageType` ke basis par folder select hota hai:
   - **icon**: `zhAIcon` (global) ya `zhOrgIcon/11/123` (org)
   - **video**: `zhGloImg` (global) ya `zhOrgImg/11/123` (org)
   - **image**: `zhGloImg` (global) ya `zhOrgImg/11/123` (org)
2. `optionType` check: 'global' ya 'org'
3. Role 11 ko org-specific folder access, baaki ko global
4. S3 se assets list fetch hoti hai (max 24 items)
5. Continuation token return hota hai next page ke liye

**CURL Command (Global Icons):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/getgallery" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "ImageType": "icon",
    "optionType": "global"
  }'
```

**CURL Command (Organization Videos):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/getgallery" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "ImageType": "video",
    "optionType": "org"
  }'
```

**CURL Command (With Pagination):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/getgallery" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "ImageType": "image",
    "optionType": "global",
    "continuationToken": "CONTINUATION_TOKEN_FROM_PREVIOUS_RESPONSE"
  }'
```

**Parameters:**
- `ImageType` (required): "icon", "video", or "image"
- `optionType` (required): "global" or "org"
- `continuationToken` (optional): Token for pagination

**Response Example:**
```json
{
  "statusCode": 201,
  "success": 1,
  "error": 0,
  "data": {
    "datas": [
      {
        "Key": "zhAIcon/social_icon.png",
        "LastModified": "2026-01-25T10:00:00.000Z",
        "Size": 5120
      }
    ],
    "NextContinuationToken": "next_page_token"
  },
  "message": "success"
}
```

---

## 5. Upload Item (Single Upload with Watermark)
**UI Feature:** Single file upload with watermark option

**Endpoint:** `/communication/email-assets/uploaditem`

**Kya kaam karta hai:**
- Single file upload karta hai (icon ya video)
- Video images par watermark apply kar sakta hai
- Existing image select karke watermark add kar sakta hai
- Role-based folder organization

**Kaise kaam karta hai:**
1. **Icon Upload:**
   - File upload hota hai
   - Special characters remove hote hain filename se
   - Folder path: `zhOrgIcon/11/123` ya `zhAIcon/38/0`
   - S3 mein upload hota hai

2. **Video Image Upload:**
   - **Option A:** New file upload with watermark
     - Watermark design select karo (`waterMarkId`)
     - File upload ho kar watermark apply hota hai
   - **Option B:** Existing image select with watermark
     - `selectedImageKey` se image download hota hai S3 se
     - Watermark apply hota hai
     - New file save hota hai with watermark

**Folder Structure:**
- **Video Images:** `videoImage/{role_id}/{org_id}/filename.png`
- **Icons:** `zhOrgIcon/{role_id}/{org_id}/icon.png` (org) ya `zhAIcon/{role_id}/0/icon.png` (global)

**CURL Command (Upload Icon):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/uploaditem" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "ImageType=icon" \
  -F "optionType=global" \
  -F "files=@/path/to/icon.png"
```

**CURL Command (Upload Video with Watermark - New File):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/uploaditem" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "ImageType=video" \
  -F "optionType=org" \
  -F "org_id=123" \
  -F "waterMarkId=1" \
  -F "files=@/path/to/video_thumbnail.png"
```

**CURL Command (Upload Video with Watermark - Existing Image):**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/uploaditem" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "ImageType=video" \
  -F "optionType=global" \
  -F "waterMarkId=2" \
  -F "selectedImageKey=videoImage/38/0/existing_image.png"
```

**Parameters:**
- `ImageType` (required): "icon" or "video"
- `optionType` (required): "global" or "org"
- `org_id` (optional): Organization ID - agar `optionType=org` hai to required
- `files` (required for new upload): Image file to upload
- `waterMarkId` (optional for video): Watermark design ID (1-5)
- `selectedImageKey` (optional for video): Existing image key from S3

**Watermark Designs:**
Available watermark designs: `design1.png`, `design2.png`, `design3.png`, `design4.png`, `design5.png`
(Located at: `./public/upload/watermark/design{1-5}.png`)

**Response Example:**
```json
{
  "statusCode": 201,
  "success": 1,
  "error": 0,
  "data": null,
  "message": "success"
}
```

---

## Complete Flow Examples

### Flow 1: Upload Multiple Campaign Images
**Use Case:** Campaign ke liye multiple images upload karni hain

**Step 1: Upload Images**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/create" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "files=@banner.png" \
  -F "files=@logo.jpg" \
  -F "files=@footer.gif"
```

**Step 2: View Uploaded Assets**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/paginate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{}'
```

---

### Flow 2: Upload Video Thumbnail with Watermark
**Use Case:** Video thumbnail upload karni hai watermark ke saath

**Step 1: Upload Video Image with Watermark**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/uploaditem" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -F "ImageType=video" \
  -F "optionType=org" \
  -F "org_id=123" \
  -F "waterMarkId=1" \
  -F "files=@thumbnail.png"
```

**Step 2: Get Video Gallery**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/getgallery" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "ImageType": "video",
    "optionType": "org"
  }'
```

---

### Flow 3: Delete Unwanted Assets
**Use Case:** Gallery se unwanted images delete karni hain

**Step 1: Get Assets List**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/paginate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{}'
```

**Step 2: Delete Specific Asset**
```bash
curl -X POST "http://localhost:3000/communication/email-assets/delete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "lang: eng" \
  -d '{
    "key": "zhGloImg/38/0/old_campaign_image.png"
  }'
```

---

## Common Headers

Sabhi requests mein yeh headers add karein:

**JSON Requests:**
```bash
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "lang: eng"
```

**File Upload Requests:**
```bash
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "lang: eng"
```
*(Content-Type automatically set hoga multipart/form-data)*

---

## S3 Folder Structure

```
S3 Bucket (COMMUNICATION)
├── zhGloImg/                    # Global Images
│   ├── 38/0/                   # Role 38 global images
│   ├── 39/0/                   # Role 39 global images
│   └── 40/0/                   # Role 40 global images
│
├── zhOrgImg/                    # Organization Images
│   └── 11/{org_id}/            # Org-specific images
│
├── zhAIcon/                     # Global Icons
│   └── {role_id}/0/
│
├── zhOrgIcon/                   # Organization Icons
│   └── 11/{org_id}/
│
└── videoImage/                  # Video Thumbnails
    └── {role_id}/{org_id}/
```

---

## Role Permission Matrix

### Upload Permissions:
- **Role 1:** All access (super admin)
- **Role 38-43:** Can upload to global folders
- **Role 11:** Can upload to org-specific folders
- **Others:** Based on role configuration

### Delete Permissions:
- **Role 1:** Can delete any asset
- **Role 38/43:** Can delete assets from roles 38,43,39,40,41,11
- **Role 39:** Can delete assets from roles 39,40,41,11
- **Role 40/41/11:** Can delete only own role assets

---

## Error Handling

### Common Errors:

**1. Missing Required Parameters**
```json
{
  "statusCode": 401,
  "success": 0,
  "error": 1,
  "message": "Required parameter missing",
  "data": null
}
```

**2. Access Denied**
```json
{
  "statusCode": 403,
  "success": 0,
  "error": 1,
  "message": "You do not have permission to delete this asset",
  "data": null
}
```

**3. File Too Large**
```json
{
  "statusCode": 413,
  "success": 0,
  "error": 1,
  "message": "File is too large to upload",
  "data": null
}
```

**4. No Files Selected**
```json
{
  "statusCode": 400,
  "success": 0,
  "error": 1,
  "message": "Please select some files to upload",
  "data": null
}
```

---

## Notes

- **Token:** Login ke baad milne wala JWT token use karein
- **Base URL:** Apna actual backend URL use karein (e.g., `https://api.example.com`)
- **File Path:** Absolute path use karein file upload ke liye
- **File Types:** PNG, JPG, JPEG, GIF for images; MP4, AVI, MOV for videos
- **Max Files:** `create` API mein multiple files upload kar sakte hain
- **Pagination:** `continuationToken` use karke next page load karein
- **Watermark:** Sirf video thumbnail upload mein available hai
- **Permissions:** Role-based access control strictly enforced hai

---

## API Summary

| API | Endpoint | Method | Purpose | File Upload |
|-----|----------|--------|---------|-------------|
| Paginate | `/paginate` | POST | List assets with pagination | No |
| Create | `/create` | POST | Upload multiple files | Yes (Multiple) |
| Delete | `/delete` | POST | Delete specific asset | No |
| Get Gallery | `/getgallery` | POST | Get categorized assets | No |
| Upload Item | `/uploaditem` | POST | Upload single file with watermark | Yes (Single) |

---

**Happy Testing! 🚀**
