import { appConstant, CommonArrayService, CommonFileService, CompanyReportMenuSettingsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class ReportMenuSettingsService {
    constructor(
        @InjectRepository(CompanyReportMenuSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicareportMenuSettingsRepository: Repository<CompanyReportMenuSettingsEntity>,
        @InjectRepository(CompanyReportMenuSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicareportMenuSettingsRepository: Repository<CompanyReportMenuSettingsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
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
                : 'reportMenuSettings.id';
        const queryResult = await this.readReplicareportMenuSettingsRepository.createQueryBuilder('reportMenuSettings')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicareportMenuSettingsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicareportMenuSettingsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicareportMenuSettingsRepository.create(data);
        return await this.writeReplicareportMenuSettingsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicareportMenuSettingsRepository.metadata);
        return await this.writeReplicareportMenuSettingsRepository.createQueryBuilder('reportMenuSettings')
            .update(CompanyReportMenuSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicareportMenuSettingsRepository.delete(condition);
    }
}