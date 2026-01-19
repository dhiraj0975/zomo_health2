import { appConstant, CommonFileService, QuizMultipleQuestionEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizMultipleQuestionService {
    constructor(
        @InjectRepository(QuizMultipleQuestionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizMultipleQuestionRepository: Repository<QuizMultipleQuestionEntity>,
        @InjectRepository(QuizMultipleQuestionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizMultipleQuestionRepository: Repository<QuizMultipleQuestionEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizMultipleQuestionRepository.create(data);
        return await this.writeReplicaQuizMultipleQuestionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizMultipleQuestionRepository.metadata);
        return await this.writeReplicaQuizMultipleQuestionRepository.createQueryBuilder('mq')
            .update(QuizMultipleQuestionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizMultipleQuestionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizMultipleQuestionRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizMultipleQuestionRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
}
