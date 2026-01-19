import {
    appConstant,
    BaseService,
    CommonArrayService,
    OptometristsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class OptometristsService extends BaseService<OptometristsEntity> {
    constructor(
        @InjectRepository(
            OptometristsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaOptometristsRepository: Repository<OptometristsEntity>,
        @InjectRepository(OptometristsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOptometristsRepository: Repository<OptometristsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaOptometristsRepository,
            writeReplicaOptometristsRepository,
            'optometrists',
            commonArrayService,
        );
    }
}
