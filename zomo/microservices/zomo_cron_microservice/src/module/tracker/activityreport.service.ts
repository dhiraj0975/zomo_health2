import {
    activityReportEntity,
    appConstant,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ActivityReportService {
    constructor(
        @InjectRepository(
            activityReportEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaActivityReportRepository: Repository<activityReportEntity>,
        @InjectRepository(activityReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivityReportRepository: Repository<activityReportEntity>,
    ) {}
    async updateReport() {
        const result = await this.readReplicaActivityReportRepository
            .createQueryBuilder('activityReport')
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
        const mainQuery = this.writeReplicaActivityReportRepository
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
        return await this.readReplicaActivityReportRepository
            .createQueryBuilder('activityReport')
            .leftJoinAndMapOne(
                'activityReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = activityReport.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('activityReport.request_date', 'ASC')
            .getOne();
    }
    async update(data) {
        const savedResult =
            this.writeReplicaActivityReportRepository.create(data);
        return await this.writeReplicaActivityReportRepository.save(
            savedResult,
        );
    }
    async save(data) {
        const savedResult =
            this.writeReplicaActivityReportRepository.create(data);
        return await this.writeReplicaActivityReportRepository.save(
            savedResult,
        );
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) { 
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaActivityReportRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaActivityReportRepository
            .createQueryBuilder('activityReport')
            .innerJoinAndMapOne(
                'activityReport.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = activityReport.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
}
