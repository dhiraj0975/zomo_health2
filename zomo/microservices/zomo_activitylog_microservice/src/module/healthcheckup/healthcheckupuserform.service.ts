import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthCheckupUserFormEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthCheckupUserFormService {
    constructor(
        @InjectRepository(HealthCheckupUserFormEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthCheckupUserFormRepository: Repository<HealthCheckupUserFormEntity>,
        @InjectRepository(HealthCheckupUserFormEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthCheckupUserFormRepository: Repository<HealthCheckupUserFormEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHealthCheckupUserFormRepository.create(data);
        return await this.writeReplicaHealthCheckupUserFormRepository.save(savedResult);
    }
}
