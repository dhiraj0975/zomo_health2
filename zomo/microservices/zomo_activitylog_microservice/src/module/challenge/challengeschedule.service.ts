import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeScheduleEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeScheduleService {
    constructor(
        @InjectRepository(ChallengeScheduleEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeScheduleRepository: Repository<ChallengeScheduleEntity>,
        @InjectRepository(ChallengeScheduleEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeScheduleRepository: Repository<ChallengeScheduleEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeScheduleRepository.create(data);
        return await this.writeReplicaChallengeScheduleRepository.save(savedResult);
    }
}
