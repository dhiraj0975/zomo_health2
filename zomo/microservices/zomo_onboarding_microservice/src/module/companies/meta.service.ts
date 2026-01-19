import {
    appConstant,
    BaseService,
    CommonArrayService,
    CompanyMetaEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MetaService extends BaseService<CompanyMetaEntity> {
    constructor(
        @InjectRepository(
            CompanyMetaEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanyMetaRepository: Repository<CompanyMetaEntity>,
        @InjectRepository(CompanyMetaEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyMetaRepository: Repository<CompanyMetaEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaCompanyMetaRepository,
            writeReplicaCompanyMetaRepository,
            'companymeta',
            commonArrayService,
        );
    }
}
