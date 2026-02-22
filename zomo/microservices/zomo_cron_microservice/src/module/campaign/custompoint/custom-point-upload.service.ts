import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    CustomPointEntity,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { UserService } from '../../user/user.service';
import { CampaignActivityService } from '../campaign-activity.service';
import { CampaignRewardService } from '../campaign-reward.service';
import { CampaignService } from '../campaign.service';
import { CustomPointRequestService } from '../custom-point-request.service';
import { CustomPointService } from './custompoint.service';
import fs from 'fs';
import { In } from 'typeorm';
@Injectable()
export class CustomPointUploadService {
    constructor(
        @InjectRepository(CustomPointEntity, appConstant.MAIN.toLowerCase())
        private readonly commonService: CommonService,
        private readonly customPointService: CustomPointService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly userService: UserService,
        private readonly campaignService: CampaignService,
        private readonly campaignRewardService: CampaignRewardService,
        private readonly customPointRequestService: CustomPointRequestService,
        private readonly campaignActivityService: CampaignActivityService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}

    async uploadCustomPoint(postData: any) {
        try {
            postData = postData?.data;
            let recordDetails: any = {},
                where: any = {};
            if (!postData) {
                where = { status: 3 };
            } else {
                if (!postData?.id) {
                    return {
                        success: 0,
                        error: 1,
                        message: 'ERR_REQUIRED_PARAM_MISSING',
                    };
                }
                where = {
                    id: postData?.id,
                    org_id: postData?.org_id,
                    created_by: postData?.created_by,
                    status: postData?.status,
                };
            }
            recordDetails = await this.customPointRequestService.findOne(
                where,
                [
                    'id',
                    'org_id',
                    'original_file',
                    'campaign_id',
                    'org_sheet_header',
                    'mapped_header',
                    'status',
                    'created_by',
                ],
            );
            if (!recordDetails) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_RECORD_NOT_FOUND',
                };
            }

            let fileData: any = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    {
                        path: `${recordDetails['original_file'].replace(/\.[^/.]+$/, '.json')}`,
                        userBucket: 'private',
                    },
                ),
            );
            let sheetData: any = JSON.parse(
                Buffer.from(fileData?.Body, 'base64').toString('utf-8'),
            );
            sheetData = sheetData.slice(1);
            if (!sheetData.length) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_DATA_NOT_FOUND',
                };
            }
            const mappedHeader: any = JSON.parse(
                recordDetails['mapped_header'],
            );
            const pointHeaderData: any = appConstant.UPLOAD_POINT_HEADER_DATA;
            const pointHeaderDataArray: string[] =
                Object.values(pointHeaderData);
            const selectedMappedHeader: any = Object.fromEntries(
                Object.entries(mappedHeader).filter(
                    ([key, value]) => value !== '',
                ),
            );
            let checkReward = await this.campaignRewardService.listRecord({
                campaign_id: recordDetails?.campaign_id,
                status: 1,
            });
            if (checkReward.length == 0) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_REWARD_NOT_FOUND',
                };
            }
            let orgSheetHeader: string[] = JSON.parse(
                recordDetails?.org_sheet_header,
            );
            const getExcelColumnName = (index: number): string => {
                let name = '';
                while (index >= 0) {
                    name = String.fromCharCode((index % 26) + 65) + name;
                    index = Math.floor(index / 26) - 1;
                }
                return name;
            };
            let columnIndex = Number(pointHeaderDataArray.length) + 1;
            let dropZoneActivity: any = {};
            let ActivityId: any = {};
            let allActivityData: any = {};
            for (let rewards of checkReward) {
                let getActivities =
                    await this.campaignActivityService.campaignActivityData(
                        [
                            'ca.id',
                            'ca.cust_name',
                            'activity.id',
                            'activity.activity_name',
                        ],
                        {id: In(rewards.related_activity.split(',')), status: 1,campaign_id: recordDetails?.campaign_id},
                        {
                            'ca.required_by_spouse': 'DESC',
                            'ca.required_by_user': 'DESC',
                            'activity.activity_name': 'ASC',
                        },
                        [
                            {
                                join_table: 'ca.activity',
                                alias: 'activity',
                                table: tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                                on_condition: `ca.activity_id = activity.id`,
                                join_type: 'left_one',
                            },
                        ],
                        'getMany',
                    );
                if (getActivities.length > 0) {
                    for (let i = 0; i < getActivities.length; i++) {
                        const activity = getActivities[i];
                        const label =
                            activity?.cust_name ||
                            activity?.['activity']?.activity_name;
                        allActivityData[`${label}`] = {};
                        if (!label) continue;
                        const col1 = getExcelColumnName(columnIndex++);
                        const col2 = getExcelColumnName(columnIndex++);
                        const tempMap = {
                            [col1]: `${label}`,
                            [col2]: `${label}`,
                            [`$${col1}$`]: `${activity?.id}`,
                            [`#${col1}#`]: `point`,
                            [`$#${col2}#$`]: `date`,
                        };
                        selectedMappedHeader[`$${col1}$`] = '';
                        selectedMappedHeader[`#${col1}#`] = '';
                        selectedMappedHeader[`$#${col2}#$`] = '';
                        dropZoneActivity = { ...dropZoneActivity, ...tempMap };
                        ActivityId = {
                            ...ActivityId,
                            ...{ [label]: activity.id },
                        };
                    }
                }
            }
            let headerData = { ...pointHeaderData, ...dropZoneActivity };
            const defaultHeader = {};
            let activityKey = Object.keys(dropZoneActivity);
            const keys = Object.keys(headerData);
            let mappedActivityCount = 0;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (selectedMappedHeader[key] !== undefined) {
                    defaultHeader[key] = headerData[key];
                } else {
                    if (activityKey.includes(key)) {
                        mappedActivityCount++;
                    }
                }
                if (selectedMappedHeader[`$${key}$`] !== undefined) {
                    defaultHeader[`$${key}$`] = headerData[`$${key}$`];
                }
                if (selectedMappedHeader[`#${key}#`] !== undefined) {
                    defaultHeader[`#${key}#`] = headerData[`#${key}#`];
                }
                if (selectedMappedHeader[`$#${key}#$`] !== undefined) {
                    defaultHeader[`$#${key}#$`] = headerData[`$#${key}#$`];
                }
            }
            let totalActivity = Object.keys(
                JSON.parse(JSON.stringify(allActivityData)),
            ).length;
            if (totalActivity == mappedActivityCount / 2) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_CUSTOM_POINT_MAPPED',
                };
            }
            const defaultHeaderValues: string[] = Object.values(defaultHeader);
            const missingFields = ['User Code', 'Email', 'Username'].filter(
                (field) => {
                    return !defaultHeaderValues.some(
                        (header) =>
                            header?.toLowerCase().trim() ===
                            field.toLowerCase().trim(),
                    );
                },
            );
            if (missingFields.length > 0) {
                return {
                    success: 0,
                    error: 1,
                    message: `Missing fields: ${missingFields.join(', ')}`,
                };
            } else {
            }
            const codeIndex = defaultHeaderValues.indexOf('User Code');
            const emailIndex = defaultHeaderValues.indexOf('Email');
            const usernameIndex = defaultHeaderValues.indexOf('Username');
            let codeArray: string[] = [],
                emailArray: string[] = [],
                usernameArray: string[] = [];
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
                [
                    'user.id AS id',
                    'user.code AS code',
                    'user.email AS email',
                    'user.username AS username',
                    'user.first_name AS first_name',
                    'user.last_name AS last_name',
                ],
            );
            if (userData?.length == 0) {
                return {
                    success: 0,
                    error: 1,
                    message: 'ERR_USER_NOT_FOUND',
                };
            } else {
                let records: any = [],
                    successSheetArray: any = [],
                    rejectSheetArray: any = [];
                let date = await this.commonDateService.DateTimeFormat(
                    'now',
                    'YYYY-MM-DD HH:mm:ss',
                );
                const requestId = recordDetails['id'];
                const createdBy = recordDetails['created_by'];
                let checkCampaign = await this.campaignService.findOne({
                    id: recordDetails?.['campaign_id'],
                    status: 1,
                    organization_id: recordDetails?.['org_id'],
                });
                if (!checkCampaign) {
                    return {
                        success: 0,
                        error: 1,
                        message: 'ERR_CAMPAIGN_RECORD_NOT_FOUND',
                    };
                }
                let errorCount = 0;

                for (let i = 0; i < sheetData.length; i++) {
                    let rowActivity = JSON.parse(
                        JSON.stringify(allActivityData),
                    );
                    const row = sheetData[i];
                    const codeCheck = row[codeIndex];
                    const matchedUser = userData.find(
                        (user) => user.code === codeCheck,
                    );
                    const userId = matchedUser?.id,
                        firstName = matchedUser?.first_name || '',
                        lastName = matchedUser?.last_name || '',
                        userNotFount: any = [];
                    let activityBlank = 0,
                        errorData: Record<string, any> = {},
                        successData: Record<string, any> = {};
                    const activityData: Record<number, any> = {},
                        object: Record<string, any> = {};
                    for (let j: number = 0; j < orgSheetHeader.length; j++) {
                        let alphabet = Object.keys(mappedHeader).find(
                            (k) => mappedHeader[k] == j,
                        );
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

                        if (!pointHeaderDataArray.includes(header)) {
                            if (!activityData[activityName])
                                activityData[activityName] = {};

                            let activityId = defaultHeader[`$${alphabet}$`];
                            let activityPoint = defaultHeader[`#${alphabet}#`];
                            let activityDate = defaultHeader[`$#${alphabet}#$`];
                            activityData[activityName]['act_id'] = activityId;

                            if (activityPoint == 'point') {
                                if (cell === '') {
                                    errorList.push(2007);
                                    activityBlank++;
                                }
                                activityData[activityName]['act_name'] =
                                    activityName;
                                activityData[activityName]['act_point'] =
                                    `${cell}`;
                                const isInvalidPoint =
                                    await this.commonHealthService.checkPointNumber(
                                        cell,
                                    );
                                if (
                                    isInvalidPoint &&
                                    !errorList.includes(2007)
                                ) {
                                    errorList.push(2004);
                                }
                            }

                            if (activityDate == 'date') {
                                if (cell === '') {
                                    errorList.push(2008);
                                }

                                let sheetDate =
                                    await this.commonDateService.checkDateFormats(
                                        cell.toString(),
                                    );

                                if (
                                    sheetDate === 'Invalid Date' &&
                                    !errorList.includes(2008)
                                ) {
                                    errorList.push(2005);
                                }
                                if (errorList.length == 0) {
                                    activityData[activityName]['act_date'] =
                                        this.commonDateService.DateTimeFormat(
                                            cell,
                                            'YYYY-MM-DD',
                                        );
                                }
                                activityData[activityName]['act_name'] =
                                    activityName;
                                if (
                                    checkCampaign?.start_date &&
                                    checkCampaign?.end_date
                                ) {
                                    const startDate =
                                        this.commonDateService.DateTimeFormat(
                                            checkCampaign.start_date,
                                            'timestamp',
                                            'YYYY-MM-DD',
                                        );
                                    const endDate =
                                        this.commonDateService.DateTimeFormat(
                                            checkCampaign.end_date,
                                            'timestamp',
                                            'YYYY-MM-DD',
                                        );
                                    const sheetTS =
                                        this.commonDateService.DateTimeFormat(
                                            sheetDate,
                                            'timestamp',
                                            'YYYY-MM-DD',
                                        );

                                    if (
                                        sheetTS < startDate ||
                                        sheetTS > endDate
                                    ) {
                                        errorList.push(2006);
                                    }
                                }
                            }
                            const keys = Object.keys(rowActivity);

                            for (let k = 0; k < keys.length; k++) {
                                const key = keys[k];
                                if (activityName === key) {
                                    rowActivity[key]['id'] ||=
                                        activityData[activityName]['act_id'];
                                    rowActivity[key]['name'] ||= activityName;
                                    rowActivity[key]['date'] ||=
                                        activityData[activityName]['act_date'];
                                    rowActivity[key]['point'] ||=
                                        activityData[activityName]['act_point'];
                                    if (
                                        [2004, 2005, 2006, 2007, 2008].some(
                                            (code) => errorList.includes(code),
                                        ) ||
                                        (rowActivity[key]['error_data'] &&
                                            Object.keys(
                                                rowActivity[key]['error_data'],
                                            ).length > 0) ||
                                        userNotFount?.length > 0
                                    ) {
                                        const activityCode: number =
                                            errorList.find((code) =>
                                                [
                                                    2004, 2005, 2006, 2007,
                                                    2008,
                                                ].includes(code),
                                            );
                                        rowActivity[key]['error_data'] = {
                                            ...(rowActivity[key][
                                                'success_data'
                                            ] || {}),
                                            ...rowActivity[key]['error_data'],
                                            ...{ [header]: cell },
                                        };
                                        rowActivity[key]['error'] =
                                            rowActivity[key]['error'] || [];
                                        if (
                                            !rowActivity[key]['error'].includes(
                                                activityCode,
                                            ) &&
                                            activityCode
                                        ) {
                                            rowActivity[key]['error'].push(
                                                activityCode,
                                            );
                                            if (
                                                rowActivity[key]['error'] &&
                                                rowActivity[key][
                                                    'error'
                                                ].includes(2007) &&
                                                rowActivity[key][
                                                    'error'
                                                ].includes(2008)
                                            ) {
                                                rowActivity[key]['error'] =
                                                    rowActivity[key][
                                                        'error'
                                                    ].filter(
                                                        (value) =>
                                                            ![
                                                                2007, 2008,
                                                            ].includes(value),
                                                    );
                                            }
                                        }
                                        rowActivity[key]['success_data'] = {};
                                    } else {
                                        rowActivity[key]['success_data'] = {
                                            ...rowActivity[key]['success_data'],
                                            ...{ [header]: cell },
                                        };
                                    }
                                    break;
                                }
                            }
                        } else {
                            object[header] = cell;
                        }
                    }

                    activityBlank =
                        activityBlank / Object.keys(rowActivity).length;
                    Object.keys(rowActivity).forEach((key) => {
                        const item = rowActivity[key];
                        if (
                            item?.['error']?.length > 0 ||
                            userNotFount?.length > 0
                        ) {
                            errorData = {
                                ...errorData,
                                ...(item?.error_data || {}),
                            };
                            errorData = {
                                ...errorData,
                                Error: [
                                    ...new Set([
                                        ...(errorData?.Error
                                            ? errorData.Error.split(',').map(
                                                  Number,
                                              )
                                            : []),
                                        ...(item?.error?.map(Number) || []),
                                    ]),
                                ].join(','),
                            };
                        } else if (item['point'] && item['date']) {
                            if (userId) {
                                records.push({
                                    user_name:
                                        `${firstName} ${lastName}`.trim(),
                                    user_id: userId,
                                    org_id: recordDetails?.org_id,
                                    activity_id: item['id'],
                                    activity_name: item['name'],
                                    point: item['point'],
                                    created_date: date,
                                    updated_date: date,
                                    date: item['date'] + ' 00:00:00',
                                    status: 1,
                                    request_id: requestId,
                                    added_by: createdBy,
                                });
                                successData = {
                                    ...successData,
                                    ...item?.success_data,
                                };
                            }
                        }
                    });

                    if (Object.keys(successData).length > 0) {
                        successSheetArray.push({ ...object, ...successData });
                    }

                    if (Object.keys(errorData).length > 0) {
                        const { Error, ...restErrorData } = errorData;
                        rejectSheetArray.push({
                            ...object,
                            ...restErrorData,
                            Error: `${userNotFount.join(',')} ${Error}`.trim(),
                        });
                    }

                    if (activityBlank === 1) errorCount++;
                }
                if (sheetData?.length == errorCount) {
                    return {
                        success: 0,
                        error: 1,
                        message: 'ERR_ADD_AT_LEAST_ONE_POINT',
                    };
                }

                if (recordDetails) {
                    let currentDatetime =
                        await this.commonDateService.DateTimeFormat(
                            'now',
                            'YYYY-MM-DD-HHmmss',
                        );
                    let filePathDir: string =
                        path.join(`${appConstant.CUSTOM_POINT_REQUEST_PATH}`) +
                        `${this.commonFileService.sanitizeFileName(requestId)}`;
                    await this.commonFileService.dirIsExist(
                        `${appConstant.CUSTOM_POINT_REQUEST_PATH}/${requestId}/`,
                    );
                    let updateRequestData = {};

                    if (rejectSheetArray.length > 0) {
                        const jsonString = JSON.stringify(
                            rejectSheetArray,
                            null,
                            2,
                        );
                        let rFileName: string = `rejected_file_${requestId}_${currentDatetime}.json`;
                        try {
                            let writeFile =
                                await this.commonFileService.writeFile(
                                    filePathDir,
                                    jsonString,
                                    rFileName,
                                );
                            if (writeFile?.status == 'success') {
                                let excelData: any =
                                    await this.commonFileService.createJsonToFile(
                                        1,
                                        `${filePathDir}/${rFileName}`,
                                        'pythonjsontoxlsx.py',
                                    );
                                if (excelData?.status == 'success') {
                                    let filePathR =
                                        `${filePathDir}/${rFileName}`.replace(
                                            '.json',
                                            '.xlsx',
                                        );
                                    if (
                                        await this.commonFileService.fileExist(
                                            filePathR,
                                        )
                                    ) {
                                        let RejectedFIleName =
                                            rFileName.replace('.json', '.xlsx');
                                        let originalName =
                                            this.commonFileService.formatFileName(
                                                RejectedFIleName,
                                            );
                                        let bucketRFileName =
                                            this.commonFileService.generateFileName(
                                                `pointuploadfiles/${recordDetails?.org_id}`,
                                                requestId.toString(),
                                                'rejected_',
                                                originalName.split('.')[
                                                    originalName.split('.')
                                                        .length - 1
                                                ],
                                            );
                                        await lastValueFrom(
                                            this.commonMicroservice.send(
                                                { cmd: 'upload_file' },
                                                {
                                                    path: path.resolve(
                                                        filePathR,
                                                    ),
                                                    filename: bucketRFileName,
                                                    userBucket: 'private',
                                                },
                                            ),
                                        );
                                        updateRequestData['rejected_file'] =
                                            bucketRFileName;
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
                        const jsonStringS = JSON.stringify(
                            successSheetArray,
                            null,
                            2,
                        );
                        let sFileName: string = `success_file_${requestId}_${currentDatetime}.json`;
                        let data;
                        try {
                            let bucketSFileName = '';
                            let writeFile =
                                await this.commonFileService.writeFile(
                                    filePathDir,
                                    jsonStringS,
                                    sFileName,
                                );
                            if (writeFile?.status == 'success') {
                                let excelData: any =
                                    await this.commonFileService.createJsonToFile(
                                        1,
                                        `${filePathDir}/${sFileName}`,
                                        'pythonjsontoxlsx.py',
                                    );
                                if (excelData?.status == 'success') {
                                    let filePathS =
                                        `${filePathDir}/${sFileName}`.replace(
                                            '.json',
                                            '.xlsx',
                                        );
                                    if (
                                        await this.commonFileService.fileExist(
                                            filePathS,
                                        )
                                    ) {
                                        let SuccessFIleName = sFileName.replace(
                                            '.json',
                                            '.xlsx',
                                        );
                                        let originalName =
                                            this.commonFileService.formatFileName(
                                                SuccessFIleName,
                                            );
                                        bucketSFileName =
                                            this.commonFileService.generateFileName(
                                                `pointuploadfiles/${recordDetails?.org_id}`,
                                                requestId.toString(),
                                                'success_',
                                                originalName.split('.')[
                                                    originalName.split('.')
                                                        .length - 1
                                                ],
                                            );
                                        await lastValueFrom(
                                            this.commonMicroservice.send(
                                                { cmd: 'upload_file' },
                                                {
                                                    path: path.resolve(
                                                        filePathS,
                                                    ),
                                                    filename: bucketSFileName,
                                                    userBucket: 'private',
                                                },
                                            ),
                                        );
                                        updateRequestData['success_file'] =
                                            bucketSFileName;

                                        let saveData = [];
                                        if (records.length > 0) {
                                            saveData =
                                                await this.customPointService.save(
                                                    records,
                                                );
                                        }
                                        let saveDataFileName: string = `${currentDatetime}_SaveData.json`;
                                        const removeCustomPointData = async (
                                            data,
                                        ) => {
                                            let saveData = data;
                                            const idArray: number[] = [];
                                            for (
                                                let i: number = 0;
                                                i < saveData.length;
                                                i++
                                            ) {
                                                idArray.push(saveData[i].id);
                                            }
                                            await this.customPointService.update(
                                                { id: In(idArray) },
                                                { status: '2' },
                                            );
                                            return {
                                                activity: 1,
                                                message:
                                                    'save data file not create',
                                                saveData: saveData || '',
                                            };
                                        };
                                        this.commonFileService
                                            .writeFile(
                                                filePathDir,
                                                JSON.stringify(
                                                    saveData,
                                                    null,
                                                    2,
                                                ),
                                                saveDataFileName,
                                            )
                                            .then(
                                                async (writeJsonFile: any) => {
                                                    const saveDataFileFullPath: string =
                                                        path.resolve(
                                                            `${filePathDir}/${saveDataFileName}`,
                                                        );
                                                    if (
                                                        writeJsonFile?.status ===
                                                        'success'
                                                    ) {
                                                        return this.commonFileService
                                                            .fileExist(
                                                                saveDataFileFullPath,
                                                            )
                                                            .then(
                                                                async (
                                                                    exists: boolean,
                                                                ) => {
                                                                    if (
                                                                        exists
                                                                    ) {
                                                                        await lastValueFrom(
                                                                            this.commonMicroservice.send(
                                                                                {
                                                                                    cmd: 'upload_file',
                                                                                },
                                                                                {
                                                                                    path: saveDataFileFullPath,
                                                                                    filename:
                                                                                        bucketSFileName.replace(
                                                                                            /\.[^/.]+$/,
                                                                                            '.json',
                                                                                        ),
                                                                                    userBucket:
                                                                                        'private',
                                                                                },
                                                                            ),
                                                                        );
                                                                    } else {
                                                                        return await removeCustomPointData(
                                                                            saveData,
                                                                        );
                                                                    }
                                                                },
                                                            );
                                                    } else {
                                                        return await removeCustomPointData(
                                                            saveData,
                                                        );
                                                    }
                                                },
                                            )
                                            .catch(async (error: any) => {
                                                return await removeCustomPointData(
                                                    saveData,
                                                );
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
                    updateRequestData['status'] = 1;
                    await this.customPointRequestService.update(
                        { id: recordDetails['id'] },
                        updateRequestData,
                    );
                    return {
                        success: 1,
                        error: 0,
                        message: 'SUCCESS_POINT_UPLOAD',
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
