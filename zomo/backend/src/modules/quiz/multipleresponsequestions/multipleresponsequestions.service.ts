import { appConstant, CommonFileService, QuizMultipleResponseQuestionEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizMultipleResponseQuestionService {
    constructor(
        @InjectRepository(QuizMultipleResponseQuestionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizMultipleResponseQuestionRepository: Repository<QuizMultipleResponseQuestionEntity>,
        @InjectRepository(QuizMultipleResponseQuestionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizMultipleResponseQuestionRepository: Repository<QuizMultipleResponseQuestionEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizMultipleResponseQuestionRepository.create(data);
        return await this.writeReplicaQuizMultipleResponseQuestionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizMultipleResponseQuestionRepository.metadata);
        return await this.writeReplicaQuizMultipleResponseQuestionRepository.createQueryBuilder('mrq')
            .update(QuizMultipleResponseQuestionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizMultipleResponseQuestionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizMultipleResponseQuestionRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
