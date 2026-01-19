import { appConstant, CommonArrayService, CommonFileService, FormSendRequestUserEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithCampaignInput } from 'src/modules/campaign/input';
import { Repository } from 'typeorm';
@Injectable()
export class FormSendRequestUserService {
    constructor(
        @InjectRepository(FormSendRequestUserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFormSendRequestUserRepository: Repository<FormSendRequestUserEntity>,
        @InjectRepository(FormSendRequestUserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFormSendRequestUserRepository: Repository<FormSendRequestUserEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
    async paginateList(condition: any, fields: any, paginationParam: PaginateWithCampaignInput) {
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
                : 'Formsendrequestuser.id';
        const queryResult = await this.readReplicaFormSendRequestUserRepository.createQueryBuilder('Formsendrequestuser')
            .leftJoinAndMapOne(
                'Formsendrequestuser.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = Formsendrequestuser.user_id`,
            )
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFormSendRequestUserRepository.create(data);
        return await this.writeReplicaFormSendRequestUserRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFormSendRequestUserRepository.metadata);
        return await this.writeReplicaFormSendRequestUserRepository.createQueryBuilder('zd')
            .update(FormSendRequestUserEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFormSendRequestUserRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFormSendRequestUserRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, limit: number = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFormSendRequestUserRepository.find({
            where: condition,
            order: orderBy,
            take: limit
        });
    }
}
