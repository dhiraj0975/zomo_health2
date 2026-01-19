import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    tableConstant,
    UserLoginEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class UserLoginService extends BaseService<UserLoginEntity> {
    constructor(
        @InjectRepository(
            UserLoginEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaUserLoginRepository: Repository<UserLoginEntity>,
        @InjectRepository(UserLoginEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserLoginRepository: Repository<UserLoginEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaUserLoginRepository,
            writeReplicaUserLoginRepository,
            'userLogin',
            commonArrayService,
        );
    }
}
