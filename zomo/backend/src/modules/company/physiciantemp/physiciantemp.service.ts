import { appConstant, CommonArrayService, CommonFileService, PhysicianTempsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginatePhysicianTempInput } from "../../../input";
@Injectable()
export class PhysicianTempService {
    constructor(
        @InjectRepository(PhysicianTempsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaphysicianTempRepository: Repository<PhysicianTempsEntity>,
        @InjectRepository(PhysicianTempsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaphysicianTempRepository: Repository<PhysicianTempsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginatePhysicianTempInput) {
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
                : 'physicianTemp.id';
        const queryResult = await this.readReplicaphysicianTempRepository.createQueryBuilder('physicianTemp')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaphysicianTempRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaphysicianTempRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaphysicianTempRepository.create(data);
        return await this.writeReplicaphysicianTempRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaphysicianTempRepository.metadata);
        return await this.writeReplicaphysicianTempRepository.createQueryBuilder('physicianTemp')
            .update(PhysicianTempsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaphysicianTempRepository.delete(condition);
    }
}