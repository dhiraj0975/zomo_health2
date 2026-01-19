import {
    CommonArrayService,
    CommonService
} from '@common-constants';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CensusCommonService } from '../../common';
import { ImportUserRequestService } from '../importuserrequest/importuserrequest.service';
import { UserSettingsService } from './usersettings.service';
@Controller('user/settings')
export class UserSettingsController {
    constructor(
        private readonly userSettingsService: UserSettingsService,
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly censusCommonService: CensusCommonService,
    ) {}
    @MessagePattern({ cmd: 'import-user-process-settings' })
    async importUserProcessSettings(postData: any) {
        const startTime = Date.now();

        try {
            // Fetch and validate the record once, avoiding repeated calls
            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '5',
                    '5',
                );
            const hashId = recordDetails?.hash;
            const companyId = recordDetails.org_id;

            // Update progress flag immediately
            await this.censusCommonService.updateRecordProgress(hashId, {
                flage: '6',
            });

            // Log start of process
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start System Process Settings',
                startTime,
            );

            // Load JSON once
            const tableMapped = await this.censusCommonService.loadJsonFile(
                `${backupDirectory}/process-data.json`,
            );

            let isCustomField = false;
            const userSettingDataList: any[] = [];

            for (const item of tableMapped) {
                if (
                    ['skip', 'reject'].includes(item.__status) ||
                    !item.userSettingData ||
                    Object.keys(item.userSettingData).length === 0
                )
                    continue;

                if (!isCustomField && item?.tmp?.is_custom_field) {
                    isCustomField = true;
                }

                userSettingDataList.push(item.userSettingData);
            }

            if (userSettingDataList.length > 0) {
                await this.userSettingsService.save(userSettingDataList);
            }

            // Write back the potentially modified JSON
            await this.censusCommonService.writeJsonFile(
                backupDirectory,
                tableMapped,
                'process-data.json',
            );



            const nextStep = isCustomField
                ? 'import-user-process-custom-field'
                : 'import-user-process-create-file';
            const step = isCustomField ? '6' : '7';

            await this.importUserRequestService.update(
                { hash: hashId },
                { requeststep: step, flage: step },
            );

            // Log end of process
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End System Process Settings',
                startTime,
            );
            await this.censusCommonService.uploadFileInBucket(
                backupDirectory + '/time.txt',
            );
            return {
                id: recordDetails.hash,
                next_step: nextStep,
            };
        } catch (error) {
            if (error?.message !== 'ERR_RECORD_NOT_FOUND') {
                this.censusCommonService.error_log(
                    0,
                    'import-user-process-settings',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
}
