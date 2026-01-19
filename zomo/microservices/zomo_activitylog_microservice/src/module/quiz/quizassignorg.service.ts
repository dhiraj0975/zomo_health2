import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizAssignOrgEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class QuizAssignOrgService {
    constructor(
        @InjectRepository(QuizAssignOrgEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizOrgAssignRepository: Repository<QuizAssignOrgEntity>,
        @InjectRepository(QuizAssignOrgEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizOrgAssignRepository: Repository<QuizAssignOrgEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaQuizOrgAssignRepository.create(data);
        return await this.writeReplicaQuizOrgAssignRepository.save(savedResult);
    }
}
