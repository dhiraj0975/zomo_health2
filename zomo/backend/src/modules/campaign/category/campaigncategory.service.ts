import { appConstant, CampaignCategoryEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class CampaignCategoryService {
    constructor(
        @InjectRepository(CampaignCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignCategoryRepository: Repository<CampaignCategoryEntity>,
        @InjectRepository(CampaignCategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignCategoryRepository: Repository<CampaignCategoryEntity>,
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
                : 'campaigncategory.id';
        const queryResult = await this.readReplicaCampaignCategoryRepository.createQueryBuilder('campaigncategory')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCampaignCategoryRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['campaigncategory.id', 'campaigncategory.cust_name', 'campaigncategory.campaign_id', 'campaigncategory.category_id','category'], isJoin:any = 'yes') {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaCampaignCategoryRepository.createQueryBuilder('campaigncategory');
        if(isJoin == 'yes'){
            query = query
            .leftJoinAndMapOne(
                'campaigncategory.category',
                tableConstant.ACTIVITIES.TBL_CATEGORIES,
                'category',
                `category.id = campaigncategory.category_id AND category.status = 1`,
            );
        }
        query = query.where(condition)
        .select(fields)
        .orderBy(`campaigncategory.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return await query.getMany();
    }
    async loglistRecord(condition: any, orderBy: any = null, fields: any = ['campaigncategory.id', 'campaigncategory.cust_name', 'campaigncategory.campaign_id', 'campaigncategory.category_id']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignCategoryRepository.createQueryBuilder('campaigncategory')
        .select(fields)
        .where(condition)
        .orderBy(`campaigncategory.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCampaignCategoryRepository.create(data);
        return await this.writeReplicaCampaignCategoryRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCampaignCategoryRepository.metadata);
        return await this.writeReplicaCampaignCategoryRepository.createQueryBuilder('campaigncategory')
            .update(CampaignCategoryEntity)
            .set(data)
            .where(condition)
            .execute();
    }

    async assignCategoryCampaignPaginate(condition: any, paginationParam: PaginateWithCampaignInput, fields: any = ['campaigncategory', 'activity']) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const queryResult:any = await this.writeReplicaCampaignCategoryRepository.createQueryBuilder('campaigncategory')
        .innerJoinAndMapOne(
            'campaigncategory.campaign',
            tableConstant.CAMPAIGN.TBL_CAMPAIGN,
            'campaign',
            `campaigncategory.campaign_id = campaign.id and campaign.status != 2`,
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
            'campaigncategory.id': 'ASC',
        })
        .groupBy('campaigncategory.campaign_id')
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async assignCategoryCampaignIds(condition: any, orderBy: any = null, fields: any = ['id']) {
        if (!orderBy) {
            orderBy = { order_id: 'ASC' };
        }
        let recordData = await this.writeReplicaCampaignCategoryRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
        return recordData.map((item) => item.id);
    }
}
