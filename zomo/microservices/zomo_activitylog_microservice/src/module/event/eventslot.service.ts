import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventSlotEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class EventSlotService {
    constructor(
        @InjectRepository(EventSlotEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventSlotRepository: Repository<EventSlotEntity>,
        @InjectRepository(EventSlotEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventSlotRepository: Repository<EventSlotEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaEventSlotRepository.create(data);
        return await this.writeReplicaEventSlotRepository.save(savedResult);
    }
}
