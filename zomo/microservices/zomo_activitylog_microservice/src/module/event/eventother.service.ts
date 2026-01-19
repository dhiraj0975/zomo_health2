import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class EventOtherService {
    constructor(
        @InjectRepository(EventOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventOtherRepository: Repository<EventOtherEntity>,
        @InjectRepository(EventOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventOtherRepository: Repository<EventOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaEventOtherRepository.create(data);
        return await this.writeReplicaEventOtherRepository.save(savedResult);
    }
}
