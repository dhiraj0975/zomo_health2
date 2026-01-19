import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IncentiveEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveService {
    constructor(
        @InjectRepository(IncentiveEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveRepository: Repository<IncentiveEntity>,
        @InjectRepository(IncentiveEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveRepository: Repository<IncentiveEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaIncentiveRepository.create(data);
        return await this.writeReplicaIncentiveRepository.save(savedResult);
    }
}
