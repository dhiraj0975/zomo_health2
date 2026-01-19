import {
    appConstant,
    BaseService,
    CommonArrayService,
    SsoOrgMappingEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SsoOrgMappingService extends BaseService<SsoOrgMappingEntity> {
    constructor(
        @InjectRepository(SsoOrgMappingEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSsoOrgMappingRepository: Repository<SsoOrgMappingEntity>,
        @InjectRepository(SsoOrgMappingEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSsoOrgMappingRepository: Repository<SsoOrgMappingEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaSsoOrgMappingRepository, writeReplicaSsoOrgMappingRepository, 'ssoOrgMapping', commonArrayService );
    }
}
