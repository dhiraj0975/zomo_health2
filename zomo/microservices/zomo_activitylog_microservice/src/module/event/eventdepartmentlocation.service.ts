import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventDepartmentLocationEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class EventDepartmentLocationService {
    constructor(
        @InjectRepository(EventDepartmentLocationEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventDepartmentLocationRepository: Repository<EventDepartmentLocationEntity>,
        @InjectRepository(EventDepartmentLocationEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventDepartmentLocationRepository: Repository<EventDepartmentLocationEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaEventDepartmentLocationRepository.create(data);
        return await this.writeReplicaEventDepartmentLocationRepository.save(savedResult);
    }
}
