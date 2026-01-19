import {
    appConstant,
    QuickLinkReReportEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuickLinkReportService {
    constructor(
        @InjectRepository(
            QuickLinkReReportEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQuickLinkReReportRepository: Repository<QuickLinkReReportEntity>,
        @InjectRepository(
            QuickLinkReReportEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaQuickLinkReReportRepository: Repository<QuickLinkReReportEntity>,
    ) {}
    async save(data: any) {
        const savedResult =
            this.writeReplicaQuickLinkReReportRepository.create(data);
        return await this.writeReplicaQuickLinkReReportRepository.save(
            savedResult,
        );
    }
    async delete(condition: any) {
        await this.writeReplicaQuickLinkReReportRepository.delete(condition);
    }
    async updateReport() {
        const result = await this.readReplicaQuickLinkReReportRepository
            .createQueryBuilder('quicklinkReport')
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
        const mainQuery = this.writeReplicaQuickLinkReReportRepository
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
        return await this.readReplicaQuickLinkReReportRepository
            .createQueryBuilder('quicklinkReport')
            .leftJoinAndMapOne(
                'quicklinkReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = quicklinkReport.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('quicklinkReport.request_date', 'ASC')
            .getOne();
    }
    async update(data) {
        const savedResult =
            this.writeReplicaQuickLinkReReportRepository.create(data);
        return await this.writeReplicaQuickLinkReReportRepository.save(
            savedResult,
        );
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaQuickLinkReReportRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaQuickLinkReReportRepository
            .createQueryBuilder('quicklinkReport')
            .innerJoinAndMapOne(
                'quicklinkReport.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = quicklinkReport.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
}
