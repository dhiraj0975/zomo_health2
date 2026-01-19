import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { In } from 'typeorm';
import { CompanyService } from '../../company/company.service';
import { ImportUserRequestService } from '../../user/importuserrequest/importuserrequest.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class TerminateCronService {
    constructor(
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly userService: UserService,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
    ) {}

    async terminateUserProcess(postData: any) {
        try {
            let recordDetails: any,
                partialData: any = {},
                rejectData: any = {},
                createData: any = {},
                skipData: any = {},
                echoTime = '';
            if (postData?.id) {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        hash: postData?.id,
                        status: '1',
                        flage: '5',
                        requeststep: '5',
                        terminate_step: '0',
                        source_type: '2',
                    },
                    null,
                    [
                        'hash',
                        'org_id',
                        'mapped_header',
                        'origional_file',
                        'id',
                        'census_upload_type',
                        'reset_password',
                    ],
                );
            } else {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        status: '1',
                        flage: '5',
                        requeststep: '5',
                        terminate_step: '0',
                        source_type: '1',
                    },
                    { request_date: 'ASC' },
                    [
                        'hash',
                        'org_id',
                        'mapped_header',
                        'origional_file',
                        'id',
                        'census_upload_type',
                        'reset_password',
                    ],
                );
            }
            if (!recordDetails) {
                throw new Error('ERR_RECORD_NOT_FOUND');
            }

            let mapped_header = JSON.parse(recordDetails?.mapped_header);
            const companyId = recordDetails?.org_id;
            let table_header_data = appConstant.table_HEADER_DATA;
            const directory = `userimport/${recordDetails?.org_id}/${recordDetails?.id}`;

            let created_user_code = [],
                reject_user_code = [],
                partial_user_code = [],
                skip_user_code = [];
            const createFileName: string = `Created_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
            let file_createData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'check_file' },
                    {
                        prefix: `${directory}/${createFileName}`,
                        userBucket: 'private',
                    },
                ),
            );
            if (file_createData) {
                let createFileRead = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'get_file' },
                        {
                            path: `${directory}/${createFileName}`,
                            userBucket: 'private',
                        },
                    ),
                );
                let create_Data = Buffer.from(
                    createFileRead.Body,
                    'base64',
                ).toString('utf-8');
                createData = JSON.parse(create_Data);
                let create_mapped_sheet_data =
                    await this.commonArrayService.mapped_sheet_data(
                        createData,
                        mapped_header,
                        'header',
                    );
                createData = await this.commonArrayService.mapped_sheet_data(
                    create_mapped_sheet_data,
                    table_header_data,
                    'table_header',
                );
                created_user_code = createData
                    .map((row) => (row['code'] || '').toString().trim())
                    .filter((code) => code !== '');
            }

            const rejectFileName: string = `Rejected_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
            let file_rejectData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'check_file' },
                    {
                        prefix: `${directory}/${rejectFileName}`,
                        userBucket: 'private',
                    },
                ),
            );
            if (file_rejectData) {
                let rejectFileRead = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'get_file' },
                        {
                            path: `${directory}/${rejectFileName}`,
                            userBucket: 'private',
                        },
                    ),
                );
                let reject_Data = Buffer.from(
                    rejectFileRead.Body,
                    'base64',
                ).toString('utf-8');
                rejectData = JSON.parse(reject_Data);
                let reject_mapped_sheet_data =
                    await this.commonArrayService.mapped_sheet_data(
                        rejectData,
                        mapped_header,
                        'header',
                    );
                rejectData = await this.commonArrayService.mapped_sheet_data(
                    reject_mapped_sheet_data,
                    table_header_data,
                    'table_header',
                );
                reject_user_code = rejectData
                    .map((row) => (row['code'] || '').toString().trim())
                    .filter((code) => code !== '');
            }

            const partialFileName: string = `Partial_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
            let file_partialData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'check_file' },
                    {
                        prefix: `${directory}/${partialFileName}`,
                        userBucket: 'private',
                    },
                ),
            );
            if (file_partialData) {
                let partialFileRead = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'get_file' },
                        {
                            path: `${directory}/${partialFileName}`,
                            userBucket: 'private',
                        },
                    ),
                );
                let partial_Data = Buffer.from(
                    partialFileRead.Body,
                    'base64',
                ).toString('utf-8');
                partialData = JSON.parse(partial_Data);
                let partial_mapped_sheet_data =
                    await this.commonArrayService.mapped_sheet_data(
                        partialData,
                        mapped_header,
                        'header',
                    );
                partialData = await this.commonArrayService.mapped_sheet_data(
                    partial_mapped_sheet_data,
                    table_header_data,
                    'table_header',
                );
                let partial_user_code = partialData
                    .map((row) => (row['code'] || '').toString().trim())
                    .filter((code) => code !== '');
            }

            const skipFileName: string = `Skip_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
            let file_skipData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'check_file' },
                    {
                        prefix: `${directory}/${skipFileName}`,
                        userBucket: 'private',
                    },
                ),
            );
            if (file_skipData) {
                let skipFileRead = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'get_file' },
                        {
                            path: `${directory}/${skipFileName}`,
                            userBucket: 'private',
                        },
                    ),
                );
                let skip_Data = Buffer.from(
                    skipFileRead.Body,
                    'base64',
                ).toString('utf-8');
                skipData = JSON.parse(skip_Data);
                let skip_mapped_sheet_data =
                    await this.commonArrayService.mapped_sheet_data(
                        skipData,
                        mapped_header,
                        'header',
                    );
                skipData = await this.commonArrayService.mapped_sheet_data(
                    skip_mapped_sheet_data,
                    table_header_data,
                    'table_header',
                );
                let skip_user_code = skipData
                    .map((row) => (row['code'] || '').toString().trim())
                    .filter((code) => code !== '');
            }

            let afect_usercode = [
                ...created_user_code,
                ...reject_user_code,
                ...partial_user_code,
                ...skip_user_code,
            ];
            let membership_code =
                await this.companyService.getCompanyCodeFromId(
                    recordDetails?.org_id,
                );

            const existCode = afect_usercode
                .map((code) => `'${code}'`)
                .join(',');
            let userTerminate_filename = '';
            let allUserData: any = [];
            if (existCode) {
                allUserData = await this.userService.listUDLCSRecords(
                    `User.membership_code = '${membership_code}' AND User.code NOT IN (${existCode}) AND User.role_id IN (2,16)`,
                    { id: 'ASC' },
                    [
                        'department.dept_name',
                        'department.id',
                        'company.id',
                        'companySetting.spouse_option',
                        'companySetting.census_status',
                        'Location.lname',
                        'Location.address1',
                        'Location.address2',
                        'Location.city',
                        'Location.state',
                        'Location.zip',
                        'Location.country',
                        'User.first_name',
                        'User.middle_name',
                        'User.last_name',
                        'User.username',
                        'User.email',
                        'User.role_id',
                        /*'User.supervisor_id',*/ 'User.status',
                        'User.department_id',
                        'User.securitycode',
                        'User.employeeid',
                        'User.relationship_id',
                        'User.insurance_plan_name',
                        'User.on_insurance_plan',
                        'User.code',
                        'User.gender',
                        'User.dob',
                        'User.date_of_hire',
                        'User.is_camp_eligible',
                        'settings.wphone',
                        'settings.wphone_ext',
                        'settings.hphone',
                        'settings.cphone',
                        'settings.address',
                        'settings.address2',
                        'settings.city',
                        'settings.state',
                        'settings.zip',
                        'settings.country',
                        'settings.jobtitle',
                        'settings.email_receiving',
                        'settings.email_update',
                    ],
                );
                if (allUserData?.length > 0) {
                    allUserData = await this.table_data_formate(allUserData);
                } else {
                    throw new Error('ERR_NO_USER_DATA');
                }
                allUserData.map((item) => {
                    item.status = 2; // Terminated
                    return item;
                });

                let terminatedUserCode = allUserData
                    .map((row) => (row['code'] || '').toString().trim())
                    .filter((code) => code !== '');

                await this.userService.update(
                    { code: In(terminatedUserCode) },
                    { status: 0 },
                ); // Update status to Terminated

                if (allUserData.length > 0) {
                    let filePath = path.join(`${directory}/`);
                    let fileName = `Terminated_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                    const companies = await this.companyService.findOne({
                        id: companyId,
                    });
                    let terminate_json =
                        await this.commonFileService.createJsonFile(
                            companies,
                            allUserData,
                            mapped_header,
                        );
                    let terminate_csv =
                        await this.commonFileService.reverseMapSheetData(
                            terminate_json,
                            mapped_header,
                            'reversed_header',
                        );
                    terminate_csv =
                        await this.commonFileService.reverseMapSheetData(
                            terminate_csv,
                            appConstant.GENERAL_HEADER_DATA,
                        );

                    let writeJsonFile = await this.commonFileService.writeFile(
                        filePath,
                        `${JSON.stringify(terminate_json)}`,
                        fileName,
                    );
                    let json_file_full_path = path.resolve(
                        `${filePath}${fileName}`,
                    );
                    if (writeJsonFile?.status == 'success') {
                        let csvFile = `CSV_Terminated_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                        let writeCsvFile =
                            await this.commonFileService.writeFile(
                                filePath,
                                `${JSON.stringify(terminate_csv)}`,
                                csvFile,
                            );
                        if (writeCsvFile?.status == 'success') {
                            let file_full_path = path.resolve(
                                `${filePath}${csvFile}`,
                            );
                            let excelData: any =
                                await this.commonFileService.createJsonToFile(
                                    1,
                                    file_full_path,
                                    'pythonjsontocsv.py',
                                );
                            if (excelData?.status == 'success') {
                                filePath = file_full_path.replace(
                                    '.json',
                                    '.csv',
                                );
                                if (
                                    await this.commonFileService.fileExist(
                                        filePath,
                                    )
                                ) {
                                    let datetime = this.commonDateService
                                        .getTodayDate(new Date())
                                        .format('MM-DD-YYYYHHmmss');
                                    userTerminate_filename = `${directory}/Terminated-Records-${datetime}.csv`;
                                    let userTerminate_filename_json = `${directory}/${fileName}`;
                                    await lastValueFrom(
                                        this.commonMicroservice.send(
                                            { cmd: 'upload_file' },
                                            {
                                                path: filePath,
                                                filename:
                                                    userTerminate_filename,
                                                userBucket: 'private',
                                            },
                                        ),
                                    );
                                    await lastValueFrom(
                                        this.commonMicroservice.send(
                                            { cmd: 'upload_file' },
                                            {
                                                path: json_file_full_path,
                                                filename:
                                                    userTerminate_filename_json,
                                                userBucket: 'private',
                                            },
                                        ),
                                    );
                                } else {
                                    throw new Error(`File does not exist`);
                                }
                            }
                        }
                    } else {
                        throw new Error(`File does not exist`);
                    }
                }
            }
            await this.importUserRequestService.update(
                { id: recordDetails?.id },
                {
                    terminate_step: '1',
                    terminated_file: userTerminate_filename,
                    terminated_count: allUserData.length,
                },
            );
            return true;
        } catch (error) {
            return false;
        }
    }
    async table_data_formate(allUserData) {
        try {
            if (allUserData?.length > 0) {
                allUserData = allUserData.map((item) => {
                    let onInsurancePlan = '';
                    let relationshipCode = '';
                    let relationshipId = '';
                    let securitycode = '';
                    const plan = item.on_insurance_plan?.toLowerCase();
                    if (plan == 'yes' || plan == 'y') {
                        onInsurancePlan = 'Yes';
                    } else if (plan == 'no' || plan == 'n') {
                        onInsurancePlan = 'No';
                    }
                    if (item?.role_id == 16) {
                        if (
                            item?.['company']?.['companySetting']
                                .spouse_option == 1
                        ) {
                            relationshipCode = 'Spouse / Domestic Partner';
                        } else {
                            relationshipCode = 'Spouse';
                        }
                        relationshipId = item?.relationship_id;
                    }
                    if (item?.securitycode) {
                        if (item?.securitycode.length > 11) {
                            securitycode = Buffer.from(
                                item?.securitycode,
                                'base64',
                            )
                                .toString()
                                .trim();
                        }
                    }
                    if (
                        item['Location']?.['country'] != '' &&
                        item['Location']?.['country'] == 'United States'
                    ) {
                        item['Location']['country'] = 'USA';
                    }
                    if (item?.employeeid) {
                        item['employeeid'] = item?.employeeid.toString().trim();
                    }
                    return {
                        department_id: item?.department_id || null,
                        status: item.status || '',
                        relationship_code: relationshipCode || null,
                        relationship_id: relationshipId || null,
                        role_id: item?.role_id.toString() || null,
                        id_of_direct_supervisor: null,
                        username: item?.username || null,
                        first_name: item?.first_name || null,
                        middle_name: item?.middle_name || null,
                        last_name: item?.last_name || null,
                        jobtitle: item?.['settings']?.jobtitle || null,
                        securitycode: securitycode || null,
                        employeeid: item?.employeeid || null,
                        gender: item.gender || null,
                        dob: item?.dob
                            ? this.commonDateService
                                  .getTodayDate(item?.dob)
                                  .format('MM-DD-YYYY')
                            : null,
                        date_of_hire: item?.date_of_hire
                            ? this.commonDateService
                                  .getTodayDate(item?.date_of_hire)
                                  .format('MM-DD-YYYY')
                            : null,
                        on_insurance_plan: onInsurancePlan,
                        insurance_plan_name: item?.insurance_plan_name || null,
                        email: item?.email || null,
                        wphone: item?.['settings']?.wphone || null,
                        wphone_ext: item?.['settings']?.wphone_ext || null,
                        location: item?.['Location']?.['lname'] || null,
                        work_address_1:
                            item?.['Location']?.['address1'] || null,
                        work_address_2:
                            item?.['Location']?.['address2'] || null,
                        work_city: item?.['Location']?.['city'] || null,
                        work_state: item?.['Location']?.['state'] || null,
                        work_zip: item?.['Location']?.['zip'] || null,
                        work_country: item?.['Location']?.['country'] || null,
                        hphone: item?.['settings']?.hphone || null,
                        cphone: item?.['settings']?.cphone || null,
                        address: item?.['settings']?.address || null,
                        address_2: item?.['settings']?.address2 || null,
                        city: item?.['settings']?.city || null,
                        state: item?.['settings']?.state || null,
                        zip: item?.['settings']?.zip || null,
                        country: item?.['settings']?.country || null,
                        code: item?.code || null,
                        is_camp_eligible:
                            item?.is_camp_eligible == 1 ? 'Yes' : 'No',
                        email_receiving:
                            item?.['settings']?.email_receiving == 1
                                ? 'Yes'
                                : 'No',
                        email_update:
                            item?.['settings']?.email_update == 1
                                ? 'Yes'
                                : 'No',
                    };
                });
            }
            return allUserData;
        } catch (error) {
            return [];
        }
    }
}
