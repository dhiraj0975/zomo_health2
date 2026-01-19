import { appConstant, CommonFileService, QuizMultipleChoiceQuestionEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizMultipleChoiceQuestionService {
    constructor(
        @InjectRepository(QuizMultipleChoiceQuestionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizMultipleChoiceQuestionRepository: Repository<QuizMultipleChoiceQuestionEntity>,
        @InjectRepository(QuizMultipleChoiceQuestionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizMultipleChoiceQuestionRepository: Repository<QuizMultipleChoiceQuestionEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizMultipleChoiceQuestionRepository.create(data);
        return await this.writeReplicaQuizMultipleChoiceQuestionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizMultipleChoiceQuestionRepository.metadata);
        return await this.writeReplicaQuizMultipleChoiceQuestionRepository.createQueryBuilder('mcq')
            .update(QuizMultipleChoiceQuestionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizMultipleChoiceQuestionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizMultipleChoiceQuestionRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
