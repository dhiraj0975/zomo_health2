import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeSquareEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeSquareService {
    constructor(
        @InjectRepository(ChallengeSquareEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeSquareRepository: Repository<ChallengeSquareEntity>,
        @InjectRepository(ChallengeSquareEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeSquareRepository: Repository<ChallengeSquareEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeSquareRepository.create(data);
        return await this.writeReplicaChallengeSquareRepository.save(savedResult);
    }
}
