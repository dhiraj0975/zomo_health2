import { appConstant, CommonFileService, QuizMatchingDropDownQuestionEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizMatchingDropDownQuestionService {
    constructor(
        @InjectRepository(QuizMatchingDropDownQuestionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizMatchingDropDownQuestionRepository: Repository<QuizMatchingDropDownQuestionEntity>,
        @InjectRepository(QuizMatchingDropDownQuestionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizMatchingDropDownQuestionRepository: Repository<QuizMatchingDropDownQuestionEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizMatchingDropDownQuestionRepository.create(data);
        return await this.writeReplicaQuizMatchingDropDownQuestionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizMatchingDropDownQuestionRepository.metadata);
        return await this.writeReplicaQuizMatchingDropDownQuestionRepository.createQueryBuilder('mdq')
            .update(QuizMatchingDropDownQuestionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizMatchingDropDownQuestionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizMatchingDropDownQuestionRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizMatchingDropDownQuestionRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
}
