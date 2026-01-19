import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HaHealthAssessmentEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class HaHealthAssessmentService {
    constructor(
        @InjectRepository(HaHealthAssessmentEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHaHealthAssessmentRepository: Repository<HaHealthAssessmentEntity>,
        @InjectRepository(HaHealthAssessmentEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHaHealthAssessmentRepository: Repository<HaHealthAssessmentEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaHaHealthAssessmentRepository.create(data);
        return await this.writeReplicaHaHealthAssessmentRepository.save(savedResult);
    }
}
