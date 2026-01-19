import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeTeamEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeTeamService {
    constructor(
        @InjectRepository(ChallengeTeamEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeTeamRepository: Repository<ChallengeTeamEntity>,
        @InjectRepository(ChallengeTeamEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeTeamRepository: Repository<ChallengeTeamEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeTeamRepository.create(data);
        return await this.writeReplicaChallengeTeamRepository.save(savedResult);
    }
}
