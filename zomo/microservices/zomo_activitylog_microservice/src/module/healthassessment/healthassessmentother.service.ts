import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthAssessmentOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthAssessmentOtherService {
    constructor(
        @InjectRepository(HealthAssessmentOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthAssessmentOtherRepository: Repository<HealthAssessmentOtherEntity>,
        @InjectRepository(HealthAssessmentOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthAssessmentOtherRepository: Repository<HealthAssessmentOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHealthAssessmentOtherRepository.create(data);
        return await this.writeReplicaHealthAssessmentOtherRepository.save(savedResult);
    }
}
