import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeService {
    constructor(
        @InjectRepository(ChallengeEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeRepository: Repository<ChallengeEntity>,
        @InjectRepository(ChallengeEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeRepository: Repository<ChallengeEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeRepository.create(data);
        return await this.writeReplicaChallengeRepository.save(savedResult);
    }
}
