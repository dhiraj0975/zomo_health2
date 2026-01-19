import { appConstant, ClaimReportsEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class ClaimReportsService {
    constructor(
        @InjectRepository(ClaimReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaclaimReportRepository: Repository<ClaimReportsEntity>,
        @InjectRepository(ClaimReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaclaimReportRepository: Repository<ClaimReportsEntity>,
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
                : 'claimReport.id';
        const queryResult = await this.readReplicaclaimReportRepository.createQueryBuilder('claimReport')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaclaimReportRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaclaimReportRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaclaimReportRepository.create(data);
        return await this.writeReplicaclaimReportRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaclaimReportRepository.metadata);
        return await this.writeReplicaclaimReportRepository.createQueryBuilder('claimReport')
            .update(ClaimReportsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaclaimReportRepository.delete(condition);
    }
}