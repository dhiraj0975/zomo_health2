import {
    appConstant,
    BaseService,
    BioWeightEntity,
    CommonArrayService, EngagementComparisonReportsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EngagementComparisonService extends BaseService<EngagementComparisonReportsEntity>{
    constructor(
        @InjectRepository(EngagementComparisonReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEngagementComparisonRepository: Repository<EngagementComparisonReportsEntity>,
        @InjectRepository(EngagementComparisonReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEngagementComparisonRepository: Repository<EngagementComparisonReportsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaEngagementComparisonRepository, writeReplicaEngagementComparisonRepository, 'engagementComparison', commonArrayService);
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaEngagementComparisonRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async updateReport() {
        const result = await this.readReplicaEngagementComparisonRepository
            .createQueryBuilder('engagementComparison')
            .select('id')
            .where('created_date < NOW() - INTERVAL 2 HOUR')
            .andWhere('status = 2')
            .andWhere('total_download < 4')
            .limit(1)
            .getRawOne();
        if (!result) {
            return;
        }
        const idToUpdate = result.id;
        const mainQuery = this.writeReplicaEngagementComparisonRepository
            .createQueryBuilder()
            .update()
            .set({
                total_download: () => 'total_download + 1',
                status: 0,
            })
            .where('id = :id', { id: idToUpdate });
        await mainQuery.execute();
    }

    async save(data: any) {
        const savedResult = this.writeReplicaEngagementComparisonRepository.create(data);
        return await this.writeReplicaEngagementComparisonRepository.save(savedResult);
    }
}
