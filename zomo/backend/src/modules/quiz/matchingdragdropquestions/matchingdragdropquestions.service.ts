import { appConstant, CommonFileService, QuizMatchingDragDropQuestionEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizMatchingDragDropQuestionService {
    constructor(
        @InjectRepository(QuizMatchingDragDropQuestionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizMatchingDragDropQuestionRepository: Repository<QuizMatchingDragDropQuestionEntity>,
        @InjectRepository(QuizMatchingDragDropQuestionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizMatchingDragDropQuestionRepository: Repository<QuizMatchingDragDropQuestionEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizMatchingDragDropQuestionRepository.create(data);
        return await this.writeReplicaQuizMatchingDragDropQuestionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizMatchingDragDropQuestionRepository.metadata);
        return await this.writeReplicaQuizMatchingDragDropQuestionRepository.createQueryBuilder('aqo')
            .update(QuizMatchingDragDropQuestionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizMatchingDragDropQuestionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizMatchingDragDropQuestionRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizMatchingDragDropQuestionRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
}
