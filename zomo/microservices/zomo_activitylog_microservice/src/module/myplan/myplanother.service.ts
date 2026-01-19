import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MyPlanOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanOtherService {
    constructor(
        @InjectRepository(MyPlanOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanOtherRepository: Repository<MyPlanOtherEntity>,
        @InjectRepository(MyPlanOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanOtherRepository: Repository<MyPlanOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaMyPlanOtherRepository.create(data);
        return await this.writeReplicaMyPlanOtherRepository.save(savedResult);
    }
}
