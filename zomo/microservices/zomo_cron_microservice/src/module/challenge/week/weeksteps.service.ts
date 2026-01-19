import {
    appConstant, BaseService,
    CommonArrayService,
    CommonFileService,
    WeeksStepsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class WeekStepsService extends BaseService<WeeksStepsEntity> {
    constructor(
        @InjectRepository(
            WeeksStepsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaWeeksStepsRepository: Repository<WeeksStepsEntity>,
        @InjectRepository(WeeksStepsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWeeksStepsRepository: Repository<WeeksStepsEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaWeeksStepsRepository, writeReplicaWeeksStepsRepository, 'weeksSteps', commonArrayService);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWeeksStepsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any = ['weeksSteps'],
        groupBy: any = null,
    ) {
        const queryBuilder = this.readReplicaWeeksStepsRepository
            .createQueryBuilder('weeksSteps')
            .where(condition);
        if (fields && fields.length > 0) {
            queryBuilder.select(fields.map(field => `weeksSteps.${field}`));
        }
        if (groupBy) {
            if (Array.isArray(groupBy)) {
                groupBy.forEach(group => queryBuilder.addGroupBy(`weeksSteps.${group}`));
            } else {
                queryBuilder.groupBy(`weeksSteps.${groupBy}`);
            }
        }
        if (orderBy) {
            Object.entries(orderBy).forEach(([key, value]) => {
                queryBuilder.addOrderBy(`weeksSteps.${key}`, value as 'ASC' | 'DESC');
            });
        } else {
            queryBuilder.orderBy('weeksSteps.id', 'DESC');
        }
        return await queryBuilder.getMany();
    }
}
