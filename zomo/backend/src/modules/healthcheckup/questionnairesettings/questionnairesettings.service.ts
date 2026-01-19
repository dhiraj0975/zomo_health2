import { appConstant, CommonFileService, QuestionnaireSettingsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuestionnaireSettingsService {
    constructor(
        @InjectRepository(QuestionnaireSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuestionnaireSettingsRepository: Repository<QuestionnaireSettingsEntity>,
        @InjectRepository(QuestionnaireSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuestionnaireSettingsRepository: Repository<QuestionnaireSettingsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuestionnaireSettingsRepository.create(data);
        return await this.writeReplicaQuestionnaireSettingsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuestionnaireSettingsRepository.metadata);
        return await this.writeReplicaQuestionnaireSettingsRepository.createQueryBuilder('a')
            .update(QuestionnaireSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuestionnaireSettingsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuestionnaireSettingsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
