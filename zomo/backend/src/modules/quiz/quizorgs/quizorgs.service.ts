import { appConstant, CommonFileService, QuizOrgEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizOrgService {
    constructor(
        @InjectRepository(QuizOrgEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizOrgRepository: Repository<QuizOrgEntity>,
        @InjectRepository(QuizOrgEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizOrgRepository: Repository<QuizOrgEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizOrgRepository.create(data);
        return await this.writeReplicaQuizOrgRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizOrgRepository.metadata);
        return await this.writeReplicaQuizOrgRepository.createQueryBuilder('qo')
            .update(QuizOrgEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizOrgRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizOrgRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null,tableData: string[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaQuizOrgRepository.createQueryBuilder('qo')
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZZES)) {
            queryResult = await queryResult.leftJoinAndMapOne(
                'qo.quiz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'quiz',
                `quiz.id = qo.quiz_id AND quiz.status = 1`,
            )
        }
        queryResult = await queryResult.where(condition)
            .orderBy(`qo.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
}
