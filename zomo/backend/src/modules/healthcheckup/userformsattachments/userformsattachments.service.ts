import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    UserFormsAttachmentsEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class UserFormsAttachmentsService  extends BaseService<UserFormsAttachmentsEntity> {
    constructor(
        @InjectRepository(UserFormsAttachmentsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserFormsAttachmentsRepository: Repository<UserFormsAttachmentsEntity>,
        @InjectRepository(UserFormsAttachmentsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserFormsAttachmentsRepository: Repository<UserFormsAttachmentsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaUserFormsAttachmentsRepository, writeReplicaUserFormsAttachmentsRepository, 'userFormsAttachments', commonArrayService );
    }
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
                ? `userformsattachments.${paginationParam.order_by}`
                : 'userformsattachments.created';
        var queryResult = await this.readReplicaUserFormsAttachmentsRepository.createQueryBuilder('userformsattachments')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaUserFormsAttachmentsRepository.create(data);
        return await this.writeReplicaUserFormsAttachmentsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUserFormsAttachmentsRepository.metadata);
        return await this.writeReplicaUserFormsAttachmentsRepository.createQueryBuilder('userformsattachments')
            .update(UserFormsAttachmentsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaUserFormsAttachmentsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserFormsAttachmentsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserFormsAttachmentsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
