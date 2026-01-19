import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UpcomingActivityEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class UpComingActivityService {
    constructor(
        @InjectRepository(UpcomingActivityEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUpcomingActivityRepository: Repository<UpcomingActivityEntity>,
        @InjectRepository(UpcomingActivityEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUpcomingActivityRepository: Repository<UpcomingActivityEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaUpcomingActivityRepository.create(data);
        return await this.writeReplicaUpcomingActivityRepository.save(savedResult);
    }
}
