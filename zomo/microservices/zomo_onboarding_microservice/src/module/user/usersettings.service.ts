import {
    appConstant,
    BaseService,
    CommonArrayService,
    UserSettingsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class UserSettingsService extends BaseService<UserSettingsEntity> {
    constructor(
        @InjectRepository(
            UserSettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaUserSettingsRepository: Repository<UserSettingsEntity>,
        @InjectRepository(UserSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserSettingsRepository: Repository<UserSettingsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaUserSettingsRepository,
            writeReplicaUserSettingsRepository,
            'userseeting',
            commonArrayService,
        );
    }
}
