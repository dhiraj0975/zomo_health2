import { appConstant, CommonFileService, QuizTrueFalseQuestionsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizTrueFalseQuestionsService {
    constructor(
        @InjectRepository(QuizTrueFalseQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizTrueFalseQuestionsRepository: Repository<QuizTrueFalseQuestionsEntity>,
        @InjectRepository(QuizTrueFalseQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizTrueFalseQuestionsRepository: Repository<QuizTrueFalseQuestionsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizTrueFalseQuestionsRepository.create(data);
        return await this.writeReplicaQuizTrueFalseQuestionsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizTrueFalseQuestionsRepository.metadata);
        return await this.writeReplicaQuizTrueFalseQuestionsRepository.createQueryBuilder('tfq')
            .update(QuizTrueFalseQuestionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizTrueFalseQuestionsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizTrueFalseQuestionsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
