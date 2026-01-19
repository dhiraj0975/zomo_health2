import { appConstant, EmailCampaignTemplatesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CampaignTemplatesService {
    constructor(
        @InjectRepository(EmailCampaignTemplatesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignTemplatesRepository: Repository<EmailCampaignTemplatesEntity>,
        @InjectRepository(EmailCampaignTemplatesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignTemplatesRepository: Repository<EmailCampaignTemplatesEntity>,
    ) {}
    async createCampaignTemplates(data: any) {
        const savedResult = this.writeReplicaCampaignTemplatesRepository.create(data);
        return await this.writeReplicaCampaignTemplatesRepository.insert(savedResult);
    }
    async updateCampaignTemplates(condition: any, data: any) {
        return await this.writeReplicaCampaignTemplatesRepository
            .createQueryBuilder('communication')
            .update(EmailCampaignTemplatesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async statusCampaignTemplates(condition: any, data: any) {
        return await this.writeReplicaCampaignTemplatesRepository
            .createQueryBuilder('communication')
            .update(EmailCampaignTemplatesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listCampaignTemplates(condition: any) {
        return await this.readReplicaCampaignTemplatesRepository
            .createQueryBuilder('communication')
            .where(condition)
            .getMany();
    }
    async getOneCampaignTemplates(condition: any) {
        return await this.readReplicaCampaignTemplatesRepository
            .createQueryBuilder('communication')
            .where(condition)
            .getOne();
    }
    async paginateCampaignTemplates(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaCampaignTemplatesRepository
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
