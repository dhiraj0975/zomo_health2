import { appConstant, CommonFileService, QuizFillUpQuestionEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizFillUpQuestionService {
    constructor(
        @InjectRepository(QuizFillUpQuestionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizFillUpQuestionRepository: Repository<QuizFillUpQuestionEntity>,
        @InjectRepository(QuizFillUpQuestionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizFillUpQuestionRepository: Repository<QuizFillUpQuestionEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizFillUpQuestionRepository.create(data);
        return await this.writeReplicaQuizFillUpQuestionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizFillUpQuestionRepository.metadata);
        return await this.writeReplicaQuizFillUpQuestionRepository.createQueryBuilder('fuq')
            .update(QuizFillUpQuestionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizFillUpQuestionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizFillUpQuestionRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizFillUpQuestionRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
}
