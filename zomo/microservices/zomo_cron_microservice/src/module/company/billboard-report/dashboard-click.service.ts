import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    CompaniesEntity,
    CompanyDashboardClickEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DashboardClickService extends BaseService<CompanyDashboardClickEntity> {
    constructor(
        @InjectRepository(
            CompanyDashboardClickEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanyDashboardClickRepository: Repository<CompanyDashboardClickEntity>,
        @InjectRepository(
            CompanyDashboardClickEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCompanyDashboardClickRepository: Repository<CompanyDashboardClickEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(
            readReplicaCompanyDashboardClickRepository,
            writeReplicaCompanyDashboardClickRepository,
            'companydashboardclick',
            commonArrayService,
        );
    }

    /**
     * Get aggregated click data with grouping
     */
    async getAggregatedClickData(condition: string): Promise<any[]> {
        return await this.readReplicaCompanyDashboardClickRepository
            .createQueryBuilder('dashboardClick')
            .select([
                'dashboardClick.user_id as user_id',
                'MAX(DATE_FORMAT(dashboardClick.created_date, "%m-%d-%Y %H:%i")) as created_date',
                'COUNT(dashboardClick.type) as total',
                'dashboardClick.type as type',
                'dashboardClick.source as source',
                'dashboardClick.ref_id as ref_id',
            ])
            .where(condition)
            .groupBy('dashboardClick.type')
            .addGroupBy('dashboardClick.ref_id')
            .addGroupBy('dashboardClick.user_id')
            .orderBy('dashboardClick.user_id')
            .addOrderBy('dashboardClick.type')
            .getRawMany();
    }
}