import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmotionalAssessmentResultEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HaEmotionalAssessmentResultService {
    constructor(
        @InjectRepository(EmotionalAssessmentResultEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHaEmotionalAssessmentRepository: Repository<EmotionalAssessmentResultEntity>,
        @InjectRepository(EmotionalAssessmentResultEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHaEmotionalAssessmentRepository: Repository<EmotionalAssessmentResultEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHaEmotionalAssessmentRepository.create(data);
        return await this.writeReplicaHaEmotionalAssessmentRepository.save(savedResult);
    }
}
