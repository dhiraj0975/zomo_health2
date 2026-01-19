import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
} from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import * as md5 from 'md5';
import { lastValueFrom } from 'rxjs';
import { processStepUpdate } from '../../common/commonFunctions';
import { CompanyService } from '../companies/company.service';
import { DepartmentService } from '../companies/department.service';
import { OnboardingService } from '../registration/onboarding.service';
import { ImportUserRequestService } from './importuserrequest.service';
import { UserService } from './user.service';
import { UserSettingsService } from './usersettings.service';
const path = require('path');
@Controller('user')
export class UserController {
    constructor(
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly onboardingService: OnboardingService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly companyService: CompanyService,
        private readonly userService: UserService,
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly userSettingsService: UserSettingsService,
        private readonly departmentService: DepartmentService,
    ) {}

    @MessagePattern({ cmd: 'user' })
    async user(@Payload() data: any) {
        try {
            const { user, step, ...stepData } = data;
            const userBucket = 'private';
            const onboardingID = user.id;

            // Step 1: Validate file structure
            const validationFileResponse = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    {
                        path: stepData.validation_file,
                        userBucket,
                    },
                ),
            );

            const validationFileContent = Buffer.from(
                validationFileResponse?.Body,
                'base64',
            ).toString('utf-8');

            const validationData = JSON.parse(validationFileContent);

            const expectedHeaders = [
                'First Name',
                'Middle Name',
                'Last Name',
                'Gender',
                'Birth Date',
                'Email',
                'Department',
            ];

            if (
                !Array.isArray(validationData) ||
                !Array.isArray(validationData[0])
            ) {
                throw new Error('Data must be an array of arrays');
            }

            const headers = validationData[0];
            const isHeaderValid =
                headers.length === expectedHeaders.length &&
                headers.every(
                    (header, index) => header === expectedHeaders[index],
                );

            if (!isHeaderValid) {
                throw new Error('Header row is invalid');
            }

            // Step 2: Update step initially
            stepData.userBucket = userBucket;

            let { stepResult } = await processStepUpdate(
                this.onboardingService,
                onboardingID,
                step,
                stepData,
                {},
            );

            // Step 3: Process validation and update status
            const updatedValidationFileResponse = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    {
                        path: stepResult.data.validation_file,
                        userBucket,
                    },
                ),
            );

            const updatedValidationData = JSON.parse(
                Buffer.from(
                    updatedValidationFileResponse?.Body,
                    'base64',
                ).toString('utf-8'),
            );

            const { records, successCount, rejectedCount } =
                await this.userService.updateStatusFromDbJson(
                    updatedValidationData,
                );

            // Replace content in-place
            updatedValidationData.length = 0;
            updatedValidationData.push(...records);

            // Step 4: Update JSON file in microservice
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'update_file' },
                    {
                        path: stepResult.data.validation_file,
                        userBucket,
                        updateItems: updatedValidationData,
                    },
                ),
            );

            // Step 5: Generate and upload Excel file
            const baseFilePath = path.join(
                `${appConstant.ONBOARD_CENSUS_FILE_PATH}${onboardingID}`,
            );

            const jsonFileName = path.basename(stepResult.data.validation_file);
            const jsonFilePath = `${baseFilePath}/${jsonFileName}`;
            const jsonString = JSON.stringify(updatedValidationData);

            // Write updated JSON locally
            await this.commonFileService.writeFile(
                baseFilePath,
                jsonString,
                jsonFileName,
            );

            // Convert to Excel
            const excelData = await this.commonFileService.createJsonToFile(
                1,
                jsonFilePath,
                'pythonjsontoxlsx.py',
            );

            const excelFileName = jsonFileName.replace('.json', '.xlsx');
            const excelFilePath = `${baseFilePath}/${excelFileName}`;
            const excelFilenameInBucket = `userimport/onboarding/${onboardingID}/${excelFileName}`;

            // Upload Excel file
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: path.resolve(excelFilePath),
                        filename: excelFilenameInBucket,
                        userBucket,
                        isRemove: false,
                    },
                ),
            );

            // Step 6: Final step update
            ({ stepResult } = await processStepUpdate(
                this.onboardingService,
                onboardingID,
                step,
                {
                    ...stepData,
                    successCount,
                    rejectedCount,
                    completed: successCount > 0 ? 1 : 0,
                    excel_file_path: excelFilenameInBucket, // Added here
                },
                {},
            ));

            return {
                success: true,
                message: 'User data validated successfully',
                data: { steps_data: stepResult },
            };
        } catch (error) {
            console.error('User error:', error);
            return {
                success: false,
                message: error.message || 'Failed to save User',
            };
        }
    }

    @MessagePattern({ cmd: 'addUserData' })
    async addUserData(@Payload() data: any) {
        try {
            const { user, step, ...stepData } = data;
            const stepResult = user.steps_data.user;
            const onboardingID = user.id;
            const orgId = user.org_id;

            const org_sheet_header =
                '["First Name","Middle Name","Last Name","Gender","Birth Date","Email","Department"]';
            const mapped_header =
                '{"A":"6","B":"","C":"","D":"","E":"","F":"","G":"","H":"0","I":"1","J":"2","K":"","L":"","M":"","N":"3","O":"4","P":"","Q":"","R":"","S":"5","T":"","U":"","V":"","W":"","X":"","Y":"","Z":"","AA":"","AB":"","AC":"","AD":"","AE":"","AF":"","AG":"","AH":"","AI":"","AJ":"","AK":"","AL":"","BA":"","BB":"","BC":"","BD":"","BE":"","BF":"","BG":"","CA":""}';

            const successCount = stepResult?.data?.successCount ?? 0;
            const rejectedCount = stepResult?.data?.rejectedCount ?? 0;
            const totalRecords = successCount + rejectedCount;
            const source_type = totalRecords > 700 ? 1 : 2;

            // Create import request
            const recordDetails = await this.importUserRequestService.create({
                org_id: orgId,
                status: 0,
                requeststep: 0,
                flage: 0,
                user_id: user.user_id,
                email: user.email,
                source: 1,
                census_upload_type: 0,
                source_type,
                org_sheet_header,
                mapped_header,
            });
            const requestId = recordDetails.id;

            // Get validation file
            const validationFile = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    {
                        path: stepResult.data.validation_file,
                        userBucket: 'private',
                    },
                ),
            );

            const validationFileData = JSON.parse(
                Buffer.from(validationFile?.Body, 'base64').toString('utf-8'),
            );

            // Filter passing records
            const passingItems = validationFileData.filter(
                (i) => i.Status === '',
            );
            if (!passingItems.length)
                throw new Error('No passing records found');

            const headers = Object.keys(passingItems[0]);
            const formatted = [
                headers,
                ...passingItems.map((item) =>
                    headers.map((key) => item[key] ?? ''),
                ),
            ];

            // Prepare file paths
            const directory = `userimport/onboarding/${onboardingID}/`;
            const directoryAlt = `userimport/${orgId}/${requestId}/pass_`;
            const originalFile = stepResult.data.origional_file.replace(
                directory,
                directoryAlt,
            );
            const parsed = path.parse(originalFile);
            const origional_file_json = 'pass_' + parsed.name + '.json';
            const baseFilePath = path.join(
                `${appConstant.ONBOARD_CENSUS_FILE_PATH}${onboardingID}`,
            );
            const jsonFilePath = `${baseFilePath}/${origional_file_json}`;
            const excelFilePath = jsonFilePath.replace('.json', '.xlsx');

            // Write JSON and create Excel
            const jsonString = JSON.stringify(formatted, null, 2);
            const writeFile = await this.commonFileService.writeFile(
                baseFilePath,
                jsonString,
                path.basename(origional_file_json),
            );

            if (writeFile?.status !== 'success') {
                throw new Error('Failed to write JSON file');
            }

            const excelData: any =
                await this.commonFileService.createJsonToFile(
                    1,
                    jsonFilePath,
                    'pythonjsontoxlsx.py',
                );

            if (excelData?.status !== 'success') {
                throw new Error('Excel generation failed');
            }

            const fileExists =
                await this.commonFileService.fileExist(excelFilePath);
            if (!fileExists) {
                throw new Error('Excel file not found');
            }

            // Create the updated filename first
            const createdPath = originalFile
                .replace(
                    `userimport/${orgId}/${requestId}`,
                    `userimport/onboarding/${onboardingID}`,
                )
                .replace('.xlsx', '.json');

            await Promise.all([
                lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'upload_file' },
                        {
                            path: path.resolve(excelFilePath),
                            filename: originalFile,
                            userBucket: 'private',
                        },
                    ),
                ),
                lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'upload_file' },
                        {
                            path: path.resolve(jsonFilePath),
                            filename: originalFile.replace('.xlsx', '.json'),
                            userBucket: 'private',
                            //isRemove: false,
                        },
                    ),
                ),
                /*lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'upload_file' },
                        {
                            path: path.resolve(jsonFilePath),
                            filename: createdPath,
                            userBucket: 'private',
                        },
                    ),
                ),*/
            ]);

            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: Buffer.from(
                            JSON.stringify(passingItems),
                        ).toString('base64'),
                        filename: createdPath,
                        userBucket: 'private',
                    },
                ),
            );
            // Update DB with hash
            const hash = md5(requestId);
            await this.importUserRequestService.updateRecord(
                { id: requestId },
                {
                    origional_file: originalFile,
                    hash,
                },
            );

            // Trigger processing if needed
            if (source_type === 2) {
                await this.importUserRequestService.processSteps(
                    'import-user-process-backup',
                    { id: hash },
                );
            }

            // Update onboarding and company status
            const requestUpdate = await this.onboardingService.getOne({
                id: onboardingID,
            });

            if (requestUpdate) {
                // console.log(createdPath);
                requestUpdate.steps_data.user.dataEntry = 1;
                requestUpdate.steps_data.wellness.dataEntry = 1;
                requestUpdate.steps_data.user.createdPath = createdPath;
                await this.onboardingService.create(requestUpdate);
            }

            await this.companyService.updateRecord(
                { id: orgId },
                { status: 1 },
            );

            return {
                success: true,
                message: 'User data saved successfully',
                data: { steps_data: stepResult },
            };
        } catch (error) {
            console.error('User error', error);
            return {
                success: false,
                message: error.message || 'Failed to save User',
            };
        }
    }
}
