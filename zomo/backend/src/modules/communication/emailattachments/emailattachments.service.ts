import { appConstant, CommonArrayService, CommonFileService, CommunicationEmailAttachmentEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCommunicationInput } from "../../../input";
@Injectable()
export class EmailAttachmentsService {
    constructor(
        @InjectRepository(CommunicationEmailAttachmentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacommunicationEmailAttachmentRepository: Repository<CommunicationEmailAttachmentEntity>,
        @InjectRepository(CommunicationEmailAttachmentEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacommunicationEmailAttachmentRepository: Repository<CommunicationEmailAttachmentEntity>,
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
        const queryResult = await this.readReplicacommunicationEmailAttachmentRepository.createQueryBuilder('communication')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicacommunicationEmailAttachmentRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacommunicationEmailAttachmentRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicacommunicationEmailAttachmentRepository.create(data);
        return await this.writeReplicacommunicationEmailAttachmentRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacommunicationEmailAttachmentRepository.metadata);
        return await this.writeReplicacommunicationEmailAttachmentRepository.createQueryBuilder('communication')
            .update(CommunicationEmailAttachmentEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicacommunicationEmailAttachmentRepository.delete(condition);
    }
    async listRecordWithType(condition: any, orderBy: any = null, feilds: string[] = ['attachment', 'type']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let result = await this.readReplicacommunicationEmailAttachmentRepository.createQueryBuilder('attachment')
            .innerJoinAndMapOne(
                'attachment.type',
                tableConstant.COMMUNICATION.TBL_COM_EMAIL_ATTACHMENT_TYPE,
                'type',
                `type.id = attachment.attachment_type_id`,
            )
            .where(condition)
            .orderBy(orderBy)
            .select(feilds)
            .getMany();
        return result;
    }
}