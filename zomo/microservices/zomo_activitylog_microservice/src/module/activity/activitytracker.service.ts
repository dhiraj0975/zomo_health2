import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityTrackerEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ActivityTrackerService {
    constructor(
        @InjectRepository(ActivityTrackerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaActivityTrackerRepository: Repository<ActivityTrackerEntity>,
        @InjectRepository(ActivityTrackerEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivityTrackerRepository: Repository<ActivityTrackerEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaActivityTrackerRepository.create(data);
        return await this.writeReplicaActivityTrackerRepository.save(savedResult);
    }
}
