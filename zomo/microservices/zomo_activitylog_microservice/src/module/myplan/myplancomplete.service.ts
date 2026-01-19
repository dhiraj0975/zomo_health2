import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MyPlanCompleteEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanCompleteService {
    constructor(
        @InjectRepository(MyPlanCompleteEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanCompleteRepository: Repository<MyPlanCompleteEntity>,
        @InjectRepository(MyPlanCompleteEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanCompleteRepository: Repository<MyPlanCompleteEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaMyPlanCompleteRepository.create(data);
        return await this.writeReplicaMyPlanCompleteRepository.save(savedResult);
    }
}
