import { appConstant, CommonArrayService, CommonFileService, QuickLinkReportEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuickLinkReportService {
    constructor(
        @InjectRepository(QuickLinkReportEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkReportRepository: Repository<QuickLinkReportEntity>,
        @InjectRepository(QuickLinkReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSurveyPopupRepository: Repository<QuickLinkReportEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(field,condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? `report.${paginationParam.order_by}`
                : 'report.created_date';
        var queryResult = await this.readReplicaQuickLinkReportRepository.createQueryBuilder('report')
            .select(field)
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSurveyPopupRepository.create(data);
        return await this.writeReplicaSurveyPopupRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSurveyPopupRepository.metadata);
        return await this.writeReplicaSurveyPopupRepository.createQueryBuilder('report')
            .update(QuickLinkReportEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaSurveyPopupRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkReportRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkReportRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async updateReport() {
        await this.writeReplicaSurveyPopupRepository.createQueryBuilder('quicklinkReport')
            .update()
            .set({
                total_download: () => 'CAST(total_download AS UNSIGNED) + 1', // Correctly increment `total_download`
                status: 0, // Set `status` to 0
            })
            .where('created_date < NOW() - INTERVAL 2 HOUR') // Condition for `created_date`
            .andWhere('status = 2') // Condition for `status`
            .andWhere('total_download < 4') // Condition for `total_download`
            .limit(1) // Limit to 1 record
            .execute();
    }
    async findOneReport(condition: any) {
        return await this.readReplicaQuickLinkReportRepository.createQueryBuilder('quicklinkReport')
        .leftJoinAndMapOne(
            'quicklinkReport.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = quicklinkReport.org_id`,
          )
        .where(condition)
        .limit(1)
        .orderBy('quicklinkReport.request_date','ASC')
        .getOne();
    }
}
