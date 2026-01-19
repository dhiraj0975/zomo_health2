import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeChatEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeChatService {
    constructor(
        @InjectRepository(ChallengeChatEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeChatRepository: Repository<ChallengeChatEntity>,
        @InjectRepository(ChallengeChatEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeChatRepository: Repository<ChallengeChatEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeChatRepository.create(data);
        return await this.writeReplicaChallengeChatRepository.save(savedResult);
    }
}
