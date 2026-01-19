import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthAssessmentEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthAssessmentService {
    constructor(
        @InjectRepository(HealthAssessmentEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthAssessmentRepository: Repository<HealthAssessmentEntity>,
        @InjectRepository(HealthAssessmentEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthAssessmentRepository: Repository<HealthAssessmentEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHealthAssessmentRepository.create(data);
        return await this.writeReplicaHealthAssessmentRepository.save(savedResult);
    }
}
