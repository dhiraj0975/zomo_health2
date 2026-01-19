import { appConstant, CampaignActivityEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class CampaignActivityService {
    constructor(
        @InjectRepository(CampaignActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
        @InjectRepository(CampaignActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
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
                ? paginationParam.order_by
                : 'campaignactivity.id';
        const queryResult = await this.readReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCampaignActivityRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['campaignactivity.id','campaignactivity.campaign_id','campaignactivity.activity_id'], isJoin:any = 'yes') {
        if (!orderBy) {
            orderBy = { order_id: 'ASC' };
        }
        let query = this.readReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity')
        .leftJoinAndMapOne(
            'campaignactivity.activity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'activity',
            `activity.id = campaignactivity.activity_id AND activity.status != '2'`,
        );
        if(isJoin == 'yes'){
            query = query
            .leftJoinAndMapOne(
                'campaignactivity.campaign',
                tableConstant.CAMPAIGN.TBL_CAMPAIGN,
                'campaign',
                `campaign.id = campaignactivity.campaign_id AND campaign.status = 1`,
            )
            .leftJoinAndMapOne(
                'campaignactivity.category',
                tableConstant.ACTIVITIES.TBL_CATEGORIES,
                'category',
                `category.id = activity.category_id AND category.status = 1`,
            );
        }
        query = query.where(condition)
        .select(fields)
        .orderBy(`campaignactivity.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return await query.getMany();
    }
    async loglistRecord(condition: any, orderBy: any = null, fields: any = ['campaignactivity.id','campaignactivity.campaign_id','campaignactivity.activity_id','campaignactivity.cust_name']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity')
        .where(condition)
        .select(fields)
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCampaignActivityRepository.create(data);
        return await this.writeReplicaCampaignActivityRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCampaignActivityRepository.metadata);
        return await this.writeReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity')
            .update(CampaignActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async campaignActivityList(condition: any, fields: any = ['campaignactivity', 'activity']) {
        return await this.readReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity')
            .leftJoinAndMapOne(
                'campaignactivity.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `campaignactivity.activity_id = activity.id `,
            )
            .where(condition)
            .select(fields)
            .orderBy({
                'campaignactivity.required_by_spouse': 'DESC',
                'campaignactivity.required_by_user': 'DESC',
                'campaignactivity.end_date': 'ASC',
                'campaignactivity.cust_name': 'ASC',
                'activity.activity_name': 'ASC'
            })
            .getMany();
    }
    async assignActivityCampaignPaginate(condition: any, paginationParam: PaginateWithCompanyInput, fields: any = ['campaignactivity', 'activity']) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const queryResult:any = await this.readReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity')
        .innerJoinAndMapOne(
            'campaignactivity.campaign',
            tableConstant.CAMPAIGN.TBL_CAMPAIGN,
            'campaign',
            `campaignactivity.campaign_id = campaign.id and campaign.status != 2`,
        )
        .leftJoinAndMapOne(
            'campaign.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `campaign.organization_id = company.id and company.deleted = 0`,
        )
        .where(condition)
        .select(fields)
        .orderBy({
            'campaignactivity.id': 'ASC',
        })
        .groupBy('campaignactivity.campaign_id')
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async assignActivityCampaignIds(condition: any, orderBy: any = null, fields: any = ['id']) {
        if (!orderBy) {
            orderBy = { order_id: 'ASC' };
        }
        let recordData = await this.readReplicaCampaignActivityRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
        return recordData.map((item) => item.id);
    }
}
