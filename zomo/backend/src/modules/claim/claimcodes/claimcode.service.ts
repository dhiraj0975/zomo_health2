import { appConstant, ClaimCodesEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
@Injectable()
export class ClaimCodeService {
    constructor(
        @InjectRepository(ClaimCodesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaclaimCodeRepository: Repository<ClaimCodesEntity>,
        @InjectRepository(ClaimCodesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaclaimCodeRepository: Repository<ClaimCodesEntity>,
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
                : 'claimCode.id';
        const queryResult = await this.readReplicaclaimCodeRepository.createQueryBuilder('claimCode')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaclaimCodeRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaclaimCodeRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaclaimCodeRepository.create(data);
        return await this.writeReplicaclaimCodeRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaclaimCodeRepository.metadata);
        return await this.writeReplicaclaimCodeRepository.createQueryBuilder('claimCode')
            .update(ClaimCodesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaclaimCodeRepository.delete(condition);
    }
}