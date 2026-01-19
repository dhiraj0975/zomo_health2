import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    CompanyDashboardEntity
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
        private readonly commonFileService: CommonFileService,
    ) {
        super(
            readReplicaCompanyDashboardRepository,
            writeReplicaCompanyDashboardRepository,
            'companydashboard',
            commonArrayService,
        );
    }

    /**
     * Get image order list for billboard report
     */
    async getImageOrderList(companyId: number): Promise<any[]> {
        const condition = `dashboard.org_id = ${companyId} AND dashboard.square_img != '' AND dashboard.imglug_id = 1 AND dashboard.reference_id = 0 AND dashboard.imgopt_id = 1`;

        return await this.readReplicaCompanyDashboardRepository
            .createQueryBuilder('dashboard')
            .select(['dashboard.id', 'dashboard.image_order'])
            .where(condition)
            .orderBy('dashboard.image_order', 'ASC')
            .getMany();
    }
}