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
}