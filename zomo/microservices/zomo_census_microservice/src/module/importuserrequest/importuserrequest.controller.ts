import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { Controller, Inject } from '@nestjs/common';
import { ImportUserRequestService } from './importuserrequest.service';
import { CensusCommonService } from '../../common';
import { CompanyService } from '../companies/company.service';
import { UserService } from '../user/user.service';
import { CommunicationTemplateTextsService } from '../communication/communicationtemplatetexts.service';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { In } from 'typeorm';
import { CensusCustomFieldsService } from '../censuscustomfields/censuscustomfields.service';
import { appCensusConstant } from '../../constant';
@Controller('import-user-request')
export class ImportUserRequestController {
    constructor(
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly censusCommonService: CensusCommonService,
        private readonly companyService: CompanyService,
        private readonly commonFileService: CommonFileService,
        private readonly commonDateService: CommonDateService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly communicationTemplateTextsService: CommunicationTemplateTextsService,
        private readonly userService: UserService,
    ) {}
    @MessagePattern({ cmd: 'import-user-process-create-file' })
    async importUserProcessCreateFile(postData: any) {
        const startTime = Date.now();

        try {
            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '7',
                    '7',
                );

            const hashId = recordDetails?.hash;
            const orgId = recordDetails.org_id;
            const requestId = recordDetails.id;

            // Prepare paths
            /*const backupDir = path.join(
                appConstant.CENSUS_FILE_PATH,
                `${orgId}`,
                `${requestId}`,
            );*/
            const directory = `userimport/${orgId}/${requestId}`;

            await this.censusCommonService.updateRecordProgress(hashId, {
                flage: '8',
            });

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start System Process Create File',
                startTime,
            );

            const [tableMapped, company] = await Promise.all([
                this.censusCommonService.loadJsonFile(
                    `${backupDirectory}/process-data.json`,
                ),
                this.companyService.findOne(
                    { id: orgId },
                    [tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],
                    appCensusConstant.CENSUS_COMPANY_LIST,
                ),
            ]);

            // Initialize caseResults buckets
            const caseResults: Record<string, any[]> = {
                skip: [],
                reject: [],
                new: [],
                partial: [],
                update: [],
                terminate: [],
            };

            const existingUserIds: number[] = [];
            const census_upload_type = recordDetails.census_upload_type;
            // Categorize items efficiently
            for (const item of tableMapped) {
                if (
                    census_upload_type === 1 &&
                    item?.existingUserRawResult?.id
                ) {
                    existingUserIds.push(item.existingUserRawResult.id);
                }
                const status = item.__status;

                if (status === 'skip') {
                    delete item.__status;
                    delete item.tmp;
                    delete item.existingUserRawResult;
                }

                if (caseResults[status]) {
                    caseResults[status].push(item);
                    if (status === 'partial') caseResults.update.push(item);
                }
            }

            if (census_upload_type === 1 && existingUserIds.length > 0) {
                const roleMap = {
                    0: [2, 16],
                    1: [2],
                    2: [16],
                };

                const roleIds =
                    roleMap[recordDetails.census_upload_type_on] || [];

                if (roleIds.length === 0) {
                    return [];
                }

                const userConditions: string[] = [];
                userConditions.push(`User.org_id = '${orgId}'`);
                userConditions.push(`User.status = 1`);

                if (existingUserIds.length > 0) {
                    const excluded = existingUserIds.join(',');
                    userConditions.push(`User.id NOT IN (${excluded})`);
                }

                if (roleIds.length > 0) {
                    const roles = roleIds.join(',');
                    userConditions.push(`User.role_id IN (${roles})`);
                }

                const condition = userConditions.join(' AND ');

                const terminatedUsers =
                    await this.userService.listTerminateRecords(
                        condition,
                        { id: 'ASC' },
                        appCensusConstant.CENSUS_TERMINATE_USER_LIST,
                    );

                if (terminatedUsers?.length) {
                    const spouseOptionIsOne =
                        company?.companySetting?.spouse_option === 1;

                    const formatted = terminatedUsers.map((u: any) => {
                        const relCode =
                            u.role_id === 16
                                ? spouseOptionIsOne
                                    ? 'Spouse / Domestic Partner'
                                    : 'Spouse'
                                : null;

                        return {
                            department_id: u.department?.dept_name ?? null,
                            status: 'Terminated',
                            relationship_code: relCode,
                            relationship_id: u.relationship_id ?? null,
                            role_id: String(u.role_id === 16 ? 'Spouse' : ''),
                            id_of_direct_supervisor: '',
                            username: u.username,
                            first_name: u.first_name,
                            middle_name: u.middle_name,
                            last_name: u.last_name,
                            jobtitle: u.settings?.jobtitle ?? null,
                            securitycode:
                                this.censusCommonService.decodeSecurityCode(
                                    u.securitycode,
                                ),
                            employeeid: u.employeeid?.toString().trim() ?? null,
                            gender:
                                u.gender === 'm'
                                    ? 'Male'
                                    : u.gender === 'f'
                                      ? 'Female'
                                      : '',
                            dob: u.dob
                                ? this.commonDateService
                                      .getTodayDate(u.dob)
                                      .format('MM-DD-YYYY')
                                : null,
                            date_of_hire: u.date_of_hire
                                ? this.commonDateService
                                      .getTodayDate(u.date_of_hire)
                                      .format('MM-DD-YYYY')
                                : null,
                            on_insurance_plan:
                                this.censusCommonService.formatYesNo(
                                    u.on_insurance_plan,
                                ),
                            insurance_plan_name: u.insurance_plan_name ?? null,
                            email: u.email,
                            wphone: u.settings?.wphone,
                            wphone_ext: u.settings?.wphone_ext,
                            location: u.location?.lname,
                            work_address_1: u.location?.address1,
                            work_address_2: u.location?.address2,
                            work_city: u.location?.city,
                            work_state: u.location?.state,
                            work_zip: u.location?.zip,
                            work_country:
                                u.location?.country === 'United States'
                                    ? 'USA'
                                    : u.location?.country,
                            hphone: u.settings?.hphone,
                            cphone: u.settings?.cphone,
                            address: u.settings?.address,
                            address_2: u.settings?.address2,
                            city: u.settings?.city,
                            state: u.settings?.state,
                            zip: u.settings?.zip,
                            country:
                                u.settings?.country === 'United States'
                                    ? 'USA'
                                    : u.settings?.country,
                            code: u.code,
                            is_camp_eligible:
                                u.is_camp_eligible == 1 ? 'Yes' : 'No',
                            email_receiving:
                                u.settings?.email_receiving == 1 ? 'Yes' : 'No',
                            email_update:
                                u.settings?.email_update == 1 ? 'Yes' : 'No',
                        };
                    });

                    caseResults.terminate.push(...formatted);

                    // Bulk update statuses
                    if (terminatedUsers.length) {
                        await this.userService.updateStatusByIds(
                            terminatedUsers.map((u: any) => u.id),
                            0,
                        );
                    }
                }
            }

            // Step 3: Prepare headers
            const mappedHeader = JSON.parse(recordDetails?.mapped_header);
            let table_header_data = {
                ...appConstant.table_HEADER_DATA,
                ...appConstant.table_SPOUSE_HEADER_DATA,
                ...appConstant.table_LINKED_HEADER_DATA,
            };
            let headerData = appConstant.table_HEADER_DATA;
            let csvHeaderData = appConstant.GENERAL_HEADER_DATA;

            if (company?.companySetting?.census_status === 1) {
                const census_mapping: Record<string, string> = {};
                const census_report_field =
                    await this.censusCustomFieldsService.listRecord(
                        ['title', 'id'],
                        { status: 1, organization_id: orgId },
                    );
                census_report_field.forEach((field) => {
                    census_mapping[`Z${field.id}`] = field.title;
                });
                table_header_data = { ...table_header_data, ...census_mapping };
                headerData = { ...headerData, ...census_mapping };
                csvHeaderData = { ...csvHeaderData, ...census_mapping };
            }

            const csvFilePaths: Record<string, string | null> = {};

            // Process each category concurrently
            await Promise.all(
                Object.entries(caseResults).map(async ([status, records]) => {
                    if (!records.length) return;

                    const title =
                        status.charAt(0).toUpperCase() + status.slice(1);
                    const timestamp = this.commonDateService
                        .getTodayDate(new Date())
                        .format('MM-DD-YYYYHHmmss');
                    const jsonName = `${title}-Records-${timestamp}.json`;
                    const csvName = `${title}-Records-${timestamp}.csv`;

                    try {
                        const jsonData =
                            await this.commonFileService.createJsonFileV1(
                                records,
                                mappedHeader,
                            );

                        const amKey =
                            status === 'partial' ||
                            status === 'reject' ||
                            status === 'new'
                                ? 'ErrorCode'
                                : status === 'update'
                                  ? 'UpdatedCode'
                                  : undefined;

                        let reversed =
                            await this.commonFileService.reverseMapSheetData(
                                records,
                                amKey
                                    ? { ...headerData, AM: amKey }
                                    : headerData,
                                'reversed_header',
                            );

                        reversed =
                            await this.commonFileService.reverseMapSheetData(
                                reversed,
                                amKey
                                    ? { ...csvHeaderData, AM: amKey }
                                    : csvHeaderData,
                            );

                        await Promise.all([
                            this.commonFileService.writeFile(
                                backupDirectory,
                                JSON.stringify(jsonData),
                                jsonName,
                            ),
                            this.commonFileService.writeFile(
                                backupDirectory,
                                JSON.stringify(reversed),
                                csvName,
                            ),
                        ]);

                        const jsonPath = path.resolve(
                            backupDirectory,
                            jsonName,
                        );
                        const csvPath = path.resolve(backupDirectory, csvName);

                        const conversion =
                            await this.commonFileService.createJsonToFile(
                                1,
                                csvPath,
                                'pythonjsontocsv.py',
                            );
                        if ((conversion as any)?.status !== 'success')
                            throw new Error('CSV conversion failed');

                        const exists =
                            await this.commonFileService.fileExist(csvPath);
                        if (!exists) throw new Error('Converted CSV not found');

                        await Promise.all([
                            lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'upload_file' },
                                    {
                                        path: csvPath,
                                        filename: `${directory}/${csvName}`,
                                        userBucket: 'private',
                                        isRemove: false,
                                    },
                                ),
                            ),
                            lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'upload_file' },
                                    {
                                        path: jsonPath,
                                        filename: `${directory}/${jsonName}`,
                                        userBucket: 'private',
                                        isRemove: false,
                                    },
                                ),
                            ),
                        ]);

                        csvFilePaths[status] = `${directory}/${csvName}`;
                    } catch {
                        // silently continue on error without logs
                    }
                }),
            );

            // Step 4: Update DB with counts and paths
            const counts = {
                created_count: caseResults.new.length,
                updated_count: caseResults.update.length,
                rejected_count: caseResults.reject.length,
                terminated_count: caseResults.terminate.length,
                partial_count: caseResults.partial.length,
                skip_count: caseResults.skip.length,
            };

            const filePathsUpdate = Object.entries(csvFilePaths).reduce(
                (acc, [key, val]) => {
                    let newKey: string;
                    switch (key) {
                        case 'reject':
                            newKey = 'rejected';
                            break;
                        case 'update':
                            newKey = 'updated';
                            break;
                        case 'new':
                            newKey = 'created';
                            break;
                        case 'terminate':
                            newKey = 'terminated';
                            break;
                        default:
                            newKey = key; // skip, partial, or anything else stays the same
                    }

                    acc[`${newKey}_file`] = val || null;
                    return acc;
                },
                {} as Record<string, string | null>,
            );

            const notify =
                recordDetails.user_notify === 1 ||
                recordDetails.cuser_notify === 1;
            const nextStep =
                (counts.created_count > 0 || counts.updated_count > 0) && notify
                    ? 'import-user-process-email'
                    : 'finish';

            await this.importUserRequestService.update(
                { hash: hashId },
                {
                    ...counts,
                    ...filePathsUpdate,
                    requeststep: nextStep === 'finish' ? '9' : '8',
                    flage: nextStep === 'finish' ? '9' : '8',
                    status: nextStep === 'finish' ? 1 : undefined,
                },
            );
            if (
                nextStep === 'finish' &&
                recordDetails.email &&
                this.commonFileService.userSheetValidation(
                    recordDetails.email,
                    'email',
                )
            ) {
                const template =
                    await this.communicationTemplateTextsService.findOne({
                        org_id: In([orgId, 0]),
                        type: 26,
                    });
                if (template) {
                    template['new_text'] =
                        (await this.onmapUrlContent(
                            template?.['new_text'],
                            'mailTemplate',
                        )) || template?.['text'];
                }
                const emailDetails = {
                    receiver: recordDetails.email,
                    subject: 'Your Import User Request Completed.',
                    template: template?.new_text || template?.text,
                    content: {
                        type: 26,
                        emailtext: 'Your census is uploaded successfully...',
                        orgAdminName: 'Sir/Madam',
                        url: 'import_user_request',
                    },
                };

                await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'send_email' },
                        emailDetails,
                    ),
                );
                await this.censusCommonService.logElapsedTime(
                    backupDirectory,
                    'End System Process Create File Send Mail To Org Admin',
                    startTime,
                );
            }
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End System Process Create File',
                startTime,
            );
            await this.censusCommonService.uploadFileInBucket(
                backupDirectory + '/time.txt',
            );
            return { id: recordDetails.hash, next_step: nextStep };
        } catch (error) {
            if (error?.message !== 'ERR_RECORD_NOT_FOUND') {
                this.censusCommonService.error_log(
                    0,
                    'import-user-process-create-file',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
    async onmapUrlContent(
        content: string | null | undefined,
        type: string = '',
    ): Promise<string> {
        if (!content) return '';
        const userDomain: string = 'https://' + process.env.DOMAIN;
        const domains: string[] = appConstant.DOMAINS_LIST;
        if (type == 'mailTemplate') {
            domains.push('{{IMAGE_BASE_URL}}');
        }
        // Create one regex pattern to match all domains
        const pattern = new RegExp(
            '(' +
                domains
                    .map((domain) =>
                        domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
                    ) // Escape special characters
                    .join('|') +
                ')',
            'gi',
        );
        return content.replace(pattern, userDomain);
    }
}
