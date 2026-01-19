import { appConstant, CommonArrayService, CommonFileService, CompanyMasscommunicationEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MassCommunicationService {
    constructor(
        @InjectRepository(CompanyMasscommunicationEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicamasscommunicationRepository: Repository<CompanyMasscommunicationEntity>,
        @InjectRepository(CompanyMasscommunicationEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicamasscommunicationRepository: Repository<CompanyMasscommunicationEntity>,
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
                : 'masscommunication.request_date';
        const queryResult = await this.readReplicamasscommunicationRepository.createQueryBuilder('masscommunication')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicamasscommunicationRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicamasscommunicationRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicamasscommunicationRepository.create(data);
        return await this.writeReplicamasscommunicationRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicamasscommunicationRepository.metadata);
        return await this.writeReplicamasscommunicationRepository.createQueryBuilder('masscommunication')
            .update(CompanyMasscommunicationEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicamasscommunicationRepository.delete(condition);
    }
}