import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    HealthRequestEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class HealthRequestService {
    constructor(
        @InjectRepository(
            HealthRequestEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaHealthRequestRepository: Repository<HealthRequestEntity>,
        @InjectRepository(HealthRequestEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthRequestRepository: Repository<HealthRequestEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaHealthRequestRepository.metadata,
        );
        return await this.writeReplicaHealthRequestRepository
            .createQueryBuilder('hr')
            .update(HealthRequestEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOne(
        condition: any,
        fields: any[] = [],
        orderBy: any = null,
    ): Promise<HealthRequestEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaHealthRequestRepository.findOne({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(
        fields: any[] = [],
        condition: any,
        orderBy: any = null,
    ): Promise<HealthRequestEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaHealthRequestRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
