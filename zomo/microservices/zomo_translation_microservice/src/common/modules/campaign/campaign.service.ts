import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    CampaignEntity,
    CategoryEntity,
    CampaignRewardEntity,
    CampaignActivityEntity,
    CampaignCategoryEntity,
    CashRewardEntity,
    InsuranceRewardEntity,
    OtherRewardEntity,
} from '@common-constants';
@Injectable()
export class CampaignModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            CampaignEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly campaignRepo: Repository<CampaignEntity>,

        @InjectRepository(
            CategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly campaignCategoryRepo: Repository<CategoryEntity>,

        @InjectRepository(
            CampaignRewardEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly campaignRewardRepo: Repository<CampaignRewardEntity>,

        @InjectRepository(
            CampaignActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly campaignActivityRepo: Repository<CampaignActivityEntity>,

        @InjectRepository(
            CampaignCategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly campaignCategoryAssignRepo: Repository<CampaignCategoryEntity>,

        @InjectRepository(
            CashRewardEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly cashRewardRepo: Repository<CashRewardEntity>,

        @InjectRepository(
            InsuranceRewardEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly insuranceRewardRepo: Repository<InsuranceRewardEntity>,

        @InjectRepository(
            OtherRewardEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly otherRewardRepo: Repository<OtherRewardEntity>,
    ) {
        super('CampaignModuleService');
    }

    async getCampaignList(companyId?: string): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.campaignRepo,
            this.buildCompanyWhereCondition(
                { status: Not(2) },
                companyId,
                'organization_id',
            ),
            'id',
            'campaign_name',
            'getCampaigns',
        );
    }

    async getCampaignCategoryList(): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.campaignCategoryRepo,
            { status: 1 },
            'id',
            'category_name',
            'getCampaignCategories',
        );
    }

    async getCampaignFields(campaignId: string): Promise<FieldDataResult> {
        const campaignArry: Record<string, string> = {};
        const campaignLabelArry: Record<string, string> = {};

        try {
            const campaign = await this.campaignRepo.findOne({
                where: { id: parseInt(campaignId, 10), status: Not(2) },
                select: ['id', 'campaign_name', 'tab_titled'],
            });

            if (!campaign) return [{}, {}];

            campaignArry[`campaign_name_${campaignId}`] =
                campaign.campaign_name;
            campaignArry[`campaign_tab_titled_${campaignId}`] =
                campaign.tab_titled || '';
            campaignLabelArry[`campaign_name_${campaignId}`] = 'Campaign Name';
            campaignLabelArry[`campaign_tab_titled_${campaignId}`] =
                'Campaign Tab Titled';

            const rewardList = await this.campaignRewardRepo.find({
                where: { campaign_id: parseInt(campaignId, 10), status: 1 },
                order: { order_id: 'ASC' } as any,
            });

            if (rewardList && rewardList.length > 0) {
                for (const reward of rewardList) {
                    const rewardId = reward.id;
                    campaignArry[`reward_name_${campaignId}_${rewardId}`] =
                        reward.reward_name;
                    campaignArry[`reward_desc_${campaignId}_${rewardId}`] =
                        reward.reward_desc || '';

                    if (reward.related_activity) {
                        const actIds = reward.related_activity
                            .split(',')
                            .map((id) => parseInt(id.trim(), 10));
                        const activities = await this.campaignActivityRepo
                            .createQueryBuilder('ca')
                            .leftJoinAndSelect(
                                'in_activity',
                                'act',
                                'ca.activity_id = act.id',
                            )
                            .where('ca.campaign_id = :campaignId', {
                                campaignId: parseInt(campaignId, 10),
                            })
                            .andWhere('ca.status = :status', { status: 1 })
                            .andWhere('ca.id IN (:...actIds)', { actIds })
                            .select([
                                'ca.id',
                                'ca.cust_name',
                                'ca.cust_description',
                                'act.activity_name',
                                'act.description',
                            ])
                            .getRawMany();

                        for (const activity of activities) {
                            const actId = activity.ca_id;
                            const activityName =
                                activity.ca_cust_name ||
                                activity.act_activity_name;
                            const activityDesc =
                                activity.ca_cust_description ||
                                activity.act_description;
                            campaignArry[
                                `activity_name_${campaignId}_${rewardId}_${actId}`
                            ] = activityName;
                            campaignArry[
                                `activity_desc_${campaignId}_${rewardId}_${actId}`
                            ] = this.safeDecodeAndParse(activityDesc);
                        }
                    }

                    if (reward.related_category) {
                        const catIds = reward.related_category
                            .split(',')
                            .map((id) => parseInt(id.trim(), 10));
                        const categories = await this.campaignCategoryAssignRepo
                            .createQueryBuilder('cc')
                            .leftJoinAndSelect(
                                'in_category',
                                'cat',
                                'cc.category_id = cat.id',
                            )
                            .where('cc.campaign_id = :campaignId', {
                                campaignId: parseInt(campaignId, 10),
                            })
                            .andWhere('cc.status = :status', { status: 1 })
                            .andWhere('cc.id IN (:...catIds)', { catIds })
                            .select([
                                'cc.id',
                                'cc.cust_name',
                                'cc.cust_description',
                                'cat.category_name',
                                'cat.description',
                            ])
                            .getRawMany();

                        for (const category of categories) {
                            const catId = category.cc_id;
                            const categoryName =
                                category.cc_cust_name ||
                                category.cat_category_name;
                            const categoryDesc =
                                category.cc_cust_description ||
                                category.cat_description;
                            campaignArry[
                                `category_name_${campaignId}_${rewardId}_${catId}`
                            ] = categoryName;
                            campaignArry[
                                `category_desc_${campaignId}_${rewardId}_${catId}`
                            ] = this.safeDecodeAndParse(categoryDesc);
                        }
                    }

                    if (reward.ins_reward === 1 && reward.ins_ids) {
                        const insIds = reward.ins_ids
                            .split(',')
                            .map((id) => parseInt(id.trim(), 10));
                        const insuranceRewards = await this.insuranceRewardRepo
                            .createQueryBuilder('ir')
                            .leftJoinAndSelect(
                                'in_insurance_plan',
                                'ip',
                                'ir.ins_id = ip.id',
                            )
                            .where('ir.status = :status', { status: 1 })
                            .andWhere('ir.id IN (:...insIds)', { insIds })
                            .select(['ir.id', 'ir.cust_name', 'ip.plan_name'])
                            .orderBy('ir.order_id', 'ASC')
                            .getRawMany();

                        for (const insReward of insuranceRewards) {
                            const insId = insReward.ir_id;
                            const insName =
                                insReward.ir_cust_name ||
                                insReward.ip_plan_name;
                            campaignArry[
                                `ins_reward_name_${rewardId}_${insId}`
                            ] = insName;
                        }
                    }

                    if (reward.cash_reward === 1 && reward.cash_ids) {
                        const cashIds = reward.cash_ids
                            .split(',')
                            .map((id) => parseInt(id.trim(), 10));
                        const cashRewards = await this.cashRewardRepo.find({
                            where: { id: In(cashIds), status: 1 },
                            select: ['id', 'cust_name'],
                            order: { order_id: 'ASC' } as any,
                        });

                        for (const cashReward of cashRewards) {
                            campaignArry[
                                `cash_reward_name_${rewardId}_${cashReward.id}`
                            ] = cashReward.cust_name;
                        }
                    }

                    if (reward.other_reward === 1 && reward.other_ids) {
                        const otherIds = reward.other_ids
                            .split(',')
                            .map((id) => parseInt(id.trim(), 10));
                        const otherRewards = await this.otherRewardRepo.find({
                            where: { id: In(otherIds), status: 1 },
                            select: ['id', 'cust_name'],
                            order: { order_id: 'ASC' } as any,
                        });

                        for (const otherReward of otherRewards) {
                            campaignArry[
                                `other_reward_name_${rewardId}_${otherReward.id}`
                            ] = otherReward.cust_name;
                        }
                    }
                }
            }

            return [campaignArry, campaignLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getCampaignFields: ${error.message}`,
                error.stack,
            );
            return [campaignArry, campaignLabelArry];
        }
    }

    async getCampaignCategoryFields(
        categoryId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.campaignCategoryRepo,
            categoryId,
            { status: 1 },
            {
                category_name: 'category_name',
                category_description: 'description',
            },
            'getCampaignCategoryFields',
        );
    }
}
