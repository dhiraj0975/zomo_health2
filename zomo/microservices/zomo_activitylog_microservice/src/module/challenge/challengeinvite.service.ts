import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeInviteEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeInviteService {
    constructor(
        @InjectRepository(ChallengeInviteEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeInviteRepository: Repository<ChallengeInviteEntity>,
        @InjectRepository(ChallengeInviteEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeInviteRepository: Repository<ChallengeInviteEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeInviteRepository.create(data);
        return await this.writeReplicaChallengeInviteRepository.save(savedResult);
    }
}
