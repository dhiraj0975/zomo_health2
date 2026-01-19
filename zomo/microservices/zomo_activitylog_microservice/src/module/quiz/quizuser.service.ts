import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizUserEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class QuizUserService {
    constructor(
        @InjectRepository(QuizUserEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizUserRepository: Repository<QuizUserEntity>,
        @InjectRepository(QuizUserEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizUserRepository: Repository<QuizUserEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaQuizUserRepository.create(data);
        return await this.writeReplicaQuizUserRepository.save(savedResult);
    }
}
