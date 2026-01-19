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
import { CensusCustomFieldsService } from '../censuscustomfields.service';
import { CensusCustomFieldsValuesService } from '../censuscustomfieldsvalues.service';

@Injectable()
export class SkipCronService {
    constructor(
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly userService: UserService,
        private readonly CensusCustomFieldsService: CensusCustomFieldsService,
        private readonly CensusCustomFieldsValuesService: CensusCustomFieldsValuesService,
    ) {}
    async importUserProcessSkip(postData: any) {
        try {
            let recordDetails: any, sheetData: any;
            if (postData?.id) {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        hash: postData?.id,
                        status: '0',
                        flage: '0',
                        requeststep: '0',
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
                    ],
                );
            } else {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        status: '0',
                        flage: '0',
                        requeststep: '0',
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
                    ],
                );
            }
            if (!recordDetails) {
                throw new Error('ERR_RECORD_NOT_FOUND');
            }
            await this.importUserRequestService.update(
                { hash: postData?.id },
                { status: '0', flage: '4' },
            );
            const directory = `userimport/${recordDetails?.org_id}/${recordDetails?.id}`;
            let jsonFilePath = recordDetails?.origional_file.replace(
                /\.(xlsx|csv)$/i,
                '.json',
            );
            /* File get */
            let fileData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    { path: `${jsonFilePath}`, userBucket: 'private' },
                ),
            );
            const decoded = Buffer.from(fileData.Body, 'base64').toString(
                'utf-8',
            );
            sheetData = JSON.parse(decoded);
            /* File get */
            /* Sheet Data field Operations */
            sheetData = sheetData.slice(1);
            let mapped_header = JSON.parse(recordDetails?.mapped_header);
            let table_header_data = {
                ...appConstant.table_HEADER_DATA,
                ...appConstant.table_SPOUSE_HEADER_DATA,
                ...appConstant.table_LINKED_HEADER_DATA,
            };
            let csv_json_header_data = appConstant.table_HEADER_DATA;
            let csv_header_data = appConstant.GENERAL_HEADER_DATA;

            const companyId = recordDetails?.org_id;
            const companies = await this.companyService.findOne({
                id: companyId,
            });
            let census_status =
                companies?.['company_settings']?.['census_status'];
            let census_custom_value = {};
            if (census_status == '1') {
                const census_mapping: Record<string, string> = {};
                let census_report_field =
                    await this.CensusCustomFieldsService.listRecord(
                        ['title', 'id'],
                        { status: 1, organization_id: companyId },
                    );
                census_report_field.forEach((field) => {
                    census_mapping[`Z${field.id}`] = field.title;
                });
                table_header_data = { ...table_header_data, ...census_mapping };
                csv_json_header_data = {
                    ...csv_json_header_data,
                    ...census_mapping,
                };
                csv_header_data = { ...csv_header_data, ...census_mapping };
                const fieldIds = census_report_field.map((field) => field.id);
                if (census_report_field) {
                    let census_field_value =
                        await this.CensusCustomFieldsValuesService.listRecord(
                            ['field_id', 'id', 'user_id', 'field_value'],
                            {
                                status: 1,
                                organization_id: companyId,
                                field_id: In(fieldIds),
                            },
                        );

                    const fieldMap = Object.fromEntries(
                        census_report_field.map((f) => [f.id, f.title]),
                    );
                    const defaultFields = Object.fromEntries(
                        census_report_field.map((f) => [f.title, null]),
                    );
                    census_custom_value = { default: { ...defaultFields } };
                    census_field_value.forEach(
                        ({ user_id, field_id, field_value }) => {
                            census_custom_value[user_id] ??= Object.fromEntries(
                                census_report_field.map((f) => [f.title, null]),
                            );
                            const fieldTitle = fieldMap[field_id.toString()];
                            if (fieldTitle) {
                                census_custom_value[user_id][fieldTitle] =
                                    field_value;
                            }
                        },
                    );
                }
            }
            let mapped_sheet_data =
                await this.commonArrayService.mapped_sheet_data(
                    sheetData,
                    mapped_header,
                    'header',
                );
            sheetData = await this.commonArrayService.mapped_sheet_data(
                mapped_sheet_data,
                table_header_data,
                'table_header',
            );
            sheetData.forEach((item) => {
                item.dob =
                    this.commonDateService.normalizeDates(item.dob) ?? null;
                item.date_of_hire =
                    this.commonDateService.normalizeDates(item.date_of_hire) ??
                    null;
            });
            /* Sheet Data field Operations */
            /* User Data Operations */
            let membership_code =
                await this.companyService.getCompanyCodeFromId(
                    recordDetails?.org_id,
                );
            let allUserData: any = await this.userService.listUDLCSRecords(
                `User.membership_code = '${membership_code}' AND User.role_id IN (2,16)`,
                { id: 'ASC' },
                [
                    'department.dept_name',
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
                    'User.id',
                    'User.first_name',
                    'User.middle_name',
                    'User.last_name',
                    'User.username',
                    'User.email',
                    'User.role_id',
                    /*'User.supervisor_id',*/ 'User.status',
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
            const statusMap = {
                1: 'Current',
                2: 'Terminated',
                3: 'Retired',
                4: 'Extended Leave',
            };
            const genderMap = {
                m: 'Male',
                f: 'Female',
                o: 'Other',
            };
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
                    if (
                        item['settings']?.['country'] != '' &&
                        item['settings']?.['country'] == 'United States'
                    ) {
                        item['settings']['country'] = 'USA';
                    }
                    if (item?.employeeid) {
                        item['employeeid'] = Number(
                            item?.employeeid.toString().trim(),
                        );
                    }
                    let baseData = {
                        department_id:
                            item?.['department']?.dept_name.trim() || null,
                        status: statusMap[item.status] || 'Terminated',
                        relationship_code: relationshipCode || null,
                        relationship_id: relationshipId || null,
                        role_id: item?.role_id,
                        /*"id_of_direct_supervisor": item?.['supervisor_id'] || '',*/
                        id_of_direct_supervisor: null,
                        username: item?.username || null,
                        first_name: item?.first_name || null,
                        middle_name: item?.middle_name || null,
                        last_name: item?.last_name || null,
                        jobtitle: item?.['settings']?.jobtitle || null,
                        securitycode: securitycode || null,
                        employeeid: item?.employeeid || null,
                        gender: genderMap[item.gender] || null,
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
                        spouse_first_name: null,
                        spouse_last_name: null,
                        spouse_dob: null,
                        spouse_gender: null,
                        spouse_email: null,
                        spouse_on_health_plan: null,
                        spouse_health_plan_name: null,
                        linked_emp_id: null,
                    };
                    let censusCustomValue =
                        census_custom_value[item.id] ||
                        census_custom_value['default'] ||
                        {};
                    return {
                        ...baseData,
                        ...censusCustomValue,
                    };
                });
            }
            /* User Data Operations */
            /* Process User Data */
            let result = await this.processJSONData(allUserData, sheetData);
            /* Process User Data */
            let createdData = result?.created || [];
            let skipData = result?.skip || [];
            /* File get and create-update json file */
            let create_update_filename = '';
            if (createdData.length > 0) {
                let fileName = `census_created_update_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                let filePath = path.join(`${directory}/`);
                let writeFile = await this.commonFileService.writeFile(
                    filePath,
                    `${JSON.stringify(createdData)}`,
                    fileName,
                );
                let create_file_full_path = path.resolve(
                    `${filePath}${fileName}`,
                );
                if (writeFile?.status == 'success') {
                    if (
                        await this.commonFileService.fileExist(
                            create_file_full_path,
                        )
                    ) {
                        create_update_filename = fileName;
                        let create_update_filename_json = `${directory}/${create_update_filename}`;
                        await lastValueFrom(
                            this.commonMicroservice.send(
                                { cmd: 'upload_file' },
                                {
                                    path: create_file_full_path,
                                    filename: create_update_filename_json,
                                    userBucket: 'private',
                                },
                            ),
                        );
                    } else {
                        throw new Error(`File does not exist`);
                    }
                } else {
                    throw new Error(`File does not exist`);
                }
            }
            /* File get and create-update json file */

            /* File get and skip json file */
            let skip_filename = '';
            if (skipData.length > 0) {
                let filePath = path.join(`${directory}/`);
                let fileName = `Skip_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                let skip_json = await this.commonFileService.createJsonFile(
                    companies,
                    skipData,
                    mapped_header,
                );
                let skip_csv = await this.commonFileService.reverseMapSheetData(
                    skipData,
                    csv_json_header_data,
                    'reversed_header',
                );
                skip_csv = await this.commonFileService.reverseMapSheetData(
                    skip_csv,
                    csv_header_data,
                );

                let writeJsonFile = await this.commonFileService.writeFile(
                    filePath,
                    `${JSON.stringify(skip_json)}`,
                    fileName,
                );
                let json_file_full_path = path.resolve(
                    `${filePath}${fileName}`,
                );
                if (writeJsonFile?.status == 'success') {
                    let csvFile = `CSV_Skip_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                    let writeCsvFile = await this.commonFileService.writeFile(
                        filePath,
                        `${JSON.stringify(skip_csv)}`,
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
                            filePath = file_full_path.replace('.json', '.csv');
                            if (
                                await this.commonFileService.fileExist(filePath)
                            ) {
                                let datetime = this.commonDateService
                                    .getTodayDate(new Date())
                                    .format('MM-DD-YYYYHHmmss');
                                skip_filename = `${directory}/Skip-Records-${datetime}.csv`;
                                let SkipUser_filename_json = `${directory}/${fileName}`;
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: filePath,
                                            filename: skip_filename,
                                            userBucket: 'private',
                                        },
                                    ),
                                );
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: json_file_full_path,
                                            filename: SkipUser_filename_json,
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
            /* File get and skip json file */
            await this.importUserRequestService.update(
                { hash: postData?.id },
                {
                    status: '0',
                    requeststep: '4',
                    skip_file: skip_filename,
                    skip_count: skipData.length,
                },
            );
            return {
                id: recordDetails?.hash,
                skip_file: skip_filename || '',
                skip_count: skipData.length,
                next_step: 'import-user-process-department',
                created_file: create_update_filename || '',
            };
        } catch (error) {
            return false;
        }
    }

    async processJSONData(json1, json2) {
        /* checks if an object exists in an array (all key-value pairs match) */
        const isExactMatch = (arr, target) =>
            arr.some((obj) =>
                Object.keys(target).every((key) => obj[key] === target[key]),
            );

        const skip = json2.filter((obj) => isExactMatch(json1, obj));
        const created = json2.filter((obj) => !isExactMatch(json1, obj));
        return { skip, created };
    }
}
