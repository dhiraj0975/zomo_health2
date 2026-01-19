import {
    appConstant,
    ReimbursementReportsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ReimbursementReportService {
    constructor(
        @InjectRepository(
            ReimbursementReportsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaReimbursementReportRepository: Repository<ReimbursementReportsEntity>,
        @InjectRepository(
            ReimbursementReportsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaReimbursementReportRepository: Repository<ReimbursementReportsEntity>,
    ) {}
    async save(data: any) {
        const savedResult =
            this.writeReplicaReimbursementReportRepository.create(data);
        return await this.writeReplicaReimbursementReportRepository.save(
            savedResult,
        );
    }
    async delete(condition: any) {
        await this.writeReplicaReimbursementReportRepository.delete(condition);
    }
    async updateReport() {
        const result = await this.readReplicaReimbursementReportRepository
            .createQueryBuilder('reimbursementReport')
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
        const mainQuery = this.writeReplicaReimbursementReportRepository
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
        return await this.readReplicaReimbursementReportRepository
            .createQueryBuilder('reimbursementReport')
            .leftJoinAndMapOne(
                'reimbursementReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = reimbursementReport.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('reimbursementReport.request_date', 'ASC')
            .getOne();
    }
    async update(data) {
        const savedResult =
            this.writeReplicaReimbursementReportRepository.create(data);
        return await this.writeReplicaReimbursementReportRepository.save(
            savedResult,
        );
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaReimbursementReportRepository
            .createQueryBuilder()
            .where(condition).
            orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaReimbursementReportRepository
            .createQueryBuilder('reimbursementReport')
            .innerJoinAndMapOne(
                'reimbursementReport.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = reimbursementReport.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
}
