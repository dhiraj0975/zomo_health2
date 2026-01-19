import {
    appConstant,
    BaseService,
    CommonFileService,
    MyPlanCompleteBlockEntity,
    CommonArrayService, MyPlanJoinUserPlanEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanCompleteBlockService extends BaseService<MyPlanCompleteBlockEntity> {
    constructor(
        @InjectRepository(
            MyPlanCompleteBlockEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaMyPlanCompleteBlockRepository: Repository<MyPlanCompleteBlockEntity>,
        @InjectRepository(
            MyPlanCompleteBlockEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaMyPlanCompleteBlockRepository: Repository<MyPlanCompleteBlockEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaMyPlanCompleteBlockRepository,
            writeReplicaMyPlanCompleteBlockRepository,
            'completeBlock',
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

            const queryBuilder = this.writeReplicaMyPlanCompleteBlockRepository.createQueryBuilder()
                .update(MyPlanCompleteBlockEntity);

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
