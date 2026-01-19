import {
    appConstant,
    BaseService,
    CommonArrayService,
    WeeksUsersEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class WeeksUsersService extends BaseService<WeeksUsersEntity> {
    constructor(
        @InjectRepository(WeeksUsersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWeeksUsersRepository: Repository<WeeksUsersEntity>,
        @InjectRepository(WeeksUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWeeksUsersRepository: Repository<WeeksUsersEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaWeeksUsersRepository,writeReplicaWeeksUsersRepository,'weeksUsers',commonArrayService);
    }

}
