import { appConstant, CommonFileService, DashboardWidgetsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class DashboardWidgetsService {
    constructor(
        @InjectRepository(DashboardWidgetsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDashboardWidgetsRepository: Repository<DashboardWidgetsEntity>,
        @InjectRepository(DashboardWidgetsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDashboardWidgetsRepository: Repository<DashboardWidgetsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaDashboardWidgetsRepository.findOne({
            where: condition,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDashboardWidgetsRepository.create(data);
        return await this.writeReplicaDashboardWidgetsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDashboardWidgetsRepository.metadata);
        return await this.writeReplicaDashboardWidgetsRepository.createQueryBuilder('dashboard_widgets')
            .update(DashboardWidgetsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
