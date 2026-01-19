import {
    appConstant,
    CommonArrayService,
    CommonService,
} from '@common-constants';
import { MessagePattern } from '@nestjs/microservices';
import { Controller } from '@nestjs/common';
import { DepartmentService } from './department.service';

import { CensusCommonService } from '../../common';
@Controller('department')
export class DepartmentController {
    constructor(
        private readonly departmentService: DepartmentService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly censusCommonService: CensusCommonService,
    ) {}
    @MessagePattern({ cmd: 'import-user-process-dept' })
    async importUserProcessDept(postData: any) {
        const startTime = Date.now();
        try {
            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '2',
                    '2',
                );

            const hashId = recordDetails?.hash;
            const orgId = recordDetails.org_id;
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start Department Process',
                startTime,
            );

            await this.censusCommonService.updateRecordProgress(hashId, {
                flage: '3',
            });

            const tableMapped = await this.censusCommonService.loadJsonFile(
                `${backupDirectory}/process-data.json`,
            );

            const deptIdMap: Record<string, number> = {};
            let newLocation = false;

            for (const item of tableMapped) {
                const isNew =
                    item.__status !== 'skip' && item.__status !== 'reject';
                const deptName = item.department_id?.trim();

                if (
                    isNew &&
                    item?.tmp?.locationKey &&
                    (!item?.tmp?.locId || item.tmp.locId === '')
                ) {
                    newLocation = true;
                }

                if (
                    isNew &&
                    deptName &&
                    (!item?.tmp?.deptId || item.tmp.deptId === '')
                ) {
                    const deptId = await this.censusCommonService.getCachedId(
                        deptName,
                        {
                            company_id: orgId,
                            default_dept: 'NO',
                            dept_name: deptName,
                            deleted: 0,
                        },
                        deptIdMap,
                        this.departmentService.findOne.bind(
                            this.departmentService,
                        ),
                        this.departmentService.save.bind(
                            this.departmentService,
                        ),
                        this.departmentService.update.bind(
                            this.departmentService,
                        ),
                        () =>
                            this.commonService.userDepartmentValidDefaultCode(
                                1,
                            ),
                        (id) => this.commonService.generateCode('D', id),
                    );

                    if (deptId) {
                        item.compare = item.compare || {};
                        item.compare.department_id = deptId;
                        item.tmp = item.tmp || {};
                        item.tmp.deptId = deptId;
                    }
                }
            }

            await this.censusCommonService.writeJsonFile(
                backupDirectory,
                tableMapped,
                'process-data.json',
            );

            const nextStep = newLocation
                ? 'import-user-process-loc'
                : 'import-user-process-sys';

            const isLocationStep = nextStep === 'import-user-process-loc';

            await this.censusCommonService.updateRecordProgress(hashId, {
                requeststep: isLocationStep ? '3' : '4',
                flage: isLocationStep ? '3' : '4',
            });

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End Department Process',
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
                    'import-user-process-dept',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
}
