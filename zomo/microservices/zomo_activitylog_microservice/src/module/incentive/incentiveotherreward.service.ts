import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OtherRewardEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveOtherRewardService {
    constructor(
        @InjectRepository(OtherRewardEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveOtherRewardRepository: Repository<OtherRewardEntity>,
        @InjectRepository(OtherRewardEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveOtherRewardRepository: Repository<OtherRewardEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaIncentiveOtherRewardRepository.create(data);
        return await this.writeReplicaIncentiveOtherRewardRepository.save(savedResult);
    }
}
