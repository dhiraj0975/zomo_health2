import { appConstant, CommonArrayService, CommonFileService, EmotionalWellBeingTagEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithEmotionalWellBeingInput } from "../../../input";
@Injectable()
export class WellBeingTagService {
    constructor(
        @InjectRepository(EmotionalWellBeingTagEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingTagRepository: Repository<EmotionalWellBeingTagEntity>,
        @InjectRepository(EmotionalWellBeingTagEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWellbeingTagRepository: Repository<EmotionalWellBeingTagEntity>,
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
        const queryResult = await this.readReplicaWellbeingTagRepository.createQueryBuilder('wellbeing')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaWellbeingTagRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWellbeingTagRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaWellbeingTagRepository.create(data);
        return await this.writeReplicaWellbeingTagRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaWellbeingTagRepository.metadata);
        return await this.writeReplicaWellbeingTagRepository.createQueryBuilder('wellbeing')
            .update(EmotionalWellBeingTagEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaWellbeingTagRepository.delete(condition);
    }
}