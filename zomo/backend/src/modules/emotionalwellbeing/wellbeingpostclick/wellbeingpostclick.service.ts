import { appConstant, CommonArrayService, CommonFileService, EmotionalWellBeingPostClickEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithEmotionalWellBeingInput } from "../../../input";
@Injectable()
export class WellBeingPostClickService {
    constructor(
        @InjectRepository(EmotionalWellBeingPostClickEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingPostClickRepository: Repository<EmotionalWellBeingPostClickEntity>,
        @InjectRepository(EmotionalWellBeingPostClickEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWellbeingPostClickRepository: Repository<EmotionalWellBeingPostClickEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithEmotionalWellBeingInput) {
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
                : 'wellbeing.id';
        const queryResult = await this.readReplicaWellbeingPostClickRepository.createQueryBuilder('wellbeing')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, fields: any = [],orderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'wellbeing.id': 'DESC' };
        }
        return await this.readReplicaWellbeingPostClickRepository.createQueryBuilder('wellbeing')
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['wellbeing.*']) {
        if (!orderBy) {
            orderBy = { 'wellbeing.id': 'DESC' };
        }
        return await this.readReplicaWellbeingPostClickRepository.createQueryBuilder('wellbeing')
        .where(condition)
        .select(fields)
        .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaWellbeingPostClickRepository.create(data);
        return await this.writeReplicaWellbeingPostClickRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaWellbeingPostClickRepository.metadata);
        return await this.writeReplicaWellbeingPostClickRepository.createQueryBuilder('wellbeing')
            .update(EmotionalWellBeingPostClickEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaWellbeingPostClickRepository.delete(condition);
    }
}
