import { appConstant, AutoReportSettingsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PaginateInput } from "src/input";
import { Repository } from "typeorm";
@Injectable()
export class AutoReportSettingService {
    constructor(
        @InjectRepository(AutoReportSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAutoReportSettingsRepository: Repository<AutoReportSettingsEntity>,
        @InjectRepository(AutoReportSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAutoReportSettingsRepository: Repository<AutoReportSettingsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateInput) {
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
                ? paginationParam.order_by
                : 'id';
        const queryResult = await this.readReplicaAutoReportSettingsRepository.createQueryBuilder('autoReport')
            .where(condition)
            .leftJoinAndMapOne(
                'autoReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = autoReport.org_id AND company.status = 1`,
            )
            .orderBy(`autoReport.${orderBy}`, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, fields: any[] = ['autoReport', 'company.id', 'company.code', 'company.company_name']) {
        return await this.readReplicaAutoReportSettingsRepository.createQueryBuilder('autoReport')
            .leftJoinAndMapOne(
                'autoReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = autoReport.org_id AND company.status = 1`,
            )
            .where(condition)
            .select(fields)
            .orderBy('autoReport.id', 'DESC')
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAutoReportSettingsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAutoReportSettingsRepository.create(data);
        return await this.writeReplicaAutoReportSettingsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAutoReportSettingsRepository.metadata);
        return await this.writeReplicaAutoReportSettingsRepository.createQueryBuilder('autoReport')
            .update(AutoReportSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAutoReportSettingsRepository.delete(condition);
    }
}