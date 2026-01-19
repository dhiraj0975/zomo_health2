import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizDetailsEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class QuizDetailsService {
    constructor(
        @InjectRepository(QuizDetailsEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizDetailsRepository: Repository<QuizDetailsEntity>,
        @InjectRepository(QuizDetailsEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizDetailsRepository: Repository<QuizDetailsEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaQuizDetailsRepository.create(data);
        return await this.writeReplicaQuizDetailsRepository.save(savedResult);
    }
}
