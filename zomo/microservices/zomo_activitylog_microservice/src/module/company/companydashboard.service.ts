import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyDashboardEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanyDashboardService {
    constructor(
        @InjectRepository(CompanyDashboardEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyDashboardRepository: Repository<CompanyDashboardEntity>,
        @InjectRepository(CompanyDashboardEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyDashboardRepository: Repository<CompanyDashboardEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCompanyDashboardRepository.create(data);
        return await this.writeReplicaCompanyDashboardRepository.save(savedResult);
    }
}
