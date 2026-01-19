import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityFeedEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ActivityFeedService {
    constructor(
        @InjectRepository(ActivityFeedEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaActivityFeedRepository: Repository<ActivityFeedEntity>,
        @InjectRepository(ActivityFeedEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivityFeedRepository: Repository<ActivityFeedEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaActivityFeedRepository.create(data);
        return await this.writeReplicaActivityFeedRepository.save(savedResult);
    }
}
