import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeWeekEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeWeekService {
    constructor(
        @InjectRepository(ChallengeWeekEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeWeekRepository: Repository<ChallengeWeekEntity>,
        @InjectRepository(ChallengeWeekEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeWeekRepository: Repository<ChallengeWeekEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeWeekRepository.create(data);
        return await this.writeReplicaChallengeWeekRepository.save(savedResult);
    }
}
