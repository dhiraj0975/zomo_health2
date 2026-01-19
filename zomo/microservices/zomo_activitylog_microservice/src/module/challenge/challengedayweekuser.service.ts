import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeDayWeekUsersEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeDayWeekUserService {
    constructor(
        @InjectRepository(ChallengeDayWeekUsersEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeDayWeekUserRepository: Repository<ChallengeDayWeekUsersEntity>,
        @InjectRepository(ChallengeDayWeekUsersEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeDayWeekUserRepository: Repository<ChallengeDayWeekUsersEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaChallengeDayWeekUserRepository.create(data);
        return await this.writeReplicaChallengeDayWeekUserRepository.save(savedResult);
    }
}
