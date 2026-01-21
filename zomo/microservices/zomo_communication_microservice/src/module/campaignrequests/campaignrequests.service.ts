import { appConstant, EmailCampaignRequestsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CampaignRequestsService {
    constructor(
        @InjectRepository(EmailCampaignRequestsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignRequestsRepository: Repository<EmailCampaignRequestsEntity>,
        @InjectRepository(EmailCampaignRequestsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignRequestsRepository: Repository<EmailCampaignRequestsEntity>,
    ) {}
    async createCampaignRequests(data: any) {
        try {
        const savedResult = this.writeReplicaCampaignRequestsRepository.create(data);
        return await this.writeReplicaCampaignRequestsRepository.insert(savedResult);
         } catch (error) {console.log("MICROSERVICE ERROR:", error); 
             throw error;
         }
    }
    async updateCampaignRequests(condition: any, data: any) {
        return await this.writeReplicaCampaignRequestsRepository
            .createQueryBuilder('communication')
            .update(EmailCampaignRequestsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async updateMultipleCampaignRequests(condition: any, data: any) {
        return await this.writeReplicaCampaignRequestsRepository
            .createQueryBuilder('communication')
            .update(EmailCampaignRequestsEntity)
            .set(data)
            .whereInIds(condition)
            .execute();
    }
    async deleteCampaignRequests(condition: any) {
        return await this.writeReplicaCampaignRequestsRepository.delete(condition);
    }
    async listCampaignRequests(condition: any) {
        return await this.readReplicaCampaignRequestsRepository
            .createQueryBuilder('communication')
            .where(condition)
            .getMany();
    }
    async getOneCampaignRequests(condition: any) {
        return await this.readReplicaCampaignRequestsRepository
            .createQueryBuilder('communication')
            .where(condition)
            .getOne();
    }
    async getFirstCampaignRequests(condition: any) {
        return await this.readReplicaCampaignRequestsRepository
            .createQueryBuilder('communication')
            .where(condition)
            .orderBy('communication.id', 'ASC')
            .getOne();
    }
    async getListHashCampaignRequests(condition: any) {
        return await this.readReplicaCampaignRequestsRepository
            .createQueryBuilder('communication')
            .select(['communication.hash','communication.hash'])
            .where(condition)
            .orderBy('communication.id', 'ASC')
            .getRawMany();
    }
    async paginateCampaignRequests(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaCampaignRequestsRepository
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
    async getOneCampaignRequestsCheck(postData: any) {
        try{
            const getData = postData[0];
            const type = postData[1];
            let where_con_e0 = '';
            let where_con_e1 = '';
            let where_con_e2 = '';
            let where_con_e3 = '';
            let where_con_e4 = '';
            if(type == 'firstCheck'){
                where_con_e0 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.status = 1`;
                where_con_e1 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.request_status = 0 AND com_email_campaigns_requests.request_flag = 0 AND com_email_campaigns_requests.status = 1`;
                where_con_e2 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.request_status = 4 AND com_email_campaigns_requests.request_flag = 0 AND com_email_campaigns_requests.status = 1`;
                where_con_e3 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.request_status = 3 AND com_email_campaigns_requests.request_flag = 0 AND com_email_campaigns_requests.status = 1`;
                where_con_e4 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.request_status = 5 AND com_email_campaigns_requests.request_flag = 0 AND com_email_campaigns_requests.status = 1`;
            }else{
                where_con_e0 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.status = 1`;
                where_con_e1 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.request_status != 0 AND com_email_campaigns_requests.request_flag != 0 AND com_email_campaigns_requests.status != 1`;
                where_con_e2 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.request_status != 4 AND com_email_campaigns_requests.request_flag = 0 AND com_email_campaigns_requests.status != 1`;
                where_con_e3 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.request_status != 3 AND com_email_campaigns_requests.request_flag = 0 AND com_email_campaigns_requests.status != 1`;
                where_con_e4 = `com_email_campaigns_requests.id = ${getData.id} AND com_email_campaigns_requests.hash = '${getData.hash}' AND com_email_campaigns_requests.request_status != 5 AND com_email_campaigns_requests.request_flag = 0 AND com_email_campaigns_requests.status != 1`;
            }
            return await this.readReplicaCampaignRequestsRepository
                .createQueryBuilder('communication')
                .select([
                    `(SELECT COUNT(*) FROM com_email_campaigns_requests WHERE ${where_con_e0}) AS checkCampaign`,
                    `(SELECT COUNT(*) FROM com_email_campaigns_requests WHERE ${where_con_e1}) AS pendingCampaign`,
                    `(SELECT COUNT(*) FROM com_email_campaigns_requests WHERE ${where_con_e2}) AS draftCampaign`,
                    `(SELECT COUNT(*) FROM com_email_campaigns_requests WHERE ${where_con_e3}) AS pausedCampaign`,
                    `(SELECT COUNT(*) FROM com_email_campaigns_requests WHERE ${where_con_e4}) AS resumeCampaign`,
                ])
                .getRawOne();
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async getAllGroupCampaigns(condition: any) {
        return await this.readReplicaCampaignRequestsRepository
            .createQueryBuilder('communication')
            .where(condition)
            .orderBy('communication.id', 'ASC')
            .getMany();
    } 
}
