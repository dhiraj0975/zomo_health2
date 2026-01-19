import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BodyFeedEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class BodyFeedService {
    constructor(
        @InjectRepository(BodyFeedEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBodyFeedRepository: Repository<BodyFeedEntity>,
        @InjectRepository(BodyFeedEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBodyFeedRepository: Repository<BodyFeedEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaBodyFeedRepository.create(data);
        return await this.writeReplicaBodyFeedRepository.save(savedResult);
    }
}
