import {
    appConstant,
    CompaniesEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CompanyService extends BaseService<CompaniesEntity> {
    constructor(
        @InjectRepository(
            CompaniesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanyRepository: Repository<CompaniesEntity>,
        @InjectRepository(CompaniesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyRepository: Repository<CompaniesEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaCompanyRepository,
            writeReplicaCompanyRepository,
            'company',
            commonArrayService,
        );
    }
}
