import {
    appConstant,
    BaseService,
    CommonArrayService,
    SsoToolEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SsoToolService extends BaseService<SsoToolEntity> {
    constructor(
        @InjectRepository(SsoToolEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSsoToolRepository: Repository<SsoToolEntity>,
        @InjectRepository(SsoToolEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSsoToolRepository: Repository<SsoToolEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaSsoToolRepository, writeReplicaSsoToolRepository, 'ssoTool', commonArrayService );
    }
}
