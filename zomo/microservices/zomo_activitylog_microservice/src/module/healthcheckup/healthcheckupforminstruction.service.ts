import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthCheckupFormInstructionEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthCheckupFormInstructionService {
    constructor(
        @InjectRepository(HealthCheckupFormInstructionEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthCheckupFormInstructionRepository: Repository<HealthCheckupFormInstructionEntity>,
        @InjectRepository(HealthCheckupFormInstructionEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthCheckupFormInstructionRepository: Repository<HealthCheckupFormInstructionEntity>,
    ) {}
    async create(data: any) {
        const savedResult =
            this.writeReplicaHealthCheckupFormInstructionRepository.create(data);
        return await this.writeReplicaHealthCheckupFormInstructionRepository.save(
            savedResult,
        );
    }
}
