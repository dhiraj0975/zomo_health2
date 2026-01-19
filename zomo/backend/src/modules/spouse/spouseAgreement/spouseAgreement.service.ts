import { appConstant, CommonArrayService, CommonFileService, SpouseAgreementsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithSpouseInput } from "../../../input";
@Injectable()
export class SpouseAgreementService {
    constructor(
        @InjectRepository(SpouseAgreementsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSpouseAgreementRepository: Repository<SpouseAgreementsEntity>,
        @InjectRepository(SpouseAgreementsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSpouseAgreementRepository: Repository<SpouseAgreementsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithSpouseInput) {
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
                : 'spouseAgreement.id';
        const queryResult = await this.readReplicaSpouseAgreementRepository.createQueryBuilder('spouseAgreement')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaSpouseAgreementRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSpouseAgreementRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSpouseAgreementRepository.create(data);
        return await this.writeReplicaSpouseAgreementRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSpouseAgreementRepository.metadata);
        return await this.writeReplicaSpouseAgreementRepository.createQueryBuilder('spouseAgreement')
            .update(SpouseAgreementsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaSpouseAgreementRepository.delete(condition);
    }
}