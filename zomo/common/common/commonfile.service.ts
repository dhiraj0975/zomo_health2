import { Injectable } from '@nestjs/common';
import * as archiver from 'archiver';
import * as crypto from 'crypto';
import * as csv from 'csv-parser';
import { createArrayCsvWriter } from 'csv-writer';
import * as fs from "fs";
import * as fsI from 'fs-extra';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { appConstant } from '../constant';
import DeviceDetector = require('device-detector-js');
// import * as csvGenerate from 'csv-generate';
import { InjectDataSource } from '@nestjs/typeorm';
import { exec, spawn } from 'child_process';
import * as fastCsv from 'fast-csv';
import * as path from 'path';
import { promisify } from 'util';
import { CommonService } from './common.service';
import { CommonDateService } from './commondate.service';
const TRANSLATIONS_DIR = appConstant.TRANSLATIONS_DIR || './src/local';
const readFileAsync = promisify(fs.readFile);
const deviceDetector = new DeviceDetector();
const S3_URL =  process.env.S3_URL_PROD
const secretKey = process.env.SECRET_KEY_PROD.slice(0, 32);
const iv = process.env.SECRET_KEY_PROD.slice(0, 16);
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(secretKey!, 'salt', 32);
@Injectable()
export class CommonFileService {
    constructor(
        // private readonly dataSource: DataSource
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase()) 
            private readonly dataSource: DataSource,
        private readonly commonDateService: CommonDateService,
        private readonly commonService: CommonService,
    ) {}
    

    async removeFileFromLocal(filePath: string) {
        try{
            if (filePath) {
                const fullPath = join(process.cwd(), filePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        }catch(err){
            throw new Error(err.message);
        }
    }
    async removeFolderFromLocal(filePath: string) {
        try{
            if (filePath) {
                const fullPath = join(process.cwd(), filePath);
                if (fs.existsSync(fullPath)) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                }
            }
        }catch(err){
            throw new Error(err.message);
        }
    }
    addMembershipCodeCondition(req: any, where: any) {
        try {
            if (req.tokenUser?.role_id === appConstant.ROLE.ORGADMIN && req.tokenUser?.organisation_code) {
                Object.assign(where, { membership_code: req.tokenUser?.organisation_code });
            }
        } catch (err) {
            throw new Error(err.message);
        }
    }
    quoteEscaper(str): string {
        try{
            let string: string = str ? str.replace(/(['"])/g, '\\$1') : ''
            return string;
        }catch(err){
            throw new Error(err.message);
        }
    }
    fileToZip = (file: any) => {
        try{
            return new Promise((resolve, reject) => {
                const saveAsFileName = `${file.filename.match(/(.+?)(?=\.[^.]*$)/)[0]}.zip`;
                const output = fs.createWriteStream(`${file.destination}${saveAsFileName}`);
                const archive = archiver('zip', { zlib: { level: 9 } });
                archive.pipe(output);
                archive.file(`${file.destination}${file.filename}`, { name: `${file.filename}` });
                archive.finalize();
                output.on('close', function () {
                    resolve(join(file.path, '..', '/') + `${saveAsFileName}`);
                });
                archive.on('error', function (err) {
                    reject(err);
                });
            });
        }catch(err){
            throw new Error(err.message);
        }
    };
    getCsvFileHeaderData(file: any,status: number) {
        try{
            const headerData: string[] = [];
            const sheetData = [];
            return new Promise((resolve, reject) => {
                fs.createReadStream(`${file.destination}${file.filename}`)
                    .pipe(csv())
                    .on('headers', (headers) => {
                        if (headers.length === 0) {
                            reject('Headers not found in the CSV file');
                        }
                        headerData.push(...headers);
                    })
                    .on('data', (data) => {
                        if (!data) {
                            reject('No data found in the Excel file');
                        }
                        sheetData.push(Object.values(data));
                    })
                    .on('end', () => {
                        if (status == 0) {
                            resolve(headerData);
                        } else {
                            resolve(sheetData);
                        }
                    })
                    .on('error', (error) => {
                        reject(error);
                    });
            });
        }catch(err){
            throw new Error(err.message);
        }
    }
    getDepartmentCsvData(file: any) {
        try{
            const headerData: string[] = [];
            const sheetData = [];
            return new Promise((resolve, reject) => {
                fs.createReadStream(`${file.destination}${file.filename}`)
                    .pipe(csv())
                    .on('data', (data) => {
                        if (!data) {
                            reject('No data found in the Excel file');
                        }
                        sheetData.push(Object.values(data));
                    })
                    .on('end', () => {
                        resolve(sheetData);
                    })
                    .on('error', (error) => {
                        reject(error);
                    });
            });
        }catch(err){
            throw new Error(err.message);
        }
    }
    getLocationCsvData(file: any) {
        try{
            const headerData: string[] = [];
            const sheetData = [];
            return new Promise((resolve, reject) => {
                fs.createReadStream(`${file.destination}${file.filename}`)
                    .pipe(csv())
                    .on('data', (data) => {
                        if (!data) {
                            reject('No data found in the Excel file');
                        }
                        sheetData.push(Object.values(data));
                    })
                    .on('end', () => {
                        resolve(sheetData);
                    })
                    .on('error', (error) => {
                        reject(error);
                    });
            });
        }catch(err){
            throw new Error(err.message);
        }
    }
    generateFileName = (folder: string, id: string, prefix: string, extension: string) => {
        try{
            let filename = folder + `/` + id + '/' + prefix + this.commonService.generateMD5(id) + this.commonDateService.getTodayDate().unix() + `.${extension}`;
            return filename;
        }catch(err){
            throw new Error(err.message);
        }
    };
    replaceSpecialCharactersWithUnderscore = (inputString: string) => {
        try{
            const regex = /[^\w\s]/g;
            return inputString.replace(regex, '_');
        }catch(err){
            throw new Error(err.message);
        }
    };

    getMappedValueFromSheet = (sheetColumn: string, usersData: any[] = [], mappedHeader: { [key: string]: any } = {}) => {
        try{
            let value = '';
            if (mappedHeader[sheetColumn] !== undefined && mappedHeader[sheetColumn] !== '') {
                if (usersData[mappedHeader[sheetColumn]] !== undefined && usersData[mappedHeader[sheetColumn]] !== '') {
                    value = usersData[mappedHeader[sheetColumn]].trim();
                }
            }
            return value;
        }catch(err){
            throw new Error(err.message);
        }
    };
    userSheetValidation(text: string | null | undefined, type: string = 'phone'): boolean {
        try {
            if (!text) {
                return false;
            }
            const patternNumber = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*(?![2-9]11)(?!555)([2-9][0-8][0-9])\s*\)|(?![2-9]11)(?!555)([2-9][0-8][0-9]))\s*(?:[.-]\s*)?)(?!(555(?:\s*(?:[.\-\s]\s*))(01([0-9][0-9])|1212)))(?!(555(01([0-9][0-9])|1212)))([2-9]1[02-9]|[2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;
            const patternEmail = /^([a-z0-9\+_\-]+)(\.[a-z0-9\+_\-]+)*@([a-z0-9\-]+\.)+[a-z]{2,6}$/;

            if (type === 'phone' && text.length <= 15 && patternNumber.test(text)) {
                return true;
            }
            if (type === 'email' && patternEmail.test(text.toLowerCase())) {
                return true;
            }

            return false;
        } catch (err) {
            throw new Error(err.message);
        }
    }


    getColumnValue = (sheetColumn: string, usersData: any[] = [], mappedHeader: { [key: string]: any } = {},) => {
        try {
            let colValue = this.getMappedValueFromSheet(sheetColumn, usersData, mappedHeader);
            switch (sheetColumn) {
                case 'H':
                    if (colValue.match(/^[a-zA-Z0-9 \s `. \' -]+$/)) {
                        return colValue;
                    } else {
                        return { org_val: colValue, error_code: 1002 };
                    }
                    break;
                case 'J':
                    if (colValue.match(/^[a-zA-Z0-9 \s `. \' -]+$/)) {
                        return colValue;
                    } else {
                        return { org_val: colValue, error_code: 1003 };
                    }
                    break;
                case 'M':
                    return colValue;
                    break;
                case 'O':
                case 'BC':
                    if (colValue != '') {
                        colValue = this.commonDateService.convertDateStrToTime(colValue);
                        let dobStr: string = this.commonDateService.checkDate(colValue);
                        if (dobStr) {
                            let dobArray = {};
                            dobArray['dob'] = dobStr != '0' ? dobStr : colValue;
                            let check18 = this.commonDateService.checkOver18(dobArray);
                            if (check18) {
                                return dobStr;
                            } else {
                                return { org_val: dobStr, error_code: 1004 };
                            }
                        } else {
                            return { org_val: colValue, error_code: 1004 };
                        }
                    } else {
                        return { org_val: colValue, error_code: 1004 };
                    }
                    break;
                case 'P':
                    if (colValue != '') {
                        colValue = this.commonDateService.convertDateStrToTime(colValue);
                        let hireDate = this.commonDateService.checkDate(colValue);
                        if (hireDate) {
                            return colValue;
                        } else {
                            return { org_val: colValue, error_code: 1029 };
                        }
                    }
                    return colValue;
                    break;
                case 'S':
                    if (colValue != '') {
                        if (this.userSheetValidation(colValue, 'email')) {
                            return colValue;
                        } else {
                            return { org_val: colValue, error_code: 1006 };
                        }
                    } else {
                        return { org_val: colValue, error_code: 1006 };
                    }
                    break;
                default:
                    return colValue;
            }
        }catch(err){
            throw new Error(err.message);
        }
    };
    dirIsExist = (directory: string) => {
        try{
            if (!fs.existsSync(directory)) {
                fs.mkdir(directory, { recursive: true }, (err) => {
                    if (err) {
                        return 'Please try again later.';
                    }
                });
            }
        }catch(err){
            throw new Error(err.message);
        }
    }
    fileExist = async (path: string) => {
        try{
            return fs.existsSync(path) ? true : false
        }catch(err){
            throw new Error(err.message);
        }
    }
    createCsvFile = async (
        columnNameArr: string[],
        columnDataArr: any[],
        directoryPath: string,
        filename: string
    ): Promise<void> => {
        try{
            return new Promise((resolve, reject) => {
                try {
                    if (!fs.existsSync(directoryPath)) {
                        fs.mkdirSync(directoryPath, { recursive: true });
                    }
                    const csvWriter = createArrayCsvWriter({
                        path: `${directoryPath}/${filename}`,
                        header: columnNameArr,
                    });
                    csvWriter.writeRecords(columnDataArr)
                        .then(() => {
                            resolve();
                        })
                        .catch((error) => {
                            reject(error);
                        });
                } catch (error) {
                    reject(error);
                    console.error(`Failed to write the CSV file: ${error.message}`);
                }
            });
        }catch(err){
            throw new Error(err.message);
        }
    };
    
    appendFile = async (directoryPath: string, text: string, filename: string) => {
        try {
            if (
                !(
                    directoryPath.startsWith('./public') ||
                    directoryPath.startsWith('public/') ||
                    directoryPath.startsWith('.\\public') ||
                    directoryPath.startsWith('public\\') ||
                    directoryPath.startsWith('./src')
                )
            ) {
                throw new Error('Attempted Path Traversal Detected!');
            }

            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
            }

            const fullPath = path.join(directoryPath, filename);

            await fs.promises.appendFile(fullPath, text);

            return {
                status: 'success',
                message: 'File has been successfully appended.'
            };
        } catch (err: any) {
            return {
                status: 'error',
                message: err.message
            };
        }
    };
    
    writeFile = async (directoryPath: string, text: string, filename: string) => {
        try {
            //for sanitize path
            if (
                !(
                    directoryPath.startsWith('./public') ||
                    directoryPath.startsWith('public/') ||
                    directoryPath.startsWith('.\\public') ||
                    directoryPath.startsWith('public\\')    ||
                    directoryPath.startsWith('./src') 
                )
            ) {
                throw new Error('Attempted Path Traversal Detected!');
            }
            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
            }
            await fs.promises.writeFile(path.resolve(`${directoryPath}/${filename}`), text);
            return {
                status: 'success',
                message: 'File has been successfully written.'
            };
        } catch (err) {
            console.error(`Error writing to file: ${err.message}`);
            return {
                status: 'error',
                message: err
            };
        }
    }
    writePDFFile = async (directoryPath: string, text: string, filename: string) => {
        try {
            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
            }
            const buffer = Buffer.from(text, 'base64');
            await fs.writeFile(`${directoryPath}/${filename}`, buffer, function (err) {
                if (err) throw err;
            });
            return {
                status: 'success',
                message: 'File has been successfully written.'
            };
        } catch (err) {
            console.error(`Error writing to file: ${err.message}`);
            return {
                status: 'error',
                message: err
            };
        }
    }

    saveUserDetail = (searchData: any, fieldsToUnique: string[],companyId: any,path: any, userCode: string, dataFile: { [key: string]: any } = {},fieldToAdd: string[] = []): any => {
        try{
            const currentDate = new Date().toISOString().split('T')[0];
            const jsonCompFolder = join(path, companyId.toString());
            if (!fs.existsSync(jsonCompFolder)) {
                fs.mkdirSync(jsonCompFolder, { recursive: true });
            }
            const filePath = join(jsonCompFolder, Buffer.from(userCode).toString('base64') + '.json');
            searchData.time = new Date().toISOString();
            dataFile[currentDate] = dataFile[currentDate] || {};
            fieldsToUnique.forEach((field) => {
                if (searchData[field]) {
                    const currentDataField = dataFile[currentDate][field]
                    if (Array.isArray(currentDataField) && !fieldToAdd.includes(field)) {
                        currentDataField.push(searchData[field]);
                        dataFile[currentDate][field] = [...new Set(currentDataField)];
                    } else {
                        dataFile[currentDate][field] = [searchData[field]];
                    }
                }
            });
            fs.writeFileSync(filePath, JSON.stringify(dataFile));
            return {filePath: filePath};
        }catch(err){
            throw new Error(err.message);
        }
    }
    ssnSecurityCode = (type: string, socialSecurityNumber: string = '', companies: { Company?: { ssn?: number; isReqdSsn?: number;}} = {}, userCode: string | null = null, allUserCodeSheet: any[] = []): {securityCode: string; orgSecurityCode: string ; validateFields: string ; errorCode: number[]} => {
        try{
            let userError: number[] = [], arrSecurityCode: string = "", validateFields: string = "";
            if (type === 'first') {
                [arrSecurityCode, userError] = this.handleFirstCase(socialSecurityNumber);
            } else if (type === 'second') {
                [arrSecurityCode, validateFields, userError] = this.handleSecondCase(socialSecurityNumber, companies, userCode, allUserCodeSheet);
            }
            return {securityCode: arrSecurityCode, orgSecurityCode: socialSecurityNumber, validateFields: validateFields, errorCode: userError};
        }catch(err){
            throw new Error(err.message);
        }
    };
    handleFirstCase = (socialSecurityNumber: string): any => {
        try{
            if (!socialSecurityNumber) return '';
            let [ssn,userError] = this.formatSSN(socialSecurityNumber);
            ssn ? Buffer.from(ssn).toString('base64').trim() : '';
            return [ssn, userError]
        }catch(err){
            throw new Error(err.message);
        }
    };
    handleSecondCase = (socialSecurityNumber: string, companies, userCode: string, allUserCodeSheet: any[]): [string, string, any ] => {
        try{
            if (socialSecurityNumber === "" && companies?.Company?.ssn === 1 && companies?.Company?.isReqdSsn === 1) {
                if (userCode != '' && allUserCodeSheet[userCode]) {
                    socialSecurityNumber = Buffer.from(allUserCodeSheet[userCode].securityCode, 'base64').toString()
                }
            }
            let [ssn, userError] = this.formatSSN(socialSecurityNumber);
            let arrSecurityCode = "", validateFields = "";
            if (!ssn && companies?.Company?.ssn === 1 && companies?.Company?.isReqdSsn === 1) {
                userError.push(1037);
            } else if (ssn) {
                if (userCode == '' || (allUserCodeSheet[userCode] && ssn !== Buffer.from(allUserCodeSheet[userCode].securityCode, 'base64').toString())) {
                    arrSecurityCode = Buffer.from(ssn).toString('base64').trim();
                    validateFields = "securitycode";
                }
            }
            return [arrSecurityCode, validateFields, userError];
        }catch(err){
            throw new Error(err.message);
        }
    }
    formatSSN = (ssn: string): [string, number[]] => {
        try{
            let userError: number[] = []
            ssn = ssn.replace(/[\- ]/g, '');
            if (/^[0-9]+$/.test(ssn)) {
                ssn = ssn.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');
                if (!/^\d{3}-\d{2}-\d{4}$/.test(ssn)) {
                    ssn = '';
                    userError.push(1058);
                }
            } else {
                ssn = '';
                userError.push(1058);
            }
            return [ssn, userError];
        }catch(err){
            throw new Error(err.message);
        }
    };

    ConditionsObjectSys = (
        dob: string,
        firstName: string,
        lastName: string,
        email: string,
        securityCode: string,
        employeeId: string,
        memberShipCode: string
    ): { conditions: Record<string, string>[]; errorCode: number[] } => {
        try {
            const userError: number[] = [];

            // Push errors if all are missing
            if (!dob && !firstName && !lastName && !email && !securityCode && !employeeId) {
                userError.push(1002, 1003, 1004, 1006, 1058);
            }

            const conditions: Record<string, string>[] = [];

            if (dob && firstName && lastName) {
                conditions.push({
                    first_name: firstName,
                    last_name: lastName,
                    dob: dob,
                    org_id: memberShipCode
                });
            }

            if (email) {
                conditions.push({
                    email: email,
                    org_id: memberShipCode
                });
            }

            if (securityCode) {
                conditions.push({
                    securitycode: securityCode,
                    org_id: memberShipCode
                });
            }

            if (employeeId) {
                conditions.push({
                    employeeid: employeeId,
                    org_id: memberShipCode
                });
            }

            return { conditions, errorCode: userError };
        } catch (err: any) {
            throw new Error(err.message);
        }
    };
    
    ConditionsObject = (dob: string, firstName: string, lastName: string, email: string, securityCode: string, employeeId: string, memberShipCode: string): {conditions: string[]; errorCode: number[];} => {
        try{
            let userError: number[] = [];
            if (!dob && !firstName && !lastName && !email && !securityCode && !employeeId) {
                userError.push(1002, 1003, 1004, 1006, 1058);
            }
            let conditions: any[] = [];
            if (dob && firstName && lastName) {
                Object.assign(conditions, {firstName: firstName, lastName: lastName, dob: dob, membership_code: memberShipCode});
            }
            if (email) {
                Object.assign(conditions, {email: email, membership_code: memberShipCode});
            }
            if (securityCode) {
                Object.assign(conditions, {securityCode: securityCode, membership_code: memberShipCode});
            }
            if (employeeId) {
                Object.assign(conditions, {employeeId: employeeId, membership_code: memberShipCode});
            }
            return { conditions: conditions, errorCode: userError };
        }catch(err){
            throw new Error(err.message);
        }
    };
    checkDepartment = (department: string, departmentArray: { [key: string]: any }, userCode: string, allUserCodeSheet: { [key: string]: any }): { departmentId: any; deptName: string; } => {
        try{
            let departmentId = '0',deptName = '';
            if (department !== "" && departmentArray.hasOwnProperty(department)) {
                departmentId = departmentArray[department];
                deptName = department;
            } else {
                if (userCode !== '' && allUserCodeSheet.hasOwnProperty(userCode)) {
                    departmentId = allUserCodeSheet[userCode]['department_id'];
                } else {
                    let firstKey = Object.keys(departmentArray)[0];
                    departmentId = departmentArray[firstKey];
                    deptName = firstKey;
                }
            }
            return { departmentId: departmentId, deptName: deptName };
        }catch(err){
            throw new Error(err.message);
        }
    }
    checkStatus = (status: any, userCode: string, allUserCodeSheet: { [key: string]: any }): { userStatus: any;orgStatus: string; errorCode: number; } => {
        try{
            const statusMap = {'current': 1, 'terminated': 2, 'retired': 3, 'extended leave': 4};
            let errorCode: number;
            let userStatus = 0;
            let lowerCaseStatus = typeof status === 'string' ? status.toLowerCase() : '';
            let orgStatus = '';
            if (statusMap.hasOwnProperty(lowerCaseStatus)) {
                userStatus = statusMap[lowerCaseStatus];
                orgStatus = lowerCaseStatus.charAt(0).toUpperCase() + lowerCaseStatus.slice(1);
            } else if (status === 0 || !['', 'current', 'terminated', 'retired', 'extended leave'].includes(lowerCaseStatus)) {
                errorCode = 1022;
            } else if (!status) {
                if (userCode && allUserCodeSheet?.[userCode]) {
                    userStatus = parseInt(allUserCodeSheet[userCode]['status']);
                    orgStatus = (userStatus === 1) ? 'Current' : 'Terminated';
                } else {
                    userStatus = 1;
                    orgStatus = 'Current';
                }
            }
            return {
                userStatus: userStatus,
                orgStatus: orgStatus,
                errorCode: errorCode
            };
        }catch(err){
            throw new Error(err.message);
        }
    };
    checkCommon = (checkFunName: any, funValue: any, relationshipCode: any = null, userCode: any = null, linkedEmpIdStatus: any = null, existingUserListCodeWise: any[] = [], allRelationshipCodeSheet: any[] = [], userError: any[] = [], val9: any = null, val10: any = null, val11: any = null) => {
        try{
            funValue = typeof funValue === 'string' ? funValue.toLowerCase() : '';
            userCode = typeof userCode === 'string' ? userCode.toLowerCase() : '';
            let healthPlanName = "";
            let arrInsurancePlanName = "";
            let validateFieldsName = "";
            switch (checkFunName) {
                /* Relationship code C::START */
                case 'relationship_code':
                    let relationshipDetails = {valInt: '', valStr: funValue, errorCode: ''};
                    const relationshipMapping = {
                        'spouse': { valInt: 16, valStr: 'Spouse' },
                        'spouse / domestic partner': { valInt: 16, valStr: 'Spouse' },
                        'domestic partner': { valInt: 16, valStr: 'Spouse' },
                        'other': { valInt: 17, valStr: 'Other' }
                    };
                    if (funValue in relationshipMapping) {
                        relationshipDetails = { ...relationshipDetails, ...relationshipMapping[funValue] };
                    } else if (funValue !== '') {
                        relationshipDetails.errorCode = '1023';
                    }
                    return relationshipDetails;
                    break;
                /* Relationship code C::END */
                /* Relationship id D::START */
                case 'relationship_id':
                    let relationshipId = '';
                    if (funValue) {
                        if(userCode && userCode === funValue){
                            userError.push(1036);
                        } else if (relationshipCode && !userError.includes(1023)) {
                            if (linkedEmpIdStatus) {
                                const existingUser = existingUserListCodeWise[funValue];
                                if (existingUser && existingUser.User.role_id != 2) {
                                    userError.push(1036);
                                } else {
                                    if (!existingUser) {
                                        userError.push(1036);
                                    }
                                    const relationshipCodeSheet = allRelationshipCodeSheet[funValue];
                                    if (relationshipCodeSheet !== undefined) {
                                        if (userCode && relationshipCodeSheet != userCode) {
                                            userError.push(1036);
                                        } else {
                                            relationshipId = funValue;
                                        }
                                    } else {
                                        relationshipId = funValue;
                                        validateFieldsName = "relationship_id";
                                    }
                                }
                            }
                        } else if (relationshipCode) {
                            userError.push(1023);
                        }
                    } else if (relationshipCode) {
                        userError.push(1024);
                    }
                    return {relationshipId: relationshipId, validateFields: validateFieldsName, errorCode: userError || []};
                    break;
                /* Relationship id D::END */
                /* User type E::START */
                case 'user_type':
                    let userType = funValue;
                    let status = linkedEmpIdStatus;
                    let usersData = existingUserListCodeWise;
                    let mappedHeader = allRelationshipCodeSheet;
                    let arrRelationshipId = '', arrRelationshipCode = '', userStatus = '', arrRoleId = '';
                    let lowerUserType = userType;
                    let lowerRelationshipCode = typeof relationshipCode === 'string' ? relationshipCode.toLowerCase() : '';
                    if (lowerUserType === 'domestic partner') {
                        userType = relationshipCode = 'spouse / domestic partner';
                    }
                    if (['spouse', 'spouse / domestic partner'].includes(lowerUserType)) {
                        userType='16';
                    }
                    if (lowerUserType === 'employee') {
                        userType='';
                    }
                    userType = userType || '2';
                    const validRelationShipValues = ['', 'spouse', 'spouse / domestic partner', 'domestic partner'];
                    if (userType === '16') {
                        if (validRelationShipValues.includes(lowerRelationshipCode)) {
                            arrRoleId = userType;
                        } else {
                            userError.push(1025);
                        }
                    } else if (userType === '2') {
                        if (lowerRelationshipCode === 'spouse' || !status) {
                            userError.push(1027);
                        } else if (status) {
                            arrRoleId = this.getMappedValueFromSheet('E', usersData, mappedHeader) || '2';
                        }
                    } else if (userType === "" && (status || !relationshipCode)) {
                        userError.push(1027);
                    } else if (userType === "" && !status && !relationshipCode) {
                        arrRoleId = '2';
                        userStatus = '1';
                    }
                    if (arrRoleId == '2' && ((relationshipCode && userCode) || (!arrRoleId))) {
                        userError.push(arrRoleId === '2' ? 1035: 1039);
                    } else {
                        if (arrRoleId.toLowerCase() === 'employee') {
                            arrRoleId = '2';
                        }
                        if (arrRoleId == '2') {
                            arrRelationshipId = "";
                            arrRelationshipCode = '0';
                        }
                    }
                    if(userType == '2'){
                        relationshipCode = '';
                    }
                    return {
                        roleId: arrRoleId,
                        userStatus: userStatus,
                        relationshipId: arrRelationshipId,
                        relationshipCode: arrRelationshipCode,
                        errorCode: userError || [],
                        userType: userType,
                        newRelationshipCode: relationshipCode
                    };
                    break;
                /* User type E::END */
                /* ID of direct superviser F::START */
                case 'id_of_direct_supervisor':
                    let idOfDirectSupervisor = funValue;
                    let allUserCodeSheet = existingUserListCodeWise;
                    let arrSupervisorId = "";
                    if (idOfDirectSupervisor && relationshipCode) {
                        if (idOfDirectSupervisor === relationshipCode) {
                            arrSupervisorId = idOfDirectSupervisor;
                        } else {
                            userError.push(1028);
                        }
                    } else if (!idOfDirectSupervisor && relationshipCode && allUserCodeSheet[relationshipCode]) {
                        arrSupervisorId = relationshipCode;
                        idOfDirectSupervisor = relationshipCode;
                    } else if ((idOfDirectSupervisor && !relationshipCode) && idOfDirectSupervisor !== relationshipCode) {
                        userError.push(1028);
                    } else {
                        arrSupervisorId = "";
                        idOfDirectSupervisor = "";
                    }
                    return {
                        idOfDirectSupervisor: idOfDirectSupervisor || '',
                        supervisorId: arrSupervisorId,
                        errorCode: userError || []
                    };
                    break;
                /* ID of direct superviser F::END */
                /* User name G::START */
                case 'user_name':
                    let arrUsername = "";
                    if (funValue && relationshipCode && existingUserListCodeWise[relationshipCode] && funValue !== existingUserListCodeWise[relationshipCode]['username']) {
                        if (allRelationshipCodeSheet['companySetting']['lock_username'] === 0) {
                            arrUsername = funValue.replace(/[^A-Za-z0-9]/g, '');
                            validateFieldsName = "username";
                        } else {
                            userError.push(1021);
                        }
                    } else if (funValue && existingUserListCodeWise[relationshipCode]) {
                        if (relationshipCode) {
                            arrUsername = existingUserListCodeWise[relationshipCode]['username'];
                        } else {
                            arrUsername = funValue.replace(/[^A-Za-z0-9]/g, '');
                            validateFieldsName = "username";
                        }
                    } else if (!funValue && relationshipCode && existingUserListCodeWise[relationshipCode]) {
                        arrUsername = existingUserListCodeWise[relationshipCode]['username'];
                    } else {
                        arrUsername = "";
                    }
                    return {userName: arrUsername, validateFields: validateFieldsName, errorCode: userError || []};
                    break;
                /* User name G::END */
                /* First name H::START */
                case 'first_name':
                    if(funValue != '' && (relationshipCode === '' || /^[a-zA-Z0-9 \s `.\'-]+$/.test(funValue))) {
                        validateFieldsName = 'first_name';
                    } else {
                        userError.push(1002);
                    }
                    return { firstName: funValue, validateFields: validateFieldsName, errorCode: userError || [] };
                    break;
                /* First name H::END */
                /* Middle name I::START */
                case 'middle_name':
                    if(funValue != '' && /^[a-zA-Z0-9 \s `.\'-]+$/.test(funValue)) {
                        validateFieldsName = 'middle_name';
                    } else {
                        userError.push(1008);
                    }
                    return { middleName: funValue, validateFields: validateFieldsName, errorCode: userError || [] };
                    break;
                /* Middle name I::END */
                /* Last name J::START */
                case 'last_name':
                    if(funValue != '' && (relationshipCode === '' || /^[a-zA-Z0-9 \s `.\'-]+$/.test(funValue))) {
                        validateFieldsName = 'last_name';
                    } else {
                        userError.push(1003);
                    }
                    return { lastName: funValue, validateFields: validateFieldsName, errorCode: userError || [] };
                    break;
                /* Last name J::END */
                /* Employee id M::START */
                case 'employee_id':
                    let employeeId = funValue;
                    let arrEmployeeId = "";
                    if (employeeId.trim() && employeeId.length >= 1 && employeeId.length <= 50) {
                        if (!employeeId && relationshipCode && existingUserListCodeWise[relationshipCode]) {
                            employeeId = existingUserListCodeWise[relationshipCode]['employeeid'];
                        }
                        if (employeeId) {
                            if (!relationshipCode) {
                                arrEmployeeId = employeeId;
                                validateFieldsName = "employeeid";
                            } else if (existingUserListCodeWise[relationshipCode] && employeeId !== existingUserListCodeWise[relationshipCode]['employeeid']) {
                                arrEmployeeId = employeeId;
                                validateFieldsName = "employeeid";
                            }
                        } else if (!employeeId && allRelationshipCodeSheet['companySetting']['employee_id'] === 1 && allRelationshipCodeSheet['companySetting']['is_reqd_empid'] === 1) {
                            userError.push(1038);
                        }
                    } else {
                        if (employeeId){
                            userError.push(1013);
                            arrEmployeeId = employeeId;
                        }
                    }
                    return {employeeId: arrEmployeeId, orgEmployeeId: employeeId, validateFields: validateFieldsName, errorCode: userError || []};
                    break;
                /* Employee id M::END */
                /* Gender N::START */
                case 'gender':
                    let gender = funValue;
                    let arrGender = "";
                    let genderMap = {"m": "Male", "male": "Male", "f": "Female", "female": "Female", "o": "Other", "other": "Other"};
                    let normalizedGender = gender.toLowerCase();
                    if (gender && !/[\'^£$%&*()}{@#~?><>,|=_+¬-]/.test(gender) && normalizedGender in genderMap) {
                        arrGender = normalizedGender.charAt(0);
                        gender = genderMap[normalizedGender];
                    } else {
                        userError.push(1005);
                    }
                    return {gender: arrGender, orgGender: gender, errorCode: userError || []};
                    break;
                /* Gender N::END */
                /* Date of hire P::START */
                case 'date_of_hire':
                    let dateOfHire = funValue ? this.commonDateService.convertDateStrToTime(funValue) : "";
                    let hireDate = "";
                    if (dateOfHire) {
                        dateOfHire = dateOfHire.replace('/', '-');
                        hireDate = this.commonDateService.checkDate(dateOfHire);
                    }
                    let arrDateOfHire = hireDate ? hireDate : (dateOfHire ? userError.push(1029) : "");
                    return {dateOfHire: arrDateOfHire, orgDateOfHire: dateOfHire, errorCode: userError || []};
                    break;
                /* Date of hire P::END */
                /* On health plan Q::START */
                case 'on_health_plan':
                    let onHealthPlan = funValue;
                    let arrOnInsurancePlan = "";
                    let healthPlan = "";
                    if (onHealthPlan) {
                        onHealthPlan = onHealthPlan.toLowerCase();
                        if (onHealthPlan === 'yes' || onHealthPlan === 'y') {
                            arrOnInsurancePlan = 'Yes';
                            healthPlan = 'Yes';
                        } else if (onHealthPlan === 'no' || onHealthPlan === 'n') {
                            arrOnInsurancePlan = 'No';
                            healthPlan = 'No';
                            /* TODO: optimize if healthPlanName and arrInsurancePlanName not use*/
                            healthPlanName = '';
                            arrInsurancePlanName = '';
                        } else {
                            arrOnInsurancePlan = 'No';
                            userError.push(1030);
                        }
                    }
                    return {onInsurancePlan: arrOnInsurancePlan, healthPlan: healthPlan, healthPlanName: healthPlanName, insurancePlanName: arrInsurancePlanName, errorCode: userError || []};
                    break;
                /* On health plan Q::END */
                /* For health plan name R::START */
                case 'health_plan_name':
                    let arrPassVar = "update";
                    let arrInsurancePlanOn = "No";
                    arrInsurancePlanName = funValue;
                    if(funValue || (relationshipCode && !['no', 'n'].includes(relationshipCode.toLowerCase()))) {
                        arrPassVar = !['yes', 'y'].includes(relationshipCode.toLowerCase()) ? 'spupdate' : 'update';
                        arrInsurancePlanOn = linkedEmpIdStatus == 804 && ['no', 'n'].includes(relationshipCode.toLowerCase()) ? 'No' : 'Yes';
                    } else if (userCode && !funValue) {
                        if(relationshipCode && !['no', 'n'].includes(relationshipCode.toLowerCase())) {
                            arrPassVar = 'dpupdate';
                            arrInsurancePlanOn = '';
                        }
                    }
                    return {insurancePlanName: arrInsurancePlanName, arrInsurancePlanOn: arrInsurancePlanOn, arrPassVar: arrPassVar};
                    break;
                /* For health plan name R::END */
                /* For email & duplication validation S::START */
                case 'email':
                    let email = funValue;
                    let arrEmail = "";
                    let validateFields = "";
                    if (relationshipCode && relationshipCode in existingUserListCodeWise) {
                        if (!email || email === existingUserListCodeWise[relationshipCode].email) {
                            arrEmail = existingUserListCodeWise[relationshipCode].email;
                        } else if(this.userSheetValidation(email, 'email')) {
                            arrEmail = email;
                            validateFields = "email";
                        } else {
                            userError.push(1006);
                        }
                    } else {
                        if (email && this.userSheetValidation(email, 'email')) {
                            arrEmail = email;
                            validateFields = "email";
                        } else {
                            userError.push(1006);
                        }
                    }
                    return { email: arrEmail, validateFields: validateFields, errorCode: userError || [] };
                    break;
                /* For email & duplication validation S::END */
                /* For location V,W,X,Y,Z,AA,AB::START */
                case 'location':
                    let locid = '';
                    let [location, workAddress1, workAddress2, workCity, workStateProvince, workZipPostalCode, workCountry] = [funValue, relationshipCode, userCode, linkedEmpIdStatus, val9, val10, val11];
                    let locationArray = existingUserListCodeWise;
                    const isValidAddress = !(location && workAddress1) || !location || !workAddress1;
                    const isLocationDefined = location || workAddress1 || workAddress2 || workCity || workStateProvince || workZipPostalCode || workCountry;
                    const checkAddress = () => {
                        if (isValidAddress) {
                            userError.push(1034);
                        } else if (workZipPostalCode !== "") {
                            if (!(workZipPostalCode in locationArray['zipcodewise'])) {
                                userError.push(1032);
                            }
                        } else if (!workZipPostalCode && (workCity || workStateProvince || workCountry)) {
                            userError.push(1033);
                        } else {
                            userError.push(1032);
                        }
                    };
                    const locationIdFromAddress = () => {
                        workAddress2 = workAddress2 || ' ';
                        let key = location + workAddress1 + workAddress2 +
                            (locationArray['zipcodewise'][workZipPostalCode] ?? locationArray['zipcodewise'][workZipPostalCode]['city']) +
                            (locationArray['zipcodewise'][workZipPostalCode] ?? locationArray['zipcodewise'][workZipPostalCode]['state']) +
                            workZipPostalCode +
                            (locationArray['zipcodewise'][workZipPostalCode] ?? locationArray['zipcodewise'][workZipPostalCode]['country']);
                        if (key.toLowerCase() in locationArray) {
                            locid = locationArray[key.toLowerCase()];
                        }
                    };
                    if (isLocationDefined) {
                        checkAddress();
                        if (userError.length === 0 && (isValidAddress)) {
                            userError.push(1034);
                        } else if (!userError.includes(1032)) {
                            locationIdFromAddress();
                        }
                    }
                    return {location: locid, errorCode: userError || []};
                    break;
                /* For location V,W,X,Y,Z,AA,AB::END */
                /* For home address AJ, AI, AG, AH::START */
                case 'home_address':
                    let [homeZipPostalCode, homeCity, homeStateProvince, homeCountry, timezoneDataUS, timezoneDataCA] = [funValue, relationshipCode, userCode, linkedEmpIdStatus, existingUserListCodeWise, allRelationshipCodeSheet];
                    let result = {country: '', state: '', city: '', zip: '', countrySort: '', stateProv: '', errorCode: userError};
                    if(homeZipPostalCode !== '') {
                        const usData = timezoneDataUS[homeZipPostalCode];
                        const caData = timezoneDataCA[homeZipPostalCode];
                        if(usData) {
                            const {statecode, city, zipcode, state} = usData;
                            result = {...result, country: 'United States', state: statecode, city, zip:zipcode, countrySort: 'USA', stateProv: state };
                        } else if(caData) {
                            const {provincecode, city, postalcode, province} = caData;
                            result = {...result, country: 'Canada', state: provincecode, city, zip: postalcode, countrySort: 'Canada', stateProv: province};
                        } else {
                            userError.push(1011);
                            result.errorCode = userError;
                        }
                    } else if(!homeZipPostalCode && (homeCity || homeStateProvince || homeCountry)) {
                        userError.push(1065);
                        result.errorCode = userError;
                    }
                    return result;
                    break;
                /* For home address AJ, AI, AG, AH::END */
                default:
                    return '';
            }
        }catch(err){
            throw new Error(err.message);
        }
    }

    async base64ToFile(base64String : string, fileName: string) {
        try{
            const base64Data = base64String.split(';base64,').pop();
            const fileType = base64String.split(';')[0].split('/')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fullFileName = `${fileName}.${fileType}`;
            fs.writeFileSync(fullFileName, buffer);
            return fullFileName;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async base64ToFileCreate(base64String : string, fileName: string) {
        try{
            const base64Data = base64String.split(';base64,').pop();
            const fileType = base64String.split(';')[0].split('/')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fullFileName = `${fileName}`;
            fs.writeFileSync(fullFileName, buffer);
            return fullFileName;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async createFile(fileContent : string, fileName: string) {
        try{
            await fs.writeFileSync(fileName, fileContent);
            return fileName;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async FileToBase64(filePath: string) {
        try{
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');
            return base64;
        }catch(err){
            throw new Error(err.message);
        }
    }

    async copyFiles(sourceDir: string, targetDir: string, fielName: string){
        try {
            await fsI.ensureDir(targetDir);
            const newPath = targetDir+`/${fielName}`;
            await fsI.copy(sourceDir, newPath, { overwrite: true });
            await fsI.remove(sourceDir);
            return true;
        } catch (error) {
            return false;
        }
    }
    async copyFile(originalFilePath: string, copyFilePath: string){
        try {
            fs.copyFileSync(originalFilePath, copyFilePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    createCSV(headers: any[], data: any[], sheetName: string) {
        try{
            return new Promise((resolve, reject) => {
                const csvStream = fastCsv.format({ headers: true });
                const csvBuffer: Buffer[] = [];
                csvBuffer.push(Buffer.from(headers.map(header=>`"${header}"`).join(',') + '\n', 'utf-8'));
                data.forEach(row => {
                const rowData = headers.map(header => {
                    const value = row[header]?.toString() || '';
                    return `"${value.replace(/"/g, '""')}"`;
                });
                csvBuffer.push(Buffer.from(rowData + '\n', 'utf-8'));
                });
                csvStream.on('data', (chunk: Buffer) => csvBuffer.push(chunk));
                csvStream.on('end', () => {
                const csvString = Buffer.concat(csvBuffer)?.toString('utf-8');
                const base64String = Buffer.from(csvString, 'utf-8')?.toString('base64');
                resolve(base64String);
                });
                csvStream.on('error', (err) => {
                reject(err);
                });
                csvStream.end();
            });
        }catch(err){
            throw new Error(err.message);
        }
    }  
    loadTranslations(directory,language = 'eng') {
        const items = fs.readdirSync(directory);
        const translations = [];
        try{
            items.forEach((item) => {
                const itemPath = path.join(directory, item);
                if (fs.statSync(itemPath).isDirectory()) {
                    const lang = language || item; 
                    const data = this.loadTranslations(itemPath, lang); 
                    translations.push(...data); 
                } else if (path.extname(itemPath) === '.json') {
                    const data = fs.readFileSync(itemPath, { encoding: 'utf-8' });
                    try {
                        if (data) {
                            const parsedData = JSON.parse(data);
                            translations.push(parsedData);
                        } else {
                            console.log(`Empty file: ${itemPath}`);
                        }
                    } catch (error) {
                        console.error(`Error parsing JSON file ${itemPath}: ${error.message}`);
                    }
                }
            });
            return translations;
        }
        catch(error){
            return translations;
        }
    }

    async readFile(filePath: string): Promise<any[]> {
        try {
            const data = await readFileAsync(filePath, 'utf-8');
            const sanitizedData = data.replace(/NaN/g, "null");
            return JSON.parse(sanitizedData);
        } catch (error) {
            console.error(`Error reading or parsing file at ${filePath}:`, error);
            throw new Error(`Failed to read or parse file at ${filePath}`);
        }
    }
    async commonFileErrorHandle(data: string = '',req: any = null) {
        try{
            let response: any;
            if (data != 'SUCCESS') {
                response = {status: 0,message: await this.commonDateService.frontendReadTranslation(req?.headers?.x_lang, data, `/LC_MESSAGES/Common/Common`, `static`)}
            } else {
                response = {status: 1,message: await this.commonDateService.frontendReadTranslation(req?.headers?.x_lang, data, `/LC_MESSAGES/Common/Common`, `static`)}
            }
            return response;
        }catch(err){
            throw new Error(err.message);
        }
    }

    async createFileToJson(xlsxFilePath = null,file,req: any = null) {
        try{
            let filePath = path.join('src/python', file);
            let command = `python ${filePath} ${xlsxFilePath}`;
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        /* which file and path not support */
                        console.error("error",error);
                    }
                    resolve(this.commonFileErrorHandle(stdout?.trim(),req));
                });
            });
        }catch(err){
            throw new Error(err.message);
        }
    }
    async generatePptxWithPython(reportData: any, outputFilePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
        const scriptPath = path.join('src/python', 'generate_pptx_report.py');
        const pythonProcess = spawn('python3', [scriptPath, outputFilePath]);

        let errorOutput = '';
        pythonProcess.stdin.write(JSON.stringify(reportData));
        pythonProcess.stdin.end();

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            console.log("pptx close", errorOutput)
            if (code !== 0) {
            reject(new Error(`Python script failed: ${errorOutput}`));
            } else {
            resolve();
            }
        });

        pythonProcess.on('error', (err) => {
            console.log("pptx error", err)
            reject(err);
        });
        });
    }
    async createJsonToFile(typeGet:any = 1, jsonFilePath = null, file, hideCells:any = '', multiple: boolean = false, sheetName: string = '') {
        try{
            let filePath = path.join('src/python', file);
            let command = `python ${filePath} ${jsonFilePath} ${typeGet} `;
            if(hideCells != ''){
                command = `python ${filePath} ${jsonFilePath} ${typeGet}  ${hideCells} `;
            }
            if(multiple){
                command = `python ${filePath} ${jsonFilePath} ${typeGet} "" ${multiple} ${sheetName}`;
                if (hideCells != '') {
                    command = `python ${filePath} ${jsonFilePath} ${typeGet} ${hideCells} ${multiple} ${sheetName}`;
                }
            }else if (sheetName && sheetName != '') {
                command = `python ${filePath} ${jsonFilePath} ${typeGet} "" ${multiple} ${sheetName}`;
            }
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(`Error occurred: ${error.message}`)
                        return;
                    }
                    if (stderr) {
                        reject(`Standard error: ${stderr}`)
                        return;
                    }
                    if (stdout) {
                        resolve({ status: 'success', stdout: stdout });
                    } else {
                        reject('Operation failed')
                    }
                });
            });
        }catch(err){
            throw new Error(err.message);
        }
    }

    logToFile(moduleName: string, errorStatus: Boolean, endpoint: string, requestBody) {
        try{
            const logFilePath = path.join(process.cwd(), 'custom_logs', 'logs.txt');
            const timestamp = new Date().toISOString();
            const logEntry = `${moduleName}, ${errorStatus}, ${endpoint}, ${JSON.stringify(requestBody)}, ${timestamp}\n`;
            fs.appendFile(logFilePath, logEntry, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            } else {
                console.log('Log entry added.');
            }
            });
        }catch(err){
            throw new Error(err.message);
        }
      }
    formatMessage(paragraph: string) {
        try{
            return paragraph
                .split('. ') 
                .map(sentence => {
                return sentence.trim().charAt(0).toUpperCase() + sentence.trim().slice(1);
                })
                .join('. '); 
        }catch(err){
            throw new Error(err.message);
        }
    }
    capitalizeFirstLetter(str: string) {
        try{
            if (str.length === 0) return str;
            return str.substring(0, 1).toUpperCase() + str.substring(1);
        }catch(err){
            throw new Error(err.message);
        }
      }
    formatFileName(fileName: string) {
        try{
            let cleanedName = fileName.toLowerCase().trim();
            cleanedName = cleanedName.replace(/\s+/g, '_');
            cleanedName = cleanedName.replace(/[^a-zA-Z0-9-_\.]/g, '');
            const extIndex = cleanedName.lastIndexOf('.');
            let baseName = cleanedName;
            let ext = '';
            if (extIndex !== -1) {
            baseName = cleanedName.substring(0, extIndex);
            ext = cleanedName.substring(extIndex);
            ext = ext.toLowerCase();
            }
            cleanedName = baseName + ext;
            return cleanedName;
        }catch(err){
            throw new Error(err.message);
        }
    }      


    filterDataByEntityColumns<T>(data: any, metadata): any {
        try{
            const validColumns = metadata.columns.map((col: any) => col.propertyName);
            const filteredData = Object.keys(data)
                .filter((key) => validColumns.includes(key))
                .reduce((obj, key) => {
                    obj[key] = data[key];
                    return obj;
                }, {});
            return filteredData;
        } catch(error){
            return data;
        }
    }
    async convertRawDataColumnsToEntityColumns(data: any, prefix) {
        try{
            data = await Promise.all(data?.map(async(ele)=>{
                ele = Object.keys(ele).reduce((acc, key) => {
                    const newKey = key.replace(prefix, '');
                    acc[newKey] = ele[key];
                    return acc;
                  }, {});
                  return ele;
                }));
            return data;
        } catch(error){
            return data;
        }
    }
    phpSerialize(obj) {
        try{
            if(Object.keys(obj).length == 0 ){
                return 'N;'
            }
            let serialized = `a:${Object.keys(obj).length}:{`;
            for (let key in obj) {
                serialized += `i:${key};s:${obj[key].length}:\"${obj[key]}\";`;
            }
            serialized += "}";
            return serialized;
        }catch(err){
            throw new Error(err.message);
        }
    }

    decryptFromFile(filePath: string): any {
        try{
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const payload = JSON.parse(fileContent);
            const iv = Buffer.from(payload.iv, 'hex');
            const authTag = Buffer.from(payload.tag, 'hex'); 
            const encryptedData = payload.data;
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            decipher.setAuthTag(authTag); 
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        }
        catch(error){
            console.error('Error encrypting and saving data:', error);
            return {}
        }
    }
    // for SNYK path traversal issue
    sanitizeFileName(input: string | number): string {
        try{
            return String(input).replace(/[<>:"\/\\|?*]+/g, '_'); // Replaces invalid characters with "_"
        }catch(err){
            throw new Error(err.message);
        }
    }
    async createPasswordProtectedZip(filePath: string | { paths: string[] , fileName: string , directory: string }, password: string, pythonFilePath = '') {
        try{
            let parsedPath;
            let zipFilePath;
            let pythonFilePathFinal;
            let command;
            if (filePath && typeof filePath === 'object') {
                let filePathsArray = JSON.stringify(filePath.paths)
                zipFilePath = path.join(filePath.directory, `${filePath.fileName}`);  // Define the ZIP file path
                pythonFilePathFinal = path.join('src/python', pythonFilePath);
                command = `python "${pythonFilePathFinal}" "${filePathsArray}" "${password}" "${zipFilePath}"`;
            } else {
                parsedPath = path.parse(filePath as string);
                zipFilePath = `${parsedPath.dir}/${parsedPath.name}.zip`;  // Define the ZIP file path
                pythonFilePathFinal = path.join('src/python', pythonFilePath);
                command = `python ${pythonFilePathFinal} ${filePath} ${password} ${zipFilePath}`;
            }
            // const command = `python ${pythonFilePathFinal} ${filePath} ${zipFilePath}`;
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        return reject(error);
                    }
                    if (stderr) {
                        return reject(stderr);
                    }
                    if (stdout) {
                        resolve({ status: 'success', stdout: stdout });  // Only return the zipFilePath as a string
                    } else {
                        reject('Operation failed');
                    }
                });
            });
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async replacePlaceholders(
        template: string,
        replacements: Record<string, string>,
    ) {
        try{
            return template.replace(/\[([^\]]+)\]/g, (_, key) => {
                return replacements[key] || '';
            });
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async zipFolder(sourceDir: any, outputDir: string, zipName: string) {
        try{
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { mode: 0o777, recursive: true });
            }
            const zipPath = path.join(outputDir, zipName);
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            return new Promise<void>((resolve, reject) => {
                output.on('close', () => {
                    resolve();
                });
                archive.on('error', (err) => {
                    reject(err);
                });
                archive.pipe(output);
                for (const folderName in sourceDir) {
                    const files = sourceDir[folderName];
                    for (const file of files) {
                        const targetPath = path.join(folderName, file.filename);
                        archive.file(file.path, { name: targetPath });
                    }
                }
                archive.finalize();
            });
        }catch (error) {
            throw new Error(error.message); 
        }
    }
        async reverseMapSheetData(sheetData: any, header: Record<string, string>, usecase = '') {        
        if(usecase == 'reversed_header'){
            /* Convert header to reverse lookup: fieldName => columnLetter */
            header = Object.entries(header).reduce((acc, [key, value]) => {
                acc[value] = key;
                return acc;
            }, {} as Record<string, string>); 
        }                                    
        sheetData = sheetData.map((item) => {
                let newItem: any = {};
                for (let key in header) {
                    if (header[key] && item[key]) {
                        newItem[header[key]] = item[key].toString().trim();
                    } else {
                        newItem[header[key]] = null;
                    }
                }
                return newItem;
            });        
        return sheetData;
    }

    async createJsonFileV1(userData, mapped_header){
        try{
            let table_header_data = {...appConstant.table_HEADER_DATA,...appConstant.table_SPOUSE_HEADER_DATA,...appConstant.table_LINKED_HEADER_DATA};
            let reverseMap = await this.reverseMapSheetData(userData, table_header_data, 'reversed_header');
            userData = await this.reverseMapSheetData(reverseMap, mapped_header);
            return userData;
        }catch (error) {
            return [];
        }
    }
    async createJsonFile(companies , userData, mapped_header){
        try{
            const statusMap = {
                1: 'Current',
                2: 'Terminated',
                3: 'Retired',
                4: 'Extended Leave',
            };
            const genderMap = {
                'm': 'Male',
                'f': 'Female',
                'o': 'Other',
            };
            let table_header_data = {...appConstant.table_HEADER_DATA,...appConstant.table_SPOUSE_HEADER_DATA,...appConstant.table_LINKED_HEADER_DATA};

            let allUserData = userData.map((item) => {
                let onInsurancePlan = '';
                let relationshipCode = '';
                let relationshipId = ''; 
                let location_name = '';
                let department_name = '';
                const plan = item.on_insurance_plan?.toLowerCase();
                if (plan == 'yes' || plan == 'y') {
                    onInsurancePlan = 'Yes';
                } else if (plan == 'no' || plan == 'n') {
                    onInsurancePlan = 'No';
                }                 
                if (item?.role_id == 16) {
                    if (companies?.company_settings?.spouse_option == 1) {
                        relationshipCode = 'Spouse / Domestic Partner';
                    } else {
                        relationshipCode = 'Spouse';
                    }
                    relationshipId = item?.relationship_id;
                }
                if(item?.employeeid){
                    item['employeeid'] = Number(item?.employeeid.toString().trim());
                }   
                if(item?.department_id){
                    department_name = companies?.departments?.find(dep => dep.id == item.department_id);   
                    department_name = department_name?.['dept_name'] ?? '';            
                }
                if(item?.location){
                    location_name = companies?.locations?.find(loc => loc.id == item.location);     
                    location_name = location_name?.['lname'] ?? '';            
                }
                item.department_id = department_name || '';
                item.status = statusMap[item.status] || '';
                item.relationship_code = relationshipCode || '';
                item.relationship_id = relationshipId || '';
                item.gender = genderMap[item.gender] || '';
                item.on_insurance_plan = onInsurancePlan;
                item.is_camp_eligible = item?.is_camp_eligible == 1 ? 'Yes' : 'No';
                item.email_receiving = item?.email_receiving == 1 ? 'Yes' : 'No';
                item.email_update = item?.email_update == 1 ? 'Yes' : 'No';
                item.location = location_name || '';
                if(item?.error_code){
                    item.error_code = Array.from(new Set(item.error_code)).join(',');
                }              
                return item;               
            });                    
            let reverseMap = await this.reverseMapSheetData(allUserData, table_header_data, 'reversed_header'); 
            allUserData = await this.reverseMapSheetData(reverseMap, mapped_header); 

            return allUserData;
        }catch (error) {
            return [];
        }

    }
    writeZipFile = async (directoryPath: string, text: string, filename: string) => {
        try {
            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
            }
            const buffer = Buffer.isBuffer(text) ? text : Buffer.from(text, 'base64');
            await fs.writeFile(`${directoryPath}/${filename}`, buffer, function (err) {
                if (err) throw err;
            });
            return {
                status: 'success',
                message: 'File has been successfully written.'
            };
        } catch (err) {
            console.error(`Error writing to file: ${err.message}`);
            return {
                status: 'error',
                message: err
            };
        }
    }

    trimSlashes = (str: string) => {
        if (str != null && str.length) {
            while (str.length && str[str.length - 1] === '/') {
                str = str.slice(0, str.length - 1);
            }
        }
        return str || '';
    }

    joinPath = (...p: string[]) =>{
      return  '/' +
        this.trimSlashes(
            p
                .map(this.trimSlashes)
                .filter((x) => x)
                .join('/'),
        );
    }
    async readFileAsBase64(filePath: string): Promise<string> {
        const fs = require('fs').promises;
        const fileBuffer = await fs.readFile(filePath);
        return fileBuffer.toString('base64');
    }
        
}
