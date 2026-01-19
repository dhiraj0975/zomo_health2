import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AssignUserPlanEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanAssignUserPlanService {
    constructor(
        @InjectRepository(AssignUserPlanEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssignUserMPRepository: Repository<AssignUserPlanEntity>,
        @InjectRepository(AssignUserPlanEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssignUserMPRepository: Repository<AssignUserPlanEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaAssignUserMPRepository.create(data);
        return await this.writeReplicaAssignUserMPRepository.save(savedResult);
    }
}
