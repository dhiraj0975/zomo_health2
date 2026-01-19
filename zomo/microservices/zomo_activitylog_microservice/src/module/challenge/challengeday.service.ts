import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeDayEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeDayService {
    constructor(
        @InjectRepository(ChallengeDayEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeDayRepository: Repository<ChallengeDayEntity>,
        @InjectRepository(ChallengeDayEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeDayRepository: Repository<ChallengeDayEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeDayRepository.create(data);
        return await this.writeReplicaChallengeDayRepository.save(savedResult);
    }
}
