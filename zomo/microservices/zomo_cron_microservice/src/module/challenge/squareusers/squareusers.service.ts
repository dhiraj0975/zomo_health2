import {
    appConstant,
    BaseService,
    CommonArrayService,
    SquareUsersEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SquareUsersService extends BaseService<SquareUsersEntity> {
    constructor(
        @InjectRepository(
            SquareUsersEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaSquareUsersRepository: Repository<SquareUsersEntity>,
        @InjectRepository(SquareUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSquareUsersRepository: Repository<SquareUsersEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaSquareUsersRepository,
            writeReplicaSquareUsersRepository,
            'squareusers',
            commonArrayService,
        );

    }
}
