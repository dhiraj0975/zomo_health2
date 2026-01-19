import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ScheduleChallengeJoinUserEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ScheduleChallengeJoinUserService {
    constructor(
        @InjectRepository(ScheduleChallengeJoinUserEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaScheduleChallengeJoinUserRepository: Repository<ScheduleChallengeJoinUserEntity>,
        @InjectRepository(ScheduleChallengeJoinUserEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaScheduleChallengeJoinUserRepository: Repository<ScheduleChallengeJoinUserEntity>,
    ) {}
    async create(data: any) {
        const savedResult =
            this.writeReplicaScheduleChallengeJoinUserRepository.create(data);
        return await this.writeReplicaScheduleChallengeJoinUserRepository.save(savedResult);
    }
}
