import { appConstant, CommonArrayService, CommonFileService, CompanySupportsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCompanySupportInput, PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class SupportService {
    constructor(
        @InjectRepository(CompanySupportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicasupportRepository: Repository<CompanySupportsEntity>,
        @InjectRepository(CompanySupportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicasupportRepository: Repository<CompanySupportsEntity>,
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
                : 'support.id';
        const queryResult = await this.readReplicasupportRepository.createQueryBuilder('support')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicasupportRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicasupportRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: CreateCompanySupportInput) {
        const savedResult = this.writeReplicasupportRepository.create(data);
        return await this.writeReplicasupportRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicasupportRepository.metadata);
        return await this.writeReplicasupportRepository.createQueryBuilder('support')
            .update(CompanySupportsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicasupportRepository.delete(condition);
    }
}