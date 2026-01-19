import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class EventService {
    constructor(
        @InjectRepository(EventEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventRepository: Repository<EventEntity>,
        @InjectRepository(EventEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventRepository: Repository<EventEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaEventRepository.create(data);
        return await this.writeReplicaEventRepository.save(savedResult);
    }
}
