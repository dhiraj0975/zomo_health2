import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeOtherService {
    constructor(
        @InjectRepository(ChallengeOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeOtherRepository: Repository<ChallengeOtherEntity>,
        @InjectRepository(ChallengeOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeOtherRepository: Repository<ChallengeOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeOtherRepository.create(data);
        return await this.writeReplicaChallengeOtherRepository.save(savedResult);
    }
}
