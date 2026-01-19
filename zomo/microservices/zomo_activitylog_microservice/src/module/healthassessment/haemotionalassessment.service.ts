import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmotionalAssessmentEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HaEmotionalAssessmentService {
    constructor(
        @InjectRepository(EmotionalAssessmentEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHaEmotionalAssessmentRepository: Repository<EmotionalAssessmentEntity>,
        @InjectRepository(EmotionalAssessmentEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHaEmotionalAssessmentRepository: Repository<EmotionalAssessmentEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHaEmotionalAssessmentRepository.create(data);
        return await this.writeReplicaHaEmotionalAssessmentRepository.save(savedResult);
    }
}
