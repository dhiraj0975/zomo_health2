import {
    appConstant,
    MediaFitnessVideosReportEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MediaFitnessVideoReportService {
    constructor(
        @InjectRepository(
            MediaFitnessVideosReportEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaFodReportRepository: Repository<MediaFitnessVideosReportEntity>,
        @InjectRepository(
            MediaFitnessVideosReportEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaFodReportRepository: Repository<MediaFitnessVideosReportEntity>,
    ) {}
    async updateReport() {
        const result = await this.readReplicaFodReportRepository
            .createQueryBuilder('fodReport')
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
        const mainQuery = this.writeReplicaFodReportRepository
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
        return await this.readReplicaFodReportRepository
            .createQueryBuilder('fodReport')
            .leftJoinAndMapOne(
                'fodReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = fodReport.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('fodReport.request_date', 'ASC')
            .getOne();
    }
    async update(data) {
        const savedResult = this.writeReplicaFodReportRepository.create(data);
        return await this.writeReplicaFodReportRepository.save(savedResult);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFodReportRepository.create(data);
        return await this.writeReplicaFodReportRepository.save(savedResult);
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaFodReportRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaFodReportRepository
            .createQueryBuilder('fodReport')
            .innerJoinAndMapOne(
                'fodReport.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = fodReport.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
}
