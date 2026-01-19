import {
    appConstant,
    QuizReReportEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuizReportService {
    constructor(
        @InjectRepository(
            QuizReReportEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQuizReReportRepository: Repository<QuizReReportEntity>,
        @InjectRepository(
            QuizReReportEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaQuizReReportRepository: Repository<QuizReReportEntity>,
    ) {}
    async save(data: any) {
        const savedResult =
            this.writeReplicaQuizReReportRepository.create(data);
        return await this.writeReplicaQuizReReportRepository.save(
            savedResult,
        );
    }
    async delete(condition: any) {
        await this.writeReplicaQuizReReportRepository.delete(condition);
    }
    async updateReport() {
        const result = await this.readReplicaQuizReReportRepository
            .createQueryBuilder('quizReport')
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
        const mainQuery = this.writeReplicaQuizReReportRepository
            .createQueryBuilder()
            .update()
            .set({
                total_download: () => 'total_download + 1',
                status: 0,
            })
            .where('id = :id', { id: idToUpdate });
        await mainQuery.execute();
    }
    async findOneReport(condition: any) {
        return await this.readReplicaQuizReReportRepository
            .createQueryBuilder('quizReport')
            .leftJoinAndMapOne(
                'quizReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = quizReport.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('quizReport.request_date', 'ASC')
            .getOne();
    }
    async update(data) {
        const savedResult =
            this.writeReplicaQuizReReportRepository.create(data);
        return await this.writeReplicaQuizReReportRepository.save(
            savedResult,
        );
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaQuizReReportRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaQuizReReportRepository
            .createQueryBuilder('quizReport')
            .innerJoinAndMapOne(
                'quizReport.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = quizReport.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
}
