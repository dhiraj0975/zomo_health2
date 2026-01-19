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
import { UserSettingsService } from 'src/module/user/usersettings.service';
import { In, Not } from 'typeorm';
import { CompanyService } from '../../company/company.service';
import { ImportUserRequestService } from '../../user/importuserrequest/importuserrequest.service';
import { UserService } from '../../user/user.service';
import { CensusCustomFieldsService } from '../censuscustomfields.service';
import { CensusCustomFieldsValuesService } from '../censuscustomfieldsvalues.service';
@Injectable()
export class SystemCronService {
    constructor(
        @Inject('POSTCODES_SERVICE')
        private client: ClientProxy,
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
        private readonly usersettingService: UserSettingsService,
        private readonly CensusCustomFieldsService: CensusCustomFieldsService,
        private readonly CensusCustomFieldsValuesService: CensusCustomFieldsValuesService,
    ) {}
    async importUserProcessSystem(postData: any) {
        try {
            let recordDetails: any,
                departmentData: unknown = {},
                locationData: { [key: string]: any } = {},
                sheetData: any = {},
                echoTime = '';
            const departmentDataObj: { [key: string]: any } = {};
            const locationDataObj: any = {};
            let defaultLocationId = '';
            const startTime = new Date().getTime();
            if (postData?.id) {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        hash: postData?.id,
                        status: '0',
                        flage: '2',
                        requeststep: '2',
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
                        'user_id',
                    ],
                );
            } else {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        status: '0',
                        flage: '2',
                        requeststep: '2',
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
                        'user_id',
                    ],
                );
            }
            if (!recordDetails) {
                throw new Error('ERR_RECORD_NOT_FOUND');
            }
            const directory = `userimport/${recordDetails?.org_id}/${recordDetails?.id}`;
            const companyId = recordDetails?.org_id;
            echoTime = 'System\n';
            echoTime += `First ${(new Date().getTime() - startTime) / 1000}\n`;

            await this.importUserRequestService.update(
                { id: recordDetails?.id },
                { status: '0', flage: '3' },
            );

            /* Department data get */
            let file_departmentData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'check_file' },
                    {
                        prefix: `${directory}/departments.json`,
                        userBucket: 'private',
                    },
                ),
            );
            if (file_departmentData) {
                let departmentFileRead = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'get_file' },
                        {
                            path: `${directory}/departments.json`,
                            userBucket: 'private',
                        },
                    ),
                );
                let deptData = Buffer.from(
                    departmentFileRead.Body,
                    'base64',
                ).toString('utf-8');
                departmentData = JSON.parse(deptData);
                for (let i = 0; i < (departmentData as any[]).length; i++) {
                    let tempdata = (departmentData as any[])[i];
                    if (
                        tempdata['DepartmentID'] &&
                        tempdata['DepartmentName']
                    ) {
                        departmentDataObj[
                            tempdata['DepartmentName'].toLowerCase()
                        ] = tempdata['DepartmentID'];
                        if (tempdata['IsDefault'] == 'Yes') {
                            departmentDataObj['default'] =
                                tempdata['DepartmentID'];
                        }
                    }
                }
            }
            /* Department data get */
            /* Location data get */
            let file_locationData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'check_file' },
                    {
                        prefix: `${directory}/locations.json`,
                        userBucket: 'private',
                    },
                ),
            );
            if (file_locationData) {
                let locationFileRead = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'get_file' },
                        {
                            path: `${directory}/locations.json`,
                            userBucket: 'private',
                        },
                    ),
                );
                let locData = Buffer.from(
                    locationFileRead.Body,
                    'base64',
                ).toString('utf-8');
                locationData = JSON.parse(locData);
                for (let i = 0; i < locationData.length; i++) {
                    let tempdata = locationData[i];
                    if (
                        tempdata['LocationID'] &&
                        tempdata['LocationLname'] &&
                        tempdata['LocationAddress1'] &&
                        tempdata['LocationAddress2'] &&
                        tempdata['LocationCity'] &&
                        tempdata['LocationState'] &&
                        tempdata['LocationZip'] &&
                        tempdata['LocationCountry'] &&
                        tempdata['IsDefault']
                    ) {
                        locationDataObj['zipcodewise'] =
                            locationDataObj['zipcodewise'] || {};
                        locationDataObj['zipcodewise'][
                            tempdata['LocationZip']
                        ] = {
                            city: tempdata['LocationCity'],
                            state: tempdata['LocationState'],
                            country: tempdata['LocationCountry'],
                            id: tempdata['LocationID'],
                        };
                        tempdata['LocationAddress2'] =
                            tempdata['LocationAddress2'] || ' ';
                        locationDataObj[
                            (
                                tempdata['LocationLname'] +
                                tempdata['LocationAddress1'] +
                                tempdata['LocationAddress2'] +
                                tempdata['LocationCity'] +
                                tempdata['LocationState'] +
                                tempdata['LocationZip'] +
                                tempdata['LocationCountry']
                            ).toLowerCase()
                        ] = tempdata['LocationID'];
                        if (tempdata['IsDefault'] == '1') {
                            defaultLocationId = tempdata['LocationID'];
                        }
                    }
                }
            }
            /* Location data get */
            echoTime += `Second ${(new Date().getTime() - startTime) / 1000}\n`;
            let mappedHeader = JSON.parse(recordDetails['mapped_header']);
            let Table_HEADER_DATA = appConstant.table_HEADER_DATA;
            let GENERAL_HEADER_DATA = appConstant.GENERAL_HEADER_DATA;
            const fileName: string = `census_created_update_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
            let dataFileRead = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    { path: `${directory}/${fileName}`, userBucket: 'private' },
                ),
            );
            let sysData = Buffer.from(dataFileRead.Body, 'base64').toString(
                'utf-8',
            );
            sheetData = JSON.parse(sysData);
            sheetData = sheetData
                .map((row) =>
                    Object.fromEntries(
                        Object.entries(row)
                            .map(([key, value]) => [
                                key,
                                typeof value === 'string'
                                    ? value.trim()
                                    : value,
                            ])
                            .filter(
                                ([, value]) =>
                                    value !== null &&
                                    value !== undefined &&
                                    value !== '',
                            ),
                    ),
                )
                .filter((row) => Object.keys(row).length > 0);
            const companies = await this.companyService.findOne({
                id: companyId,
            });
            if (!companies) {
                throw new Error('ERR_RECORD_NOT_FOUND');
            }
            let mapped_header = JSON.parse(recordDetails?.mapped_header);
            let census_status =
                companies?.['company_settings']?.['census_status'];
            let census_custom_value = {};
            let fieldMap = {};
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
                Table_HEADER_DATA = { ...Table_HEADER_DATA, ...census_mapping };
                GENERAL_HEADER_DATA = {
                    ...GENERAL_HEADER_DATA,
                    ...census_mapping,
                };
                const fieldIds = census_report_field.map((field) => field.id);
                fieldMap = Object.fromEntries(
                    census_report_field.map((f) => [f.id, f.title]),
                );
                const defaultFields = Object.fromEntries(
                    census_report_field.map((f) => [f.title, null]),
                );
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
            echoTime += `Second one ${(new Date().getTime() - startTime) / 1000}\n`;
            let allUserCodeSheet = [];
            let memberShipCode = companies['code'];
            if (sheetData && sheetData.length > 0) {
                allUserCodeSheet = sheetData
                    .map((row) => (row['code'] || '').toString().trim())
                    .filter((code) => code !== '');
            }
            if (allUserCodeSheet) {
                let allUserCodes = allUserCodeSheet
                    .join(',')
                    .replace(/[^A-Za-z0-9,]/g, '')
                    .split(',');
                allUserCodeSheet = await this.userService.listRecord({
                    code: In(allUserCodes),
                    membership_code: memberShipCode,
                });
                if (allUserCodeSheet) {
                    allUserCodeSheet = allUserCodeSheet.reduce((obj, item) => {
                        item.dob = item?.dob
                            ? this.commonDateService
                                  .getTodayDate(item?.dob)
                                  .format('MM-DD-YYYY')
                            : '';
                        item.date_of_hire = item?.date_of_hire
                            ? this.commonDateService
                                  .getTodayDate(item?.date_of_hire)
                                  .format('MM-DD-YYYY')
                            : '';
                        obj[item.code] = item;
                        return obj;
                    }, {});
                }
            }
            echoTime += `Second two ${(new Date().getTime() - startTime) / 1000}\n`;
            let homeCityArray = [],
                homeStateArray = [],
                homeCountryArray = [],
                homeDataUS: any[] = [{ countrycode: 'US' }],
                homeDataCA: any[] = [{ countrycode: 'CA' }];
            if (sheetData && sheetData.length > 0) {
                homeCityArray = Array.from(
                    new Set(
                        sheetData
                            .map((row) => (row['city'] || '').toString().trim())
                            .filter((code) => code !== ''),
                    ),
                );
                homeStateArray = Array.from(
                    new Set(
                        sheetData
                            .map((row) =>
                                (row['state'] || '').toString().trim(),
                            )
                            .filter((code) => code !== ''),
                    ),
                );
                homeCountryArray = Array.from(
                    new Set(
                        sheetData
                            .map((row) =>
                                (row['country'] || '').toString().trim(),
                            )
                            .filter((code) => code !== ''),
                    ),
                );
            }
            if (
                homeCityArray.length > 0 ||
                homeStateArray.length > 0 ||
                homeCountryArray.length > 0
            ) {
                if (homeCityArray.length > 0) {
                    homeDataUS[0]['city'] = [...new Set(homeCityArray)];
                    homeDataCA[0]['city'] = [...new Set(homeCityArray)];
                }
                if (homeStateArray.length > 0) {
                    if (homeCityArray.length > 0) {
                        homeDataUS.push({
                            state: [...new Set(homeStateArray)],
                        });
                        homeDataCA.push({
                            province: [...new Set(homeStateArray)],
                        });
                    } else {
                        homeDataUS[0]['state'] = [...new Set(homeStateArray)];
                        homeDataCA[0]['province'] = [
                            ...new Set(homeStateArray),
                        ];
                    }
                }
                if (homeCountryArray.length > 0) {
                    if (homeCityArray.length > 0) {
                        homeDataUS.push({
                            country: [...new Set(homeCountryArray)],
                        });
                    } else {
                        homeDataUS[0]['country'] = [
                            ...new Set(homeCountryArray),
                        ];
                    }
                }
            }
            let usCityData = [],
                usStateData = [],
                usCountryData = [],
                caCityData = [],
                caStateData = [],
                caCountryData = [];
            if (homeDataUS.length > 0) {
                let cityStateCountryUs = await lastValueFrom(
                    this.client.send({ cmd: 'find_postcode' }, homeDataUS),
                );
                cityStateCountryUs.forEach((item) => {
                    if (item && item.postalcode) {
                        if (item.city) {
                            if (!usCityData[item.city]) {
                                usCityData[item.city] = {};
                            }
                            usCityData[item.city][item.postalcode] = item;
                        }
                        if (item.state) {
                            if (!usStateData[item.state]) {
                                usStateData[item.state] = {};
                            }
                            usStateData[item.state][item.postalcode] = item;
                        }
                        if (item.country) {
                            if (!usCountryData[item.country]) {
                                usCountryData[item.country] = {};
                            }
                            usCountryData[item.country][item.postalcode] = item;
                        }
                    }
                });
            }
            if (homeDataCA.length > 0) {
                let cityStateCountryCA = await lastValueFrom(
                    this.client.send({ cmd: 'find_postcode' }, homeDataCA),
                );
                if (
                    cityStateCountryCA.length === 0 &&
                    homeCountryArray.includes('canada')
                ) {
                    cityStateCountryCA = await lastValueFrom(
                        this.client.send({ cmd: 'find_postcode' }, [
                            { countrycode: 'CA', status: 1 },
                        ]),
                    );
                }
                cityStateCountryCA.forEach((item) => {
                    if (item && item.postalcode) {
                        if (item.city) {
                            if (!caCityData[item.city]) {
                                caCityData[item.city] = {};
                            }
                            caCityData[item.city][item.postalcode] = item;
                        }
                        if (item.state) {
                            if (!caStateData[item.state]) {
                                caStateData[item.state] = {};
                            }
                            caStateData[item.state][item.postalcode] = item;
                        }
                    }
                });
                caCountryData = cityStateCountryCA;
            }
            let homeZipPostalCode = [],
                TimeZoneDataUS = [],
                TimeZoneDataCA = [];
            if (sheetData && sheetData.length > 0) {
                homeZipPostalCode = sheetData
                    .map((row) => (row['zip'] || '').toString().trim())
                    .filter((code) => code !== '');
                const escapeLookup = {
                    '\\': '\\\\',
                    '\0': '\\0',
                    '\n': '\\n',
                    '\r': '\\r',
                    "'": "\\'",
                    '"': '\\"',
                    '\x1a': '\\Z',
                };
                homeZipPostalCode = [
                    ...new Set(
                        homeZipPostalCode.map((code) =>
                            String(code).replace(
                                /\\|\0|\n|\r|'|"|\x1a/g,
                                (match) => escapeLookup[match] || match,
                            ),
                        ),
                    ),
                ];
                TimeZoneDataUS = await lastValueFrom(
                    this.client.send({ cmd: 'find_postcode' }, [
                        { zipcode: homeZipPostalCode, countrycode: 'US' },
                    ]),
                );
                if (TimeZoneDataUS.length > 0) {
                    TimeZoneDataUS = TimeZoneDataUS.reduce((obj, item) => {
                        obj[item.postalcode] = item;
                        return obj;
                    }, {});
                }
                TimeZoneDataCA = await lastValueFrom(
                    this.client.send({ cmd: 'find_postcode' }, [
                        { postalcode: homeZipPostalCode, countrycode: 'CA' },
                    ]),
                );
                if (TimeZoneDataCA.length > 0) {
                    TimeZoneDataCA = TimeZoneDataCA.reduce((obj, item) => {
                        obj[item.postalcode] = item;
                        return obj;
                    }, {});
                }
            }
            echoTime += `Second three ${(new Date().getTime() - startTime) / 1000}\n`;
            let removeCustomField = [],
                existingUserAllData = [],
                existingUserlist = [],
                existRelationshipCodeSheet = [],
                existRelationshipCodeSheetEmp = [],
                sheetEmployeeIdExist = [],
                allRelationshipCodeSheet = [],
                existingUserListCodeWise = [];
            if (
                recordDetails?.census_upload_type == 1 ||
                (sheetData
                    .map((item) => item['spouse_first_name'])
                    .filter(Boolean).length > 0 &&
                    sheetData
                        .map((item) => item['spouse_last_name'])
                        .filter(Boolean).length > 0) ||
                sheetData.map((item) => item['linked_emp_id']).filter(Boolean)
                    .length > 0 ||
                sheetData.map((item) => item['relationship_id']).filter(Boolean)
                    .length > 0
            ) {
                existingUserAllData = await this.userService.listUDLRecord({
                    role_id: In([16, 2]),
                    membership_code: memberShipCode,
                });
                if (
                    recordDetails?.census_upload_type == 1 &&
                    existingUserAllData.length > 0
                ) {
                    existingUserlist = existingUserAllData.reduce(
                        (obj, item) => {
                            obj[item.id] = item;
                            return obj;
                        },
                        {},
                    );
                }
                if (
                    sheetData
                        .map((item) => item['spouse_first_name'])
                        .filter(Boolean).length > 0 &&
                    sheetData
                        .map((item) => item['spouse_last_name'])
                        .filter(Boolean).length > 0
                ) {
                    existRelationshipCodeSheet = existingUserAllData.reduce(
                        (obj, item) => {
                            obj[item.id] = item.code;
                            return obj;
                        },
                        {},
                    );
                }
                if (
                    sheetData
                        .map((item) => item['linked_emp_id'])
                        .filter(Boolean).length > 0
                ) {
                    existRelationshipCodeSheetEmp = existingUserAllData.reduce(
                        (obj, item) => {
                            if (item.employeeid && item.code) {
                                obj[item.employeeid] = item.code;
                            }
                            return obj;
                        },
                        {},
                    );
                    sheetEmployeeIdExist = sheetData
                        .map((item) => item['employeeid'])
                        .filter(Boolean);
                }
                if (
                    sheetData
                        .map((item) => item['relationship_id'])
                        .filter(Boolean).length > 0 ||
                    sheetData
                        .map((item) => item['linked_emp_id'])
                        .filter(Boolean).length > 0
                ) {
                    allRelationshipCodeSheet = existingUserAllData.reduce(
                        (obj, item) => {
                            if (item.relationship_id && item.code) {
                                obj[item.relationship_id] = item.code;
                            }
                            return obj;
                        },
                        {},
                    );
                    existingUserListCodeWise = existingUserAllData.reduce(
                        (obj, item) => {
                            obj[item.code] = item;
                            return obj;
                        },
                        {},
                    );
                }
            }
            let UserCreateUpdateData = [],
                RejectedUserData = [],
                UserCreateData = [],
                UserUpdateData = [],
                UserPartialData = [];
            echoTime += `Third ${(new Date().getTime() - startTime) / 1000}\n`;
            let strReplaceArray = [
                '[',
                '@',
                '_',
                '!',
                '#',
                '$',
                '%',
                '^',
                '&',
                '*',
                '(',
                ')',
                '<',
                '>',
                '?',
                '/',
                '|',
                '}',
                '{',
                '~',
                ':',
                ';',
                ']',
                '"',
                '\\',
                '=',
                '+',
                ',',
            ];

            for (let usersData of sheetData) {
                echoTime += `Four Start ${(new Date().getTime() - startTime) / 1000}\n`;
                let userError: any = [],
                    singleUser: any = [],
                    validateFields = [],
                    partialUserError = [];
                let eligibleArray = { Yes: 1, No: 0 };
                let department = this.commonService.sanitize(
                    usersData['department_id'],
                );
                let status = this.commonService.sanitize(usersData['status']);
                let relationshipCode = this.commonService.sanitize(
                    usersData['relationship_code'],
                );
                let relationshipId = this.commonService.sanitize(
                    usersData['relationship_id'],
                );
                let userType = this.commonService.sanitize(
                    usersData['role_id'],
                );
                let idOfDirectSupervisor = this.commonService.sanitize(
                    usersData['id_of_direct_supervisor'],
                    'start_zero_replace',
                );
                let userName = this.commonService.sanitize(
                    usersData['username'],
                );
                let firstName = this.commonService.sanitize(
                    usersData['first_name'],
                );
                let middleName = this.commonService.sanitize(
                    usersData['middle_name'],
                );
                let lastName = this.commonService.sanitize(
                    usersData['last_name'],
                );
                let jobTitle = this.commonService.sanitize(
                    usersData?.['jobtitle'],
                );
                let socialSecurityNumber = this.commonService.sanitize(
                    usersData['securitycode'],
                );
                let employeeId = this.commonService.sanitize(
                    usersData['employeeid'],
                );
                let gender = this.commonService.sanitize(usersData['gender']);
                let birthDate = this.commonService.sanitize(
                    this.commonDateService
                        .getTodayDate(usersData['dob'])
                        .format('MM-DD-YYYY'),
                );
                let dateOfHire = this.commonService.sanitize(
                    this.commonDateService
                        .getTodayDate(usersData['date_of_hire'])
                        .format('MM-DD-YYYY'),
                );
                let onHealthPlan = this.commonService.sanitize(
                    usersData['on_insurance_plan'],
                );
                let healthPlanName = this.commonService.sanitize(
                    usersData['insurance_plan_name'],
                );
                let email = this.commonService.sanitize(usersData['email']);
                let workPhoneNumber = this.commonService.sanitize(
                    usersData['wphone'],
                );
                let workPhoneExtension = this.commonService.sanitize(
                    usersData['wphone_ext'],
                );
                let location = this.commonService.sanitize(
                    usersData['location'],
                );
                let workAddress1 = this.commonService.sanitize(
                    usersData['work_address_1'],
                );
                let workAddress2 = this.commonService.sanitize(
                    usersData['work_address_2'],
                );
                let workCity = this.commonService.sanitize(
                    usersData['work_city'],
                );
                let workStateProvince = this.commonService.sanitize(
                    usersData['work_state'],
                );
                let workZipPostalCode = this.commonService.sanitize(
                    usersData['work_zip'],
                    'start_zero_replace',
                );
                let workCountry = this.commonService.sanitize(
                    usersData['work_country'],
                );
                let homePhoneNumber = this.commonService.sanitize(
                    usersData['hphone'],
                );
                let mobilePhoneNumber = this.commonService.sanitize(
                    usersData['cphone'],
                );
                let homeAddress1 = this.commonService.sanitize(
                    usersData['address'],
                );
                let homeAddress2 = this.commonService.sanitize(
                    usersData['address_2'],
                );
                let homeCity = this.commonService.sanitize(usersData['city']);
                let homeStateProvince = this.commonService.sanitize(
                    usersData['state'],
                );
                let homeZipPostalCode = this.commonService.sanitize(
                    usersData['zip'],
                    'start_zero_replace',
                );
                let homeCountry = this.commonService.sanitize(
                    usersData['country'],
                );
                let userCode = this.commonService.sanitize(usersData['code']);
                let eligibleString = this.commonService.sanitize(
                    usersData['is_camp_eligible'],
                );
                let eligible = eligibleArray[eligibleString];
                let Unsubscribed = this.commonService.sanitize(
                    usersData['email_receiving'],
                );
                let LockEmail = this.commonService.sanitize(
                    usersData['email_update'],
                );

                let spouseFirstName = this.commonService.sanitize(
                    usersData['spouse_first_name'],
                );
                let spouseLastName = this.commonService.sanitize(
                    usersData['spouse_last_name'],
                );
                let spouseDob = this.commonService.sanitize(
                    this.commonDateService
                        .getTodayDate(usersData['spouse_dob'])
                        .format('MM-DD-YYYY'),
                );
                let spouseGender = this.commonService.sanitize(
                    usersData['spouse_gender'],
                );
                let spouseEmail = this.commonService.sanitize(
                    usersData['spouse_email'],
                );
                let spouseOnHealthPlan = this.commonService.sanitize(
                    usersData['spouse_on_health_plan'],
                );
                let spouseHealthPlanName = this.commonService.sanitize(
                    usersData['spouse_health_plan_name'],
                );

                let linkedEmpId = this.commonService.sanitize(
                    usersData['linked_emp_id'],
                    'start_zero_replace',
                );
                /* Census Custom Field */
                const dataTable: any[] = [];
                if (census_status == '1') {
                    Object.entries(fieldMap).forEach(([fieldId, title]) => {
                        if (usersData.hasOwnProperty(title)) {
                            singleUser[`${title}`] =
                                this.commonService.sanitize(
                                    usersData[`${title}`],
                                );
                            dataTable.push({
                                field_id: Number(fieldId),
                                field_value: this.commonService.sanitize(
                                    usersData[`${title}`],
                                ),
                                organization_id: recordDetails?.org_id,
                                created_by: recordDetails?.user_id,
                                updated_by: recordDetails?.user_id,
                            });
                        }
                    });
                }
                /* Census Custom Field */
                if (allUserCodeSheet && allUserCodeSheet[userCode]) {
                    allUserCodeSheet[userCode]['status'] =
                        allUserCodeSheet[userCode]['status'] == '' && 0;
                    let emailUpdate =
                        allUserCodeSheet[userCode]['email_update'];
                    if (emailUpdate && emailUpdate == 1) {
                        email = allUserCodeSheet[userCode]['email'];
                    }
                }

                if (recordDetails?.census_upload_type == 1 && status == '') {
                    status = 'current';
                }
                /* Existing data set for spouse start */
                let existingSpouseForSpouse = [];
                if (
                    (linkedEmpId != '' && userType == '') ||
                    (relationshipId != '' && userType == '')
                ) {
                    userType = 'Spouse';
                }
                if (
                    (relationshipCode == '' &&
                        (linkedEmpId != '' || relationshipId != '')) ||
                    (relationshipCode == '' &&
                        (linkedEmpId == '' || relationshipId == '') &&
                        appConstant.USER_TYPE.includes(userType.toLowerCase()))
                ) {
                    relationshipCode = 'Spouse';
                }
                if (
                    linkedEmpId != '' &&
                    existRelationshipCodeSheetEmp[linkedEmpId]
                ) {
                    existingSpouseForSpouse = existingUserAllData.filter(
                        (data) =>
                            data.relationship_id ===
                            existRelationshipCodeSheetEmp[linkedEmpId],
                    );
                    if (existingSpouseForSpouse.length > 0) {
                        userCode = existingSpouseForSpouse[0].code;
                        allUserCodeSheet[userCode] = existingSpouseForSpouse[0];
                    }
                }
                /* Existing data set for spouse end */
                singleUser.is_camp_eligible = eligible;
                singleUser.code = userCode;
                if (userCode && allUserCodeSheet[userCode] == undefined) {
                    userError.push(1064);
                } else if (userCode == '') {
                    singleUser.first_name = firstName;
                    singleUser.last_name = lastName;
                    singleUser.employeeid = employeeId;
                    singleUser.dob = birthDate;
                    singleUser.date_of_hire = dateOfHire;
                    singleUser.email = email;
                    let securityCode =
                        await this.commonFileService.ssnSecurityCode(
                            'first',
                            socialSecurityNumber,
                        );
                    singleUser.securitycode = securityCode.securityCode;
                    if (
                        Array.isArray(securityCode.errorCode) &&
                        securityCode.errorCode.length === 0
                    ) {
                        socialSecurityNumber = singleUser.orgSecurityCode;
                    } else {
                        userError = { ...userError, ...singleUser.errorCode };
                    }
                    if (Array.isArray(userError) && userError.length === 0) {
                        let conditionsObject =
                            await this.commonFileService.ConditionsObject(
                                singleUser.dob,
                                singleUser.first_name,
                                singleUser.last_name,
                                singleUser.email,
                                singleUser.securitycode,
                                singleUser.employeeid,
                                memberShipCode,
                            );
                        if (conditionsObject.errorCode.length > 0) {
                            userError = {
                                ...userError,
                                ...conditionsObject.errorCode,
                            };
                        }
                        if (conditionsObject.conditions.length > 0) {
                            let checkUser = await this.userService.findOne(
                                conditionsObject.conditions,
                            );
                            if (checkUser) {
                                if (recordDetails?.census_upload_type == 1) {
                                    delete existingUserlist[checkUser.id];
                                }
                                userCode = checkUser.code;
                                allUserCodeSheet[userCode] = checkUser;
                                checkUser = {} as any;
                                userError.push(dateOfHire['error_code']);
                            }
                        }
                    }
                }
                if (userCode && UserCreateUpdateData.includes(userCode)) {
                    userError.push(1066);
                }
                if (
                    userCode &&
                    allUserCodeSheet[userCode] &&
                    (!['2', '16'].includes(
                        allUserCodeSheet[userCode]['role_id'].toString(),
                    ) ||
                        (allUserCodeSheet[userCode]['role_id'] == 2 &&
                            [
                                '16',
                                'spouse',
                                'domestic partner',
                                'spouse / domestic partner',
                            ].includes(userType.toLowerCase())) ||
                        (allUserCodeSheet[userCode]['role_id'] == 16 &&
                            ['', '2', 'employee'].includes(
                                userType.toLowerCase(),
                            )))
                ) {
                    userError.push(1067);
                }
                /* SET PARTIAL ERROR CODE AND REMOVE USER CODE START */
                if (
                    userCode &&
                    allUserCodeSheet[userCode] &&
                    userError.length > 0
                ) {
                    if (userError.includes(1002)) {
                        partialUserError.push(1002);
                        userError = userError.filter((item) => item !== 1002);
                        firstName = allUserCodeSheet[userCode]['first_name'];
                    }
                    if (userError.includes(1003)) {
                        partialUserError.push(1003);
                        userError = userError.filter((item) => item !== 1003);
                        lastName = allUserCodeSheet[userCode]['last_name'];
                    }
                    if (userError.includes(1004)) {
                        partialUserError.push(1004);
                        userError = userError.filter((item) => item !== 1004);
                        birthDate = allUserCodeSheet[userCode]['dob'];
                    }
                    if (userError.includes(1006)) {
                        partialUserError.push(1006);
                        userError = userError.filter((item) => item !== 1006);
                        email = allUserCodeSheet[userCode]['email'];
                    }
                } else {
                    let regex = /^[a-zA-Z0-9 \s `. \' -]+$/;
                    if (userError?.includes(1002)) {
                        let afReplaceFirstName: string = <string>firstName;
                        strReplaceArray.forEach((str) => {
                            afReplaceFirstName = afReplaceFirstName.replace(
                                new RegExp(str, 'g'),
                                '',
                            );
                        });
                        if (regex.test(afReplaceFirstName)) {
                            firstName = afReplaceFirstName;
                            partialUserError.push(1002);
                            userError = userError.filter(
                                (item) => item !== 1002,
                            );
                        }
                    }
                    if (userError?.includes(1003)) {
                        let afReplaceLastName: string = <string>lastName;
                        strReplaceArray.forEach((str) => {
                            afReplaceLastName = afReplaceLastName.replace(
                                new RegExp(str, 'g'),
                                '',
                            );
                        });
                        if (regex.test(afReplaceLastName)) {
                            lastName = afReplaceLastName;
                            partialUserError.push(1003);
                            userError = userError.filter(
                                (item) => item !== 1003,
                            );
                        }
                    }
                }
                /* SET PARTIAL ERROR CODE AND REMOVE USER CODE END */
                if (
                    userCode &&
                    recordDetails?.census_upload_type == 1 &&
                    allUserCodeSheet[userCode]
                ) {
                    delete existingUserlist[allUserCodeSheet[userCode]['id']];
                }
                const codeCheck = async () => {
                    let varityCode: any = '';
                    let code = await this.commonService.userValidDefaultCode(1);
                    const userCodeCheck = await this.userService.findOne({
                        code: code,
                    });
                    if (!userCodeCheck) {
                        varityCode = code;
                    } else {
                        varityCode = await codeCheck();
                    }
                    return varityCode;
                };

                if (userError.length == 0) {
                    /* For update sheet code::START */
                    let updateNameDobCode = [];
                    if (userCode && allUserCodeSheet[userCode]) {
                        if (
                            allUserCodeSheet[userCode]['first_name'] !=
                            firstName
                        ) {
                            updateNameDobCode.push(101);
                        }
                        if (
                            allUserCodeSheet[userCode]['middle_name'] !=
                            middleName
                        ) {
                            updateNameDobCode.push(102);
                        }
                        if (
                            allUserCodeSheet[userCode]['last_name'] != lastName
                        ) {
                            updateNameDobCode.push(103);
                        }
                        if (allUserCodeSheet[userCode]['dob'] != birthDate) {
                            updateNameDobCode.push(104);
                        }
                    }
                    /* For update sheet code::END */
                    /* For department A::START */
                    let departMentCheck =
                        await this.commonFileService.checkDepartment(
                            department,
                            departmentDataObj,
                            userCode,
                            allUserCodeSheet,
                        );
                    singleUser.department_id = departMentCheck.departmentId;
                    /* For department A::END */
                    /* For user status B::START */
                    let statusCheck = await this.commonFileService.checkStatus(
                        status,
                        userCode,
                        allUserCodeSheet,
                    );
                    singleUser.status = statusCheck.userStatus;
                    status =
                        statusCheck.orgStatus != '' && statusCheck.orgStatus;
                    if (statusCheck.errorCode) {
                        userError.push(statusCheck.errorCode);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1022)
                        ) {
                            if (
                                statusCheck.orgStatus == '1' &&
                                allUserCodeSheet[userCode]['dob'] == '1'
                            ) {
                                status = 'Current';
                            } else {
                                status = 'Terminated';
                            }
                            partialUserError.push(1022);
                            userError = userError.filter(
                                (item) => item !== 1022,
                            );
                        }
                    }
                    /* For user status B::END */
                    /* For user linked emp id CA::START */
                    let linkedEmpIdStatus = true;
                    if (
                        (linkedEmpId &&
                            [
                                'spouse',
                                'spouse / domestic partner',
                                'domestic partner',
                            ].includes(userType.toLowerCase())) ||
                        (linkedEmpId && ['16'].includes(userType.toLowerCase()))
                    ) {
                        relationshipCode = 'spouse';
                        if (existRelationshipCodeSheetEmp[linkedEmpId]) {
                            relationshipId =
                                existRelationshipCodeSheetEmp[linkedEmpId];
                        } else if (sheetEmployeeIdExist.includes(linkedEmpId)) {
                            linkedEmpIdStatus = false;
                        }
                    }
                    /* For user linked emp id CA::END */
                    /* For relationship code C::START */
                    let rCodeCheck = await this.commonFileService.checkCommon(
                        'relationship_code',
                        relationshipCode,
                    );
                    if (rCodeCheck['errorCode'].length == 0) {
                        singleUser.relationship_code = rCodeCheck['valInt'];
                        relationshipCode = rCodeCheck['valStr'];
                    } else {
                        userError.push(rCodeCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1023) &&
                            (linkedEmpId || relationshipId)
                        ) {
                            singleUser.relationship_code =
                                allUserCodeSheet[userCode]['relationship_code'];
                            relationshipCode = 'spouse';
                            if (userError.includes(1023)) {
                                partialUserError.push(1023);
                                userError = userError.filter(
                                    (item) => item !== 1023,
                                );
                            }
                        }
                    }
                    /* For relationship code C::END */
                    /* For Relationship ID D::START */
                    let rIdCheck = await this.commonFileService.checkCommon(
                        'relationship_id',
                        relationshipId,
                        relationshipCode,
                        userCode,
                        linkedEmpIdStatus,
                        existingUserListCodeWise,
                        allRelationshipCodeSheet,
                        userError,
                    );
                    if (rIdCheck['errorCode'].length == 0) {
                        singleUser.relationship_id =
                            rCodeCheck['relationshipId'];
                        validateFields.push(rCodeCheck['validateFields']);
                    } else {
                        userError.push(rIdCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            [1023, 1024, 1036].some((val) =>
                                userError.includes(val),
                            ) &&
                            (linkedEmpId || relationshipId)
                        ) {
                            singleUser.relationship_id =
                                allUserCodeSheet[userCode]['relationship_id'];
                            validateFields.push('relationship_id');
                            let errorCodes = [1023, 1024, 1036];
                            errorCodes.forEach((code) => {
                                if (userError.includes(code)) {
                                    partialUserError.push(code);
                                    userError = userError.filter(
                                        (error) => error !== code,
                                    );
                                }
                            });
                        }
                    }
                    /* For Relationship ID D::END */
                    /* For User Type E::START */
                    let userTypeCheck =
                        await this.commonFileService.checkCommon(
                            'user_type',
                            userType,
                            relationshipCode,
                            relationshipId,
                            status,
                            usersData,
                            mappedHeader,
                        );
                    if (userTypeCheck['errorCode'].length > 0) {
                        userError.push(userTypeCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            [1025, 1027, 1035, 1039].some((val) =>
                                userError.includes(val),
                            ) &&
                            (linkedEmpId || relationshipId)
                        ) {
                            singleUser.role_id =
                                allUserCodeSheet[userCode]['role_id'];
                            singleUser.relationship_id =
                                allUserCodeSheet[userCode]['relationship_id'];
                            singleUser.relationship_code =
                                allUserCodeSheet[userCode]['relationship_code'];
                            singleUser.status =
                                allUserCodeSheet[userCode]['status'];
                            userType = userTypeCheck['userType'];
                            relationshipCode =
                                userTypeCheck['newRelationshipCode'];
                            let errorCodes = [1025, 1027, 1035, 1039];
                            errorCodes.forEach((code) => {
                                if (userError.includes(code)) {
                                    partialUserError.push(code);
                                    userError = userError.filter(
                                        (error) => error !== code,
                                    );
                                }
                            });
                        }
                    } else {
                        singleUser.role_id = userTypeCheck['roleId'];
                        singleUser.relationship_id =
                            userTypeCheck['relationshipId'];
                        singleUser.relationship_code =
                            userTypeCheck['relationshipCode'];
                        singleUser.status = userTypeCheck['userStatus'];
                        userType = userTypeCheck['userType'];
                        relationshipCode = userTypeCheck['newRelationshipCode'];
                    }
                    /* For User Type E::END */
                    /* For ID of Direct Supervisor F::START */
                    let iOfDirSupervisorCheck =
                        await this.commonFileService.checkCommon(
                            'id_of_direct_supervisor',
                            idOfDirectSupervisor,
                            userCode,
                            allUserCodeSheet,
                        );
                    if (iOfDirSupervisorCheck['errorCode'].length > 0) {
                        userError.push(
                            iOfDirSupervisorCheck?.['errorCode']?.['0'],
                        );
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1028)
                        ) {
                            singleUser.supervisor_id =
                                allUserCodeSheet[userCode]['supervisorId'];
                            idOfDirectSupervisor =
                                iOfDirSupervisorCheck['iODSupervisor'];
                            partialUserError.push(1028);
                            userError = userError.filter(
                                (item) => item !== 1028,
                            );
                        }
                    } else {
                        singleUser.supervisor_id =
                            iOfDirSupervisorCheck['supervisorId'] ?? '';
                        singleUser.id_of_direct_supervisor =
                            iOfDirSupervisorCheck['iODSupervisor'] ?? '';
                    }
                    /* For ID of Direct Supervisor F::END */
                    /* For Username G::START */
                    let uNameCheck = await this.commonFileService.checkCommon(
                        'user_name',
                        userName,
                        userCode,
                        null,
                        null,
                        allUserCodeSheet,
                        companies,
                    );
                    if (uNameCheck['errorCode'].length > 0) {
                        userError.push(uNameCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError.includes(1021)
                        ) {
                            singleUser.username =
                                allUserCodeSheet[userCode]['username'];
                            validateFields.push('username');
                            partialUserError.push(1021);
                            userError = userError.filter(
                                (item) => item !== 1021,
                            );
                        }
                    } else {
                        singleUser.username = uNameCheck['userName'];
                        validateFields.push(uNameCheck['validateFields']);
                    }
                    /* For Username G::END */
                    /* For First Name H::START */
                    let fNameCheck = await this.commonFileService.checkCommon(
                        'first_name',
                        firstName,
                        userCode,
                    );
                    if (fNameCheck['errorCode'].length > 0) {
                        userError.push(fNameCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1002)
                        ) {
                            singleUser.first_name =
                                allUserCodeSheet[userCode]['first_name'];
                            validateFields.push('first_name');
                            partialUserError.push(1002);
                            userError = userError.filter(
                                (item) => item !== 1002,
                            );
                        }
                    } else {
                        singleUser.first_name = fNameCheck['firstName'];
                        validateFields.push(fNameCheck['validateFields']);
                    }
                    /* For First Name H::END */
                    /* For Middle Name I::START */
                    let mNameCheck = await this.commonFileService.checkCommon(
                        'middle_name',
                        middleName,
                    );
                    if (mNameCheck['errorCode'].length > 0) {
                        userError.push(mNameCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1008)
                        ) {
                            singleUser.middle_name =
                                allUserCodeSheet[userCode]['middle_name'];
                            validateFields.push('middle_name');
                            partialUserError.push(1008);
                            userError = userError.filter(
                                (item) => item !== 1008,
                            );
                        }
                    } else {
                        singleUser.middle_name = mNameCheck['middleName'];
                        validateFields.push(mNameCheck['validateFields']);
                    }
                    /* For Middle Name I::END */
                    /* For Last Name J::START */
                    let lNameCheck = await this.commonFileService.checkCommon(
                        'last_name',
                        lastName,
                        userCode,
                    );
                    if (lNameCheck['errorCode'].length > 0) {
                        userError.push(lNameCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1003)
                        ) {
                            singleUser.last_name =
                                allUserCodeSheet[userCode]['last_name'];
                            validateFields.push('last_name');
                            partialUserError.push(1003);
                            userError = userError.filter(
                                (item) => item !== 1003,
                            );
                        }
                    } else {
                        singleUser.last_name = lNameCheck['lastName'];
                        validateFields.push(lNameCheck['validateFields']);
                    }
                    /* For Last Name J::END */
                    /* Set name START */
                    singleUser.name = `${singleUser.first_name} ${singleUser.last_name}`;
                    /* Set name END */
                    /* For Job Title K::START */
                    singleUser.jobtitle = jobTitle;
                    /* For Job Title K::END */
                    /* For Social Security Number L::START */
                    let sssNumberCheck =
                        await this.commonFileService.ssnSecurityCode(
                            'second',
                            socialSecurityNumber,
                            companies,
                            userCode,
                            allUserCodeSheet,
                        );
                    if (sssNumberCheck['errorCode'].length > 0) {
                        userError.push(sssNumberCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1058)
                        ) {
                            singleUser.securitycode =
                                allUserCodeSheet[userCode]['securitycode'];
                            validateFields.push('securitycode');
                            partialUserError.push(1058);
                            userError = userError.filter(
                                (item) => item !== 1058,
                            );
                        }
                    } else {
                        singleUser.securitycode =
                            sssNumberCheck['securityCode'];
                        socialSecurityNumber =
                            sssNumberCheck['orgSecurityCode'];
                        validateFields.push(sssNumberCheck['validateFields']);
                    }
                    /* For Social Security Number L::END */
                    /* For Employee ID M::START */
                    let empIdCheck = await this.commonFileService.checkCommon(
                        'employee_id',
                        employeeId,
                        userCode,
                        '',
                        '',
                        allUserCodeSheet,
                        companies,
                    );
                    if (empIdCheck['errorCode'].length > 0) {
                        userError.push(empIdCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            [1013, 1038].some((val) =>
                                userError.includes(val),
                            ) &&
                            (linkedEmpId || relationshipId)
                        ) {
                            singleUser.employeeid =
                                allUserCodeSheet[userCode]['employeeid'];
                            validateFields.push('employeeid');
                            let errorCodes = [1013, 1038];
                            errorCodes.forEach((code) => {
                                if (userError.includes(code)) {
                                    partialUserError.push(code);
                                    userError = userError.filter(
                                        (error) => error !== code,
                                    );
                                }
                            });
                        }
                    } else {
                        singleUser.employeeid =
                            empIdCheck['employeeId'] != ''
                                ? empIdCheck['employeeId']
                                : empIdCheck['orgEmployeeId'];
                        employeeId = empIdCheck['orgEmployeeId'];
                        socialSecurityNumber = empIdCheck['orgSecurityCode'];
                        validateFields.push(empIdCheck['validateFields']);
                    }
                    /* For Employee ID M::END */
                    /* For Gender N::START */
                    let genCheck = await this.commonFileService.checkCommon(
                        'gender',
                        gender,
                    );
                    if (genCheck['errorCode'].length > 0) {
                        userError.push(genCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1005)
                        ) {
                            singleUser.gender =
                                allUserCodeSheet[userCode]['gender'];
                            partialUserError.push(1005);
                            userError = userError.filter(
                                (item) => item !== 1005,
                            );
                        }
                    } else {
                        singleUser.gender = genCheck['gender'];
                        gender = genCheck['orgGender'];
                    }
                    /* For Gender N::END */
                    /* For Birth Date O::START */
                    let dofBirthCheck =
                        await this.commonFileService.checkCommon(
                            'date_of_birth',
                            birthDate,
                        );
                    if (dofBirthCheck['errorCode'].length > 0) {
                        userError.push(dofBirthCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1004)
                        ) {
                            singleUser.dob = allUserCodeSheet[userCode]['dob'];
                            partialUserError.push(1004);
                            userError = userError.filter(
                                (item) => item !== 1004,
                            );
                        }
                    } else {
                        singleUser.dob = dofBirthCheck['dateOfBirth']
                            ? this.commonDateService.normalizeDates(
                                  dofBirthCheck['dateOfBirth'],
                                  'YYYY-MM-DD',
                              )
                            : null;
                        birthDate = dofBirthCheck['orgDateOfBirth'];
                    }
                    /* For Birth Date O::END */
                    /* For Date of Hire P::START */
                    let dofHireCheck = await this.commonFileService.checkCommon(
                        'date_of_hire',
                        dateOfHire,
                    );
                    if (dofHireCheck['errorCode'].length > 0) {
                        userError.push(dofHireCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1029)
                        ) {
                            singleUser.date_of_hire =
                                allUserCodeSheet[userCode]['date_of_hire'];
                            partialUserError.push(1029);
                            userError = userError.filter(
                                (item) => item !== 1029,
                            );
                        }
                    } else {
                        singleUser.date_of_hire = dofHireCheck['dateOfHire']
                            ? this.commonDateService.normalizeDates(
                                  dofHireCheck['dateOfHire'],
                                  'YYYY-MM-DD',
                              )
                            : null;
                        dateOfHire = dofHireCheck['orgDateOfHire'];
                    }
                    /* For Date of Hire P::END */
                    /* For Health Plan Name R & On Health Plan Q ::START */
                    let hPlanNameCheck =
                        await this.commonFileService.checkCommon(
                            'health_plan_name',
                            healthPlanName,
                            onHealthPlan,
                            userCode,
                            companyId,
                        );
                    onHealthPlan = hPlanNameCheck['arrInsurancePlanOn'];
                    healthPlanName = hPlanNameCheck['insurancePlanName'];
                    let arrPassVar = hPlanNameCheck['arrPassVar'];
                    switch (arrPassVar) {
                        case 'update':
                        case 'spupdate':
                            singleUser.on_insurance_plan = onHealthPlan;
                            singleUser.insurance_plan_name = healthPlanName;
                            if (arrPassVar === 'spupdate') {
                                partialUserError.push(1030);
                            }
                            break;
                        case 'dpupdate':
                            singleUser.on_insurance_plan = onHealthPlan =
                                allUserCodeSheet[userCode].on_insurance_plan;
                            singleUser.insurance_plan_name = healthPlanName =
                                allUserCodeSheet[userCode].insurance_plan_name;
                            partialUserError.push(1030);
                            break;
                    }
                    /* For Health Plan Name R & On Health Plan Q ::END */
                    /* For Email & Duplication Validation S::START */
                    let emailCheck = await this.commonFileService.checkCommon(
                        'email',
                        email,
                        userCode,
                        '',
                        '',
                        allUserCodeSheet,
                    );
                    if (emailCheck['errorCode'].length > 0) {
                        userError.push(emailCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1006)
                        ) {
                            singleUser.email =
                                allUserCodeSheet[userCode]['email'];
                            validateFields.push('email');
                            partialUserError.push(1006);
                            userError = userError.filter(
                                (item) => item !== 1006,
                            );
                        }
                    } else {
                        singleUser.email = emailCheck['email'];
                        validateFields.push(emailCheck['validateFields']);
                    }
                    /* For Email & Duplication Validation S::END */
                    /* For Work Phone Number T::START */
                    if (workPhoneNumber) {
                        if (
                            await this.commonFileService.userSheetValidation(
                                workPhoneNumber,
                                'phone',
                            )
                        ) {
                            singleUser.wphone = workPhoneNumber;
                        } else {
                            partialUserError.push(1007);
                        }
                        singleUser.wphone = '';
                        if (userCode && allUserCodeSheet[userCode]) {
                            singleUser.wphone =
                                allUserCodeSheet[userCode]['wphone'];
                        }
                    }
                    /* For Work Phone Number T::END */
                    /* For Work Phone Extension U::START */
                    workPhoneExtension &&
                        (singleUser.wphone_ext = workPhoneExtension);
                    /* For Work Phone Extension U::END */
                    /* For Location V,W,X,Y,Z,AA,AB::START */
                    let locationCheck =
                        await this.commonFileService.checkCommon(
                            'location',
                            location,
                            workAddress1,
                            workAddress2,
                            workCity,
                            locationDataObj,
                            [],
                            [],
                            workStateProvince,
                            workZipPostalCode,
                            workCountry,
                        );
                    if (locationCheck['errorCode'].length > 0) {
                        userError.push(locationCheck?.['errorCode']?.['0']);
                        singleUser.location = '';
                        if (userCode && allUserCodeSheet[userCode]) {
                            singleUser.location =
                                allUserCodeSheet[userCode]['location'];
                            validateFields.push('relationship_id');
                        }
                        let errorCodes = [1032, 1033, 1034];
                        errorCodes.forEach((code) => {
                            if (userError.includes(code)) {
                                partialUserError.push(code);
                                userError = userError.filter(
                                    (error) => error !== code,
                                );
                            }
                        });
                    } else {
                        singleUser.location = locationCheck['location'];
                        singleUser.work_address_1 = workAddress1;
                        singleUser.work_address_2 = workAddress2;
                        singleUser.work_city = workCity;
                        singleUser.work_state = workStateProvince;
                        singleUser.work_zip = workZipPostalCode;
                        singleUser.work_country = workCountry;
                    }
                    /* For Location V,W,X,Y,Z,AA,AB::END */
                    /* For Home Phone Number AC::START */
                    if (homePhoneNumber) {
                        if (
                            await this.commonFileService.userSheetValidation(
                                homePhoneNumber,
                                'phone',
                            )
                        ) {
                            singleUser.hphone = homePhoneNumber;
                        } else {
                            partialUserError.push(1014);
                        }
                        singleUser.hphone = '';
                        if (userCode && allUserCodeSheet[userCode]) {
                            singleUser.hphone =
                                allUserCodeSheet[userCode]['hphone'];
                        }
                    }
                    /* For Home Phone Number AC::END */
                    /* For Mobile Phone Number AD::START */
                    if (mobilePhoneNumber) {
                        if (
                            await this.commonFileService.userSheetValidation(
                                mobilePhoneNumber,
                                'phone',
                            )
                        ) {
                            singleUser.cphone = mobilePhoneNumber;
                        } else {
                            partialUserError.push(1012);
                        }
                        singleUser.cphone = '';
                        if (userCode && allUserCodeSheet[userCode]) {
                            singleUser.cphone =
                                allUserCodeSheet[userCode]['cphone'];
                        }
                    }
                    /* For Mobile Phone Number AD::END */
                    /* For Home Address 1,2 AE,AF::START */
                    homeAddress1 && (singleUser.address = homeAddress1);
                    homeAddress2 && (singleUser.address2 = homeAddress2);
                    /* For Home Address 1,2 AE,AF::END */
                    /* For Home Address AJ, AI, AG, AH::START */
                    let hAddressCheck =
                        await this.commonFileService.checkCommon(
                            'home_address',
                            homeZipPostalCode,
                            homeCity,
                            homeStateProvince,
                            homeCountry,
                            TimeZoneDataUS,
                            TimeZoneDataCA,
                        );
                    if (hAddressCheck['errorCode'].length > 0) {
                        userError.push(hAddressCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1006)
                        ) {
                            singleUser.country =
                                allUserCodeSheet[userCode]['country'];
                            singleUser.state =
                                allUserCodeSheet[userCode]['state'];
                            singleUser.city =
                                allUserCodeSheet[userCode]['city'];
                            singleUser.zip = allUserCodeSheet[userCode]['zip'];
                        } else {
                            let finalHomeAddressDetails = [];
                            if (homeCity && (usCityData || caCityData)) {
                                if (
                                    usCityData &&
                                    usCityData.hasOwnProperty(homeCity)
                                ) {
                                    finalHomeAddressDetails =
                                        usCityData[homeCity][0];
                                } else if (
                                    caCityData &&
                                    caCityData.hasOwnProperty(homeCity)
                                ) {
                                    finalHomeAddressDetails =
                                        caCityData[homeCity][0];
                                } else {
                                    homeCity = '';
                                }
                            }
                            if (
                                homeCity == '' &&
                                homeStateProvince &&
                                (usCityData || caCityData)
                            ) {
                                if (
                                    usCityData &&
                                    usCityData.hasOwnProperty(homeStateProvince)
                                ) {
                                    finalHomeAddressDetails =
                                        usCityData[homeStateProvince][0];
                                } else if (
                                    caCityData &&
                                    caCityData.hasOwnProperty(homeStateProvince)
                                ) {
                                    finalHomeAddressDetails =
                                        caCityData[homeStateProvince][0];
                                } else {
                                    homeStateProvince = '';
                                }
                            }
                            if (
                                homeCity == '' &&
                                homeStateProvince == '' &&
                                homeCountry &&
                                (usCityData || caCityData)
                            ) {
                                if (
                                    usCityData &&
                                    usCityData.hasOwnProperty(homeCountry)
                                ) {
                                    finalHomeAddressDetails =
                                        usCityData[homeCountry][0];
                                } else if (
                                    caCityData &&
                                    homeCountry.toLowerCase() == 'canada'
                                ) {
                                    caCityData[0]['country'] = 'Canada';
                                    finalHomeAddressDetails = caCityData[0][0];
                                }
                            }
                            if (finalHomeAddressDetails) {
                                singleUser.country = homeCountry =
                                    finalHomeAddressDetails['country']
                                        ? finalHomeAddressDetails['country']
                                        : 'Canada';
                                singleUser.state = finalHomeAddressDetails[
                                    'statecode'
                                ]
                                    ? finalHomeAddressDetails['statecode']
                                    : finalHomeAddressDetails['provincecode'];
                                homeStateProvince = finalHomeAddressDetails[
                                    'state'
                                ]
                                    ? finalHomeAddressDetails['state']
                                    : finalHomeAddressDetails['province'];
                                singleUser.city = homeCity =
                                    finalHomeAddressDetails['city'];
                                singleUser.zip = homeZipPostalCode =
                                    finalHomeAddressDetails['zipcode']
                                        ? finalHomeAddressDetails['zipcode']
                                        : finalHomeAddressDetails['postalcode'];
                            } else {
                                singleUser.country = homeCountry = '';
                                singleUser.state = homeStateProvince = '';
                                singleUser.city = homeCity = '';
                                singleUser.zip = homeZipPostalCode;
                            }
                        }
                        let errorCodes = [1011, 1065];
                        errorCodes.forEach((code) => {
                            if (userError.includes(code)) {
                                partialUserError.push(code);
                                userError = userError.filter(
                                    (error) => error !== code,
                                );
                            }
                        });
                    } else {
                        singleUser.country = hAddressCheck['country'];
                        singleUser.state = hAddressCheck['state'];
                        singleUser.city = hAddressCheck['city'];
                        singleUser.zip = hAddressCheck['zip'];
                    }
                    /* For Home Address Aj, AI, AG, AH::END */
                    /* TODO ip add singleUser.ip = await this.commonService.getClientIPAndDeviceDetails(req).client_ip; */
                    singleUser.entered_code = memberShipCode;
                    singleUser.membership_code = memberShipCode;
                    singleUser.companytype_id = 3;
                    singleUser.org_id = companyId;
                    singleUser.on_current_census = 'Yes';
                    singleUser.user_type = '1';
                    singleUser.created = this.commonDateService
                        .getTodayDate()
                        .format('YYYY-MM-DD HH:mm:ss');
                    singleUser.status =
                        singleUser.status && singleUser.status != 1 ? 0 : 1;
                    singleUser.email_receiving = Unsubscribed == 'Yes' ? 1 : 0;
                    singleUser.email_update = LockEmail == 'Yes' ? 1 : 0;
                    if (userCode && allUserCodeSheet[userCode]) {
                        singleUser.code = userCode;
                        singleUser.id = allUserCodeSheet[userCode]['id'];
                        singleUser.updated = this.commonDateService
                            .getTodayDate()
                            .format('YYYY-MM-DD HH:mm:ss');
                    } else if (userError.length == 0) {
                        singleUser.code = await codeCheck();
                        if (singleUser?.username == '') {
                            const dobDate =
                                this.commonDateService.getDateFormateChange(
                                    singleUser?.dob,
                                );
                            let username = (
                                singleUser.first_name +
                                singleUser.last_name +
                                dobDate
                            ).toUpperCase();
                            username = username.replace(/[^a-zA-Z0-9]/gi, '');
                            singleUser.username = username;
                            sheetData['username'] = username;
                            validateFields.push('username');
                        }
                    }
                }
                /* USERNAME min 8 character error code */
                if (
                    singleUser.username &&
                    (singleUser.username.length < 8 ||
                        singleUser.username.length > 60)
                ) {
                    userError.push(1021);
                }
                if (
                    allUserCodeSheet[userCode] &&
                    singleUser.username ==
                        allUserCodeSheet[userCode]['username']
                ) {
                    partialUserError.push(1021);
                    userError = userError.filter((error) => error !== 1021);
                }
                /* USERNAME min 8 character error code */
                /* USER TIMEZONE */
                /* TODO create getUserTimezone comman function */
                singleUser['timezone'] = this.commonService.sanitize(
                    await this.commonDateService.getTimezoneFromZipcode(
                        workZipPostalCode,
                        workCountry,
                    ),
                );
                /* USER TIMEZONE */

                /* SET PARTIAL ERROR CODE AND REMOVE USER CODE */
                if (
                    userCode !== '' &&
                    allUserCodeSheet[userCode] !== null &&
                    userError.length > 0
                ) {
                    if (userError.includes(1058)) {
                        partialUserError.push(1058);
                        userError = userError.filter((item) => item !== 1058);
                        singleUser['securitycode'] =
                            allUserCodeSheet[userCode]['securitycode'];
                    }
                    if (userError.includes(1013)) {
                        partialUserError.push(1013);
                        userError = userError.filter((item) => item !== 1013);
                        singleUser['employeeid'] =
                            allUserCodeSheet[userCode]['employeeid'];
                    }
                    if (userError.includes(1036)) {
                        partialUserError.push(1036);
                        userError = userError.filter((item) => item !== 1036);
                        singleUser['relationship_id'] =
                            allUserCodeSheet[userCode]['relationship_id'];
                    }
                    if (userError.includes(1006)) {
                        partialUserError.push(1006);
                        userError = userError.filter((item) => item !== 1006);
                        singleUser['email'] =
                            allUserCodeSheet[userCode]['email'];
                    }
                    if (userError.includes(1021)) {
                        partialUserError.push(1021);
                        userError = userError.filter((item) => item !== 1021);
                        singleUser['username'] =
                            allUserCodeSheet[userCode]['username'];
                    }
                }
                /* SET PARTIAL ERROR CODE AND REMOVE USER CODE */
                /* SET AUTO CREATE THREE TIME USERNAME */
                if (
                    userError.includes(1021) &&
                    !singleUser['id'] &&
                    singleUser['code'] &&
                    userName === '' &&
                    singleUser['username']
                ) {
                    let dobyear = this.commonDateService.getDateFormateChange(
                        singleUser?.dob,
                    );
                    let autoGenerateUsername =
                        await this.commonService.threeTimeUserName(
                            singleUser['first_name']
                                .toUpperCase()
                                .match(/[a-zA-z0-9-]/g)
                                .join(''),
                            singleUser['last_name']
                                .toUpperCase()
                                .match(/[a-zA-z0-9-]/g)
                                .join(''),
                            dobyear,
                        );
                    singleUser['username'] = sheetData['username'] =
                        autoGenerateUsername;
                    userError = userError.filter((item) => item !== 1021);
                }
                /* SET AUTO CREATE THREE TIME USERNAME */
                if (userError.length > 0 || partialUserError.length > 0) {
                    if (userError.length > 0) {
                        singleUser['error_code'] = userError;
                        RejectedUserData.push(singleUser);
                    }
                    if (partialUserError.length > 0) {
                        singleUser['error_code'] = partialUserError;
                        UserPartialData.push(singleUser);
                    }
                } else {
                    if (singleUser?.id) {
                        if (recordDetails?.census_upload_type == 1) {
                            delete existingUserlist[singleUser['id']];
                        }
                        if (recordDetails?.reset_password == 1) {
                            singleUser.password = '';
                        }
                        let UserUpdateQuery =
                            await this.createUpdateData(singleUser);
                        let userTable = UserUpdateQuery['userData'];
                        userTable.id = singleUser.id;
                        let saveUserResult =
                            await this.userService.save(userTable);
                        let userSettingTable =
                            UserUpdateQuery['userSettingData'];
                        let user_setting_table =
                            await this.usersettingService.findOne({
                                user_id: singleUser.id,
                            });
                        userSettingTable.id = user_setting_table.id;
                        userSettingTable.user_id = singleUser.id;
                        let saveUserSettingResult =
                            await this.usersettingService.save(
                                userSettingTable,
                            );
                        removeCustomField.push(singleUser.id);
                        UserUpdateData.push(singleUser);
                    } else {
                        let UserCreateQuery =
                            await this.createUpdateData(singleUser);
                        let userTable = UserCreateQuery['userData'];
                        userTable.num_login = 0;
                        userTable.companytype_id = 3;
                        userTable.password = '';
                        userTable.new_password = '';
                        let userSettingTable =
                            UserCreateQuery['userSettingData'];
                        let saveUserResult =
                            await this.userService.save(userTable);
                        const uID = saveUserResult.identifiers[0].id;
                        userSettingTable.user_id = uID;
                        let saveUserSettingResult =
                            await this.usersettingService.save(
                                userSettingTable,
                            );
                        UserCreateData.push(singleUser);
                        if (census_status == '1') {
                            removeCustomField.push(uID);
                            let censusData = [];
                            if (Object.keys(dataTable).length > 0) {
                                dataTable.forEach((data: any) => {
                                    censusData.push({
                                        ...data,
                                        user_id: uID,
                                    });
                                });
                                await this.CensusCustomFieldsValuesService.save(
                                    censusData,
                                );
                            }
                        }
                    }
                }

                /* Spouse Start */
                let spouserecord: any = [];
                if (spouseFirstName != '' && spouseLastName != '') {
                    let uid = singleUser['id'];
                    delete singleUser['error_code'];
                    spouserecord = singleUser;
                    let userCode = '';
                    if (uid && existRelationshipCodeSheet[uid]) {
                        const checkUser = existingUserAllData
                            .filter(
                                (userObj) =>
                                    userObj.User?.relationship_id ===
                                    existRelationshipCodeSheet[uid],
                            )
                            .map((userObj) => userObj.User);

                        if (checkUser.length > 0) {
                            if (recordDetails?.census_upload_type == 1) {
                                delete existingUserlist[singleUser['id']];
                            }
                            userCode = checkUser[0].code;
                            allUserCodeSheet[userCode] = checkUser[0];
                        }
                    }

                    let spouseEmployeeId = '';
                    if (userCode !== '' && allUserCodeSheet[userCode]) {
                        spouserecord['employeeid'] = spouseEmployeeId =
                            allUserCodeSheet[userCode].employeeid;
                    } else {
                        if (!employeeId) {
                            spouserecord['employeeid'] = spouseEmployeeId =
                                employeeId;
                        } else {
                            spouserecord['employeeid'] = spouseEmployeeId =
                                employeeId + 's';
                        }
                    }

                    /* For First Name H::START */
                    let fNameCheck = await this.commonFileService.checkCommon(
                        'first_name',
                        spouseFirstName,
                        userCode,
                    );
                    if (fNameCheck['errorCode'].length > 0) {
                        userError.push(fNameCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1002)
                        ) {
                            spouserecord.first_name =
                                allUserCodeSheet[userCode]['first_name'];
                            validateFields.push('first_name');
                            partialUserError.push(1002);
                            userError = userError.filter(
                                (item) => item !== 1002,
                            );
                        }
                    } else {
                        spouserecord.first_name = fNameCheck['firstName'];
                        validateFields.push(fNameCheck['validateFields']);
                    }
                    /* For First Name H::END */
                    /* For Last Name J::START */
                    let lNameCheck = await this.commonFileService.checkCommon(
                        'last_name',
                        spouseLastName,
                        userCode,
                    );
                    if (lNameCheck['errorCode'].length > 0) {
                        userError.push(lNameCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1003)
                        ) {
                            spouserecord.last_name =
                                allUserCodeSheet[userCode]['last_name'];
                            validateFields.push('last_name');
                            partialUserError.push(1003);
                            userError = userError.filter(
                                (item) => item !== 1003,
                            );
                        }
                    } else {
                        spouserecord.last_name = lNameCheck['lastName'];
                        validateFields.push(lNameCheck['validateFields']);
                    }
                    /* For Last Name J::END */

                    /* For Birth Date O::START */
                    let dofBirthCheck =
                        await this.commonFileService.checkCommon(
                            'date_of_birth',
                            spouseDob,
                        );
                    if (dofBirthCheck['errorCode'].length > 0) {
                        userError.push(dofBirthCheck?.['errorCode']?.['0']);
                        if (
                            userCode &&
                            allUserCodeSheet[userCode] &&
                            userError &&
                            userError.includes(1004)
                        ) {
                            spouserecord.dob =
                                allUserCodeSheet[userCode]['dob'];
                            partialUserError.push(1004);
                            userError = userError.filter(
                                (item) => item !== 1004,
                            );
                        }
                    } else {
                        spouserecord.dob = dofBirthCheck['dateOfBirth']
                            ? this.commonDateService.normalizeDates(
                                  dofBirthCheck['dateOfBirth'],
                                  'YYYY-MM-DD',
                              )
                            : null;
                        birthDate = dofBirthCheck['orgDateOfBirth'];
                    }
                    /* For Birth Date O::END */

                    if (singleUser['role_id'] && singleUser['role_id'] == 2) {
                        /* For Username G::START */
                        let uNameCheck =
                            await this.commonFileService.checkCommon(
                                's_user_name',
                                '',
                                userCode,
                                '',
                                spouserecord,
                                allUserCodeSheet,
                            );
                        if (uNameCheck['errorCode'].length > 0) {
                            userError.push(uNameCheck?.['errorCode']?.['0']);
                            if (
                                userCode &&
                                allUserCodeSheet[userCode] &&
                                userError.includes(1021)
                            ) {
                                spouserecord.username =
                                    allUserCodeSheet[userCode]['username'];
                                validateFields.push('username');
                                partialUserError.push(1021);
                                userError = userError.filter(
                                    (item) => item !== 1021,
                                );
                            }
                        } else {
                            spouserecord.username =
                                uNameCheck['spouse_username'];
                            validateFields.push(uNameCheck['validateFields']);
                        }
                        /* For Username G::END */
                        /* For Email & Duplication Validation S::START */
                        let emailCheck =
                            await this.commonFileService.checkCommon(
                                'email',
                                spouseEmail,
                                userCode,
                                '',
                                '',
                                allUserCodeSheet,
                            );
                        if (emailCheck['errorCode'].length > 0) {
                            userError.push(emailCheck?.['errorCode']?.['0']);
                            if (
                                userCode &&
                                allUserCodeSheet[userCode] &&
                                userError &&
                                userError.includes(1006)
                            ) {
                                spouserecord.email =
                                    allUserCodeSheet[userCode]['email'];
                                validateFields.push('email');
                                partialUserError.push(1006);
                                userError = userError.filter(
                                    (item) => item !== 1006,
                                );
                            }
                        } else {
                            spouserecord.email = emailCheck['email'];
                            validateFields.push(emailCheck['validateFields']);
                        }
                        /* For Email & Duplication Validation S::END */
                        /* For Gender N::START */
                        let genCheck = await this.commonFileService.checkCommon(
                            'gender',
                            spouseGender,
                        );
                        if (genCheck['errorCode'].length > 0) {
                            userError.push(genCheck?.['errorCode']?.['0']);
                            if (
                                userCode &&
                                allUserCodeSheet[userCode] &&
                                userError &&
                                userError.includes(1005)
                            ) {
                                spouserecord.gender =
                                    allUserCodeSheet[userCode]['gender'];
                                partialUserError.push(1005);
                                userError = userError.filter(
                                    (item) => item !== 1005,
                                );
                            }
                        } else {
                            spouserecord.gender = genCheck['gender'];
                            gender = genCheck['orgGender'];
                        }
                        /* For Gender N::END */
                        /* For Health Plan Name R & On Health Plan Q ::START */
                        let hPlanNameCheck =
                            await this.commonFileService.checkCommon(
                                'health_plan_name',
                                spouseHealthPlanName,
                                spouseOnHealthPlan,
                                userCode,
                                companyId,
                            );
                        onHealthPlan = hPlanNameCheck['arrInsurancePlanOn'];
                        healthPlanName = hPlanNameCheck['insurancePlanName'];
                        let arrPassVar = hPlanNameCheck['arrPassVar'];
                        switch (arrPassVar) {
                            case 'update':
                            case 'spupdate':
                                spouserecord.on_insurance_plan = onHealthPlan;
                                spouserecord.insurance_plan_name =
                                    healthPlanName;
                                if (arrPassVar === 'spupdate') {
                                    partialUserError.push(1030);
                                }
                                break;

                            case 'dpupdate':
                                spouserecord.on_insurance_plan = onHealthPlan =
                                    allUserCodeSheet[userCode]
                                        .on_insurance_plan;
                                spouserecord.insurance_plan_name =
                                    healthPlanName =
                                        allUserCodeSheet[userCode]
                                            .insurance_plan_name;
                                partialUserError.push(1030);
                                break;
                        }
                        /* For Health Plan Name R & On Health Plan Q ::END */
                        /* Set name START */
                        spouserecord.name = `${spouserecord.first_name} ${spouserecord.last_name}`;
                        /* Set name END */
                    } else {
                        userError.push(1025);
                        spouserecord.username = '';
                    }
                    if (
                        userCode &&
                        allUserCodeSheet[userCode] &&
                        (!['16'].includes(
                            allUserCodeSheet[userCode]['role_id'].toString(),
                        ) ||
                            allUserCodeSheet[userCode]['role_id'] != 16)
                    ) {
                        userError.push(1067);
                    }
                    if (!userError.length) {
                        spouserecord.role_id = 16;
                        /* For Relationship ID START */
                        if (singleUser?.code != '') {
                            let checkcode = singleUser.code;
                            let checkCodeData = await this.userService.findOne(
                                { code: checkcode },
                                ['code'],
                            );
                            if (checkCodeData) {
                                spouserecord.relationship_id = checkcode;
                            } else {
                                userError.push(1024);
                            }
                        } else {
                            userError.push(1024);
                        }
                        /* For Relationship ID END */
                        if (userCode !== '') {
                            spouserecord.code = userCode;
                            spouserecord.id = allUserCodeSheet[userCode]['id'];
                            spouserecord.updated = this.commonDateService
                                .getTodayDate()
                                .format('YYYY-MM-DD HH:mm:ss');
                        }
                        /* USER TIMEZONE */
                    }
                    /* USERNAME min 8 character error code */
                    if (
                        spouserecord.username &&
                        (spouserecord.username.length < 8 ||
                            spouserecord.username.length > 60)
                    ) {
                        userError.push(1021);
                    }
                    if (
                        allUserCodeSheet[userCode] &&
                        spouserecord.username ==
                            allUserCodeSheet[userCode]['username']
                    ) {
                        partialUserError.push(1021);
                        userError = userError.filter((error) => error !== 1021);
                    }
                    /* USERNAME min 8 character error code */
                    /* SET AUTO CREATE THREE TIME USERNAME */
                    if (
                        userError.includes(1021) &&
                        !spouserecord['id'] &&
                        spouserecord['code'] &&
                        userName === '' &&
                        spouserecord['username']
                    ) {
                        let dobyear = this.commonDateService
                            .getTodayDate(spouserecord?.dob)
                            .format('YYYY');
                        let autoGenerateUsername =
                            await this.commonService.threeTimeUserName(
                                spouserecord['first_name']
                                    .toUpperCase()
                                    .match(/[a-zA-z0-9-]/g)
                                    .join(''),
                                spouserecord['last_name']
                                    .toUpperCase()
                                    .match(/[a-zA-z0-9-]/g)
                                    .join(''),
                                dobyear,
                            );
                        spouserecord['username'] = sheetData['username'] =
                            autoGenerateUsername;
                        userError = userError.filter((item) => item !== 1021);
                    }
                    /* SET AUTO CREATE THREE TIME USERNAME */
                    /* SET PARTIAL ERROR CODE AND REMOVE USER CODE */
                    if (
                        userCode !== '' &&
                        allUserCodeSheet[userCode] !== null &&
                        userError.length > 0
                    ) {
                        if (userError.includes(1058)) {
                            partialUserError.push(1058);
                            userError = userError.filter(
                                (item) => item !== 1058,
                            );
                            spouserecord['securitycode'] =
                                allUserCodeSheet[userCode]['securitycode'];
                        }

                        if (userError.includes(1013)) {
                            partialUserError.push(1013);
                            userError = userError.filter(
                                (item) => item !== 1013,
                            );
                            spouserecord['employeeid'] =
                                allUserCodeSheet[userCode]['employeeid'];
                        }

                        if (userError.includes(1036)) {
                            partialUserError.push(1036);
                            userError = userError.filter(
                                (item) => item !== 1036,
                            );
                            spouserecord['relationship_id'] =
                                allUserCodeSheet[userCode]['relationship_id'];
                        }

                        if (userError.includes(1006)) {
                            partialUserError.push(1006);
                            userError = userError.filter(
                                (item) => item !== 1006,
                            );
                            spouserecord['email'] =
                                allUserCodeSheet[userCode]['email'];
                        }

                        if (userError.includes(1021)) {
                            partialUserError.push(1021);
                            userError = userError.filter(
                                (item) => item !== 1021,
                            );
                            spouserecord['username'] =
                                allUserCodeSheet[userCode]['username'];
                        }
                    }
                    /* SET PARTIAL ERROR CODE AND REMOVE USER CODE */
                    /* USER TIMEZONE */
                    /* TODO create getUserTimezone comman function */
                    spouserecord.code = await codeCheck();
                    /* USER TIMEZONE */
                    if (userError.length > 0 || partialUserError.length > 0) {
                        if (userError.length > 0) {
                            spouserecord['error_code'] = userError;
                            RejectedUserData.push(spouserecord);
                        }
                        if (partialUserError.length > 0) {
                            spouserecord['error_code'] = partialUserError;
                            UserPartialData.push(spouserecord);
                        }
                    } else {
                        if (spouserecord?.id) {
                            if (recordDetails?.census_upload_type == 1) {
                                delete existingUserlist[spouserecord['id']];
                            }
                            if (recordDetails?.reset_password == 1) {
                                spouserecord.password = '';
                            }

                            let UserUpdateQuery =
                                await this.createUpdateData(spouserecord);
                            let userTable = UserUpdateQuery['userData'];
                            userTable.id = singleUser.id;
                            let saveUserResult =
                                await this.userService.save(userTable);
                            let userSettingTable =
                                UserUpdateQuery['userSettingData'];
                            let user_setting_table =
                                await this.usersettingService.findOne({
                                    user_id: spouserecord.id,
                                });
                            userSettingTable.id = user_setting_table.id;
                            userSettingTable.user_id = singleUser.id;
                            let saveUserSettingResult =
                                await this.usersettingService.save(
                                    userSettingTable,
                                );
                            UserUpdateData.push(spouserecord);
                        } else {
                            let UserCreateQuery =
                                await this.createUpdateData(spouserecord);
                            let userTable = UserCreateQuery['userData'];
                            userTable.num_login = 0;
                            userTable.companytype_id = 3;
                            userTable.password = '';
                            userTable.new_password = '';
                            let userSettingTable =
                                UserCreateQuery['userSettingData'];
                            let saveUserResult =
                                await this.userService.save(userTable);
                            const uID = saveUserResult.identifiers[0].id;
                            userSettingTable.user_id = uID;
                            let saveUserSettingResult =
                                await this.usersettingService.save(
                                    userSettingTable,
                                );
                            UserCreateData.push(spouserecord);
                        }
                    }
                }
                /* Spouse End */
            }
            /* Census Custom field remove */
            if (removeCustomField.length > 0) {
                let removeCustomFieldData =
                    await this.CensusCustomFieldsValuesService.listRecord(
                        ['user_id'],
                        {
                            user_id: Not(removeCustomField.join(',')),
                            organization_id: companyId,
                        },
                    );
                if (removeCustomFieldData && removeCustomFieldData.length > 0) {
                    let removeUserIds = removeCustomFieldData.map(
                        (item) => item.user_id,
                    );
                    await this.CensusCustomFieldsValuesService.update(
                        { user_id: In(removeUserIds) },
                        { status: 2 },
                    );
                }
            }
            /* Census Custom field remove */
            let userRejected_filename = '',
                userCreate_filename = '',
                userUpdate_filename = '',
                userPartial_filename = '';
            if (RejectedUserData.length > 0) {
                let filePath = path.join(`${directory}/`);
                let fileName = `Rejected_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                let reject_json = await this.commonFileService.createJsonFile(
                    companies,
                    RejectedUserData,
                    mapped_header,
                );
                let reject_header_data = {
                    ...Table_HEADER_DATA,
                    ...{ AM: 'error_code' },
                };
                let reject_csv =
                    await this.commonFileService.reverseMapSheetData(
                        RejectedUserData,
                        reject_header_data,
                        'reversed_header',
                    );
                let general_reject_header = {
                    ...GENERAL_HEADER_DATA,
                    ...{ AM: 'Error Code' },
                };
                reject_csv = await this.commonFileService.reverseMapSheetData(
                    reject_csv,
                    general_reject_header,
                );

                let writeJsonFile = await this.commonFileService.writeFile(
                    filePath,
                    `${JSON.stringify(reject_json)}`,
                    fileName,
                );
                let json_file_full_path = path.resolve(
                    `${filePath}${fileName}`,
                );
                if (writeJsonFile?.status == 'success') {
                    let csvFile = `CSV_Rejected_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                    let writeCsvFile = await this.commonFileService.writeFile(
                        filePath,
                        `${JSON.stringify(reject_csv)}`,
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
                                userRejected_filename = `${directory}/Rejected-Records-${datetime}.csv`;
                                let userRejected_filename_json = `${directory}/${fileName}`;
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: filePath,
                                            filename: userRejected_filename,
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
                                                userRejected_filename_json,
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

            if (UserCreateData.length > 0) {
                let filePath = path.join(`${directory}/`);
                let fileName = `Created_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;

                let create_json = await this.commonFileService.createJsonFile(
                    companies,
                    UserCreateData,
                    mapped_header,
                );
                let create_csv =
                    await this.commonFileService.reverseMapSheetData(
                        UserCreateData,
                        Table_HEADER_DATA,
                        'reversed_header',
                    );
                create_csv = await this.commonFileService.reverseMapSheetData(
                    create_csv,
                    GENERAL_HEADER_DATA,
                );

                let writeJsonFile = await this.commonFileService.writeFile(
                    filePath,
                    `${JSON.stringify(create_json)}`,
                    fileName,
                );
                let json_file_full_path = path.resolve(
                    `${filePath}${fileName}`,
                );
                if (writeJsonFile?.status == 'success') {
                    let csvFile = `CSV_Created_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                    let writeCsvFile = await this.commonFileService.writeFile(
                        filePath,
                        `${JSON.stringify(create_csv)}`,
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
                                userCreate_filename = `${directory}/Created-Records-${datetime}.csv`;
                                let userCreate_filename_json = `${directory}/${fileName}`;
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: filePath,
                                            filename: userCreate_filename,
                                            userBucket: 'private',
                                        },
                                    ),
                                );
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: json_file_full_path,
                                            filename: userCreate_filename_json,
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

            if (UserUpdateData.length > 0) {
                let filePath = path.join(`${directory}/`);
                let fileName = `Updated_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                let update_json = await this.commonFileService.createJsonFile(
                    companies,
                    UserUpdateData,
                    mapped_header,
                );
                let update_csv =
                    await this.commonFileService.reverseMapSheetData(
                        UserUpdateData,
                        Table_HEADER_DATA,
                        'reversed_header',
                    );
                update_csv = await this.commonFileService.reverseMapSheetData(
                    update_csv,
                    GENERAL_HEADER_DATA,
                );

                let writeJsonFile = await this.commonFileService.writeFile(
                    filePath,
                    `${JSON.stringify(update_json)}`,
                    fileName,
                );
                let json_file_full_path = path.resolve(
                    `${filePath}${fileName}`,
                );
                if (writeJsonFile?.status == 'success') {
                    let csvFile = `CSV_Updated_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                    let writeCsvFile = await this.commonFileService.writeFile(
                        filePath,
                        `${JSON.stringify(update_csv)}`,
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
                                userUpdate_filename = `${directory}/Updated-Records-${datetime}.csv`;
                                let userUpdate_filename_json = `${directory}/${fileName}`;
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: filePath,
                                            filename: userUpdate_filename,
                                            userBucket: 'private',
                                        },
                                    ),
                                );
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: json_file_full_path,
                                            filename: userUpdate_filename_json,
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

            if (UserPartialData.length > 0) {
                let filePath = path.join(`${directory}/`);
                let fileName = `Partial_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                let partial_json = await this.commonFileService.createJsonFile(
                    companies,
                    UserPartialData,
                    mapped_header,
                );
                let partial_header_data = {
                    ...Table_HEADER_DATA,
                    ...{ AM: 'error_code' },
                };
                let partial_csv =
                    await this.commonFileService.reverseMapSheetData(
                        UserPartialData,
                        partial_header_data,
                        'reversed_header',
                    );
                let general_partial_header = {
                    ...GENERAL_HEADER_DATA,
                    ...{ AM: 'Error Code' },
                };
                partial_csv = await this.commonFileService.reverseMapSheetData(
                    partial_csv,
                    general_partial_header,
                );

                let writeJsonFile = await this.commonFileService.writeFile(
                    filePath,
                    `${JSON.stringify(partial_json)}`,
                    fileName,
                );
                let json_file_full_path = path.resolve(
                    `${filePath}${fileName}`,
                );
                if (writeJsonFile?.status == 'success') {
                    let csvFile = `CSV_Partial_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                    let writeCsvFile = await this.commonFileService.writeFile(
                        filePath,
                        `${JSON.stringify(partial_csv)}`,
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
                                userPartial_filename = `${directory}/Partial-Records-${datetime}.csv`;
                                let userPartial_filename_json = `${directory}/${fileName}`;
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: filePath,
                                            filename: userPartial_filename,
                                            userBucket: 'private',
                                        },
                                    ),
                                );
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: json_file_full_path,
                                            filename: userPartial_filename_json,
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
            await this.importUserRequestService.update(
                { id: recordDetails?.id },
                {
                    requeststep: '3',
                    created_file: userCreate_filename,
                    created_count: UserCreateData.length,
                    updated_file: userUpdate_filename,
                    updated_count: UserUpdateData.length,
                    rejected_file: userRejected_filename,
                    rejected_count: RejectedUserData.length,
                    partial_file: userPartial_filename,
                    partial_count: UserPartialData.length,
                },
            );
            this.commonFileService.writeFile(
                `${directory}`,
                echoTime,
                'time.txt',
            );
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: path.resolve(`${directory}/time.txt`),
                        filename: `${directory}/time.txt`,
                        userBucket: 'private',
                    },
                ),
            );
            return {
                id: recordDetails?.hash,
                next_step: 'import-user-process-upload',
            };
        } catch (error) {
            return false;
        }
    }
    async createUpdateData(singleUser) {
        let user_table_field = appConstant.USER_TABLE;
        let usersetting_table_field = appConstant.USER_SETTING_TABLE;
        try {
            let item = singleUser;
            let onInsurancePlan = '';
            let securitycode = '';
            const plan = item.on_insurance_plan?.toLowerCase();
            if (plan == 'yes' || plan == 'y') {
                onInsurancePlan = 'Yes';
            } else if (plan == 'no' || plan == 'n') {
                onInsurancePlan = 'No';
            }
            if (item?.securitycode) {
                if (item?.securitycode.length > 11) {
                    securitycode = Buffer.from(item?.securitycode, 'base64')
                        .toString()
                        .trim();
                }
            }
            if (item?.employeeid) {
                item['employeeid'] = Number(item?.employeeid.toString().trim());
            }
            item.securitycode = securitycode;
            item.employeeid = item?.employeeid || '';
            item.on_insurance_plan = onInsurancePlan;
            /* User Table Data Set */
            const userData = Object.fromEntries(
                Object.entries(item).filter(([key]) =>
                    user_table_field.includes(key),
                ),
            );
            /* User Setting Table Data Set */
            const userSettingData = Object.fromEntries(
                Object.entries(item).filter(([key]) =>
                    usersetting_table_field.includes(key),
                ),
            );
            return {
                userData,
                userSettingData,
            };
        } catch (error) {
            return [];
        }
    }
}
