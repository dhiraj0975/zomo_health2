import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ActivityService {
    constructor(
        @InjectRepository(ActivityEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaActivityRepository: Repository<ActivityEntity>,
        @InjectRepository(ActivityEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivityRepository: Repository<ActivityEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaActivityRepository.create(data);
        return await this.writeReplicaActivityRepository.save(savedResult);
    }
}
