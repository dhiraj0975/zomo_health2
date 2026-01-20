import { appConstant, CommonArrayService, CommonFileService, CommunicationEmailToEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsSelect, Repository } from "typeorm";
import { PaginateWithCommunicationInput } from "../../../input";
@Injectable()
export class CommunicationEmailToService {
    constructor(
        @InjectRepository(CommunicationEmailToEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacommunicationEmailRepository: Repository<CommunicationEmailToEntity>,
        @InjectRepository(CommunicationEmailToEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacommunicationEmailRepository: Repository<CommunicationEmailToEntity>,
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
                : 'communication.created_date';
        const queryResult = await this.readReplicacommunicationEmailRepository.createQueryBuilder('communication')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicacommunicationEmailRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: FindOptionsSelect<CommunicationEmailToEntity> = {} ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacommunicationEmailRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicacommunicationEmailRepository.create(data);
        return await this.writeReplicacommunicationEmailRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacommunicationEmailRepository.metadata);
        return await this.writeReplicacommunicationEmailRepository.createQueryBuilder('communication')
            .update(CommunicationEmailToEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicacommunicationEmailRepository.delete(condition);
    }
}