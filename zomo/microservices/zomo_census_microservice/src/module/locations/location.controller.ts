import {
    appConstant,
    CommonArrayService,
    CommonService,
} from '@common-constants';
import { MessagePattern } from '@nestjs/microservices';
import { Controller } from '@nestjs/common';
import { LocationService } from './location.service';
import { CensusCommonService } from '../../common';
@Controller('location')
export class LocationController {
    constructor(
        private readonly locationService: LocationService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly censusCommonService: CensusCommonService,
    ) {}
    @MessagePattern({ cmd: 'import-user-process-loc' })
    async importUserProcessLoc(postData: any) {
        const startTime = Date.now();

        try {
            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '3',
                    '3',
                );

            const hashId = recordDetails?.hash;

            await this.censusCommonService.updateRecordProgress(hashId, {
                flage: '4',
            });

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start Location Process',
                startTime,
            );

            const tableMapped = await this.censusCommonService.loadJsonFile(
                `${backupDirectory}/process-data.json`,
            );

            const locationIdMap: Record<string, number> = {};

            for (const item of tableMapped) {
                const isNew =
                    item.__status !== 'skip' && item.__status !== 'reject';
                const locKey = item.tmp?.locationKey;
                const locMeta = item.tmp?.locationMeta;

                if (isNew && !item?.tmp?.locId && locKey && locMeta) {
                    const locId = await this.censusCommonService.getCachedId(
                        locKey,
                        locMeta,
                        locationIdMap,
                        this.locationService.findOne.bind(this.locationService),
                        this.locationService.save.bind(this.locationService),
                        this.locationService.update.bind(this.locationService),
                        () =>
                            this.commonService.userLocationValidDefaultCode(1),
                        (id) => this.commonService.generateCode('L', id),
                    );
                    if (locId) {
                        item.compare = item.compare || {};
                        item.compare.location = locId;

                        item.tmp = item.tmp || {};
                        item.tmp.locId = locId;
                    }
                }
            }

            await this.censusCommonService.writeJsonFile(
                backupDirectory,
                tableMapped,
                'process-data.json',
            );

            await this.censusCommonService.updateRecordProgress(hashId, {
                requeststep: '4',
            });
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End Location Process',
                startTime,
            );
            await this.censusCommonService.uploadFileInBucket(
                backupDirectory + '/time.txt',
            );
            return {
                id: recordDetails.hash,
                next_step: 'import-user-process-sys',
            };
        } catch (error) {
            if (error?.message !== 'ERR_RECORD_NOT_FOUND') {
                this.censusCommonService.error_log(
                    0,
                    'import-user-process-loc',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
}
