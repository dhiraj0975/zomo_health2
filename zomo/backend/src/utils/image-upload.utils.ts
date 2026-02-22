import { Request } from "express";
import * as path from 'path';
import { Translator } from "src/modules/translation/translator";
import { v4 as uuidv4 } from 'uuid';
// Provide the directory path where translation files are located
const translationsDir = path.join(__dirname, '..', 'local');
const translator = new Translator(translationsDir, null, null); // Create an instance of the Translator class
export const fileName = (req: Request, file: any, callback: any) => {
    const saveAsFileName = Date.now() + file.originalname.replace(/[^a-zA-Z0-9.]/g, '');
    callback(null, `${saveAsFileName}`);
}
export const fileNameUUID = (req: Request, file: any, callback: any) => {
    const uniqueId = uuidv4();  
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '');  
    const saveAsFileName = `${uniqueId}${sanitizedFileName}`;
    callback(null, `${saveAsFileName}`);
}
export const imgFilter = (req: Request, file: any, callback: any) => {
    if(file.fieldname == 'img'){
        if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
            let error = 'ERR_FILE_TYPE';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(file.fieldname == 'profile_image'){
        if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
            let error = 'The User could not be saved. Image type png, jpg, jpeg only. Please select valid image type.';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(file.fieldname == 'post_img' || file.fieldname == 'display_area'){
        if(file.fieldname == 'post_img'){
            if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|svg)$/)) {
                let error = "Content could not be saved. Image type png, jpg, jpeg, svg only. Please select valid image type.";
                const errorMessage = translator.translate(req.lang, error);
                return callback(new Error(errorMessage), false);
            }
        }
        if(file.fieldname == 'display_area'){
            if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|svg|pdf|heic|docx|doc)$/)) {
                let error = "Please try to upload a file smaller than 2 MB and in the following formats: .jpg, .jpeg, .png, .svg, .pdf, .heic, .docx, .doc. The selected file is rejected.";
                const errorMessage = translator.translate(req.lang, error);
                return callback(new Error(errorMessage), false);
            }
        }
    }
    if(file.fieldname == 'logo_image'){
        if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
            let error = 'Your selected Logo file type is not valid. Please select a .jpeg, .jpg or .png file type.';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(file.fieldname == 'company_logo'){
        // Check if it's actually a file upload, not a string
        if (!file || !file.originalname) {
            let error = 'Company logo must be a valid image file. Please select a file to upload.';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
        
        // Validate file extension
        if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|svg)$/)) {
            let error = 'Company logo must be a valid image file. Please select a .jpeg, .jpg, .png or .svg file type.';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(file.fieldname.startsWith('dashboard_data[')){
        if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|svg)$/)) {
            let error = 'Dashboard images must be valid image files. Please select .jpeg, .jpg, .png or .svg file types only.';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(file.fieldname === 'original_file'){
        if (!file.originalname.toLowerCase().match(/\.(xls|xlsx|csv)$/)) {
            let error = 'Original file must be an Excel or CSV file. Please select .xls, .xlsx or .csv file types only.';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(file.fieldname === 'origional_file'){
        if (!file.originalname.toLowerCase().match(/\.(xls|xlsx|csv)$/)) {
            let error = 'Original file must be an Excel or CSV file. Please select .xls, .xlsx or .csv file types only.';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }

    if(file.fieldname === 'attachment'){
        if (!file.originalname.toLowerCase().match(/\.(pdf|doc|docx|jpg|jpeg|png|txt)$/)) {
            let error = 'Attachment must be a valid document or image file. Please select .pdf, .doc, .docx, .jpg, .jpeg, .png or .txt file types only.';
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    return callback(null, true);
}
export const imgsFilter = (req: Request, file: any, callback: any) => {
    if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|pjpeg|x-png|pdf)$/)) {
        let error = "ERR_IMAGE_TYPE";
        if(file.fieldname == 'profile_image'){
            error = 'The User could not be saved. Please select valid image type(png, jpg, jpeg only).';
        }
        const errorMessage = translator.translate(req.lang, error);
        return callback(new Error(errorMessage), false);
    }
    return callback(null, true);
}
export const filesFilter = (req: Request, file: any, callback: any) => {
    if(file.fieldname == 'img'){
        if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|pdf|heic|docx|doc)$/)) {
            let error = "Please try to upload a file smaller than 2 MB and in the following formats: .jpg, .jpeg, .png, .pdf, .heic, .docx, .doc. The selected file is rejected.";
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(file.fieldname == 'image'){
        if (req?.originalUrl == '/my-plan/complete-activity/create') {
            if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|pdf|heic|bmp|jfif)$/)) {
                let error = "Please try to upload a file smaller than 2 MB and in the following formats: .jpg, .jpeg, .png, .pdf, .heic, .bmp, .jfif. The selected file is rejected.";
                const errorMessage = translator.translate(req.lang, error);
                return callback(new Error(errorMessage), false);
            }
            return callback(null, true);
        }
    }
    if(file.fieldname == 'post_img'){
        if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|svg)$/)) {
            let error = "Content could not be saved. Image type png, jpg, jpeg, svg only. Please select valid image type.";
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(file.fieldname == 'display_area'){
        if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|svg|pdf|heic|docx|doc)$/)) {
            let error = "Please try to upload a file smaller than 2 MB and in the following formats: .jpg, .jpeg, .png, .svg, .pdf, .heic, .docx, .doc. The selected file is rejected.";
            const errorMessage = translator.translate(req.lang, error);
            return callback(new Error(errorMessage), false);
        }
    }
    if(!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|pdf|heic|docx|doc|xls|xlsx|csv|json)$/)){
        const errorMessage = translator.translate(req.lang, "ERR_FILE_TYPE");
        return callback( new Error(errorMessage), false);
    }
    return callback(null, true);
}
export const docsFilter = (req: Request, file: any, callback: any) => {
    if(!file.originalname.toLowerCase().match(/\.(pdf|docx|doc)$/)){
        const errorMessage = translator.translate(req.lang, "ERR_FILE_TYPE");
        return callback( new Error(errorMessage), false);
    }
    return callback(null, true);
}
export const fileFilter = (req: Request, file: any, callback: any) => {
    if(!file.originalname.toLowerCase().match(/\.(xls|xlsx|csv|json)$/)){
        const errorMessage = translator.translate(req.lang, "ERR_IMAGE_TYPE");
        return callback( new Error(errorMessage), false);
    }
    return callback(null, true);
}
export const datafileFilter = (req: Request, file: any, callback: any) => {
    if(!file.originalname.toLowerCase().match(/\.(xls|xlsx|csv)$/)){
        const errorMessage = translator.translate(req.lang, "ERR_DATA_FILE_TYPE");
        return callback( new Error(errorMessage), false);
    }
    return callback(null, true);
}
export const xlsxFileFilter = (req: Request, file: any, callback: any) => {
    if (!file.originalname.toLowerCase().match(/\.(xlsx)$/)) {
        const errorMessage = translator.translate(req.lang, "ERR_XLSX_FILE_TYPE");
        return callback(new Error(errorMessage), false);
    }
    callback(null, true);
};
export const attachmentFileFilter = (req: Request, file: any, callback: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
        const errorMessage = translator.translate(req.lang, "ERR_DATA_ATTCHAMENT_FILE_TYPE");
        return callback( new Error(errorMessage), false);
    }
    return callback(null, true);
}
export const document_Filter = (req: Request, file: any, callback: any) => {
    if (file.originalname.toLowerCase().match(/\.(gif|bat|exe|cmd|sh|php|pl|cgi|386|dll|com|torrent|js|app|jar|pif|vb|vbscript|wsf|asp|cer|csr|jsp|drv|sys|ade|adp|bas|chm|cpl|crt|csh|fxp|hlp|hta|inf|ins|isp|jse|htaccess|htpasswd|ksh|lnk|mdb|mde|mdt|mdw|msc|msi|msp|mst|ops|pcd|prg|reg|scr|sct|shb|shs|url|vbe|vbs|wsc|wsf|wsh)$/)) {
        const errorMessage = translator.translate(req.lang, "ERR_INVALID_FILE");
        return callback(new Error(errorMessage), false);
    }
    return callback(null, true);
}
export const files_Filter = (req: Request, file: any, callback: any) => {
    if (file.originalname.toLowerCase().match(/\.(gif|bat|exe|cmd|sh|php|pl|cgi|386|dll|com|torrent|js|app|jar|pif|vb|vbscript|wsf|asp|cer|csr|jsp|drv|sys|ade|adp|bas|chm|cpl|crt|csh|fxp|hlp|hta|inf|ins|isp|jse|htaccess|htpasswd|ksh|lnk|mdb|mde|mdt|mdw|msc|msi|msp|mst|ops|pcd|prg|reg|scr|sct|shb|shs|url|vbe|vbs|wsc|wsf|wsh|tmp|html|ctp|tpl)$/)) {
        const errorMessage = translator.translate(req.lang, "ERR_INVALID_FILE");
        return callback(new Error(errorMessage), false);
    }
    return callback(null, true);
}