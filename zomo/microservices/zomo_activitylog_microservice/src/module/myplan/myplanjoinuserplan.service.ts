import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JoinUserPlanEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanJoinUserPlanService {
    constructor(
        @InjectRepository(JoinUserPlanEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaJoinUserMPRepository: Repository<JoinUserPlanEntity>,
        @InjectRepository(JoinUserPlanEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaJoinUserMPRepository: Repository<JoinUserPlanEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaJoinUserMPRepository.create(data);
        return await this.writeReplicaJoinUserMPRepository.save(savedResult);
    }
}
