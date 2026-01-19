import {
    appConstant,
    SurveyReportEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SurveyReportService {
    constructor(
        @InjectRepository(
            SurveyReportEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaSurveyReportRepository: Repository<SurveyReportEntity>,
        @InjectRepository(SurveyReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSurveyReportRepository: Repository<SurveyReportEntity>,
    ) {}
    async updateReport() {
        const result = await this.readReplicaSurveyReportRepository
            .createQueryBuilder('surveyReport')
            .select('id')
            .where('created_date < NOW() - INTERVAL 2 HOUR')
            .andWhere('status = 2')
            .andWhere('total_download < 4')
            .limit(1)
            .getRawOne();
        if (!result) {
            return;
        }
        const idToUpdate = result.id;
        const mainQuery = this.writeReplicaSurveyReportRepository
            .createQueryBuilder()
            .update()
            .set({
                total_download: () => 'total_download + 1',
                status: 0,
            })
            .where('id = :id', { id: idToUpdate });
        await mainQuery.execute();
    }
    async findOne(condition: any) {
        return await this.readReplicaSurveyReportRepository
            .createQueryBuilder('surveyReport')
            .leftJoinAndMapOne(
                'surveyReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = surveyReport.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('surveyReport.request_date', 'ASC')
            .getOne();
    }
    async update(data) {
        const savedResult =
            this.writeReplicaSurveyReportRepository.create(data);
        return await this.writeReplicaSurveyReportRepository.save(savedResult);
    }
    async save(data) {
        const savedResult =
            this.writeReplicaSurveyReportRepository.create(data);
        return await this.writeReplicaSurveyReportRepository.save(savedResult);
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) { 
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaSurveyReportRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaSurveyReportRepository
            .createQueryBuilder('surveyReport')
            .innerJoinAndMapOne(
                'surveyReport.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = surveyReport.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
}
