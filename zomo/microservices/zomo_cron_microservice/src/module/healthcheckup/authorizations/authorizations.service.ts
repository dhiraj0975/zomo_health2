import {
    appConstant,
    AuthorizationsEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AuthorizationsService extends BaseService<AuthorizationsEntity> {
    constructor(
        @InjectRepository(
            AuthorizationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        @InjectRepository(AuthorizationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaAuthorizationsRepository,
            writeReplicaAuthorizationsRepository,
            'authorizations',
            commonArrayService,
        );
    }
}
