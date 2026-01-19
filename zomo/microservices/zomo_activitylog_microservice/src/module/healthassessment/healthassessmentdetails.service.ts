import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthAssessmentDetailsEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthAssessmentDetailsService {
    constructor(
        @InjectRepository(HealthAssessmentDetailsEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthAssessmentDetailsRepository: Repository<HealthAssessmentDetailsEntity>,
        @InjectRepository(HealthAssessmentDetailsEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthAssessmentDetailsRepository: Repository<HealthAssessmentDetailsEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHealthAssessmentDetailsRepository.create(data);
        return await this.writeReplicaHealthAssessmentDetailsRepository.save(savedResult);
    }
}
