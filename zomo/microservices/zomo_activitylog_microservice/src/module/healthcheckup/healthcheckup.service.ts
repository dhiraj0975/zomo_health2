import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthCheckupEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthCheckupService {
    constructor(
        @InjectRepository(HealthCheckupEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthCheckupRepository: Repository<HealthCheckupEntity>,
        @InjectRepository(HealthCheckupEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthCheckupRepository: Repository<HealthCheckupEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHealthCheckupRepository.create(data);
        return await this.writeReplicaHealthCheckupRepository.save(savedResult);
    }
}
