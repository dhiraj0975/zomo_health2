import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeTeamScheduleEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeTeamScheduleService {
    constructor(
        @InjectRepository(ChallengeTeamScheduleEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeTeamScheduleRepository: Repository<ChallengeTeamScheduleEntity>,
        @InjectRepository(ChallengeTeamScheduleEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeTeamScheduleRepository: Repository<ChallengeTeamScheduleEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeTeamScheduleRepository.create(data);
        return await this.writeReplicaChallengeTeamScheduleRepository.save(savedResult);
    }
}
