import { appConstant, EmailConfigEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class EmailConfigsService {
    constructor(
        @InjectRepository(EmailConfigEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEmailConfigsRepository: Repository<EmailConfigEntity>,
        @InjectRepository(EmailConfigEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEmailConfigsRepository: Repository<EmailConfigEntity>,
    ) {}
    async createEmailConfigs(data: any) {
        const savedResult = this.writeReplicaEmailConfigsRepository.create(data);
        return await this.writeReplicaEmailConfigsRepository.insert(savedResult);
    }
    async updateEmailConfigs(condition: any, data: any) {
        return await this.writeReplicaEmailConfigsRepository
            .createQueryBuilder('communication')
            .update(EmailConfigEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async statusEmailConfigs(condition: any, data: any) {
        return await this.writeReplicaEmailConfigsRepository
            .createQueryBuilder('communication')
            .update(EmailConfigEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listEmailConfigs(condition: any) {
        return await this.readReplicaEmailConfigsRepository
            .createQueryBuilder('communication')
            .select(['communication.id', 'communication.email'])
            .where(condition)
            .getMany();
    }
    async getOneEmailConfigs(condition: any) {
        return await this.readReplicaEmailConfigsRepository
            .createQueryBuilder('communication')
            .select(['communication.id', 'communication.first_name','communication.last_name','communication.email','communication.source'])
            .where(condition)
            .getOne();
    }
    async paginateEmailConfigs(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaEmailConfigsRepository
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
