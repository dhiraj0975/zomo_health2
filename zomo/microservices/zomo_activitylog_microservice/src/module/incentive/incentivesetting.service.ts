import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IncentiveSettingEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveSettingService {
    constructor(
        @InjectRepository(IncentiveSettingEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveSettingRepository: Repository<IncentiveSettingEntity>,
        @InjectRepository(IncentiveSettingEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveSettingRepository: Repository<IncentiveSettingEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaIncentiveSettingRepository.create(data);
        return await this.writeReplicaIncentiveSettingRepository.save(savedResult);
    }
}
