import { appConstant, CampaignActivityEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CampaignActivityService {
    constructor(
        @InjectRepository(
            CampaignActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
    ) {}

    async campaignActivityData(
        fields: any[] = [],
        condition: any,
        orderBy: any = null,
        joinCondition: any[] = [],
        dataType: any = 'getOne',
    ) {
        try {
            if (!orderBy) {
                orderBy = { 'ca.id': 'DESC' };
            }
            let query: any =
                this.readReplicaCampaignActivityRepository.createQueryBuilder(
                    'ca',
                );
            if (joinCondition && joinCondition?.length > 0) {
                for (let i = 0; i < joinCondition?.length; i++) {
                    const {
                        join_table,
                        table,
                        alias,
                        on_condition,
                        join_type,
                    } = joinCondition[i];
                    switch (join_type) {
                        case 'left_one':
                            query = query.leftJoinAndMapOne(
                                join_table,
                                table,
                                alias,
                                on_condition,
                            );
                            break;
                        case 'left_many':
                            query = query.leftJoinAndMapMany(
                                join_table,
                                table,
                                alias,
                                on_condition,
                            );
                            break;
                        case 'inner_one':
                            query = query.innerJoinAndMapOne(
                                join_table,
                                table,
                                alias,
                                on_condition,
                            );
                            break;
                        case 'inner_many':
                            query = query.innerJoinAndMapMany(
                                join_table,
                                table,
                                alias,
                                on_condition,
                            );
                            break;
                    }
                }
            }
            query = query.where(condition).select(fields);
            const orderByKeys = Object.keys(orderBy);
            if (orderByKeys.length > 0) {
                query = query.orderBy(orderByKeys[0], orderBy[orderByKeys[0]]);
                for (let i = 1; i < orderByKeys.length; i++) {
                    query = query.addOrderBy(
                        orderByKeys[i],
                        orderBy[orderByKeys[i]],
                    );
                }
            }
            switch (dataType) {
                case 'getOne':
                    query = query.getOne();
                    break;
                case 'getMany':
                    query = query.getMany();
                    break;
                case 'getRawOne':
                    query = query.getRawOne();
                    break;
                case 'getRawMany':
                    query = query.getRawMany();
                    break;
                case 'getCount':
                    query = query.getCount();
                    break;
            }
            return await query;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['campaignactivity.id','campaignactivity.campaign_id','campaignactivity.activity_id'], isJoin:any = 'yes') {
        if (!orderBy) {
            orderBy = { order_id: 'ASC' };
        }
        let query = this.readReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity');
        if(isJoin == 'yes'){
            query = query
            .leftJoinAndMapOne(
                'campaignactivity.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `activity.id = campaignactivity.activity_id AND activity.status != '2'`,
            )
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
}
