import { appConstant, CommonArrayService, CommonFileService, EmotionalWellBeingTagAssignEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithEmotionalWellBeingInput } from "../../../input";
@Injectable()
export class WellBeingTagAssignService {
    constructor(
        @InjectRepository(EmotionalWellBeingTagAssignEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingTagRepository: Repository<EmotionalWellBeingTagAssignEntity>,
        @InjectRepository(EmotionalWellBeingTagAssignEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWellbeingTagRepository: Repository<EmotionalWellBeingTagAssignEntity>,
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
        .leftJoinAndMapOne(
            'wellbeing.tag',
            tableConstant.EMOTIONAL_WELLBEING.TBL_EM_TAG,
            'tag',
            `tag.id = wellbeing.t_id AND tag.status = 1`,
          )
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
        return await this.readReplicaWellbeingTagRepository.createQueryBuilder('wellbeing')
        .leftJoinAndMapOne(
            'wellbeing.tag',
            tableConstant.EMOTIONAL_WELLBEING.TBL_EM_TAG,
            'tag',
            `tag.id = wellbeing.t_id AND tag.status = 1`,
          )
            .where(condition)
            .orderBy(`wellbeing.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaWellbeingTagRepository.create(data);
        return await this.writeReplicaWellbeingTagRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaWellbeingTagRepository.metadata);
        return await this.writeReplicaWellbeingTagRepository.createQueryBuilder('wellbeing')
            .update(EmotionalWellBeingTagAssignEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaWellbeingTagRepository.delete(condition);
    }
}