import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HealthAssessmentAnswersEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HealthAssessmentAnswersService {
    constructor(
        @InjectRepository(HealthAssessmentAnswersEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthAssessmentAnswersRepository: Repository<HealthAssessmentAnswersEntity>,
        @InjectRepository(HealthAssessmentAnswersEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthAssessmentAnswersRepository: Repository<HealthAssessmentAnswersEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHealthAssessmentAnswersRepository.create(data);
        return await this.writeReplicaHealthAssessmentAnswersRepository.save(savedResult);
    }
}
