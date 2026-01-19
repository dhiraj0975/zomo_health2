import { appConstant, CommonFileService, QuizHotspotQuestionEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizHotspotQuestionService {
    constructor(
        @InjectRepository(QuizHotspotQuestionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizHotspotQuestionRepository: Repository<QuizHotspotQuestionEntity>,
        @InjectRepository(QuizHotspotQuestionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizHotspotQuestionRepository: Repository<QuizHotspotQuestionEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizHotspotQuestionRepository.create(data);
        return await this.writeReplicaQuizHotspotQuestionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizHotspotQuestionRepository.metadata);
        return await this.writeReplicaQuizHotspotQuestionRepository.createQueryBuilder('hq')
            .update(QuizHotspotQuestionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizHotspotQuestionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizHotspotQuestionRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
