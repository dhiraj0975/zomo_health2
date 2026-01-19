import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    MyPlanJoinUserPlanEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanJoinUserPlanService extends BaseService<MyPlanJoinUserPlanEntity> {
    constructor(
        @InjectRepository(
            MyPlanJoinUserPlanEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaMyPlanJoinUserPlanRepository: Repository<MyPlanJoinUserPlanEntity>,
        @InjectRepository(
            MyPlanJoinUserPlanEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaMyPlanJoinUserPlanRepository: Repository<MyPlanJoinUserPlanEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaMyPlanJoinUserPlanRepository,
            writeReplicaMyPlanJoinUserPlanRepository,
            'joinUserPlan',
            commonArrayService,
        );
    }

    async bulkUpdate(
        idField: string,
        data: Array<{[key: string]: any}>
    ) {
        try {
            if (!data || data.length === 0) return { affected: 0 };

            const ids = data.map(item => item[idField]);
            const sampleItem = data[0];
            const updateFields = Object.keys(sampleItem).filter(key => key !== idField);

            const queryBuilder = this.writeReplicaMyPlanJoinUserPlanRepository.createQueryBuilder()
                .update(MyPlanJoinUserPlanEntity);

            const setObject: any = {};

            updateFields.forEach(field => {
                const caseWhen = data.map(item =>
                    `WHEN ${idField} = ${item[idField]} THEN '${item[field]}'`
                ).join(' ');

                setObject[field] = () => `CASE ${caseWhen} ELSE ${field} END`;
            });

            return await queryBuilder
                .set(setObject)
                .where(`${idField} IN (:...ids)`, { ids })
                .execute();
        } catch (error) {
            throw new Error(`Failed to bulkUpdate: ${error}`);
        }
    }
}
