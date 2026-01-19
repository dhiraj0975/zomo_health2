import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    tableConstant,
} from '@common-constants';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { In } from 'typeorm';
import { CensusCommonService } from '../../common';
import { appCensusConstant } from '../../constant';
import { CensusCustomFieldsService } from '../censuscustomfields/censuscustomfields.service';
import { CensusCustomFieldsValuesService } from '../censuscustomfieldsvalues/censuscustomfieldsvalues.service';
import { CompanyService } from '../companies/company.service';
import { DepartmentService } from '../departments/department.service';
import { LocationService } from '../locations/location.service';
import { UserService } from '../user/user.service';
import { SkipService } from './skips.service';

@Controller('skip')
export class SkipController {
    constructor(
        private readonly skipService: SkipService,
        private readonly commonDateService: CommonDateService,
        private readonly commonArrayService: CommonArrayService,
        private readonly censusCommonService: CensusCommonService,
        private readonly companyService: CompanyService,
        private readonly censusCustomFieldsValuesService: CensusCustomFieldsValuesService,
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
    ) {}

    @MessagePattern({ cmd: 'import-user-process-skip' })
    async importUserProcessSkip(postData: any) {
        const startTime = Date.now();
        const censusFieldMap = new Map<number, string>();
        const userCustomFieldMap = new Map<number, any>();
        const userCustomFieldById = {};
        try {
            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '1',
                    '1',
                );

            const companyId = recordDetails.org_id;
            const recordId = recordDetails?.hash;

            await this.censusCommonService.updateRecordProgress(recordId, {
                flage: '2',
            });
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start Skip Process',
                startTime,
            );

            const [company, existingUsers] = await Promise.all([
                this.companyService.findOne(
                    { id: companyId },
                    [tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],
                    appCensusConstant.CENSUS_COMPANY_LIST,
                ),
                this.userService.listUDLCSRecords(
                    `user.org_id = '${companyId}' AND user.role_id IN (2,16)`,
                    { id: 'ASC' },
                    appConstant.CENSUS_USER_LIST,
                ),
            ]);

            if (!company) {
                await this.censusCommonService.error_log(
                    0,
                    'import-user-process-skip',
                    'ERR_RECORD_NOT_FOUND',
                    null,
                    postData,
                );
                return false;
            }
            /*
            let tableMapped = await this.censusCommonService.loadJsonFile(
                `${backupDirectory}/process-data.json`,
            );*/
            let fieldList: any[] = [];
            let headersMap = {};
            let defaultHeaderMap = {
                ...appConstant.table_HEADER_DATA,
                ...appConstant.table_SPOUSE_HEADER_DATA,
                ...appConstant.table_LINKED_HEADER_DATA,
            };

            const isCensusStatusEnabled =
                company?.companySetting?.census_status === 1;

            //if (!tableMapped) {
            const fileContents = await this.censusCommonService.loadJsonFile(
                recordDetails.origional_file,
            );
            const sheetRows = fileContents.slice(1);
            headersMap = JSON.parse(recordDetails.mapped_header);

            if (isCensusStatusEnabled) {
                fieldList = await this.censusCustomFieldsService.listRecord(
                    ['title', 'id'],
                    {
                        status: 1,
                        organization_id: companyId,
                    },
                );

                const rawValues =
                    await this.censusCustomFieldsValuesService.listRecord(
                        ['field_id', 'field_value', 'user_id', 'id'],
                        {
                            status: '1',
                            organization_id: companyId,
                            field_id: In(fieldList.map((f) => f.id)),
                        },
                    );

                for (const { id, title } of fieldList) {
                    censusFieldMap.set(Number(id), title);
                }

                for (const row of rawValues) {
                    const title = censusFieldMap.get(row.field_id);
                    const userId = Number(row.user_id);
                    if (!title) continue;

                    if (!userCustomFieldMap.has(userId))
                        userCustomFieldMap.set(userId, {});
                    userCustomFieldMap.get(userId)[title] = row.field_value;

                    if (!userCustomFieldById[userId])
                        userCustomFieldById[userId] = {};
                    userCustomFieldById[userId][row.field_id] = row;
                }

                const censusHeaderMap = Object.fromEntries(
                    fieldList.map((f) => [`Z${f.id}`, f.title]),
                );
                const headerIndexMap = Object.fromEntries(
                    fieldList.map((f) => {
                        const index = fileContents[0].findIndex(
                            (col: string) => col === f.title,
                        );
                        return [
                            `Z${f.id}`,
                            index !== -1 ? String(index) : null,
                        ];
                    }),
                );

                defaultHeaderMap = {
                    ...defaultHeaderMap,
                    ...censusHeaderMap,
                };
                headersMap = { ...headersMap, ...headerIndexMap };
            }

            const headerMapped =
                await this.commonArrayService.mapped_sheet_data(
                    sheetRows,
                    headersMap,
                    'header',
                );
            const tableMapped = await this.commonArrayService.mapped_sheet_data(
                headerMapped,
                defaultHeaderMap,
                'table_header',
            );
            //}
            const departmentNames = new Set<string>();
            let hasLinkedEmp = false;
            const spouseKeys = Object.values(
                appConstant.table_SPOUSE_HEADER_DATA,
            );

            const processedRows = [];

            for (let i = 0; i < tableMapped.length; i++) {
                const row = tableMapped[i];

                // Check linked_emp_id
                if (!hasLinkedEmp && row['linked_emp_id'] != null) {
                    hasLinkedEmp = true;
                }

                // Agar spouse info hai, to row.tmp update karo
                if (row['spouse_first_name'] && row['spouse_last_name']) {
                    row.tmp = row.tmp || {};
                    // childRowIndex spouse ke liye, processedRows me next push hone wala index hoga
                    row.tmp.isSpouseExist = true;
                    row.tmp.childRowIndex = processedRows.length + 1;
                }

                // Pehle employee row ko processedRows me push karo
                processedRows.push(row);
                const parentIndex = processedRows.length - 1; // Employee ka actual index processedRows me

                if (row['spouse_first_name'] && row['spouse_last_name']) {
                    // Spouse object banayen
                    const spouse: any = {};
                    for (const key of spouseKeys) {
                        let newKey = key.slice(7);
                        if (newKey === 'on_health_plan')
                            newKey = 'on_insurance_plan';
                        if (newKey === 'health_plan_name')
                            newKey = 'insurance_plan_name';
                        spouse[newKey] = row[key];
                    }

                    spouse.relationship_code = row['code'] || 'spouse';
                    spouse.role_id = 16;

                    spouse.tmp = {
                        isSpouse: true,
                        // Spouse ka parent employee ka index
                        parentRowIndex: parentIndex,
                    };

                    // Spouse ko processedRows me push karo
                    processedRows.push(spouse);
                } else {
                    // Agar spouse nahi hai to spouseKeys delete karo from employee row
                    for (const key of spouseKeys) delete row[key];
                }

                // Department sanitization
                const dept = await this.censusCommonService.sanitizeAndTrim(
                    row['department_id'],
                );
                if (typeof dept === 'string' && dept) departmentNames.add(dept);
            }

            tableMapped.length = 0;
            tableMapped.push(...processedRows);

            if (hasLinkedEmp) {
                const userMapByEmpId = new Map(
                    existingUsers
                        .filter(
                            (u) =>
                                u.employeeid !== null &&
                                u.employeeid.toString().trim() !== '',
                        )
                        .map((u) => [u.employeeid, u]),
                );
                for (const row of tableMapped) {
                    if (!row.linked_emp_id) continue;
                    const matchedUser = userMapByEmpId.get(row.linked_emp_id);
                    row.relationship_code = 'spouse';
                    if (matchedUser) {
                        row.relationship_id = matchedUser.code;
                        /*delete row.linked_emp_id;*/
                    }
                }
            }
            let departmentMap = new Map<string, number>();
            let defaultDeptName: string | null = null;
            let defaultLocName: string | null = null;
            // Prepare condition parts
            const conditionParts = [
                `department.company_id = ${companyId}`,
                `department.status != 2`,
            ];

            if (departmentNames.size > 0) {
                const sanitizedNames = [...departmentNames].map(
                    (d) => `'${d.replace(/'/g, "''")}'`,
                );
                conditionParts.push(`
                    (
                        department.default_dept = 'Yes'
                        OR department.dept_name IN (${sanitizedNames.join(',')})
                    )
                `);
            } else {
                conditionParts.push(`department.default_dept = 'Yes'`);
            }

            const conditionDept = conditionParts.join(' AND ');

            const departments = await this.departmentService.listRecordCustom(
                conditionDept,
                [
                    'department.id',
                    'department.dept_name',
                    'department.default_dept',
                ],
            );

            departmentMap = new Map();
            for (const { id, dept_name, default_dept } of departments) {
                departmentMap.set(dept_name, id);
                if (default_dept === 'Yes' && defaultDeptName === null) {
                    defaultDeptName = dept_name;
                }
            }

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Skip Process Department Mapping',
                startTime,
            );

            const workZipPromises = (tableMapped as Record<string, any>[]).map(
                (row: Record<string, any>) =>
                    this.censusCommonService.sanitizeAndTrim(row['work_zip']),
            );
            const zipResults = await Promise.all(workZipPromises);
            const workZipSet = new Set(
                zipResults.filter((zip) => typeof zip === 'string' && zip),
            );

            const locationIdMap = new Map<string, number>();
            const locationMap = new Map<string, any>([
                [
                    'default',
                    {
                        company_id: companyId,
                        deleted: 0,
                        is_default: 1,
                    },
                ],
            ]);
            const locationKeySet = new Set<string>(['default']);

            if (workZipSet.size > 0) {
                const timeZoneData =
                    await this.censusCommonService.getTimeZoneDataFromZips(
                        workZipSet,
                    );

                for (const row of tableMapped) {
                    const [location, address1, address2, zip] =
                        await Promise.all([
                            this.censusCommonService.sanitizeAndTrim(
                                row['location'],
                            ),
                            this.censusCommonService.sanitizeAndTrim(
                                row['work_address_1'],
                            ),
                            this.censusCommonService.sanitizeAndTrim(
                                row['work_address_2'] || '',
                            ),
                            this.censusCommonService.sanitizeAndTrim(
                                row['work_zip'],
                                'start_zero_replace',
                            ),
                        ]);

                    const tzInfo = timeZoneData[zip];
                    if (!tzInfo) continue;

                    const country =
                        tzInfo.country === 'US' ? 'United States' : 'Canada';
                    const key = [
                        location,
                        address1,
                        address2,
                        tzInfo.city,
                        tzInfo.statecode || tzInfo.provincecode,
                        zip,
                        country,
                    ].join(':::::');

                    if (!locationMap.has(key)) {
                        locationMap.set(key, {
                            lname: location,
                            address1,
                            address2,
                            city: tzInfo.city,
                            state: tzInfo.statecode || tzInfo.provincecode,
                            zip,
                            country,
                            company_id: companyId,
                            deleted: 0,
                        });
                        locationKeySet.add(key);
                    }

                    row.tmp = {
                        locationKey: key,
                        locationMeta: locationMap.get(key),
                    };
                }
            }
            const existingLocations =
                await this.locationService.findByMultipleQueries(
                    [...locationKeySet].map((key) => locationMap.get(key)),
                );

            for (const loc of existingLocations) {
                const key = [
                    loc.lname,
                    loc.address1,
                    loc.address2,
                    loc.city,
                    loc.state,
                    loc.zip,
                    loc.country,
                ].join(':::::');
                locationIdMap.set(key, loc.id);
                if (loc.is_default === 1) {
                    defaultLocName = loc;
                }
            }
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Skip Process Location Mapping',
                startTime,
            );

            const excludedKeys = new Set(
                appCensusConstant.CENSUS_COMPARE_EXCLUDED_KEYS,
            );

            for (const row of tableMapped as Record<string, any>[]) {
                row.compare = {};

                for (const key in row) {
                    if (excludedKeys.has(key)) continue;

                    const val = row[key];

                    if (
                        isCensusStatusEnabled &&
                        fieldList?.some((f) => f.title?.trim() === key.trim())
                    ) {
                        row.compare[key] = val;
                        continue;
                    }

                    if (
                        (key === 'department_id' && val === null) ||
                        val === undefined
                    ) {
                        row.tmp = row.tmp || {};
                        row.tmp.deptId = departmentMap?.get(defaultDeptName);
                        row.tmp.deptName = defaultDeptName;
                        continue;
                    }
                    if (
                        (key === 'location' && val === null) ||
                        val === undefined
                    ) {
                        row.tmp = row.tmp || {};
                        row.tmp.locName = defaultLocName;
                        continue;
                    }
                    if (val === null || val === undefined) continue;
                    let processedVal = val;

                    switch (key) {
                        case 'status':
                            const status = val?.toString().toLowerCase();
                            row.compare.status =
                                !status &&
                                recordDetails?.census_upload_type === 1
                                    ? 1
                                    : status === 'current'
                                      ? 1
                                      : status === 'terminated'
                                        ? 0
                                        : status || 0;
                            continue;

                        case 'employeeid':
                        case 'insurance_plan_name':
                        case 'jobtitle':
                            processedVal = val.toString().trim();
                            break;
                        case 'email':
                            processedVal = val.toString().trim().toLowerCase();
                            break;
                        case 'department_id':
                            processedVal = departmentMap?.get(val) ?? val;
                            if (departmentMap?.get(val)) {
                                row.tmp = row.tmp || {};
                                row.tmp.deptId = departmentMap.get(val);
                            }
                            break;

                        case 'location':
                            processedVal =
                                locationIdMap?.get(row?.tmp?.locationKey) ??
                                val;
                            if (locationIdMap?.get(row?.tmp?.locationKey)) {
                                row.tmp = row.tmp || {};
                                row.tmp.locId = locationIdMap.get(
                                    row?.tmp?.locationKey,
                                );
                            }
                            break;

                        case 'dob':
                        case 'date_of_hire':
                            if (val === '') {
                                processedVal = '';
                            } else {
                                processedVal =
                                    this.commonDateService.DateTimeFormat(
                                        val,
                                        'YYYY-MM-DD',
                                        'MM-DD-YYYY',
                                    );
                            }
                            break;

                        case 'role_id':
                            processedVal =
                                await this.censusCommonService.getRoleId(val);
                            break;

                        case 'gender':
                            processedVal =
                                await this.censusCommonService.getGender(val);
                            break;

                        case 'country':
                            processedVal =
                                await this.censusCommonService.normalizeCountry(
                                    val,
                                );
                            break;

                        case 'on_insurance_plan':
                            processedVal =
                                await this.censusCommonService.normalizeYesNo(
                                    val,
                                );
                            break;

                        case 'is_camp_eligible':
                        case 'email_receiving':
                        case 'email_update':
                            processedVal =
                                await this.censusCommonService.toBooleanFlag(
                                    val,
                                );
                            break;

                        case 'address_2':
                            processedVal = row.address_2 ?? val;
                            break;
                    }

                    if (processedVal !== null && processedVal !== undefined) {
                        const compareKey =
                            key === 'address_2' ? 'address2' : key;
                        row.compare[compareKey] = processedVal;
                    }
                }
            }

            if (isCensusStatusEnabled && censusFieldMap.size > 0) {
                const censusFieldsWithNull = {};
                for (const [, fieldName] of censusFieldMap) {
                    censusFieldsWithNull[fieldName] = null;
                }
                for (const user of existingUsers) {
                    const userId = Number(user.id);
                    const customFields = userCustomFieldMap.get(userId) || {};
                    const mergedFields = {
                        ...censusFieldsWithNull,
                        ...customFields,
                    };
                    Object.assign(user, mergedFields);

                    const userCustomFieldsArray = userCustomFieldById[userId];
                    if (
                        userCustomFieldsArray &&
                        Object.keys(userCustomFieldsArray).length > 0
                    ) {
                        user.customFieldsArray = userCustomFieldsArray;
                    }
                }
            }
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Skip Process Matching Start',
                startTime,
            );
            const { updatedUsers, comboData } =
                await this.skipService.matchAndClassifyUsers(
                    existingUsers,
                    tableMapped,
                );
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Skip Process Matching End',
                startTime,
            );
            await this.censusCommonService.writeJsonFile(
                backupDirectory,
                updatedUsers,
                'process-data.json',
            );

            const skipOnly =
                tableMapped.length ===
                comboData.skipCount + comboData.rejectCount;
            const hasNewDepartment = comboData.newDepartment;
            const hasNewLocation = comboData.newLocation;

            let nextStep = 'import-user-process-sys';
            let requeststep: string = '4';
            if (skipOnly) {
                requeststep = '7';
                nextStep = 'import-user-process-create-file';
            } else if (hasNewDepartment) {
                requeststep = '2';
                nextStep = 'import-user-process-dept';
            } else if (hasNewLocation) {
                requeststep = '3';
                nextStep = 'import-user-process-loc';
            }

            await this.censusCommonService.updateRecordProgress(recordId, {
                requeststep,
                flage: requeststep,
            });
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End Skip Process',
                startTime,
            );
            await this.censusCommonService.uploadFileInBucket(
                backupDirectory + '/time.txt',
            );
            return { id: recordDetails.hash, next_step: nextStep };
        } catch (error: any) {
            if (error?.message !== 'ERR_RECORD_NOT_FOUND') {
                console.log(error);
                await this.censusCommonService.error_log(
                    0,
                    'import-user-process-skip',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
}
