import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CashRewardEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveCashRewardService {
    constructor(
        @InjectRepository(CashRewardEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveCashRewardRepository: Repository<CashRewardEntity>,
        @InjectRepository(CashRewardEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveCashRewardRepository: Repository<CashRewardEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaIncentiveCashRewardRepository.create(data);
        return await this.writeReplicaIncentiveCashRewardRepository.save(savedResult);
    }
}
