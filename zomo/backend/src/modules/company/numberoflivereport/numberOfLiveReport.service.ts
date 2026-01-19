import { appConstant, CommonArrayService, CommonFileService, CompanyNumberOfLiveReportsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeleteResult, FindOptionsWhere, InsertResult, Repository, UpdateResult } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class CompanyNumberOfLiveReportsService {
    constructor(
        @InjectRepository(CompanyNumberOfLiveReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacompanyNumberOfLiveReportsRepository: Repository<CompanyNumberOfLiveReportsEntity>,
        @InjectRepository(CompanyNumberOfLiveReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacompanyNumberOfLiveReportsRepository: Repository<CompanyNumberOfLiveReportsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: string, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order
            ? paginationParam.order
            : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'numberOfLiveReports.id';
        const queryResult = await this.readReplicacompanyNumberOfLiveReportsRepository.createQueryBuilder('numberOfLiveReports')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: FindOptionsWhere<CompanyNumberOfLiveReportsEntity>, select: any[] = []): Promise<CompanyNumberOfLiveReportsEntity | null> {
        return await this.readReplicacompanyNumberOfLiveReportsRepository.findOne({
            where: condition,
            select: select
        });
    }
    async listRecord(condition: FindOptionsWhere<CompanyNumberOfLiveReportsEntity>, orderBy: object = null): Promise<CompanyNumberOfLiveReportsEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacompanyNumberOfLiveReportsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: CompanyNumberOfLiveReportsEntity): Promise<InsertResult> {
        const savedResult = this.writeReplicacompanyNumberOfLiveReportsRepository.create(data);
        return await this.writeReplicacompanyNumberOfLiveReportsRepository.insert(savedResult);
    }
    async update(condition: string | object, data: CompanyNumberOfLiveReportsEntity): Promise<UpdateResult> {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacompanyNumberOfLiveReportsRepository.metadata);
        return await this.writeReplicacompanyNumberOfLiveReportsRepository.createQueryBuilder('numberOfLiveReports')
            .update(CompanyNumberOfLiveReportsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: FindOptionsWhere<CompanyNumberOfLiveReportsEntity>): Promise<DeleteResult> {
        return await this.writeReplicacompanyNumberOfLiveReportsRepository.delete(condition);
    }
}