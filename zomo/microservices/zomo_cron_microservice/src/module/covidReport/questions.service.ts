import {
    appConstant,
    CovidQuestionsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuestionsService {
    constructor(
        @InjectRepository(
            CovidQuestionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQuestionsRepository: Repository<CovidQuestionsEntity>,
        @InjectRepository(CovidQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuestionsRepository: Repository<CovidQuestionsEntity>,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaQuestionsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuestionsRepository.find({
            where: condition,
            select: ['id', 'org_id', 'title', 'status'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuestionsRepository.create(data);
        return await this.writeReplicaQuestionsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaQuestionsRepository
            .createQueryBuilder('questions')
            .update(CovidQuestionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaQuestionsRepository.delete(condition);
    }
    async questionData(condition, feild = []) {
        return await this.readReplicaQuestionsRepository
            .createQueryBuilder('questions')
            .leftJoinAndMapMany(
                'questions.CovidAnswer',
                tableConstant.REPORT.COVID_ANSWERS,
                'CovidAnswer',
                `CovidAnswer.q_id = questions.id AND CovidAnswer.status = 1`,
            )
            .where(condition)
            .select(feild)
            .orderBy('questions.id', 'ASC')
            .getMany();
    }
}
