import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService, CompaniesEntity,
    CustomPointEntity,
    Status, UserEntity,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { UserService } from '../../../user/user.service';
import fs from 'fs';
import {In, Not} from 'typeorm';
import {BiometricHealthRequestService} from "../biometric-health-request.service";
import {CompanyService} from "../../../company/company.service";
import {OptometristsService} from "../../optometrists/optometrists.service";
import {DentistsService} from "../../dentists/dentists.service";
import {UserChallengeHelperService} from "../../../challenge/userChallengeHelper.service";
import {ActivityService} from "../../../acitivity/activity.service";
import {BiometricsService} from "../../biometrics/biometrics.service";
import {PhysicianTempsService} from "../../../company";

@Injectable()
export class BiometricHealthRequestAddService {
    constructor(
        @InjectRepository(CustomPointEntity, appConstant.MAIN.toLowerCase())
        private readonly commonService: CommonService,
        private readonly biometricHealthRequestService: BiometricHealthRequestService,
        private readonly companyService: CompanyService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly userService: UserService,
        private readonly optometristsService: OptometristsService,
        private readonly dentistsService: DentistsService,
        private readonly activityService: ActivityService,
        private readonly biometricsService: BiometricsService,
        private readonly physicianTempsService: PhysicianTempsService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}

    async biometricHealthRequestAdd(postData: any) {
        try {
            postData = postData?.data;
            let recordDetails: any = {}, where: any = {};
            if (!postData) {
                where = { status: Status.Three };
            } else {
                if (!postData?.id) {
                    return { success: 0, error: 1, message: 'ERR_REQUIRED_PARAM_MISSING' };
                }
                where = { id: postData?.id, status: postData?.status };
            }

            recordDetails = await this.biometricHealthRequestService.getOne(
                where,
                ['id', 'original_file', 'org_sheet_header', 'mapped_header', 'mail_status', 'status']
            );

            if (!recordDetails) {
                return { success: 0, error: 1, message: 'ERR_RECORD_NOT_FOUND' };
            }

            let fileData: any = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    { path: `${recordDetails['original_file'].replace(/\.[^/.]+$/, '.json')}`, userBucket: 'private' }
                )
            );

            let sheetData: any = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            const headerRow = sheetData[0];
            sheetData = sheetData.slice(1);

            if (!sheetData.length) {
                return { success: 0, error: 1, message: 'ERR_DATA_NOT_FOUND' };
            }

            const { mappedHeaders, orgSheetHeader, defaultHeader } = this.parseHeaderMappings(recordDetails);
            const headerIndices = this.getHeaderIndices(defaultHeader);
            const biometricFields = appConstant.BIOMETRIC_HEALTH_REQUEST_DROP_DATA;

            const validationResult = this.validateRequiredMappings(mappedHeaders);
            if (!validationResult.success) {
                return validationResult;
            }

            const organizationIds = sheetData.map(row => row[headerIndices['orgId']]).filter(Boolean);
            const userCodes = sheetData.map(row => row[headerIndices['userId']]).filter(Boolean);
            let organizationCode: CompaniesEntity[] = await this.companyService.getAll(
                { code: In(organizationIds) },
                ['code']
            );
            const existOrganizationCode = organizationCode.map(x => x.code);
            const optometristIDs = sheetData.map(row => row[headerIndices['optometristID']]).filter(Boolean);
            const physicianIDs = sheetData.map(row => row[headerIndices['physicianID']]).filter(Boolean);
            const dentistIDs = sheetData.map(row => row[headerIndices['dentistID']]).filter(Boolean);
            let usersData = await this.userService.getAll(
                { code: In([...optometristIDs, ...physicianIDs, ...dentistIDs,...userCodes]), status: Not(2) },
                ['id', 'code','role_id']
            );

            const codeToUserIdMap = new Map<string, number>();
            let userIdArray = []
            for (const user of usersData) {
                if ([2,16].includes(user.role_id)) {
                    userIdArray.push(user.id)
                } else {
                    let code = sheetData.find(d => d.includes(user.code));
                    if (headerIndices['userId']) {
                        code = code[headerIndices['userId']]
                        const found:UserEntity = usersData.find(u => u.code === code);
                        const id: number = found ? found.id : null;
                        codeToUserIdMap.set(user.code, id);
                    }


                }
            }

            const optometristUserIds = optometristIDs.map(code => codeToUserIdMap.get(code)).filter(Boolean);
            const physicianUserIds = physicianIDs.map(code => codeToUserIdMap.get(code)).filter(Boolean);
            const dentistUserIds = dentistIDs.map(code => codeToUserIdMap.get(code)).filter(Boolean);
            let optometristsResult = await this.optometristsService.getAll(
                { userid: In(userIdArray), status: Not(2) },
                ['id', 'userid', 'date_completed']
            );
            let dentistsResult = await this.dentistsService.getAll(
                { userid: In(userIdArray), status: Not(2) },
                ['id', 'userid', 'date_completed']
            );

            const optometristByUserId = new Map<number, any[]>();
            for (const row of optometristsResult) {
                if (!optometristByUserId.has(row.userid)) {
                    optometristByUserId.set(row.userid, []);
                }
                optometristByUserId.get(row.userid).push({
                    userId: row.userid,
                    date: row.date_completed
                });
            }

            const dentistByUserId = new Map<number, any[]>();
            for (const row of dentistsResult) {
                if (!dentistByUserId.has(row.userid)) {
                    dentistByUserId.set(row.userid, []);
                }
                dentistByUserId.get(row.userid).push({
                    userId: row.userid,
                    date: row.date_completed
                });
            }

            const finalMap: any = {};

            for (const code of optometristIDs) {
                const userId = codeToUserIdMap.get(code);
                finalMap[code] = userId ? (optometristByUserId.get(userId) || []) : [];
            }

            for (const code of dentistIDs) {
                const userId = codeToUserIdMap.get(code);
                finalMap[code] = userId ? (dentistByUserId.get(userId) || []) : [];
            }

            for (const code of physicianIDs) {
                const userId = codeToUserIdMap.get(code);
                finalMap[code] = userId ? [{ userId, date: null }] : [];
            }

            const userIdentifiers = this.extractUserIdentifiers(sheetData, defaultHeader);
            const userData = await this.fetchUsers(userIdentifiers);
            let emailStorageData = new Map<string, any>();
            const processResult = await this.processSheetRows(
                sheetData,
                userData,
                defaultHeader,
                orgSheetHeader,
                mappedHeaders,
                recordDetails.id,
                existOrganizationCode,
                headerIndices,
                biometricFields,
                finalMap,
                headerRow,
                emailStorageData
            );

                if (recordDetails) {
                    let currentDatetime = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD-HHmmss');
                    let updateRequestData = {};
                    if (processResult.rejectSheetArray.length > 0) {
                        try {
                            let rFileName = `reject-upload-files${recordDetails['id']}${currentDatetime}.json`
                            const sheetData = [{sheet_name: "Sheet", list: processResult.rejectSheetArray}];
                            const manualReportResult: any = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                {org_id: 1},
                                sheetData,
                                rFileName,
                                true
                            );
                            rFileName = `health-request/${recordDetails['id']}/${rFileName}`.replace('.json', '.xlsx')
                            if (manualReportResult.file_dir) {
                                if (await this.commonFileService.fileExist(manualReportResult.file_dir)) {
                                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {
                                        path: path.resolve(manualReportResult.file_dir),
                                        filename: rFileName,
                                        userBucket: 'private'
                                    }));
                                    updateRequestData['rejected_file'] = rFileName;
                                }
                            }
                            await this.commonFileService.removeFolderFromLocal(manualReportResult.file_dir);
                            await this.commonFileService.removeFolderFromLocal(manualReportResult.file_dir.replace(/\.[^/.]+$/,'.json'));
                        } catch (err) {
                            return {
                                success: 0,
                                error: 1,
                                message: `An error occurred: ${err}`,
                            };
                        }
                    }
                    if (processResult.successSheetArray.length > 0) {
                        try {
                            let sFileName = `success-upload-files${recordDetails['id']}${currentDatetime}.json`
                            const sheetData = [{sheet_name: "Sheet", list: processResult.successSheetArray}];
                            const manualReportResult: any = await this.userChallengeHelperService.createChallengeReportlsxNew(
                                {org_id: 1},
                                sheetData,
                                sFileName,
                                true
                            );
                            sFileName = `health-request/${recordDetails['id']}/${sFileName}`.replace('.json', '.xlsx')
                            if (manualReportResult.file_dir) {
                                if (await this.commonFileService.fileExist(manualReportResult.file_dir)) {
                                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {
                                        path: path.resolve(manualReportResult.file_dir),
                                        filename: sFileName,
                                        userBucket: 'private'
                                    }));
                                    updateRequestData['success_file'] = sFileName;


                                    let saveData = [];
                                    if (processResult.records.length > 0) {
                                        /* TODO: subject and template text change */
                                        if (recordDetails?.mail_status === '1') {
                                            for (const [email, records] of processResult.emailStorageData) {
                                                let emailData = {
                                                    sender: ``,
                                                    receiver: email,
                                                    subject: 'Your health request Completed.',
                                                    content: {},
                                                    template: `successfully`,
                                                };
                                                await lastValueFrom(
                                                    this.commonMicroservice.send(
                                                        { cmd: 'send_email' },
                                                        emailData,
                                                    ),
                                                );
                                            }
                                        }
                                        saveData = await this.biometricsService.createMany(processResult.records);
                                    }
                                    let saveDataFileName: string = `${currentDatetime}_SaveData.json`;
                                    const removeCustomHealthData = async (
                                        data,
                                    ) => {
                                        let saveData = data;
                                        const idArray: number[] = [];
                                        for (let i: number = 0; i < saveData.length; i++) {
                                            idArray.push(saveData[i].id);
                                        }
                                        await this.biometricsService.updateRecord({ id: In(idArray) },{ status: 2 });
                                        return {
                                            activity: 1,
                                            message:
                                                'save data file not create',
                                            saveData: saveData || '',
                                        };
                                    };
                                    let filePathDir: string = path.join(`${appConstant.HEALTH_REQUEST_PATH}`) + `${this.commonFileService.sanitizeFileName(recordDetails['id'])}`;
                                    this.commonFileService
                                        .writeFile(filePathDir,JSON.stringify(saveData,null,2),saveDataFileName)
                                        .then(
                                            async (writeJsonFile: any) => {
                                                const saveDataFileFullPath: string = path.resolve(`${filePathDir}/${saveDataFileName}`);
                                                if (writeJsonFile?.status === 'success') {
                                                    return this.commonFileService.fileExist(saveDataFileFullPath)
                                                        .then(async (exists: boolean) => {
                                                            if (exists) {
                                                                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'},{path: saveDataFileFullPath, filename: sFileName.replace(/\.[^/.]+$/,'.json'),userBucket: 'private'}));
                                                            } else {
                                                                return await removeCustomHealthData(saveData);
                                                            }
                                                        });
                                                } else {
                                                    return await removeCustomHealthData(saveData);
                                                }
                                                await this.commonFileService.removeFolderFromLocal(saveDataFileFullPath);
                                            },
                                        )
                                        .catch(async (error: any) => {
                                            return await removeCustomHealthData(saveData);
                                        });
                                }
                            }
                            await this.commonFileService.removeFolderFromLocal(manualReportResult.file_dir);
                            await this.commonFileService.removeFolderFromLocal(manualReportResult.file_dir.replace(/\.[^/.]+$/,'.json'));

                        } catch (err) {
                            return {
                                success: 0,
                                error: 1,
                                message: `An error occurred: ${err}`,
                            };
                        }
                    }
                    updateRequestData['status'] = Status.One;
                    await this.biometricHealthRequestService.updateRecord({ id: recordDetails['id'] },updateRequestData);
                    return {
                        success: 1,
                        error: 0,
                        message: 'SUCCESS_HEALTH_REQUEST_UPLOAD',
                    };
                } else {
                    return {
                        success: 0,
                        error: 1,
                        message: 'ERR_SOMETHING_WENT_WRONG',
                    };
                }

            return {
                success: 1,
                error: 0,
                message: 'Biometric data processed successfully',
                successCount: processResult.successSheetArray.length - 1,
                errorCount: processResult.rejectSheetArray.length - 1,
                successSheet: processResult.successSheetArray,
                errorSheet: processResult.rejectSheetArray
            };
        } catch (error) {
            console.log("error", error);
            return {
                activity: 1,
                message: `An error occurred: ${error}`,
            };
        }
    }

    private parseHeaderMappings(recordDetails: any) {
        const mappedHeaders = JSON.parse(recordDetails.mapped_header);
        const orgSheetHeader = JSON.parse(recordDetails.org_sheet_header);

        const selectedMappedHeader = Object.fromEntries(
            Object.entries(mappedHeaders).filter(([_, value]) => value !== "")
        );

        const defaultHeader = {};
        Object.entries(selectedMappedHeader).forEach(([key, value]) => {
            defaultHeader[value as string] = orgSheetHeader[value as number];
        });

        return { mappedHeaders, orgSheetHeader, defaultHeader };
    }

    private validateRequiredMappings(mappedHeaders: Record<string, any>): any {
        const requiredFields = ['A', 'B', 'J'];
        const headerData = appConstant.BIOMETRIC_HEALTH_REQUEST_HEADER_DATA;

        const missingFields = requiredFields.filter(key => !mappedHeaders[key] || mappedHeaders[key] === "");

        if (missingFields.length > 0) {
            const missingFieldNames = missingFields.map(key => headerData[key]);
            return {
                success: 0,
                error: 1,
                message: `Missing required fields: ${missingFieldNames.join(', ')}`
            };
        }

        const biometricKeys = Object.keys(appConstant.BIOMETRIC_HEALTH_REQUEST_DROP_DATA);
        const mappedBiometricCount = biometricKeys.filter(key =>
            mappedHeaders[key] && mappedHeaders[key] !== ""
        ).length;

        if (mappedBiometricCount === 0) {
            return { success: 0, error: 1, message: 'ERR_NO_BIOMETRIC_FIELDS_MAPPED' };
        }

        return { success: 1 };
    }

    private extractUserIdentifiers(sheetData: any[], defaultHeader: any) {
        const codeIndex = Object.keys(defaultHeader).find(k => defaultHeader[k] === 'User ID');
        const emailIndex = Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Email');
        const usernameIndex = Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Username');

        const identifiers = {
            codes: new Set<string>(),
            emails: new Set<string>(),
            usernames: new Set<string>()
        };

        sheetData.forEach(row => {
            if (row[codeIndex]?.trim()) identifiers.codes.add(row[codeIndex].trim());
            if (row[emailIndex]?.trim()) identifiers.emails.add(row[emailIndex].trim());
            if (row[usernameIndex]?.trim()) identifiers.usernames.add(row[usernameIndex].trim());
        });

        return {
            codeIndex,
            emailIndex,
            usernameIndex,
            codes: Array.from(identifiers.codes),
            emails: Array.from(identifiers.emails),
            usernames: Array.from(identifiers.usernames)
        };
    }

    private async fetchUsers(identifiers: any) {
        const whereConditions = [];

        if (identifiers.codes.length) {
            whereConditions.push(`users.code IN ('${identifiers.codes.join("','")}')`);
        }
        if (identifiers.emails.length) {
            whereConditions.push(`users.email IN ('${identifiers.emails.join("','")}')`);
        }
        if (identifiers.usernames.length) {
            whereConditions.push(`users.username IN ('${identifiers.usernames.join("','")}')`);
        }

        const whereClause = `(${whereConditions.join(' OR ')}) AND users.status = 1`;
        let userData: UserEntity[] = await this.userService.commonQueryBuilder(
            ['users.id', 'users.code', 'users.email'],
            whereClause, {}, [], 'getMany'
        );

        const userResult = new Map<string, UserEntity>();
        for (const data of userData) {
            userResult.set(data?.code, data);
        }
        return userResult;
    }

    private async processSheetRows(
        sheetData: any[],
        userData,
        defaultHeader: any,
        orgSheetHeader: string[],
        mappedHeaders: Record<string, any>,
        requestId: number,
        existOrganizationCode: string[],
        headerIndices,
        biometricFields,
        finalMap,
        headerRow: any[],
        emailStorageData,
    ): Promise<any> {
        const records = [];
        let successSheetArray = [headerRow];
        let rejectSheetArray = [[...headerRow, 'Error']];
        const currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');

        for (const row of sheetData) {
            const rowResult = await this.processRow(
                row,
                userData,
                headerIndices,
                orgSheetHeader,
                mappedHeaders,
                biometricFields,
                currentDate,
                requestId,
                existOrganizationCode,
                finalMap,
                emailStorageData
            );
            if (rowResult?.record) records.push(rowResult.record);
            if (rowResult?.successData?.length > 0) {
                successSheetArray.push(rowResult.successData);
            } else {
                successSheetArray = [];
            }

            if (rowResult?.errorData?.length > 0) {
                rejectSheetArray.push(rowResult.errorData);
            } else {
                rejectSheetArray = [];
            }
        }

        return { records, successSheetArray, rejectSheetArray, emailStorageData };
    }

    private getHeaderIndices(defaultHeader: any) {
        return {
            userId: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'User ID'),
            orgId: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Organization ID'),
            userFirstName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'First Name'),
            userMiddleName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Middle Name'),
            userLastName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Last Name'),
            ssn: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Social Security Number'),
            employeeId: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Employee ID'),
            gender: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Gender'),
            birthDate: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Birth Date'),
            email: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Email'),
            physicianID: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Physician ID'),
            physicianFirstName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Physician First Name'),
            physicianLastName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Physician Last Name'),
            physicianEmail: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Physician Email'),
            physicianOfficePhone: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Office Phone'),
            height: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Height'),
            weight: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Weight'),
            bmi: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'BMI'),
            bpSystolic: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Blood Pressure- Systolic'),
            bpDiastolic: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Blood Pressure- Diastolic'),
            glucoseType: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Fasting or Random'),
            glucose: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Glucose'),
            a1c: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'A1C'),
            totalCholesterol: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Total Cholesterol'),
            hdl: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'HDL Cholesterol'),
            ldl: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'LDL Cholesterol'),
            triglycerides: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Triglycerides'),
            waist: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Waist'),
            dentistID: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Dentist ID'),
            dentistFirstName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Dentist First Name'),
            dentistLastName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Dentist Last Name'),
            dentistEmail: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Dentist Email'),
            dentistOfficePhone: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Office Phone.1'),
            dateDFReceived: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Date DF Received'),
            optometristID: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Optometrist ID'),
            optometristFirstName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Optometrist First Name'),
            optometristLastName: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Optometrist Last Name'),
            optometristEmail: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Optometrist Email'),
            optometristOfficePhone: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Office Phone.2'),
            dateOVFReceived: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Date OVF Received'),
            datePFReceived: Object.keys(defaultHeader).find(k => defaultHeader[k] === 'Date PF Received'),
        };
    }

    private async processRow(
        row: any[],
        userData,
        indices: any,
        orgSheetHeader: string[],
        mappedHeaders: Record<string, any>,
        biometricFields: any,
        currentDate: string,
        requestId: number,
        existOrganizationCode: string[],
        finalMap,
        emailStorageData
    ): Promise<any> {
        const errors = [];
        const userCode = row[indices.userId];
        let matchedUser = userData.get(userCode);

        let organizationId = row[indices.orgId];
        if (!organizationId || !existOrganizationCode.includes(organizationId)) {
            errors.push(1001);
        }

        if (!userCode || !matchedUser) {
            errors.push(1013);
        }

        let physicianID = row[indices.physicianID];
        if (physicianID) {
            const physicianData = finalMap[physicianID];
            if (!physicianData || physicianData.length === 0) {
                errors.push(1014);
            }
        }

        let dentistID = row[indices.dentistID];
        // if (!dentistID) {
        //     errors.push(1034);
        // }
        if (dentistID) {
            const dentistData = finalMap[dentistID];
            if (matchedUser) {
                const dateDFReceived = row[indices.dateDFReceived];
                if (dateDFReceived) {
                    const formattedDate = await this.commonDateService.checkDateFormats(dateDFReceived.toString());
                    if (formattedDate !== 'Invalid Date') {
                        const receivedDate = this.commonDateService.DateTimeFormat(dateDFReceived, 'YYYY-MM-DD','MM-DD-YYYY');
                        const sameDayEntries = dentistData.filter(entry => {
                            const entryDate = this.commonDateService.DateTimeFormat(entry.date, 'YYYY-MM-DD');
                            return entryDate === receivedDate && entry.userId === matchedUser.id;
                        });
                        if (sameDayEntries.length >= 2) {
                            errors.push(1056);
                        } else {
                            /*HS-Admin Upload - Dental Visit Form*/
                            let data = {userid: matchedUser.id,activity_id: 40,date_completed: receivedDate}
                            await this.dentistsService.create(data)
                            let phyTempData = {user_id: matchedUser.id,physiciantype_id: 4,first_name: row[indices.dentistFirstName], last_name: row[indices.dentistLastName],email: row[indices.dentistEmail],wphone: row[indices.dentistOfficePhone] ,create_account: 0}
                            await this.physicianTempsService.create(phyTempData)
                        }
                    }
                }
            }
        }

        let optometristID = row[indices.optometristID];
        // if (!optometristID) {
        //     errors.push(1044);
        // }
        if (optometristID) {
            const optometristData = finalMap[optometristID];
            if (matchedUser) {
                const dateOVFReceived = row[indices.dateOVFReceived];
                if (dateOVFReceived) {
                    const formattedDate = await this.commonDateService.checkDateFormats(dateOVFReceived.toString());
                    if (formattedDate !== 'Invalid Date') {
                        const receivedDate = this.commonDateService.DateTimeFormat(dateOVFReceived, 'YYYY-MM-DD','MM-DD-YYYY');
                        const sameDayEntries = optometristData.filter(entry => {
                            const entryDate = this.commonDateService.DateTimeFormat(entry.date, 'YYYY-MM-DD');
                            return entryDate === receivedDate && entry.userId === matchedUser.id;
                        });
                        if (sameDayEntries.length >= 2) {
                            errors.push(1057);
                        } else {
                            /*HS-Admin Upload - Optometrist Form*/
                            let data = {userid: matchedUser.id,activity_id: 41,date_completed: receivedDate}
                            await this.optometristsService.create(data)
                            let phyTempData = {user_id: matchedUser.id,physiciantype_id: 24,first_name: row[indices.optometristFirstName], last_name: row[indices.optometristLastName],email: row[indices.optometristEmail],wphone: row[indices.optometristOfficePhone] ,create_account: 0}
                            await this.physicianTempsService.create(phyTempData)
                        }
                    }
                }
            }
        }

        /*let datePFReceived = row[indices.datePFReceived];
        if (datePFReceived) {
            const formattedDate = await this.commonDateService.checkDateFormats(datePFReceived.toString());
            if (formattedDate === 'Invalid Date') {
                errors.push(1032);
            }
        }

        let dateDFReceived = row[indices.dateDFReceived];
        if (dateDFReceived) {
            const formattedDate = await this.commonDateService.checkDateFormats(dateDFReceived.toString());
            if (formattedDate === 'Invalid Date') {
                errors.push(1041);
            }
        }

        let dateOVFReceived = row[indices.dateOVFReceived];
        if (dateOVFReceived) {
            const formattedDate = await this.commonDateService.checkDateFormats(dateOVFReceived.toString());
            if (formattedDate === 'Invalid Date') {
                errors.push(1051);
            }
        }*/

        const biometricData = await this.extractAndValidateBiometrics(row, indices, errors);

        if (errors.length > 0) {
            return {
                success: false,
                errorData: [...row, errors.join(', ')]
            };
        }
        let email = row[indices.email]
        if (email) {
            const existing: any  = emailStorageData.get(email) || [];
            existing.push({...biometricData.validData});
            emailStorageData.set(email, existing);
        }

        const record = {
            user_id: matchedUser.id,
            request_id: requestId,
            ...biometricData.validData,
            created_date: currentDate,
            status: 1
        };

        return {
            success: true,
            record,
            successData: row,
            emailStorageData: emailStorageData
        };
    }

    private async extractAndValidateBiometrics(row: any[], indices: any, errors: number[]): Promise<any> {
        const validData = {};

        if (indices.height !== undefined) {
            const height = row[indices.height];
            if (height) {
                if (!this.isNumeric(height)) {
                    errors.push(1060);
                } else if (height < 1 || height > 9) {
                    errors.push(1060);
                } else {
                    validData['height'] = height;
                }
            }
        }

        if (indices.weight !== undefined) {
            const weight = row[indices.weight];
            if (weight) {
                if (!this.isNumeric(weight)) {
                    errors.push(1022);
                } else if (weight < 0 || weight > 999) {
                    errors.push(1022);
                } else {
                    validData['weight'] = weight;
                }
            }
        }

        if (indices.bmi !== undefined) {
            const bmi = row[indices.bmi];
            if (bmi) {
                validData['bmi'] = bmi;
            }
        }

        if (indices.bpSystolic !== undefined && indices.bpDiastolic !== undefined) {
            const systolic = row[indices.bpSystolic];
            const diastolic = row[indices.bpDiastolic];

            if ((systolic && !diastolic) || (!systolic && diastolic)) {
                errors.push(1023);
            } else if (systolic && diastolic) {
                let systolicValid = true;
                let diastolicValid = true;

                if (!this.isNumeric(systolic) || systolic < 10 || systolic > 300) {
                    errors.push(1024);
                    systolicValid = false;
                }

                if (!this.isNumeric(diastolic) || diastolic < 10 || diastolic > 300) {
                    errors.push(1025);
                    diastolicValid = false;
                }

                if (systolicValid && diastolicValid) {
                    validData['systolic'] = systolic;
                    validData['diastolic'] = diastolic;
                }
            }
        }

        if (indices.glucose !== undefined) {
            const glucose = row[indices.glucose];
            const glucoseType = row[indices.glucoseType];
            const testType = {"Random": 0, "Fasting": 1};
            validData['test_type'] = testType[glucoseType];

            if (!glucose) {
                errors.push(1021);
            } else if (glucose) {
                if (!this.isNumeric(glucose) || glucose < 10 || glucose > 2500) {
                    errors.push(1026);
                } else {
                    validData['blood_glucose'] = glucose;
                }
            }
        }

        if (indices.a1c !== undefined) {
            const a1c = row[indices.a1c];
            if (a1c) {
                if (!this.isNumeric(a1c) || a1c < 1 || a1c > 15) {
                    errors.push(1027);
                } else {
                    validData['alc'] = a1c;
                }
            }
        }

        if (indices.hdl !== undefined) {
            const hdl = row[indices.hdl];
            if (hdl) {
                if (!this.isNumeric(hdl) || hdl < 10 || hdl > 500) {
                    errors.push(1028);
                } else {
                    validData['hdl'] = hdl;
                }
            }
        }

        if (indices.ldl !== undefined) {
            const ldl = row[indices.ldl];
            if (ldl) {
                if (!this.isNumeric(ldl) || ldl < 10 || ldl > 500) {
                    errors.push(1029);
                } else {
                    validData['ldl'] = ldl;
                }
            }
        }

        if (indices.totalCholesterol !== undefined) {
            const totalChol = row[indices.totalCholesterol];
            if (totalChol) {
                if (!this.isNumeric(totalChol) || totalChol < 10 || totalChol > 1000) {
                    errors.push(1030);
                } else {
                    validData['total_cholesterol'] = totalChol;
                }
            }
        }

        if (indices.triglycerides !== undefined) {
            const trig = row[indices.triglycerides];
            if (trig) {
                if (!this.isNumeric(trig) || trig < 10 || trig > 1000) {
                    errors.push(1031);
                } else {
                    validData['triglycerides'] = trig;
                }
            }
        }

        if (indices.waist !== undefined) {
            const waist = row[indices.waist];
            if (waist && this.isNumeric(waist)) {
                validData['waist'] = waist;
            }
        }

        if (indices.datePFReceived !== undefined) {
            const date = row[indices.datePFReceived];
            if (date) {
                const formattedDate = await this.commonDateService.checkDateFormats(date.toString());
                if (formattedDate !== 'Invalid Date') {
                    // validData['date_pf_received'] = this.commonDateService.DateTimeFormat(date, 'YYYY-MM-DD');
                }
            }
        }

        if (indices.dateDFReceived !== undefined) {
            const date = row[indices.dateDFReceived];
            if (date) {
                const formattedDate = await this.commonDateService.checkDateFormats(date.toString());
                if (formattedDate !== 'Invalid Date') {
                    // validData['date_df_received'] = this.commonDateService.DateTimeFormat(date, 'YYYY-MM-DD');
                }
            }
        }

        if (indices.dateOVFReceived !== undefined) {
            const date = row[indices.dateOVFReceived];
            if (date) {
                const formattedDate = await this.commonDateService.checkDateFormats(date.toString());
                if (formattedDate !== 'Invalid Date') {
                    // validData['date_ovf_received'] = this.commonDateService.DateTimeFormat(date, 'YYYY-MM-DD');
                }
            }
        }

        if (indices.physicianID !== undefined && row[indices.physicianID]) {
            // validData['physician_id'] = row[indices.physicianID];
        }

        if (indices.dentistID !== undefined && row[indices.dentistID]) {
            // validData['dentist_id'] = row[indices.dentistID];
        }

        if (indices.optometristID !== undefined && row[indices.optometristID]) {
            // validData['optometrist_id'] = row[indices.optometristID];
        }

        const activity: number[] = [];

        const rules = [
            {
                condition: !row[indices.weight] || !row[indices.height] ? false : true,
                name: 'HS-Admin Upload - BMI',
            },
            {
                condition: !!row[indices.bmi],
                name: 'HS-Admin Upload - BMI',
            },
            {
                condition: !!row[indices.totalCholesterol],
                name: 'HS-Admin Upload - Total Cholesterol',
            },
            {
                condition: !!row[indices.hdl],
                name: 'HS-Admin Upload - HDL',
            },
            {
                condition: !!row[indices.ldl],
                name: 'HS-Admin Upload - LDL',
            },
            {
                condition: !!row[indices.triglycerides],
                name: 'HS-Admin Upload - Triglycerides',
            },
            {
                condition: !!row[indices.bpSystolic] && !!row[indices.bpDiastolic],
                name: 'HS-Admin Upload - Blood Pressure',
            },
            {
                condition: !!row[indices.glucose] || !!row[indices.a1c],
                name: 'HS-Admin Upload - Glucose or AC1',
            },
            {
                condition: !!row[indices.waist],
                name: 'HS-Admin Upload - Waist',
            },
        ];
        const names = rules
            .filter(r => r.condition)
            .map(r => r.name);
        if (!names.length) return '';
        const activities = await this.activityService.getAll({ activity_name: In([...names,'Admin Uploaded Biometric Screening'])},['id']);
        activities.forEach(a => activity.push(a.id));
        validData['source'] = 2;
        validData['inserted'] = await await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
        let activityIds= activity.join(',');
        if (!activityIds) {
            activityIds = '2'
        } else {
            activityIds += ',2'
        }
        validData['activity_id'] = activityIds;
        return { validData };
    }

    private isNumeric(value: any): boolean {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }
}
