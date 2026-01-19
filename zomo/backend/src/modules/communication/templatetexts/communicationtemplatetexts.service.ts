import { appConstant, CommonArrayService, CommonFileService, CommunicationTemplateTextsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, FindOptionsWhere, InsertResult, Repository, UpdateResult } from "typeorm";
import { PaginateWithTemplateTextInput } from './input';
@Injectable()
export class CommunicationTemplateTextsService {
    constructor(
        @InjectRepository(CommunicationTemplateTextsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        @InjectRepository(CommunicationTemplateTextsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithTemplateTextInput) {
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
                : 'communication.created_date';
        const queryResult = await this.readReplicacommunicationTemplateTextsRepository.createQueryBuilder('communication')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: FindOptionsWhere<CommunicationTemplateTextsEntity>, orderBy: any = null): Promise<CommunicationTemplateTextsEntity | null> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacommunicationTemplateTextsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacommunicationTemplateTextsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: DeepPartial<CommunicationTemplateTextsEntity>): Promise<InsertResult> {
        const savedResult = this.writeReplicacommunicationTemplateTextsRepository.create(data);
        return await this.writeReplicacommunicationTemplateTextsRepository.insert(savedResult);
    }
    async update(condition: FindOptionsWhere<CommunicationTemplateTextsEntity>, data: DeepPartial<CommunicationTemplateTextsEntity>): Promise<UpdateResult> {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacommunicationTemplateTextsRepository.metadata);
        return await this.writeReplicacommunicationTemplateTextsRepository.createQueryBuilder('communication')
            .update(CommunicationTemplateTextsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicacommunicationTemplateTextsRepository.delete(condition);
    }
}