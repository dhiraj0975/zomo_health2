import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class QuizOtherService {
    constructor(
        @InjectRepository(QuizOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizOtherRepository: Repository<QuizOtherEntity>,
        @InjectRepository(QuizOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizOtherRepository: Repository<QuizOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaQuizOtherRepository.create(data);
        return await this.writeReplicaQuizOtherRepository.save(savedResult);
    }
}
