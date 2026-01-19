import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeTeamMembersEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeTeamMembersService {
    constructor(
        @InjectRepository(ChallengeTeamMembersEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeTeamMembersRepository: Repository<ChallengeTeamMembersEntity>,
        @InjectRepository(ChallengeTeamMembersEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeTeamMembersRepository: Repository<ChallengeTeamMembersEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeTeamMembersRepository.create(data);
        return await this.writeReplicaChallengeTeamMembersRepository.save(savedResult);
    }
}
