import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventUserBookingListEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class EventUserBookingListService {
    constructor(
        @InjectRepository(EventUserBookingListEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventUserBookingListRepository: Repository<EventUserBookingListEntity>,
        @InjectRepository(EventUserBookingListEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventUserBookingListRepository: Repository<EventUserBookingListEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaEventUserBookingListRepository.create(data);
        return await this.writeReplicaEventUserBookingListRepository.save(savedResult);
    }
}
