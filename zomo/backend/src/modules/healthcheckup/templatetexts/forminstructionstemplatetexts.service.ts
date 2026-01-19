import { appConstant, CommonArrayService, CommonFileService, ForminstructionsTemplateTextsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class ForminstructionsTemplateTextsService {
    constructor(
        @InjectRepository(ForminstructionsTemplateTextsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaForminstructionsTemplateTextRepository: Repository<ForminstructionsTemplateTextsEntity>,
        @InjectRepository(ForminstructionsTemplateTextsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaForminstructionsTemplateTextRepository: Repository<ForminstructionsTemplateTextsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
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
                : 'hcforminstructionstempletetexts.created';
        var queryResult = await this.readReplicaForminstructionsTemplateTextRepository.createQueryBuilder('hcforminstructionstempletetexts')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaForminstructionsTemplateTextRepository.create(data);
        return await this.writeReplicaForminstructionsTemplateTextRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaForminstructionsTemplateTextRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaForminstructionsTemplateTextRepository.metadata);
        return await this.writeReplicaForminstructionsTemplateTextRepository.createQueryBuilder('hcforminstructionstempletetexts')
            .update(ForminstructionsTemplateTextsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaForminstructionsTemplateTextRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaForminstructionsTemplateTextRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async createUpdate(condition: any, data: any) {       
        data = await this.commonFileService.filterDataByEntityColumns(data, this.readReplicaForminstructionsTemplateTextRepository.metadata);
        let recordDetails = await this.readReplicaForminstructionsTemplateTextRepository.findOne({ where: condition });       
        if (recordDetails) {
            await this.writeReplicaForminstructionsTemplateTextRepository.update(condition, data);
            return {...recordDetails, update:1};
        } else {
            return await this.writeReplicaForminstructionsTemplateTextRepository.save(data);
        }
    }
}