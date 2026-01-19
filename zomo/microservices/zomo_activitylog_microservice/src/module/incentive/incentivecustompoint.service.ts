import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomPointEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveCustomPointService {
    constructor(
        @InjectRepository(CustomPointEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveCustomPointRepository: Repository<CustomPointEntity>,
        @InjectRepository(CustomPointEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveCustomPointRepository: Repository<CustomPointEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaIncentiveCustomPointRepository.create(data);
        return await this.writeReplicaIncentiveCustomPointRepository.save(savedResult);
    }
}
