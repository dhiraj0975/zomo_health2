import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class QuizService {
    constructor(
        @InjectRepository(QuizEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizRepository: Repository<QuizEntity>,
        @InjectRepository(QuizEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizRepository: Repository<QuizEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaQuizRepository.create(data);
        return await this.writeReplicaQuizRepository.save(savedResult);
    }
}
