import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeActivityEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeActivityService {
    constructor(
        @InjectRepository(ChallengeActivityEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeActivityRepository: Repository<ChallengeActivityEntity>,
        @InjectRepository(ChallengeActivityEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeActivityRepository: Repository<ChallengeActivityEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeActivityRepository.create(data);
        return await this.writeReplicaChallengeActivityRepository.save(savedResult);
    }
}
