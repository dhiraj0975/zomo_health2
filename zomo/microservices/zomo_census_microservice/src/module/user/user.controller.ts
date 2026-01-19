import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { isEmail } from 'class-validator';
import { CensusCommonService } from '../../common';
import { appCensusConstant, isValidName, phonePattern } from '../../constant';
import { CensusCustomFieldsService } from '../censuscustomfields/censuscustomfields.service';
import { CompanyService } from '../companies/company.service';
import { ImportUserRequestService } from '../importuserrequest/importuserrequest.service';
import { UserSettingsService } from '../usersettings/usersettings.service';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly censusCommonService: CensusCommonService,
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly userSettingsService: UserSettingsService,
        private readonly commonFileService: CommonFileService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
    ) {}

    @MessagePattern({ cmd: 'import-user-process-sys' })
    async importUserProcessSys(postData: any) {
        const startTime = Date.now();
        try {
            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '4',
                    '4',
                );

            const companyId = recordDetails.org_id;
            const hashId = recordDetails?.hash;
            let is_user_setting = false;
            let is_custom_field = false;

            await this.censusCommonService.updateRecordProgress(hashId, {
                flage: '5',
            });

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start System Process',
                startTime,
            );

            const tableMapped = await this.censusCommonService.loadJsonFile(
                `${backupDirectory}/process-data.json`,
            );

            const companies = await this.companyService.findOne(
                { id: companyId },
                [tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],
                appCensusConstant.CENSUS_COMPANY_LIST,
            );
            if (!companies) throw new Error('ERR_RECORD_NOT_FOUND');

            const mappedHeader = JSON.parse(
                recordDetails.mapped_header || '{}',
            );

            const hasBA = mappedHeader.BA;
            const hasBB = mappedHeader.BB;
            const hasCA = mappedHeader.CA;
            const hasD = mappedHeader.D;

            let existingUserAllData = [];
            const exist_relationship_code_sheet = new Map<number, string>();
            const exist_relationship_code_sheet_emp = new Map<string, string>();
            let sheet_employee_id_exist = [];
            const all_relationship_code_sheet = new Map<string, string>();
            const existinguserlistcodewise = new Map<string, any>();

            if ((hasBA && hasBB) || hasCA || hasD) {
                existingUserAllData = await this.userService.listUDLCSRecords(
                    `user.org_id = '${companyId}' AND user.role_id IN (2,16)`,
                    { id: 'ASC' },
                    appConstant.CENSUS_USER_LIST,
                );

                for (const u of existingUserAllData) {
                    if (hasBA && hasBB) {
                        exist_relationship_code_sheet.set(u.id, u.code);
                    }
                    if (hasCA && u.employeeid) {
                        exist_relationship_code_sheet_emp.set(
                            u.employeeid,
                            u.code,
                        );
                    }
                    if ((hasD || hasCA) && u.relationship_id) {
                        all_relationship_code_sheet.set(
                            u.relationship_id,
                            u.code,
                        );
                    }
                    if (hasD || hasCA) {
                        existinguserlistcodewise.set(u.code, u);
                    }
                }

                if (hasCA) {
                    sheet_employee_id_exist = tableMapped
                        .map((row) => row['employeeid']?.trim())
                        .filter(Boolean);
                }
            }

            const fieldTitlesSet = new Set<string>();
            const fieldIdMap = new Map<string, number>();
            if (companies?.companySetting?.census_status === 1) {
                const fieldList =
                    await this.censusCustomFieldsService.listRecord(
                        ['title', 'id'],
                        {
                            status: 1,
                            organization_id: companyId,
                        },
                    );
                fieldList.forEach(({ title, id }) => {
                    fieldTitlesSet.add(title);
                    fieldIdMap.set(title, id);
                });
            }

            const importantFieldsSet = new Set(
                appCensusConstant.importantFieldsSet,
            );

            const zipSet = new Set<string>();
            for (const row of tableMapped) {
                if (row.__status !== 'skip' && row.__status !== 'reject') {
                    const zip = await this.censusCommonService.sanitizeAndTrim(
                        row['zip'],
                    );
                    if (zip) zipSet.add(zip);
                }
            }

            const timeZoneData =
                await this.censusCommonService.getTimeZoneDataFromZips(zipSet);

            const TimeZoneDataUS: Record<string, any> = {};
            const TimeZoneDataCA: Record<string, any> = {};

            for (const [zip, data] of Object.entries(timeZoneData)) {
                if (data.country === 'US') TimeZoneDataUS[zip] = data;
                else if (data.country === 'CA') TimeZoneDataCA[zip] = data;
            }

            const companySetting = companies?.companySetting;
            const lockUsername = companySetting?.lock_username;
            const resetPassword = recordDetails?.reset_password === 1;

            const cleanPartialErrorField = (
                item: any,
                field: string,
                code: number,
            ) => {
                const strReplaceArray = ['$', '*', '#', '@'];
                let cleanedValue = (item[field] || '').toString();
                for (const ch of strReplaceArray) {
                    cleanedValue = cleanedValue.replace(
                        new RegExp(`\\${ch}`, 'g'),
                        '',
                    );
                }
                const regex = /^[a-zA-Z0-9 \s `. ' -]+$/;
                if (regex.test(cleanedValue)) {
                    item[field] = cleanedValue;
                    item.partialUserError.push(code);
                    item.userError = item.userError.filter(
                        (c: number) => c !== code,
                    );
                }
            };

            const getStatusString = (val: any) =>
                val === 1 ? 'current' : val === 0 ? 'terminated' : '';

            const formatDateField = (val: any) =>
                this.commonDateService.DateTimeFormat(
                    val,
                    'MM-DD-YYYY',
                    'YYYY-MM-DD',
                );

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start System Other Process',
                startTime,
            );

            const userCodeSet = new Set<string>();
            const parentChildMap = new Map<number, any>();
            const employeeIdToCodeMap = new Map();
            const allValidationData = [];

            for (
                let currentIndex = 0;
                currentIndex < tableMapped.length;
                currentIndex++
            ) {
                const item = tableMapped[currentIndex];

                if (item.__status === 'skip' || item.__status === 'reject')
                    continue;

                item.userError = item.userError || [];
                item.partialUserError = item.partialUserError || [];
                if (item?.tmp?.invalid_code) {
                    item.userError.push(1064);
                    continue;
                }

                if (item?.linked_emp_id) {
                    const linkedCode = employeeIdToCodeMap.get(
                        item.linked_emp_id.trim(),
                    );
                    if (linkedCode) {
                        item.relationship_id = linkedCode ? linkedCode : '';
                        item.compare.relationship_id = linkedCode
                            ? linkedCode
                            : '';
                        item.relationship_code = 'spouse';
                    }
                }

                if (
                    item.tmp?.isSpouse &&
                    item.tmp?.parentRowIndex !== undefined
                ) {
                    const parentUser = parentChildMap.get(
                        item.tmp.parentRowIndex,
                    );

                    if (parentUser) {
                        const parentCode = parentUser.saveUserResult?.code;

                        if (parentCode) {
                            item.relationship_id = parentCode;
                            item.compare.relationship_id = parentCode;
                        }

                        if (
                            !item.existingUserRawResult &&
                            item.__status === 'new'
                        ) {
                            const baseFieldsToSync: (keyof typeof item.compare)[] =
                                [
                                    'employeeid',
                                    'department_id',
                                    'location',
                                    'gender',
                                    'status',
                                    'wphone',
                                    'wphone_ext',
                                    'hphone',
                                    'cphone',
                                    'country',
                                    'state',
                                    'city',
                                    'zip',
                                    'address',
                                    'address2',
                                ];
                            const shouldIncludeInsuranceFields =
                                (!!item.on_insurance_plan &&
                                    !!item.insurance_plan_name) ||
                                (!item.on_insurance_plan &&
                                    !item.insurance_plan_name);

                            const fieldsToSync: (keyof typeof item.compare)[] =
                                [
                                    ...baseFieldsToSync,
                                    ...(shouldIncludeInsuranceFields
                                        ? [
                                              'on_insurance_plan',
                                              'insurance_plan_name',
                                          ]
                                        : []),
                                ];
                            if (!item.tmp.locName) {
                                item.tmp.locName = parentUser.item.tmp.locName;
                            }
                            const parentCompare = parentUser.item.compare ?? {};
                            const parentItem = parentUser.item ?? {};
                            fieldsToSync.forEach((key) => {
                                if (
                                    (item.compare[key] == null ||
                                        item.compare[key] === undefined) &&
                                    parentCompare[key] != null
                                ) {
                                    item.compare[key] = parentCompare[key];
                                }
                                if (
                                    (item[key] == null ||
                                        item[key] === undefined) &&
                                    parentItem[key] != null
                                ) {
                                    item[key] = parentItem[key];
                                }
                            });
                            const suffix = 's';

                            if (typeof item.employeeid === 'string') {
                                item.employeeid += suffix;
                            }

                            if (typeof item.compare.employeeid === 'string') {
                                item.compare.employeeid += suffix;
                            }
                        }
                    }
                }

                const userCode = item.existingUserRawResult?.code ?? item.code;
                if (typeof userCode === 'string' && userCode.trim() !== '') {
                    if (userCodeSet.has(userCode)) {
                        item.userError.push(1066);
                    } else {
                        userCodeSet.add(userCode);
                    }
                }

                const userType = (item.role_id || '').toString().toLowerCase();
                const userResult = item.existingUserRawResult;
                if (userResult?.code && userResult) {
                    const roleIdStr = userResult.role_id?.toString();
                    const invalidRole = !['2', '16'].includes(roleIdStr);
                    const role2WithInvalidUserType =
                        roleIdStr === '2' &&
                        [
                            '16',
                            'spouse',
                            'domestic partner',
                            'spouse / domestic partner',
                        ].includes(userType);
                    const role16WithInvalidUserType =
                        roleIdStr === '16' &&
                        ['', '2', 'employee'].includes(userType);

                    if (
                        invalidRole ||
                        role2WithInvalidUserType ||
                        role16WithInvalidUserType
                    ) {
                        item.userError.push(1067);
                    }
                }

                if (item.userError.length === 0) {
                    const role2and16WithInvalidUserType = ![
                        '16',
                        'spouse',
                        'domestic partner',
                        'spouse / domestic partner',
                        '2',
                        'employee',
                        '',
                    ].includes(userType);
                    if (role2and16WithInvalidUserType) {
                        item.userError.push(1067);
                    }
                }

                for (const [code, field] of Object.entries(
                    appCensusConstant.partialErrorCodes,
                )) {
                    const numericCode = Number(code);
                    if (item.userError.includes(numericCode)) {
                        if (item.existingUserRawResult) {
                            item.partialUserError.push(numericCode);
                            item.userError = item.userError.filter(
                                (c) => c !== numericCode,
                            );
                            item[field] = item.existingUserRawResult?.[field];
                        } else if (
                            ['first_name', 'last_name'].includes(field)
                        ) {
                            cleanPartialErrorField(item, field, numericCode);
                        }
                    }
                }

                if (item.userError.length === 0) {
                    item.updatedFields = {};
                    const validateFields: string[] = [];
                    const compare = item.compare || {};
                    let sourceFields = Array.isArray(item.differenceField)
                        ? item.differenceField
                        : typeof compare === 'object'
                          ? Object.keys(compare)
                          : [];
                    if (!Array.isArray(item.differenceField)) {
                        const requiredFields = [
                            'first_name',
                            'last_name',
                            'dob',
                            'username',
                            'gender',
                            'email',
                        ];
                        sourceFields = Array.from(
                            new Set([...sourceFields, ...requiredFields]),
                        );
                    }

                    const homeFieldHandled = false;
                    const hasUser = !!userCode;
                    const existingUser = item.existingUserRawResult || false;

                    if (!existingUser && !sourceFields.includes('username')) {
                        sourceFields.push('username');
                    }

                    const simpleFields = new Set(
                        appCensusConstant.directAssignField,
                    );

                    for (const field of sourceFields) {
                        const value = compare[field];
                        if (simpleFields.has(field)) {
                            if (value !== undefined) {
                                item.updatedFields[field] = value;
                            }
                            continue;
                        }
                        switch (field) {
                            case 'status': {
                                const valLower =
                                    typeof value === 'string'
                                        ? value.toLowerCase()
                                        : value;
                                if (
                                    ['current', 'terminated'].includes(
                                        valLower,
                                    ) ||
                                    valLower === 1 ||
                                    valLower === 0
                                ) {
                                    item.updatedFields[field] = value;
                                } else {
                                    if (!item.userError.includes(1022))
                                        item.userError.push(1022);
                                }
                                break;
                            }
                            case 'on_insurance_plan':
                            case 'insurance_plan_name': {
                                const relCode = (
                                    item.compare?.on_insurance_plan || ''
                                ).toLowerCase();
                                const isRelCodeNo = ['no', 'n'].includes(
                                    relCode,
                                );
                                const isRelCodeYes = ['yes', 'y'].includes(
                                    relCode,
                                );
                                const isCompany804 = companyId === 804;

                                let updateMode = 'update';
                                let insurancePlanStatus = 'No';
                                const insurancePlanName =
                                    item.compare?.insurance_plan_name || '';

                                if (insurancePlanName || !isRelCodeNo) {
                                    updateMode = isRelCodeYes
                                        ? 'update'
                                        : 'spupdate';
                                    insurancePlanStatus =
                                        isCompany804 && isRelCodeNo
                                            ? 'No'
                                            : 'Yes';
                                } else if (
                                    hasUser &&
                                    !insurancePlanName &&
                                    relCode &&
                                    !isRelCodeNo
                                ) {
                                    updateMode = 'dpupdate';
                                    insurancePlanStatus = '';
                                }

                                if (
                                    ['update', 'spupdate'].includes(updateMode)
                                ) {
                                    item.updatedFields['on_insurance_plan'] =
                                        insurancePlanStatus;
                                    item.updatedFields['insurance_plan_name'] =
                                        insurancePlanName;
                                    if (updateMode === 'spupdate') {
                                        if (
                                            !item.partialUserError.includes(
                                                1030,
                                            )
                                        )
                                            item.partialUserError.push(1030);
                                    }
                                } else if (updateMode === 'dpupdate') {
                                    item.updatedFields['on_insurance_plan'] =
                                        existingUser.on_insurance_plan || '';
                                    item.updatedFields['insurance_plan_name'] =
                                        existingUser.insurance_plan_name || '';
                                    if (!item.partialUserError.includes(1030))
                                        item.partialUserError.push(1030);
                                }
                                break;
                            }
                            case 'hphone':
                            case 'cphone':
                            case 'wphone': {
                                const phone =
                                    typeof value === 'string'
                                        ? value.trim()
                                        : '';
                                const isValid =
                                    phone &&
                                    phone.length <= 15 &&
                                    phonePattern.test(phone);

                                let errorCode = 0;
                                if (field === 'cphone') errorCode = 1012;
                                else if (field === 'wphone') errorCode = 1007;
                                else if (field === 'hphone') errorCode = 1014;

                                if (isValid) {
                                    item.updatedFields[field] = phone;
                                    validateFields.push(field);
                                } else {
                                    if (
                                        !item.partialUserError.includes(
                                            errorCode,
                                        )
                                    ) {
                                        item.partialUserError.push(errorCode);
                                    }
                                    item.updatedFields[field] =
                                        hasUser && item.compare?.[field]
                                            ? item.compare[field]
                                            : '';
                                }
                                break;
                            }
                            case 'username': {
                                const rawUsername =
                                    item.compare?.username || item.username;

                                const sanitizedUsername = rawUsername
                                    ? rawUsername.replace(/[^A-Za-z0-9]/g, '')
                                    : '';
                                const shouldUpdate =
                                    sanitizedUsername &&
                                    hasUser &&
                                    existingUser &&
                                    sanitizedUsername !== existingUser.username;
                                if (shouldUpdate) {
                                    if (lockUsername === 0) {
                                        if (
                                            sanitizedUsername.length < 8 ||
                                            sanitizedUsername.length > 60
                                        ) {
                                            if (!item.userError.includes(1021))
                                                item.userError.push(1021);
                                        } else {
                                            item.updatedFields.username =
                                                sanitizedUsername;
                                            validateFields.push('username');
                                            if (
                                                existingUser &&
                                                sanitizedUsername ===
                                                    existingUser.username
                                            ) {
                                                if (
                                                    !item.partialUserError.includes(
                                                        1021,
                                                    )
                                                )
                                                    item.partialUserError.push(
                                                        1021,
                                                    );
                                                item.userError =
                                                    item.userError.filter(
                                                        (e) => e !== 1021,
                                                    );
                                            }
                                        }
                                    } else {
                                        if (!item.userError.includes(1021))
                                            item.userError.push(1021);
                                    }
                                } else if (existingUser) {
                                    item.updatedFields.username =
                                        existingUser.username;
                                }

                                if (
                                    !existingUser &&
                                    (!sanitizedUsername ||
                                        sanitizedUsername === '')
                                ) {
                                    const dobyear =
                                        this.commonDateService.getDateFormateChange(
                                            item.dob,
                                        );
                                    const firstNameCleaned =
                                        (item.compare['first_name'] || '')
                                            .toUpperCase()
                                            .match(/[A-Za-z0-9]/g) || [];

                                    const lastNameCleaned =
                                        (item.compare['last_name'] || '')
                                            .toUpperCase()
                                            .match(/[A-Za-z0-9]/g) || [];

                                    const autoGenerateUsername =
                                        await this.userService.threeTimeUserName(
                                            firstNameCleaned.join(''),
                                            lastNameCleaned.join(''),
                                            dobyear,
                                        );

                                    item.username = autoGenerateUsername;
                                    item.compare.username =
                                        autoGenerateUsername;
                                    item.updatedFields.username =
                                        autoGenerateUsername;
                                    validateFields.push('username');
                                    item.userError = item.userError.filter(
                                        (code) => code !== 1021,
                                    );
                                }

                                if (
                                    item.userError.includes(1021) &&
                                    existingUser
                                ) {
                                    item.updatedFields.username =
                                        existingUser.username;
                                    validateFields.push('username');
                                    if (!item.partialUserError.includes(1021))
                                        item.partialUserError.push(1021);
                                    item.userError = item.userError.filter(
                                        (code) => code !== 1021,
                                    );
                                }
                                if (
                                    !item.userError.includes(1021) &&
                                    !existingUser
                                ) {
                                    item.updatedFields.username =
                                        item.compare.username;
                                    validateFields.push('username');
                                }
                                break;
                            }
                            case 'first_name': {
                                if (
                                    value &&
                                    (userCode === '' || isValidName(value))
                                ) {
                                    item.updatedFields.first_name = value;
                                    validateFields.push('first_name');
                                } else {
                                    if (!item.userError.includes(1002))
                                        item.userError.push(1002);
                                    if (hasUser && existingUser) {
                                        item.updatedFields.first_name =
                                            existingUser.first_name;
                                        validateFields.push('first_name');
                                        if (
                                            !item.partialUserError.includes(
                                                1002,
                                            )
                                        )
                                            item.partialUserError.push(1002);
                                        item.userError = item.userError.filter(
                                            (code) => code !== 1002,
                                        );
                                    }
                                }
                                break;
                            }
                            case 'middle_name': {
                                if (value && isValidName(value)) {
                                    item.updatedFields.middle_name = value;
                                    validateFields.push('middle_name');
                                } else {
                                    if (!item.userError.includes(1008))
                                        item.userError.push(1008);
                                    if (hasUser && existingUser) {
                                        item.updatedFields.middle_name =
                                            existingUser.middle_name;
                                        validateFields.push('middle_name');
                                        if (
                                            !item.partialUserError.includes(
                                                1008,
                                            )
                                        )
                                            item.partialUserError.push(1008);
                                        item.userError = item.userError.filter(
                                            (code) => code !== 1008,
                                        );
                                    }
                                }
                                break;
                            }
                            case 'last_name': {
                                if (
                                    value &&
                                    (userCode === '' || isValidName(value))
                                ) {
                                    item.updatedFields.last_name = value;
                                    validateFields.push('last_name');
                                } else {
                                    if (!item.userError.includes(1003))
                                        item.userError.push(1003);
                                    if (hasUser && existingUser) {
                                        item.updatedFields.last_name =
                                            existingUser.last_name;
                                        validateFields.push('last_name');
                                        if (
                                            !item.partialUserError.includes(
                                                1003,
                                            )
                                        )
                                            item.partialUserError.push(1003);
                                        item.userError = item.userError.filter(
                                            (code) => code !== 1003,
                                        );
                                    }
                                }
                                break;
                            }
                            case 'employeeid': {
                                const empId = value || '';
                                const existingEmpId =
                                    existingUser.employeeid || '';
                                const isValid =
                                    empId.length >= 1 && empId.length <= 50;
                                const mismatch =
                                    hasUser && empId !== existingEmpId;
                                let assignValue = '';
                                let shouldValidate = false;

                                if (isValid) {
                                    if (!hasUser || mismatch) {
                                        assignValue = empId;
                                        shouldValidate = true;
                                    }
                                } else if (empId) {
                                    if (!item.userError.includes(1013))
                                        item.userError.push(1013);
                                    assignValue = empId;
                                } else if (
                                    !empId &&
                                    companySetting?.employee_id === 1 &&
                                    companySetting?.is_reqd_empid === 1
                                ) {
                                    if (!item.userError.includes(1038))
                                        item.userError.push(1038);
                                }

                                if (
                                    [1013, 1038].some((code) =>
                                        item.userError.includes(code),
                                    )
                                ) {
                                    if (
                                        hasUser &&
                                        existingUser &&
                                        (item.linked_emp_id || userCode)
                                    ) {
                                        item.updatedFields.employeeid =
                                            existingEmpId;
                                        validateFields.push('employeeid');

                                        [1013, 1038].forEach((code) => {
                                            if (item.userError.includes(code)) {
                                                if (
                                                    !item.partialUserError.includes(
                                                        code,
                                                    )
                                                )
                                                    item.partialUserError.push(
                                                        code,
                                                    );
                                                item.userError =
                                                    item.userError.filter(
                                                        (err) => err !== code,
                                                    );
                                            }
                                        });
                                    }
                                } else {
                                    item.updatedFields.employeeid =
                                        assignValue || existingEmpId;
                                    if (shouldValidate)
                                        validateFields.push('employeeid');
                                }
                                break;
                            }
                            case 'gender': {
                                const raw = (value || '').toString().trim();
                                const normalized = raw.toLowerCase();
                                const genderMap = {
                                    m: 'm',
                                    male: 'm',
                                    f: 'f',
                                    female: 'f',
                                    o: 'o',
                                    other: 'o',
                                };

                                if (
                                    raw &&
                                    !/[\'^£$%&*()}{@#~?><>,|=_+¬-]/.test(raw) &&
                                    genderMap[normalized]
                                ) {
                                    item.updatedFields['gender'] =
                                        genderMap[normalized];
                                } else if (userCode && existingUser?.gender) {
                                    item.updatedFields['gender'] =
                                        existingUser.gender;
                                    item.partialUserError.push(1005);
                                    item.userError = item.userError.filter(
                                        (code) => code !== 1005,
                                    );
                                } else {
                                    item.userError.push(1005);
                                }
                                break;
                            }
                            case 'relationship_code': {
                                const rel = (value || '').trim().toLowerCase();
                                const relationshipMapping = {
                                    spouse: { valInt: 16, valStr: 'Spouse' },
                                    'spouse / domestic partner': {
                                        valInt: 16,
                                        valStr: 'Spouse',
                                    },
                                    'domestic partner': {
                                        valInt: 16,
                                        valStr: 'Spouse',
                                    },
                                    other: { valInt: 17, valStr: 'Other' },
                                };

                                if (rel && relationshipMapping[rel]) {
                                    item.updatedFields['relationship_code'] =
                                        relationshipMapping[rel].valInt;
                                } else if (rel) {
                                    item.userError.push(1023);
                                }

                                if (
                                    item.userError.includes(1023) &&
                                    userCode &&
                                    existingUser?.relationship_code
                                ) {
                                    item.updatedFields['relationship_code'] =
                                        existingUser.relationship_code;
                                    item.partialUserError.push(1023);
                                    item.userError = item.userError.filter(
                                        (code) => code !== 1023,
                                    );
                                }
                                break;
                            }
                            case 'relationship_id': {
                                const relId = value?.trim();
                                const errorCodesToCheck = [1023, 1024, 1036];
                                if (relId) {
                                    if (userCode && userCode === relId) {
                                        item.userError.push(1036);
                                    } else if (
                                        item.relationship_code &&
                                        !item.userError.includes(1023)
                                    ) {
                                        if (item.linked_emp_id) {
                                            const existingRelUser =
                                                existinguserlistcodewise.get(
                                                    relId,
                                                );
                                            const existingUserRoleId =
                                                existingRelUser?.User?.role_id;

                                            if (!existingRelUser) {
                                                item.userError.push(1036);
                                            } else if (
                                                existingUserRoleId !== 2
                                            ) {
                                                item.userError.push(1036);
                                            }

                                            const mappedUserCode =
                                                all_relationship_code_sheet.get(
                                                    relId,
                                                );
                                            if (mappedUserCode !== undefined) {
                                                if (
                                                    userCode &&
                                                    mappedUserCode !== userCode
                                                ) {
                                                    item.userError.push(1036);
                                                } else {
                                                    item.updatedFields[
                                                        'relationship_id'
                                                    ] = relId;
                                                    validateFields.push(
                                                        'relationship_id',
                                                    );
                                                }
                                            } else {
                                                item.updatedFields[
                                                    'relationship_id'
                                                ] = relId;
                                                validateFields.push(
                                                    'relationship_id',
                                                );
                                            }
                                        }
                                    } else if (item.relationship_code) {
                                        item.userError.push(1023);
                                    }
                                } else if (item.relationship_code) {
                                    item.userError.push(1024);
                                }
                                if (
                                    errorCodesToCheck.some((code) =>
                                        item.userError.includes(code),
                                    )
                                ) {
                                    if (userCode && existingUser && relId) {
                                        item.updatedFields['relationship_id'] =
                                            existingUser['relationship_id'];
                                        validateFields.push('relationship_id');

                                        errorCodesToCheck.forEach((code) => {
                                            if (item.userError.includes(code)) {
                                                item.partialUserError.push(
                                                    code,
                                                );
                                                item.userError =
                                                    item.userError.filter(
                                                        (err) => err !== code,
                                                    );
                                            }
                                        });
                                    }
                                } else if (relId) {
                                    item.updatedFields['relationship_id'] =
                                        relId;
                                }
                                break;
                            }
                            case 'role_id':
                            case 'user_type': {
                                let rawUserType = String(item.role_id || '')
                                    .trim()
                                    .toLowerCase();
                                const relationshipId =
                                    item.relationship_id?.trim() || '';
                                const Ustatus = item.status?.trim() || '';
                                let rawRelationshipCode = (
                                    item.relationship_code || ''
                                ).toLowerCase();
                                let arrRoleId = '';
                                let arruserStatus = '';
                                let arrRelationshipId = '';
                                let arrRelationshipCode = '';

                                const validRelationshipCodes = [
                                    '',
                                    'spouse',
                                    'spouse / domestic partner',
                                    'domestic partner',
                                ];

                                if (rawUserType === 'domestic partner') {
                                    rawUserType = 'spouse / domestic partner';
                                    rawRelationshipCode =
                                        'spouse / domestic partner';
                                }

                                if (
                                    [
                                        'spouse',
                                        'spouse / domestic partner',
                                    ].includes(rawUserType)
                                ) {
                                    rawUserType = '16';
                                } else if (rawUserType === 'employee') {
                                    rawUserType = '';
                                }

                                rawUserType = rawUserType || '2';

                                if (rawUserType === '16') {
                                    if (
                                        validRelationshipCodes.includes(
                                            rawRelationshipCode,
                                        )
                                    ) {
                                        arrRoleId = '16';
                                    } else {
                                        item.userError.push(1025);
                                    }
                                } else if (rawUserType === '2') {
                                    if (
                                        rawRelationshipCode === 'spouse' ||
                                        !item.status
                                    ) {
                                        item.userError.push(1027);
                                    } else {
                                        arrRoleId =
                                            item.compare?.role_id || '2';
                                    }
                                } else if (
                                    rawUserType === '' &&
                                    (Ustatus === '' || !item.relationship_code)
                                ) {
                                    item.userError.push(1027);
                                } else if (
                                    rawUserType === '' &&
                                    !item.status &&
                                    !item.relationship_code
                                ) {
                                    arrRoleId = '2';
                                    arruserStatus = '1';
                                }

                                if (
                                    String(arrRoleId) === '2' &&
                                    ((rawRelationshipCode && relationshipId) ||
                                        !arrRoleId)
                                ) {
                                    item.userError.push(
                                        arrRoleId === '2' ? 1035 : 1039,
                                    );
                                } else {
                                    if (
                                        String(arrRoleId).toLowerCase() ===
                                        'employee'
                                    ) {
                                        arrRoleId = '2';
                                    }
                                    if (arrRoleId === '2') {
                                        arrRelationshipId = '';
                                        arrRelationshipCode = '0';
                                    }
                                }

                                if (rawUserType === '2') {
                                    item.relationship_code = '';
                                }

                                const errorCodes = [1025, 1027, 1035, 1039];
                                const hasErrors = errorCodes.some((code) =>
                                    item.userError.includes(code),
                                );

                                if (hasErrors) {
                                    if (
                                        userCode &&
                                        existingUser &&
                                        (item.linked_emp_id ||
                                            item.relationship_id)
                                    ) {
                                        item.updatedFields['role_id'] =
                                            existingUser?.['role_id'];
                                        item.updatedFields['relationship_id'] =
                                            existingUser?.['relationship_id'];
                                        item.updatedFields[
                                            'relationship_code'
                                        ] = existingUser?.['relationship_code'];

                                        errorCodes.forEach((code) => {
                                            if (item.userError.includes(code)) {
                                                item.partialUserError.push(
                                                    code,
                                                );
                                                item.userError =
                                                    item.userError.filter(
                                                        (err) => err !== code,
                                                    );
                                            }
                                        });
                                    }
                                } else {
                                    if (
                                        arruserStatus !== null &&
                                        arruserStatus !== undefined &&
                                        arruserStatus !== ''
                                    ) {
                                        item.updatedFields['status'] =
                                            arruserStatus;
                                    }

                                    if (
                                        arrRoleId !== null &&
                                        arrRoleId !== undefined &&
                                        arrRoleId !== ''
                                    ) {
                                        item.updatedFields['role_id'] =
                                            arrRoleId;
                                    }

                                    if (
                                        arrRelationshipId !== null &&
                                        arrRelationshipId !== undefined &&
                                        arrRelationshipId !== ''
                                    ) {
                                        item.updatedFields['relationship_id'] =
                                            arrRelationshipId;
                                    }

                                    if (
                                        arrRelationshipCode !== null &&
                                        arrRelationshipCode !== undefined &&
                                        arrRelationshipCode !== ''
                                    ) {
                                        item.relationship_code =
                                            arrRelationshipCode;
                                    }
                                }
                                break;
                            }
                            case 'id_of_direct_supervisor': {
                                const rawSupervisorId = value?.trim();
                                let arrSupervisorId = '';
                                let resolvedIdOfDirectSupervisor =
                                    rawSupervisorId;

                                const relCode = userCode?.trim();

                                if (rawSupervisorId && relCode) {
                                    if (rawSupervisorId === relCode) {
                                        arrSupervisorId = rawSupervisorId;
                                    } else {
                                        item.userError.push(1028);
                                    }
                                } else if (
                                    !rawSupervisorId &&
                                    relCode &&
                                    existingUser?.[relCode]
                                ) {
                                    arrSupervisorId = relCode;
                                    resolvedIdOfDirectSupervisor = relCode;
                                } else if (rawSupervisorId && !relCode) {
                                    item.userError.push(1028);
                                } else {
                                    arrSupervisorId = '';
                                    resolvedIdOfDirectSupervisor = '';
                                }

                                if (item.userError.includes(1028)) {
                                    if (
                                        userCode &&
                                        existingUser &&
                                        existingUser?.['supervisorId']
                                    ) {
                                        item.updatedFields['supervisor_id'] =
                                            existingUser?.['supervisorId'];
                                        item.updatedFields[
                                            'id_of_direct_supervisor'
                                        ] = resolvedIdOfDirectSupervisor;
                                        item.partialUserError.push(1028);
                                        item.userError = item.userError.filter(
                                            (err) => err !== 1028,
                                        );
                                    }
                                } else {
                                    item.updatedFields['supervisor_id'] =
                                        arrSupervisorId || '';
                                    item.updatedFields[
                                        'id_of_direct_supervisor'
                                    ] = resolvedIdOfDirectSupervisor || '';
                                }

                                break;
                            }
                            case 'date_of_hire': {
                                let rawDOH = item.date_of_hire?.trim();
                                const validDateFormat =
                                    /^(\d{2})[\/-](\d{2})[\/-](\d{4})$/;

                                if (!rawDOH || !validDateFormat.test(rawDOH)) {
                                    item.userError.push(1029);
                                    if (existingUser?.date_of_hire) {
                                        item.updatedFields['date_of_hire'] =
                                            existingUser.date_of_hire;
                                        item.partialUserError.push(1029);
                                        item.userError = item.userError.filter(
                                            (code) => code !== 1029,
                                        );
                                    }
                                } else {
                                    rawDOH = rawDOH.replace(/\//g, '-');
                                    item.updatedFields['date_of_hire'] =
                                        this.commonDateService.normalizeDates(
                                            rawDOH,
                                            'YYYY-MM-DD',
                                        );
                                }
                                break;
                            }
                            case 'email': {
                                const rawEmail =
                                    typeof value === 'string'
                                        ? value.trim()
                                        : '';
                                const existingEmail = existingUser?.email || '';
                                const isValid = isEmail(rawEmail);

                                if (!rawEmail || rawEmail === existingEmail) {
                                    item.updatedFields['email'] = existingEmail;
                                } else if (isValid) {
                                    item.updatedFields['email'] = rawEmail;
                                    validateFields.push('email');
                                } else if (existingEmail) {
                                    item.updatedFields['email'] = existingEmail;
                                    item.partialUserError.push(1006);
                                    item.userError = item.userError.filter(
                                        (e) => e !== 1006,
                                    );
                                    validateFields.push('email');
                                } else {
                                    item.userError.push(1006);
                                }
                                break;
                            }
                            case 'dob': {
                                const rawDob =
                                    typeof value === 'string'
                                        ? value.trim()
                                        : '';
                                const parsed = new Date(rawDob);
                                const isValid = !isNaN(parsed.getTime());
                                const eighteenYearsAgo = new Date();
                                eighteenYearsAgo.setFullYear(
                                    eighteenYearsAgo.getFullYear() - 18,
                                );

                                if (isValid && parsed <= eighteenYearsAgo) {
                                    item.updatedFields['dob'] = rawDob;
                                    validateFields.push('dob');
                                } else {
                                    item.userError.push(1004);
                                }
                                break;
                            }
                            case 'location': {
                                const rawLocation = item.location?.trim() || '';
                                const rawAddress1 =
                                    item.work_address_1?.trim() || '';
                                const rawAddress2 =
                                    item.work_address_2?.trim() || '';
                                const rawCity = item.work_city?.trim() || '';
                                const rawState = item.work_state?.trim() || '';
                                const rawZip = item.work_zip?.trim() || '';
                                const rawCountry =
                                    item.work_country?.trim() || '';

                                const hasAnyLocationInfo =
                                    rawLocation ||
                                    rawAddress1 ||
                                    rawAddress2 ||
                                    rawCity ||
                                    rawState ||
                                    rawZip ||
                                    rawCountry;

                                if (hasAnyLocationInfo) {
                                    const missingRequired =
                                        !rawLocation || !rawAddress1;

                                    if (missingRequired) {
                                        item.userError.push(1034);
                                    } else if (rawZip) {
                                        if (!item.tmp?.locationKey) {
                                            item.userError.push(1032);
                                        }
                                    } else if (
                                        rawCity ||
                                        rawState ||
                                        rawCountry
                                    ) {
                                        item.userError.push(1033);
                                    } else {
                                        item.userError.push(1032);
                                    }
                                }

                                if (item.userError.length === 0) {
                                    item.updatedFields['location'] =
                                        item.compare.location;
                                }
                                break;
                            }
                            case 'zip':
                            case 'country':
                            case 'state':
                            case 'city': {
                                if (!homeFieldHandled) {
                                    const homeZipPostalCode = compare.zip;
                                    const homeCity = compare.city;
                                    const homeStateProvince = compare.state;
                                    const homeCountry = compare.country?.trim();

                                    const usData =
                                        TimeZoneDataUS?.[homeZipPostalCode];
                                    const caData =
                                        TimeZoneDataCA?.[homeZipPostalCode];
                                    let userResolved = false;
                                    if (homeZipPostalCode) {
                                        if (usData) {
                                            item.updatedFields['country'] =
                                                'United States';
                                            item.updatedFields['state'] =
                                                usData.statecode;
                                            item.updatedFields['city'] =
                                                usData.city;
                                            item.updatedFields['zip'] =
                                                usData.zipcode;
                                            userResolved = true;
                                        } else if (caData) {
                                            item.updatedFields['country'] =
                                                'Canada';
                                            item.updatedFields['state'] =
                                                caData.statecode;
                                            item.updatedFields['city'] =
                                                caData.city;
                                            item.updatedFields['zip'] =
                                                caData.postalcode;
                                            userResolved = true;
                                        } else {
                                            item.userError.push(1011);
                                        }
                                    } else if (
                                        homeCity ||
                                        homeStateProvince ||
                                        homeCountry
                                    ) {
                                        item.userError.push(1065);
                                    }

                                    if (
                                        !userResolved &&
                                        (item.userError.includes(1011) ||
                                            item.userError.includes(1065))
                                    ) {
                                        if (
                                            userCode &&
                                            existingUser &&
                                            item.userError.includes(1006)
                                        ) {
                                            item.updatedFields['country'] =
                                                existingUser?.['country'];
                                            item.updatedFields['state'] =
                                                existingUser?.['state'];
                                            item.updatedFields['city'] =
                                                existingUser?.['city'];
                                            item.updatedFields['zip'] =
                                                existingUser?.['zip'];
                                        } else {
                                            const tryFallback = (key) => {
                                                const usArr =
                                                    TimeZoneDataUS?.[key];
                                                const caArr =
                                                    TimeZoneDataCA?.[key];
                                                if (Array.isArray(usArr))
                                                    return usArr[0];
                                                if (Array.isArray(caArr))
                                                    return caArr[0];
                                                return null;
                                            };

                                            const fallback =
                                                (homeCity &&
                                                    tryFallback(homeCity)) ||
                                                (homeStateProvince &&
                                                    tryFallback(
                                                        homeStateProvince,
                                                    )) ||
                                                (homeCountry &&
                                                    ((Array.isArray(
                                                        TimeZoneDataUS?.[
                                                            homeCountry
                                                        ],
                                                    ) &&
                                                        TimeZoneDataUS[
                                                            homeCountry
                                                        ][0]) ||
                                                        (homeCountry.toLowerCase() ===
                                                            'canada' &&
                                                            Array.isArray(
                                                                TimeZoneDataCA?.[0],
                                                            ) &&
                                                            TimeZoneDataCA[0][0])));

                                            if (fallback) {
                                                item.updatedFields['country'] =
                                                    fallback.country ||
                                                    'Canada';
                                                item.updatedFields['state'] =
                                                    fallback.statecode ||
                                                    fallback.provincecode ||
                                                    '';
                                                item.updatedFields['city'] =
                                                    fallback.city || '';
                                                item.updatedFields['zip'] =
                                                    fallback.zipcode ||
                                                    fallback.postalcode ||
                                                    '';
                                            } else {
                                                item.updatedFields['country'] =
                                                    '';
                                                item.updatedFields['state'] =
                                                    '';
                                                item.updatedFields['city'] = '';
                                                item.updatedFields['zip'] =
                                                    homeZipPostalCode || '';
                                            }
                                        }

                                        [1011, 1065].forEach((code) => {
                                            if (item.userError.includes(code)) {
                                                if (
                                                    !item.partialUserError.includes(
                                                        code,
                                                    )
                                                ) {
                                                    item.partialUserError.push(
                                                        code,
                                                    );
                                                }
                                                item.userError =
                                                    item.userError.filter(
                                                        (e) => e !== code,
                                                    );
                                            }
                                        });
                                    }
                                }

                                break;
                            }
                            default: {
                                if (fieldTitlesSet.has(field)) {
                                    if (!item.tmp?.is_custom_field) {
                                        item.tmp = item.tmp || {};
                                        item.tmp.is_custom_field = true;
                                    }
                                    item.censusSettingData =
                                        item.censusSettingData || [];
                                    const fieldId = fieldIdMap.get(field);
                                    if (fieldId) {
                                        const existingId =
                                            item.existingUserRawResult
                                                ?.customFieldsArray?.[
                                                `${fieldId}`
                                            ]?.id || null;
                                        const fieldValue = item[field];
                                        if (
                                            existingId !== null ||
                                            fieldValue !== null
                                        ) {
                                            item.censusSettingData.push({
                                                id: existingId,
                                                field_value: fieldValue,
                                                ...(existingId === null
                                                    ? { field_id: fieldId }
                                                    : {}),
                                            });
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    if (item.userError.length === 0) {
                        if (
                            item.existingUserRawResult?.user_id &&
                            item.updatedFields
                        ) {
                            item.updatedFields['id'] =
                                item.existingUserRawResult.user_id;
                        }

                        const conditionsArray: Record<string, any>[] = [];
                        for (const field of appCensusConstant.fieldsToCheckOr) {
                            if (
                                validateFields.includes(field) &&
                                item.updatedFields[field]
                            ) {
                                conditionsArray.push({
                                    [field]: item.updatedFields[field],
                                });
                            }
                        }

                        if (
                            validateFields.includes('employeeid') &&
                            item.updatedFields['employeeid'] &&
                            companyId
                        ) {
                            conditionsArray.push({
                                employeeid: item.updatedFields['employeeid'],
                                org_id: companyId,
                            });
                        }

                        if (conditionsArray.length > 0) {
                            item._validateFields = validateFields;
                            item._conditionsArray = conditionsArray;
                            allValidationData.push({
                                itemIndex: currentIndex,
                                conditions: conditionsArray,
                                updatedFields: item.updatedFields,
                            });
                        }
                    }
                }
            }

            const existingUsersMap = new Map();
            if (allValidationData.length > 0) {
                const allConditions = allValidationData.flatMap(
                    (v) => v.conditions,
                );

                try {
                    const checkUsers = await this.userService.findManySys(
                        allConditions,
                        appConstant.CENSUS_USER_LIST,
                    );

                    for (const user of checkUsers) {
                        const keys = [
                            user.username && `u:${user.username.toLowerCase()}`,
                            user.email && `e:${user.email.toLowerCase()}`,
                            user.dob && `d:${user.dob}`,
                            user.employeeid && `emp:${user.employeeid}`,
                        ].filter(Boolean);

                        keys.forEach((key) => {
                            existingUsersMap.set(key, user);
                        });
                    }
                } catch (error) {
                    console.log('Batch validation error:', error);
                }
            }

            const usersToCreate = [];
            const usersToUpdate = [];

            for (
                let currentIndex = 0;
                currentIndex < tableMapped.length;
                currentIndex++
            ) {
                const item = tableMapped[currentIndex];

                if (item.__status === 'skip' || item.__status === 'reject')
                    continue;

                if (item._conditionsArray && item.userError.length === 0) {
                    const updatedFields = item.updatedFields;
                    let foundConflict = false;

                    for (const condition of item._conditionsArray) {
                        const key = Object.keys(condition)[0];
                        const value = condition[key];
                        let lookupKey;

                        if (key === 'username')
                            lookupKey = `u:${value.toLowerCase()}`;
                        else if (key === 'email')
                            lookupKey = `e:${value.toLowerCase()}`;
                        else if (key === 'dob') lookupKey = `d:${value}`;
                        else if (key === 'employeeid')
                            lookupKey = `emp:${value}`;

                        if (lookupKey) {
                            const checkUser = existingUsersMap.get(lookupKey);
                            if (
                                checkUser &&
                                (!updatedFields.id ||
                                    checkUser.user_id !== updatedFields.id)
                            ) {
                                const errorCode =
                                    appCensusConstant.errorMap[key];
                                if (
                                    errorCode &&
                                    value.toLowerCase?.() ===
                                        checkUser[key]?.toLowerCase?.()
                                ) {
                                    item.userError.push(errorCode);
                                    foundConflict = true;
                                }
                            }
                        }
                    }

                    delete item._conditionsArray;
                    delete item._validateFields;
                }

                if (
                    item.userError.length === 0 &&
                    item?.tmp?.locationMeta?.zip &&
                    item?.tmp?.locationMeta?.country &&
                    (!item.differenceField ||
                        item.differenceField.includes('location'))
                ) {
                    item.updatedFields['timezone'] =
                        this.commonService.sanitize(
                            await this.commonDateService.getTimezoneFromZipcode(
                                item.tmp.locationMeta.zip,
                                item.tmp.locationMeta.country,
                            ),
                        );
                }

                if (
                    item.userError.length === 0 &&
                    item.existingUserRawResult?.code
                ) {
                    for (const code of Object.keys(
                        appCensusConstant.codeMap,
                    ).map(Number)) {
                        if (item.userError.includes(code)) {
                            item.partialUserError.push(code);
                            item.userError = item.userError.filter(
                                (item) => item !== code,
                            );
                            item.updatedFields[
                                appCensusConstant.codeMap[code]
                            ] =
                                item.existingUserRawResult?.code[
                                    appCensusConstant.codeMap[code]
                                ];
                        }
                    }
                }

                if (item.userError.length > 0) {
                    item.__status = 'reject';
                    item.ErrorCode = item.userError
                        .map((e) => `'${e}'`)
                        .join(', ');
                } else if (
                    item.existingUserRawResult &&
                    item.partialUserError.length > 0
                ) {
                    item.__status = 'partial';
                    item.ErrorCode = item.partialUserError
                        .map((e) => `'${e}'`)
                        .join(', ');
                } else if (item.existingUserRawResult) {
                    item.__status = 'update';
                    item.UpdatedCode = Object.keys(item.updatedFields)
                        .filter((key) => appCensusConstant.updateCodeMap[key])
                        .map(
                            (key) =>
                                `'${appCensusConstant.updateCodeMap[key]}'`,
                        )
                        .join(', ');
                } else {
                    item.__status = 'new';
                    if (item.partialUserError.length > 0) {
                        item.ErrorCode = item.partialUserError
                            .map((e) => `'${e}'`)
                            .join(', ');
                    }
                }

                if (['new', 'update', 'partial'].includes(item.__status)) {
                    if (!is_custom_field && item?.tmp?.is_custom_field)
                        is_custom_field = true;

                    item.userSettingData = {};
                    for (const key in item.updatedFields) {
                        if (importantFieldsSet.has(key)) {
                            item.userSettingData[key] = item.updatedFields[key];
                            delete item.updatedFields[key];
                        }
                    }

                    try {
                        const isExistingUser = !!item.existingUserRawResult?.id;
                        const hasUpdates =
                            item.updatedFields &&
                            Object.keys(item.updatedFields).length > 0;
                        const updatedFields = item.updatedFields || {};

                        if (isExistingUser && hasUpdates) {
                            if (
                                Object.keys(item.userSettingData || {}).length >
                                0
                            ) {
                                item.userSettingData['user_id'] =
                                    item.existingUserRawResult.user_id;
                                item.userSettingData['id'] =
                                    item.existingUserRawResult.sid;
                                if (!is_user_setting) is_user_setting = true;
                            }

                            delete updatedFields['relationship_code'];

                            if (
                                ((item.updatedFields?.status !== undefined &&
                                    item.updatedFields.status === 0) ||
                                    (item.updatedFields?.status === undefined &&
                                        item.existingUserRawResult?.status ===
                                            0)) &&
                                resetPassword
                            ) {
                                updatedFields['password'] = null;
                                updatedFields['new_password'] = null;
                            }

                            if (
                                'employeeid' in updatedFields &&
                                updatedFields.employeeid?.trim() !== ''
                            ) {
                                employeeIdToCodeMap.set(
                                    updatedFields.employeeid.trim(),
                                    item.existingUserRawResult?.code,
                                );
                            }

                            if (
                                Object.keys(updatedFields).length > 0 &&
                                !(
                                    Object.keys(updatedFields).length === 1 &&
                                    updatedFields['id']
                                )
                            ) {
                                updatedFields['id'] =
                                    item.existingUserRawResult.user_id;
                                usersToUpdate.push(updatedFields);
                            }
                        } else {
                            if (!is_user_setting) is_user_setting = true;

                            if (!updatedFields.department_id) {
                                updatedFields.department_id = item.tmp.deptId;
                                item.department_id = item.tmp.deptName;
                            }

                            if (!updatedFields.location) {
                                const loc = item.tmp.locName;
                                if (loc && typeof loc === 'object') {
                                    updatedFields.location = loc.id;
                                    item.location = loc.location_name || '';
                                    item.work_address_1 = loc.address1 || '';
                                    item.work_address_2 = loc.address2 || '';
                                    item.work_city = loc.city || '';
                                    item.work_state = loc.state || '';
                                    item.work_country = loc.country || '';
                                    item.work_zip = loc.zip || '';
                                }
                            }

                            if (item.role_id == null) updatedFields.role_id = 2;

                            const newUserFields = {
                                first_name: '',
                                middle_name: '',
                                last_name: '',
                                password: '',
                                dob: '2001-01-01',
                                num_login: 0,
                                relationship_id: '',
                                ...updatedFields,
                                code: await this.userService.generateUniqueCode(),
                                membership_code: companies?.code,
                                org_id: companies?.id,
                                companytype_id: 3,
                                user_type: 1,
                                on_current_census: 'Yes',
                                status:
                                    updatedFields.status &&
                                    updatedFields.status != 1
                                        ? 0
                                        : 1,
                                email_receiving:
                                    item.email_receiving?.toLowerCase() ===
                                    'yes'
                                        ? 1
                                        : 0,
                                email_update:
                                    item.email_update?.toLowerCase() === 'yes'
                                        ? 1
                                        : 0,
                            };

                            const saveUserResult =
                                await this.userService.create(newUserFields);

                            if (newUserFields.employeeid) {
                                exist_relationship_code_sheet_emp.set(
                                    newUserFields.employeeid,
                                    saveUserResult?.code,
                                );
                            }
                            if (newUserFields.code) {
                                existinguserlistcodewise.set(
                                    saveUserResult?.code,
                                    saveUserResult,
                                );
                            }
                            if (
                                newUserFields.relationship_id &&
                                saveUserResult?.code
                            ) {
                                all_relationship_code_sheet.set(
                                    newUserFields.relationship_id,
                                    saveUserResult.code,
                                );
                            }

                            item.existingUserRawResult = saveUserResult;
                            item.userSettingData['user_id'] =
                                saveUserResult?.['id'];

                            if (
                                item.employeeid &&
                                item.employeeid.trim() !== ''
                            ) {
                                employeeIdToCodeMap.set(
                                    item.employeeid.trim(),
                                    saveUserResult?.code,
                                );
                            }

                            if (
                                !item.tmp?.isSpouse &&
                                item.tmp?.isSpouseExist
                            ) {
                                parentChildMap.set(currentIndex, {
                                    saveUserResult,
                                    item,
                                });
                            }
                            item.userSettingData['cphone'] =
                                item.userSettingData?.['cphone'] || '';
                            item.__status = 'new';
                        }

                        if (
                            'email' in item &&
                            (item.email === '' || item.email === null) &&
                            item.existingUserRawResult?.email
                        ) {
                            item.email = item.existingUserRawResult.email;
                        }

                        const allFields = {
                            ...item.updatedFields,
                            ...item.userSettingData,
                        };

                        for (const key in allFields) {
                            const val = allFields[key];

                            switch (key) {
                                case 'status':
                                    item['status'] = getStatusString(val);
                                    break;

                                case 'dob':
                                case 'date_of_hire':
                                    item[key] = formatDateField(val);
                                    break;

                                case 'role_id':
                                    item[key] =
                                        val === 2
                                            ? 'Register'
                                            : val === 16
                                              ? 'Spouse'
                                              : val.toString();
                                    break;

                                case 'gender':
                                    item[key] =
                                        val === 'm'
                                            ? 'Male'
                                            : val === 'f'
                                              ? 'Female'
                                              : val === 'o'
                                                ? 'Other'
                                                : val?.toString();
                                    break;

                                case 'on_insurance_plan':
                                case 'country':
                                    item[key] = val;
                                    break;

                                default:
                                    break;
                            }
                        }
                    } catch (error) {
                        this.censusCommonService.error_log(
                            0,
                            'import-user-process-sys-user-store',
                            error?.message,
                            error,
                            item,
                        );
                    }
                }
            }

            if (usersToUpdate.length > 0) {
                try {
                    for (const userFields of usersToUpdate) {
                        await this.userService.save(userFields);
                    }
                } catch (error) {
                    console.log('Bulk update error:', error);
                }
            }
            await this.censusCommonService.writeJsonFile(
                backupDirectory,
                tableMapped,
                'process-data.json',
            );

            let requeststep = '7';
            let flage = '7';
            let next_step = 'import-user-process-create-file';

            if (is_user_setting) {
                requeststep = flage = '5';
                next_step = 'import-user-process-settings';
            } else if (is_custom_field) {
                requeststep = flage = '6';
                next_step = 'import-user-process-custom-field';
            }

            await this.censusCommonService.updateRecordProgress(hashId, {
                requeststep,
                flage,
            });

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End System Process',
                startTime,
            );

            await this.censusCommonService.uploadFileInBucket(
                backupDirectory + '/time.txt',
            );

            return {
                id: recordDetails.hash,
                next_step,
            };
        } catch (error) {
            if (error?.message !== 'ERR_RECORD_NOT_FOUND') {
                console.log('error', error);
                this.censusCommonService.error_log(
                    0,
                    'import-user-process-sys',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
}
