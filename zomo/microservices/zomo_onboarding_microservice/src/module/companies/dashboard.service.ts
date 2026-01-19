import {
    appConstant,
    CommonArrayService,
    CompanyDashboardEntity,
    BaseService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class DashboardService extends BaseService<CompanyDashboardEntity> {
    constructor(
        @InjectRepository(
            CompanyDashboardEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanyDashboardRepository: Repository<CompanyDashboardEntity>,
        @InjectRepository(
            CompanyDashboardEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCompanyDashboardRepository: Repository<CompanyDashboardEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaCompanyDashboardRepository,
            writeReplicaCompanyDashboardRepository,
            'company_dashboard',
            commonArrayService,
        );
    }
}