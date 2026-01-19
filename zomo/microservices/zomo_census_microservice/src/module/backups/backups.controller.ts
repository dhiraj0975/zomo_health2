import {
    appConstant,
    tableConstant,
    CommonDateService,
} from '@common-constants';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { In } from 'typeorm';
import { CompanyService } from '../companies/company.service';
import { CensusCustomFieldsValuesService } from '../censuscustomfieldsvalues/censuscustomfieldsvalues.service';
import { CensusCustomFieldsService } from '../censuscustomfields/censuscustomfields.service';
import { UserService } from '../user/user.service';
import { CensusCommonService } from '../../common';
import { appCensusConstant } from '../../constant';

@Controller('backup')
export class BackupController {
    constructor(
        private readonly censusCommonService: CensusCommonService,
        private readonly commonDateService: CommonDateService,
        private readonly companyService: CompanyService,
        private readonly censusCustomFieldsValuesService: CensusCustomFieldsValuesService,
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
        private readonly userService: UserService,
    ) {}

    @MessagePattern({ cmd: 'import-user-process-backup' })
    async importUserProcessBackup(@Payload() postData: any) {
        const startTime = Date.now();
        try {
            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '0',
                    '0',
                );

            await this.censusCommonService.updateRecordProgress(
                recordDetails?.hash,
                {
                    flage: '1',
                },
            );

            //const backupDirectory = `${appConstant.CENSUS_FILE_PATH}${recordDetails.org_id}/${recordDetails.id}`;

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start Backup Process',
                startTime,
            );

            const companyData = await this.companyService.findOne(
                `company.id = ${recordDetails.org_id}`,
                [tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],
                appCensusConstant.CENSUS_COMPANY_LIST,
            );
            if (!companyData) {
                await this.censusCommonService.error_log(
                    0,
                    'import-user-process-backup',
                    'ERR_RECORD_NOT_FOUND',
                    null,
                    postData,
                );
                return false;
            }
            const censusStatus = companyData?.companySetting?.census_status;
            const spouseOption = companyData?.companySetting?.spouse_option;

            const users: any[] = await this.userService.listRecord({
                org_id: recordDetails.org_id,
                role_id: In([2, 16]),
            });

            const censusFieldMap = new Map<number, string>();
            const userFieldValueMap = new Map<number, Record<string, any>>();
            const fieldTemplate: Record<string, string> = {};

            if (censusStatus === 1) {
                const censusFields =
                    await this.censusCustomFieldsService.listRecord(
                        ['id', 'title'],
                        { status: '1', organization_id: recordDetails.org_id },
                    );

                censusFields.forEach(({ id, title }) => {
                    censusFieldMap.set(id, title);
                    fieldTemplate[title] = '';
                });

                const rawValues =
                    await this.censusCustomFieldsValuesService.listRecord(
                        ['field_id', 'field_value', 'user_id'],
                        {
                            status: '1',
                            organization_id: recordDetails.org_id,
                            field_id: In([...censusFieldMap.keys()]),
                        },
                    );

                for (const { field_id, user_id, field_value } of rawValues) {
                    const title = censusFieldMap.get(field_id);
                    if (!title) continue;
                    const uid = Number(user_id);
                    if (!userFieldValueMap.has(uid)) {
                        userFieldValueMap.set(uid, {});
                    }
                    userFieldValueMap.get(uid)![title] = field_value;
                }
            }

            const getCountry = (val: any) =>
                typeof val === 'string'
                    ? val === 'United States'
                        ? 'USA'
                        : val
                    : '';

            const header = appConstant.HEADER_DATA;

            const backupJson = await Promise.all(
                users.map(async (user) => {
                    const values = userFieldValueMap.get(user.id) || {};
                    const isSpouse = user.role_id === appConstant.ROLE.SPOUSE;
                    const relationshipCode =
                        isSpouse && spouseOption === 1
                            ? 'Spouse / Domestic Partner'
                            : isSpouse
                              ? 'Spouse'
                              : '';

                    const loc = user.location ?? {};
                    const settings = user.settings ?? {};
                    let securitycode = user.securitycode;

                    if (securitycode?.length > 11) {
                        try {
                            securitycode = Buffer.from(securitycode, 'base64')
                                .toString()
                                .trim();
                        } catch {}
                    }

                    const row = {
                        [header.A]: user?.department?.dept_name || '',
                        [header.B]:
                            appCensusConstant.statusMap[user?.status] ||
                            'Terminated',
                        [header.C]: relationshipCode,
                        [header.D]: user?.relationship_id || '',
                        [header.E]: user?.role_id || '',
                        [header.F]: '',
                        [header.G]: user?.username || '',
                        [header.H]: user?.first_name || '',
                        [header.I]: user?.middle_name || '',
                        [header.J]: user?.last_name || '',
                        [header.K]: settings?.jobtitle || '',
                        [header.L]: securitycode || '',
                        [header.M]: user?.employeeid || '',
                        [header.N]:
                            appCensusConstant.genderMap[user?.gender] || '',
                        [header.O]: this.commonDateService.DateTimeFormat(
                            user?.dob,
                            'MM-DD-YYYY',
                        ),
                        [header.P]: this.commonDateService.DateTimeFormat(
                            user?.date_of_hire,
                            'MM-DD-YYYY',
                        ),
                        [header.Q]:
                            appCensusConstant.insuranceMap[
                                user?.on_insurance_plan?.toLowerCase?.()
                            ] || '',
                        [header.R]: user?.insurance_plan_name || '',
                        [header.S]: user?.email || '',
                        [header.T]: settings?.wphone || '',
                        [header.U]: settings?.wphone_ext || '',
                        [header.V]: loc?.lname || '',
                        [header.W]: loc?.address1 || '',
                        [header.X]: loc?.address2 || '',
                        [header.Y]: loc?.city || '',
                        [header.Z]: loc?.state || '',
                        [header.AA]: loc?.zip || '',
                        [header.AB]: getCountry(loc?.country),
                        [header.AC]: settings?.hphone || '',
                        [header.AD]: settings?.cphone || '',
                        [header.AE]: settings?.address || '',
                        [header.AF]: settings?.address2 || '',
                        [header.AG]: settings?.city || '',
                        [header.AH]: settings?.state || '',
                        [header.AI]: settings?.zip || '',
                        [header.AJ]: getCountry(settings?.country),
                        [header.AK]: user?.code || '',
                        [header.AL]: user?.is_camp_eligible ? 'Yes' : 'No',
                        [header.AM]: settings?.email_receiving ? 'Yes' : 'No',
                        [header.AN]: settings?.email_update ? 'Yes' : 'No',
                    };

                    return censusStatus === 1
                        ? { ...row, ...fieldTemplate, ...values }
                        : row;
                }),
            );

            await this.censusCommonService.writeJsonFile(
                backupDirectory,
                backupJson,
                'bkpdata.json',
            );

            await this.censusCommonService.updateRecordProgress(
                recordDetails?.hash,
                {
                    requeststep: '1',
                },
            );

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End Backup Process',
                startTime,
            );
            await this.censusCommonService.uploadFileInBucket(
                backupDirectory + '/time.txt',
            );
            return {
                id: recordDetails?.hash,
                next_step: 'import-user-process-skip',
            };
        } catch (error) {
            if (error?.message !== 'ERR_RECORD_NOT_FOUND') {
                await this.censusCommonService.error_log(
                    0,
                    'import-user-process-backup',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
}
