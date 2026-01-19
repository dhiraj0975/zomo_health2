import {
    appConstant,
    HealthReReportEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class HealthReReportService {
    constructor(
        @InjectRepository(
            HealthReReportEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaHealthReReportRepository: Repository<HealthReReportEntity>,
        @InjectRepository(HealthReReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthReReportRepository: Repository<HealthReReportEntity>,
    ) {}
    async save(data: any) {
        const savedResult =
            this.writeReplicaHealthReReportRepository.create(data);
        return await this.writeReplicaHealthReReportRepository.save(
            savedResult,
        );
    }
    async listRecord(condition: any) {
        const queryBuilder = this.readReplicaHealthReReportRepository
            .createQueryBuilder()
            .where(condition);
        const result = await queryBuilder.getMany();
        return result;
    }
}
