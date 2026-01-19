import {
    appConstant,
    BaseService,
    CashRewardEntity,
    CommonArrayService,
    CommonService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CashRewardService extends BaseService<CashRewardEntity> {
    constructor(
        @InjectRepository(
            CashRewardEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCashRewardRepository: Repository<CashRewardEntity>,
        @InjectRepository(CashRewardEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCashRewardRepository: Repository<CashRewardEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaCashRewardRepository,
            writeReplicaCashRewardRepository,
            'cashReward',
            commonArrayService,
        );
    }
}
