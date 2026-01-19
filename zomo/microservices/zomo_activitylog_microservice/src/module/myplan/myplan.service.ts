import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MyPlanEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanService {
    constructor(
        @InjectRepository(MyPlanEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanRepository: Repository<MyPlanEntity>,
        @InjectRepository(MyPlanEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanRepository: Repository<MyPlanEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaMyPlanRepository.create(data);
        return await this.writeReplicaMyPlanRepository.save(savedResult);
    }
}
