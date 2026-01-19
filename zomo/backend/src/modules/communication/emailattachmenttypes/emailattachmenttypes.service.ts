import { appConstant, CommonArrayService, CommonFileService, CommunicationEmailAttachmentTypeEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCommunicationInput } from "../../../input";
@Injectable()
export class EmailAttachmentTypesService {
    constructor(
        @InjectRepository(CommunicationEmailAttachmentTypeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacommunicationEmailAttachmentTypeRepository: Repository<CommunicationEmailAttachmentTypeEntity>,
        @InjectRepository(CommunicationEmailAttachmentTypeEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacommunicationEmailAttachmentTypeRepository: Repository<CommunicationEmailAttachmentTypeEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithCommunicationInput) {
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
                : 'communication.id';
        const queryResult = await this.readReplicacommunicationEmailAttachmentTypeRepository.createQueryBuilder('communication')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicacommunicationEmailAttachmentTypeRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacommunicationEmailAttachmentTypeRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicacommunicationEmailAttachmentTypeRepository.create(data);
        return await this.writeReplicacommunicationEmailAttachmentTypeRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacommunicationEmailAttachmentTypeRepository.metadata);
        return await this.writeReplicacommunicationEmailAttachmentTypeRepository.createQueryBuilder('communication')
            .update(CommunicationEmailAttachmentTypeEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicacommunicationEmailAttachmentTypeRepository.delete(condition);
    }
}