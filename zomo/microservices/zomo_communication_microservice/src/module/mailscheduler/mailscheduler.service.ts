import { appConstant, MailSchedulersEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MailSchedulerService {
    constructor(
        @InjectRepository(MailSchedulersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMailSchedulerRepository: Repository<MailSchedulersEntity>,
        @InjectRepository(MailSchedulersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMailSchedulerRepository: Repository<MailSchedulersEntity>,
    ) {}
    async createMailScheduler(data: any) {
        const savedResult = this.writeReplicaMailSchedulerRepository.create(data);
        return await this.writeReplicaMailSchedulerRepository.insert(savedResult);
    }
    async updateMailScheduler(condition: any, data: any) {
        return await this.writeReplicaMailSchedulerRepository
            .createQueryBuilder('communication')
            .update(MailSchedulersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteMailScheduler(condition: any) {
        return await this.writeReplicaMailSchedulerRepository.delete(condition);
    }
    async listMailScheduler(condition: any) {
        return await this.readReplicaMailSchedulerRepository
            .createQueryBuilder('communication')
            .where(condition)
            .getMany();
    }
    async getOneMailScheduler(condition: any) {
        return await this.readReplicaMailSchedulerRepository
            .createQueryBuilder('communication')
            .where(condition)
            .getOne();
    }
    async paginateMailScheduler(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaMailSchedulerRepository
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
    async getOneCampaignRequestsScheduleCheck(postData: any) {
        try{
            const getData = postData[0];
            const type = postData[1];
            let where_con_e0 = '';
            if(type == 'group'){
                where_con_e0 = `com_mail_schedulers.status = 0 AND com_mail_schedulers.campaign_id = '${getData.id}' AND com_mail_schedulers.parent_campaign_id = '${getData.id}'`;
            }else{
                where_con_e0 = `com_mail_schedulers.status = 0 AND com_mail_schedulers.campaign_id = '${getData.id}'`;
            }
            return await this.readReplicaMailSchedulerRepository
                .createQueryBuilder('communication')
                .select([
                    `(SELECT COUNT(*) FROM com_mail_schedulers WHERE ${where_con_e0}) AS checkCampaignSchedule`,
                ])
                .getRawOne();
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}
