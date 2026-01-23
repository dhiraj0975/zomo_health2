import { appConstant, CommonArrayService, CommonFileService, CommunicationEmailEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsSelect, Repository } from "typeorm";
import { PaginateWithCommunicationInput } from "../../../input";
@Injectable()
export class CommunicationEmailService {
    constructor(
        @InjectRepository(CommunicationEmailEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacommunicationEmailRepository: Repository<CommunicationEmailEntity>,
        @InjectRepository(CommunicationEmailEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacommunicationEmailRepository: Repository<CommunicationEmailEntity>,
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
    async listRecord(condition: any, orderBy: any = null ,  fields: FindOptionsSelect<CommunicationEmailEntity> = {} ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacommunicationEmailRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async listRecordWithEmailToUser(condition: any, orderBy: any = null ,  fields: string[] = ['communication'] ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacommunicationEmailRepository.createQueryBuilder('communication')
            .innerJoinAndMapOne(
                'communication.EmailTo',
                tableConstant.COMMUNICATION.TBL_COM_EMAIL_TO,
                'EmailTo',
                `EmailTo.mail_id = communication.id`,
            )
            .leftJoinAndMapOne(
                'communication.suser',
                tableConstant.TBL_USERS,
                'suser',
                `suser.id = communication.from_user_id`,
            )
            .leftJoinAndMapOne(
                'communication.ruser',
                tableConstant.TBL_USERS,
                'ruser',
                `ruser.id = EmailTo.user_id`,
            )
            .where(condition)
            .select(fields)
            .orderBy(orderBy)
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicacommunicationEmailRepository.create(data);
        return await this.writeReplicacommunicationEmailRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacommunicationEmailRepository.metadata);
        return await this.writeReplicacommunicationEmailRepository.createQueryBuilder('communication')
            .update(CommunicationEmailEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicacommunicationEmailRepository.delete(condition);
    }
    async paginateWithEmT(condition: any, orderBy: any = null, fields: string[] = ['communication'],  paginationParam: PaginateWithCommunicationInput, subCondition: string = '') {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        if (!orderBy) {
            orderBy = { 'communication.id': 'DESC' };
        }
        const resultData = await this.readReplicacommunicationEmailRepository.createQueryBuilder('communication')
            .innerJoinAndMapOne(
                'communication.EmailTo',
                tableConstant.COMMUNICATION.TBL_COM_EMAIL_TO,
                'EmailTo',
                `EmailTo.mail_id = communication.id`,
            )
            .leftJoinAndMapMany(
                'communication.user',
                tableConstant.TBL_USERS,
                'user',
                `${subCondition}`,
            )
            .where(condition)
            .select(fields)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = resultData;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async count(condition: any) {
        return await this.readReplicacommunicationEmailRepository.count({
            where: condition,
        });
    }
}