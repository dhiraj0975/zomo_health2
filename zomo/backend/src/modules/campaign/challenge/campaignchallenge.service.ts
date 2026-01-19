import { appConstant, CampaignChallengeEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class CampaignChallengeService {
    constructor(
        @InjectRepository(CampaignChallengeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignChallengeRepository: Repository<CampaignChallengeEntity>,
        @InjectRepository(CampaignChallengeEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignChallengeRepository: Repository<CampaignChallengeEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCampaignInput) {
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
                : 'campaignchallenge.id';
        const queryResult = await this.readReplicaCampaignChallengeRepository.createQueryBuilder('campaignchallenge')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCampaignChallengeRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['campaignchallenge.id','campaignchallenge.campaign_id','campaignchallenge.challenge_id','campaignchallenge.challenge_schedule_id','campaignchallenge.start_date'], isJoin: any = 'no') {
        if (!orderBy) {
            orderBy = { order_id: 'DESC' };
        }
        let query = this.readReplicaCampaignChallengeRepository.createQueryBuilder('campaignchallenge');
        if(isJoin == 'yes') {
            query = query
            .leftJoinAndMapOne(
                'campaignchallenge.sc',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'sc',
                `sc.id = campaignchallenge.challenge_schedule_id AND sc.status = 1`,
            )
            .leftJoinAndMapOne(
                'campaignchallenge.ch',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'ch',
                `ch.id = campaignchallenge.challenge_id AND ch.status = 1`,
            );
        }
        query = query.where(condition)
        .select(fields);
        query = query.orderBy(`campaignchallenge.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        return await query.getMany();
    }
    async listRecorda(condition: any, orderBy: any = null, fields: any = ['id', 'campaign_id', 'challenge_id', 'challenge_schedule_id', 'start_date']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignChallengeRepository.find({
            where: condition,
            select: ['id', 'campaign_id', 'challenge_id','challenge_schedule_id','start_date'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCampaignChallengeRepository.create(data);
        return await this.writeReplicaCampaignChallengeRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCampaignChallengeRepository.metadata);
        return await this.writeReplicaCampaignChallengeRepository.createQueryBuilder('campaignchallenge')
            .update(CampaignChallengeEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
