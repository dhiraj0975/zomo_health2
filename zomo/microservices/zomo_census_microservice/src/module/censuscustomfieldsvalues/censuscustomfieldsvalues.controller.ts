import { appConstant, CommonArrayService } from '@common-constants';
import { Controller } from '@nestjs/common';
import { CensusCustomFieldsValuesService } from './censuscustomfieldsvalues.service';
import { CensusCommonService } from '../../common';
import { MessagePattern } from '@nestjs/microservices';
@Controller('company/census-custom-fields-values')
export class CensusCustomFieldsValuesController {
    constructor(
        private readonly censusCustomFieldsValuesService: CensusCustomFieldsValuesService,
        private readonly commonArrayService: CommonArrayService,
        private readonly censusCommonService: CensusCommonService,
    ) {}
    @MessagePattern({ cmd: 'import-user-process-custom-field' })
    async importUserProcessCustomField(postData: any) {
        const startTime = Date.now();

        try {
            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '6',
                    '6',
                );
            const hashId = recordDetails?.hash;
            const companyId = recordDetails.org_id;
            const userId = recordDetails.user_id;

            await this.censusCommonService.updateRecordProgress(hashId, {
                flage: '7',
            });

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start System Process Custom Field',
                startTime,
            );

            const tableMapped = await this.censusCommonService.loadJsonFile(
                `${backupDirectory}/process-data.json`,
            );
            const recordsToSave: any[] = [];

            for (const item of tableMapped) {
                if (!item.tmp?.is_custom_field) continue;

                for (const record of item.censusSettingData || []) {
                    const recordId = String(record.id);
                    const isNewRecord =
                        !recordId || recordId === 'null' || record.id === null;

                    if (isNewRecord) {
                        record.user_id = item.existingUserRawResult.user_id;
                        record.organization_id = companyId;
                        record.created_by = userId;
                        record.updated_by = userId;
                    } else {
                        record.updated_by = userId;
                    }

                    const emptyValues = [null, 'null', '', undefined];
                    if (emptyValues.includes(record.field_value)) {
                        recordsToSave.push({ id: record.id, status: 2 });
                    } else {
                        recordsToSave.push(record);
                    }
                }
            }

            if (recordsToSave.length > 0) {
                await this.censusCustomFieldsValuesService.save(recordsToSave);
            }

            await this.censusCommonService.writeJsonFile(
                backupDirectory,
                tableMapped,
                'process-data.json',
            );

            await this.censusCommonService.updateRecordProgress(hashId, {
                requeststep: '7',
                flage: '7',
            });
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End System Process Custom Field',
                startTime,
            );
            await this.censusCommonService.uploadFileInBucket(
                backupDirectory + '/time.txt',
            );
            return {
                id: recordDetails.hash,
                next_step: 'import-user-process-create-file',
            };
        } catch (error) {
            if (error?.message !== 'ERR_RECORD_NOT_FOUND') {
                this.censusCommonService.error_log(
                    0,
                    'import-user-process-custom-field',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
}
