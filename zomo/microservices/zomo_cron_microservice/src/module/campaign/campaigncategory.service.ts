import { appConstant, CampaignCategoryEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CampaignCategoryService {
    constructor(
        @InjectRepository(CampaignCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignCategoryRepository: Repository<CampaignCategoryEntity>,
        @InjectRepository(CampaignCategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignCategoryRepository: Repository<CampaignCategoryEntity>,
    ) {}
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
    
}
