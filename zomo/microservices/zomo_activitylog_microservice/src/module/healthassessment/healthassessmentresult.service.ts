import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthAssessmentResultEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthAssessmentResultService {
    constructor(
        @InjectRepository(HealthAssessmentResultEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthAssessmentResultRepository: Repository<HealthAssessmentResultEntity>,
        @InjectRepository(HealthAssessmentResultEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthAssessmentResultRepository: Repository<HealthAssessmentResultEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHealthAssessmentResultRepository.create(data);
        return await this.writeReplicaHealthAssessmentResultRepository.save(savedResult);
    }
}
