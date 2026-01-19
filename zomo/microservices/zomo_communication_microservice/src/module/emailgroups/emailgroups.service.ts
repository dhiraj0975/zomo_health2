import { appConstant, EmailGroupsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class EmailGroupsService {
    constructor(
        @InjectRepository(EmailGroupsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEmailGroupsRepository: Repository<EmailGroupsEntity>,
        @InjectRepository(EmailGroupsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEmailGroupsRepository: Repository<EmailGroupsEntity>,
    ) {}
    async createEmailGroups(data: any) {
        const savedResult = this.writeReplicaEmailGroupsRepository.create(data);
        return await this.writeReplicaEmailGroupsRepository.insert(savedResult);
    }
    async updateEmailGroups(condition: any, data: any) {
        return await this.writeReplicaEmailGroupsRepository
            .createQueryBuilder('communication')
            .update(EmailGroupsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async statusEmailGroups(condition: any, data: any) {
        return await this.writeReplicaEmailGroupsRepository
            .createQueryBuilder('communication')
            .update(EmailGroupsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listEmailGroups(condition: any) {
        return await this.readReplicaEmailGroupsRepository
            .createQueryBuilder('communication')
            .select(['communication.id', 'communication.group_name'])
            .where(condition)
            .getMany();
    }
    async getOneEmailGroups(condition: any) {
        return await this.readReplicaEmailGroupsRepository
            .createQueryBuilder('communication')
            .select(['communication.id', 'communication.group_name','communication.status','communication.orgs_ids'])
            .where(condition)
            .getOne();
    }
    async paginateEmailGroups(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaEmailGroupsRepository
            .createQueryBuilder('communication')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return {
            list: result,
            total: total,
            pages: Math.ceil(total / paginateObj.take),
            limit: paginateObj.take,
            page: paginateObj.page,
        };
    }
}
