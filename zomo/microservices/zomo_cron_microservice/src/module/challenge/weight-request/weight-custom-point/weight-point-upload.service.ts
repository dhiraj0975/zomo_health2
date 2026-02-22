import {
    appConstant, AssessmentEmotionalAssessmentEntity, ChallengeEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    CustomPointEntity, ScheduleChallengeEntity,
    Status,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { UserService } from '../../../user/user.service';
import fs from 'fs';
import { In } from 'typeorm';
import {WeightRequestService} from "../weight-request.service";
import {BioWeightService} from "../../bioweight/bioweight.service";
import {ChallengeService} from "../../challenge/challenge.service";
import {ScheduleChallengeService} from "../../schedulechallenge/schedulechallenge.service";
import {WeightRecords} from "../../../../interface";

@Injectable()
export class WeightCustomPointUploadService {
    constructor(
        @InjectRepository(CustomPointEntity, appConstant.MAIN.toLowerCase())
        private readonly commonService: CommonService,
        private readonly weightRequestService: WeightRequestService,
        private readonly bioWeightService: BioWeightService,
        private readonly challengeService: ChallengeService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly userService: UserService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}

    async weightCustomUploadPoint(postData: any) {
        try {
            postData = postData?.data;
            let recordDetails: any = {},
                where: any = {};
            if (!postData) {
                where = { status: Status.Three };
            } else {
                if (!postData?.id) {
                    return {
                        success: 0,
                        error: 1,
                        message: 'ERR_REQUIRED_PARAM_MISSING',
                    };
                }
                where = {id: postData?.id,org_id: postData?.org_id,created_by: postData?.created_by,status: postData?.status};
            }
            recordDetails = await this.weightRequestService.getOne(where,['id','org_id','original_file','org_sheet_header','mapped_header','mail_status','status','created_by'],);
            if (!recordDetails) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_RECORD_NOT_FOUND',
                };
            }

            let fileData: any = await lastValueFrom(this.commonMicroservice.send({ cmd: 'get_file' },{path: `${recordDetails['original_file'].replace(/\.[^/.]+$/, '.json')}`, userBucket: 'private'}));
            let sheetData: any = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            sheetData = sheetData.slice(1);
            if (!sheetData.length) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_DATA_NOT_FOUND',
                };
            }
            const mappedHeader: any = JSON.parse(recordDetails['mapped_header']);
            const weightHeaderData: any = appConstant.WEIGHT_REQUEST_HEADER_DATA;
            const weightHeaderDataArray: string[] = Object.values(weightHeaderData);
            const selectedMappedHeader: any = Object.fromEntries(Object.entries(mappedHeader).filter(([key, value]) => value !== ''));
            let orgSheetHeader: string[] = JSON.parse(recordDetails?.org_sheet_header,);

            let dropZoneActivity: any = {'L': 'Weight','M': 'Added Date_Date'};

            let headerData = { ...weightHeaderData, ...dropZoneActivity };
            const defaultHeader = {};
            let activityKey = Object.keys(dropZoneActivity);
            const keys = Object.keys(headerData);
            let mappedActivityCount: number = 0;
            for (let i: number = 0; i < keys.length; i++) {
                const key = keys[i];
                if (selectedMappedHeader[key] !== undefined) {
                    defaultHeader[key] = headerData[key];
                } else {
                    if (activityKey.includes(key)) {
                        mappedActivityCount++;
                    }
                }
            }
            if (activityKey.length == mappedActivityCount) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_CUSTOM_POINT_MAPPED',
                };
            }
            const defaultHeaderValues: string[] = Object.values(defaultHeader);
            const missingFields = ['User ID', 'Email', 'Username'].filter((field) => {
                    return !defaultHeaderValues.some(
                        (header) =>
                            header?.toLowerCase().trim() ===
                            field.toLowerCase().trim(),
                    );
                });
            if (missingFields.length > 0) {
                return {
                    success: 0,
                    error: 1,
                    message: `Missing fields: ${missingFields.join(', ')}`,
                };
            }
            const codeIndex = defaultHeaderValues.indexOf('User ID');
            const emailIndex = defaultHeaderValues.indexOf('Email');
            const usernameIndex = defaultHeaderValues.indexOf('Username');
            let codeArray: string[] = [], emailArray: string[] = [], usernameArray: string[] = [];
            const pushIfValid = (val: any, arr: string[]) => {
                if (typeof val === 'string' && val.trim() !== '') {
                    arr.push(val.trim());
                }
            };
            for (let i = 0; i < sheetData.length; i++) {
                pushIfValid(sheetData[i][codeIndex], codeArray);
                pushIfValid(sheetData[i][emailIndex], emailArray);
                pushIfValid(sheetData[i][usernameIndex], usernameArray);
            }

            const userData: any = await this.userService.listRecord(
                `user.username IN ('${usernameArray.join("','")}') AND user.email IN ('${emailArray.join("','")}') AND user.code IN ('${codeArray.join("','")}') AND user.status = 1 AND user.org_id = ${recordDetails?.org_id}`,
                ['user.id AS id', 'user.code AS code', 'user.email AS email', 'user.username AS username'],
            );
            if (userData?.length == 0) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_USER_NOT_FOUND',
                };
            } else {
                let records: any = [], successSheetArray: any = [], rejectSheetArray: any = [];
                let date = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                const requestId = recordDetails['id'];
                let errorCount: number = 0;
                let challengeId: ChallengeEntity | null = await this.challengeService.getOne({bio_challenge_type: 'Weight_progress'},['id'],{id: 'ASC'})
                let getScheduleChallenge: ScheduleChallengeEntity | null = await this.scheduleChallengeService.getOne({challenge_id: challengeId.id,org_id: postData?.org_id},['id'],{id: 'ASC'});
                let emailStorageData = new Map<string, WeightRecords>();
                for (let i: number = 0; i < sheetData.length; i++) {
                    let rowActivity = {};
                    const row = sheetData[i];
                    const codeCheck = row[codeIndex];
                    const matchedUser = userData.find((user) => user.code === codeCheck);
                    const userId = matchedUser?.id,
                        userNotFount: any = [];
                    const userEmail = matchedUser?.email
                    let activityBlank = 0,
                        errorData: Record<string, any> = {},
                        successData: Record<string, any> = {};
                    const activityData: Record<number, any> = {},
                        object: Record<string, any> = {};
                    for (let j: number = 0; j < orgSheetHeader.length; j++) {
                        let alphabet = Object.keys(mappedHeader).find((k) => mappedHeader[k] == j);
                        let activityName = defaultHeader[alphabet];
                        const errorList: number[] = [];
                        const header = orgSheetHeader[j];
                        let cell = row[j];
                        const codeCheck = row[codeIndex];
                        const emailCheck = row[emailIndex];
                        const usernameCheck = row[usernameIndex];
                        if (!codeCheck) {
                            if (!userNotFount.includes(2001)) {
                                userNotFount.push(2001);
                            }
                        }
                        if (!emailCheck) {
                            if (!userNotFount.includes(2002)) {
                                userNotFount.push(2002);
                            }
                        }
                        if (!usernameCheck) {
                            if (!userNotFount.includes(2003)) {
                                userNotFount.push(2003);
                            }
                        }

                        if (!weightHeaderDataArray.includes(header)) {
                            if (!activityData[activityName])
                                activityData[activityName] = {};
                            let activityWeight = '';
                            let activityDate = '';
                            if (activityName.toLowerCase().includes('weight')) {
                                activityWeight = 'weight';
                            }
                            if (activityName.toLowerCase().includes('_date')) {
                                activityDate = 'date'
                            }
                            let weight = '';
                            let date = '';


                            if (activityWeight == 'weight') {
                                if (cell === '') {
                                    errorList.push(2007);
                                    activityBlank++;
                                }
                                weight = `${cell}`;
                                const isInvalidPoint = await this.commonHealthService.checkPointNumber(cell);
                                if (!isInvalidPoint) {
                                    const isValid: boolean = cell >= 1 && cell <= 999;
                                    if (!isValid) {
                                        errorList.push(2009);
                                    }
                                }
                                if (isInvalidPoint && !errorList.includes(2007)) {
                                    errorList.push(2004);
                                }
                            }

                            if (activityDate == 'date') {
                                if (cell === '') {
                                    errorList.push(2008);
                                }
                                let sheetDate = await this.commonDateService.checkDateFormats(cell.toString());
                                if (sheetDate === 'Invalid Date' && !errorList.includes(2008)) {
                                    errorList.push(2005);
                                }
                                if (errorList.length == 0) {
                                    date = this.commonDateService.DateTimeFormat(cell, 'YYYY-MM-DD');
                                }
                            }
                            rowActivity['0'] = rowActivity['0'] || {}
                                    rowActivity['0']['weight'] = rowActivity['0']['weight'] || weight;
                                    rowActivity['0']['date'] = rowActivity['0']['date'] || date;
                                    if ([2004, 2005, 2007, 2008, 2009].some((code) => errorList.includes(code)) || (rowActivity['0']['error_data'] && Object.keys(rowActivity['0']['error_data']).length > 0) || userNotFount?.length > 0) {
                                        const activityCode: number = errorList.find((code) => [2004, 2005, 2007, 2008, 2009].includes(code));
                                        rowActivity['0']['error_data'] = {...(rowActivity['0']['success_data'] || {}), ...rowActivity['0']['error_data'],...{ [header]: cell }};
                                        rowActivity['0']['error'] = rowActivity['0']['error'] || [];
                                        if (!rowActivity['0']['error'].includes(activityCode) && activityCode) {
                                            rowActivity['0']['error'].push(activityCode);
                                        }

                                        rowActivity['0']['success_data'] = {};
                                    } else {
                                        rowActivity['0']['success_data'] = {...rowActivity['0']['success_data'], ...{ [header]: cell }};
                                    }

                        } else {
                            object[header] = cell;
                        }
                    }
                    activityBlank = activityBlank / Object.keys(rowActivity).length;
                    Object.keys(rowActivity).forEach((key) => {
                        const item = rowActivity[key];
                        if (item?.['error']?.length > 0 || userNotFount?.length > 0) {
                            errorData = {...errorData, ...(item?.error_data || {})};
                            errorData = {...errorData, Error: [...new Set([...(errorData?.Error ? errorData.Error.split(',').map(Number) : []),...(item?.error?.map(Number) || [])])].join(',')};
                        } else if (item['weight'] && item['date']) {
                            if (userId) {
                                records.push({
                                    user_id: userId,
                                    schedule_id: getScheduleChallenge?.id,
                                    weight: item['weight'],
                                    created_date: date,
                                    added_date: item['date'] + ' 00:00:00',
                                    status: 1,
                                });
                                const existing: WeightRecords = emailStorageData.get(userEmail) || [];
                                existing.push({ weight: item['weight'], date: item['date'] });
                                emailStorageData.set(userEmail, existing);
                                successData = {...successData,...item?.success_data};
                            }
                        }
                    });

                    if (Object.keys(successData).length > 0) {
                        successSheetArray.push({ ...object, ...successData });
                    }
                    if (Object.keys(errorData).length > 0) {
                        const { Error, ...restErrorData } = errorData;
                        rejectSheetArray.push({...object, ...restErrorData, Error: `${userNotFount.join(',')} ${Error}`.replace(/,/g, ", ")});
                    }

                    if (activityBlank === 1) errorCount++;
                }
                if (sheetData?.length == errorCount) {
                    return {
                        success: 0,
                        error: 1,
                        message: 'ERR_ADD_AT_LEAST_ONE_WEIGHT',
                    };
                }

                if (recordDetails) {
                    let currentDatetime = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD-HHmmss');
                    let filePathDir: string = path.join(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`) + `${this.commonFileService.sanitizeFileName(requestId)}`;
                    await this.commonFileService.dirIsExist(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}/${requestId}/`);
                    let updateRequestData = {};
                    if (rejectSheetArray.length > 0) {
                        const jsonString = JSON.stringify(rejectSheetArray,null,2);
                        let rFileName: string = `rejected_file_${requestId}_${currentDatetime}.json`;
                        try {
                            let writeFile = await this.commonFileService.writeFile(filePathDir,jsonString,rFileName);
                            if (writeFile?.status == 'success') {
                                let excelData: any = await this.commonFileService.createJsonToFile(1,`${filePathDir}/${rFileName}`,'pythonjsontocsv.py');
                                if (excelData?.status == 'success') {
                                    let filePathR = `${filePathDir}/${rFileName}`.replace('.json','.csv');
                                    if (await this.commonFileService.fileExist(filePathR)) {
                                        let RejectedFIleName = rFileName.replace('.json', '.csv');
                                        let originalName = this.commonFileService.formatFileName(RejectedFIleName);
                                        let bucketRFileName = this.commonFileService.generateFileName(`weight-upload-files/${recordDetails?.org_id}`,requestId.toString(),'rejected_', originalName.split('.')[originalName.split('.').length - 1]);
                                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },{path: path.resolve(filePathR),filename: bucketRFileName,userBucket: 'private'}),);
                                        updateRequestData['rejected_file'] = bucketRFileName;
                                    }
                                }
                            }
                        } catch (err) {
                            return {
                                success: 0,
                                error: 1,
                                message: `An error occurred: ${err}`,
                            };
                        }
                        if (rFileName) {
                            await this.commonFileService.removeFolderFromLocal(
                                path.resolve(
                                    `${filePathDir}/${rFileName}`,
                                )
                            );
                        }
                    }
                    if (successSheetArray.length > 0) {
                        const jsonStringS = JSON.stringify(successSheetArray,null,2);
                        let sFileName: string = `success_file_${requestId}_${currentDatetime}.json`;
                        let data;
                        try {
                            let bucketSFileName: string = '';
                            let writeFile = await this.commonFileService.writeFile(filePathDir,jsonStringS,sFileName);
                            if (writeFile?.status == 'success') {
                                let excelData: any = await this.commonFileService.createJsonToFile(1,`${filePathDir}/${sFileName}`, 'pythonjsontocsv.py');
                                if (excelData?.status == 'success') {
                                    let filePathS = `${filePathDir}/${sFileName}`.replace('.json','.csv');
                                    if (await this.commonFileService.fileExist(filePathS)) {
                                        let SuccessFIleName = sFileName.replace('.json','.csv');
                                        let originalName = this.commonFileService.formatFileName(SuccessFIleName);
                                        bucketSFileName = this.commonFileService.generateFileName(`weight-upload-files/${recordDetails?.org_id}`,requestId.toString(),'success_',originalName.split('.')[originalName.split('.').length - 1]);
                                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },{path: path.resolve(filePathS),filename: bucketSFileName,userBucket: 'private'}));
                                        updateRequestData['success_file'] = bucketSFileName;
                                        let saveData = [];
                                        if (records.length > 0) {
                                            /* TODO: subject and template text change */
                                            if (recordDetails?.mail_status === '1') {
                                                for (const [email, records] of emailStorageData) {
                                                    let data = ''
                                                    for (const record of records) {
                                                        data += ` Weight: ${record.weight} and Date: ${record.date}`;
                                                    }
                                                    let emailData = {
                                                        sender: ``,
                                                        receiver: email,
                                                        subject: 'Your weight Completed.',
                                                        content: {},
                                                        template: `${data} weight added successfully`,
                                                    };
                                                    await lastValueFrom(
                                                        this.commonMicroservice.send(
                                                            { cmd: 'send_email' },
                                                            emailData,
                                                        ),
                                                    );
                                                }
                                            }
                                            saveData = await this.bioWeightService.createMany(records);
                                        }
                                        let saveDataFileName: string = `${currentDatetime}_SaveData.json`;
                                        const removeCustomWeightData = async (
                                            data,
                                        ) => {
                                            let saveData = data;
                                            const idArray: number[] = [];
                                            for (let i: number = 0; i < saveData.length; i++) {
                                                idArray.push(saveData[i].id);
                                            }
                                            await this.bioWeightService.update({ id: In(idArray) },{ status: '2' });
                                            return {
                                                activity: 1,
                                                message:
                                                    'save data file not create',
                                                saveData: saveData || '',
                                            };
                                        };
                                        this.commonFileService
                                            .writeFile(filePathDir,JSON.stringify(saveData,null,2),saveDataFileName)
                                            .then(
                                                async (writeJsonFile: any) => {
                                                    const saveDataFileFullPath: string = path.resolve(`${filePathDir}/${saveDataFileName}`);
                                                    if (writeJsonFile?.status === 'success') {
                                                        return this.commonFileService.fileExist(saveDataFileFullPath)
                                                            .then(async (exists: boolean) => {
                                                                    if (exists) {
                                                                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'},{path: saveDataFileFullPath, filename: bucketSFileName.replace(/\.[^/.]+$/,'.json'),userBucket: 'private'}));
                                                                    } else {
                                                                        return await removeCustomWeightData(saveData);
                                                                    }
                                                            });
                                                    } else {
                                                        return await removeCustomWeightData(saveData);
                                                    }
                                                },
                                            )
                                            .catch(async (error: any) => {
                                                return await removeCustomWeightData(saveData);
                                            });
                                    }
                                }
                            }
                        } catch (err) {
                            return {
                                activity: 1,
                                message: `An error occurred: ${err}`,
                            };
                        }
                        if (sFileName) {
                            await this.commonFileService.removeFolderFromLocal(
                                path.resolve(
                                    `${filePathDir}/${sFileName}`,
                                )
                            );
                        }
                    }
                    updateRequestData['status'] = Status.One;
                    await this.weightRequestService.updateRecord({ id: recordDetails['id'] },updateRequestData);
                    return {
                        success: 1,
                        error: 0,
                        message: 'SUCCESS_WEIGHT_UPLOAD',
                    };
                } else {
                    return {
                        success: 0,
                        error: 1,
                        message: 'ERR_SOMETHING_WENT_WRONG',
                    };
                }
            }
        } catch (error) {
            return {
                activity: 1,
                message: `An error occurred: ${error}`,
            };
        }
    }
}
