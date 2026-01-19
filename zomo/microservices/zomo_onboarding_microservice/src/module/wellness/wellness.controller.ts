import {
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
} from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { processStepUpdate } from '../../common/commonFunctions';
import { OnboardingService } from '../registration/onboarding.service';
import { CampaignService } from './campaign.service';
import { CampaignActivityService } from './campaignactivity.service';
import { CampaignRewardService } from './campaignreward.service';
import { CashRewardService } from './cashreward.service';
@Controller('wellness')
export class WellnessController {
    constructor(
        private readonly onboardingService: OnboardingService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly campaignService: CampaignService,
        private readonly campaignActivityService: CampaignActivityService,
        private readonly campaignRewardService: CampaignRewardService,
        private readonly cashRewardService: CashRewardService,
    ) {}

    @MessagePattern({ cmd: 'wellness' })
    async wellness(@Payload() data: any) {
        try {
            const { user, step, ...stepData } = data;
            let { stepResult } = await processStepUpdate(
                this.onboardingService,
                user.id,
                step,
                stepData,
                {},
            );
            if (stepResult?.completed !== 1) {
                const campaignDetails = stepResult?.data ?? {};

                const requiredFields = [
                    'campaign_name',
                    'start_date',
                    'end_date',
                    'activity_data',
                    'rewards',
                ];

                const allFieldsPresent = requiredFields.every(
                    (field) => field in campaignDetails,
                );

                const isActivityDataValid =
                    campaignDetails.activity_data &&
                    Array.isArray(campaignDetails.activity_data) &&
                    campaignDetails.activity_data.every(
                        (item) =>
                            item.activity_id &&
                            item.activity_id !== 0 &&
                            item.activity_id !== '0',
                    );

                const isRewardsDataValid =
                    campaignDetails.rewards &&
                    Array.isArray(campaignDetails.rewards) &&
                    campaignDetails.rewards.every(
                        (item) =>
                            item.cust_name &&
                            item.cust_name.trim() !== '' &&
                            item.amt_user &&
                            item.amt_user !== '0' &&
                            item.amt_user !== 0,
                    );

                if (
                    allFieldsPresent &&
                    isActivityDataValid &&
                    isRewardsDataValid
                ) {
                    ({ stepResult } = await processStepUpdate(
                        this.onboardingService,
                        user.id,
                        step,
                        { completed: 1 },
                    ));
                }
            }
            return {
                success: true,
                message: 'Wellness data saved successfully',
                data: { steps_data: stepResult },
            };
        } catch (error) {
            console.error('Wellness error', error);
            return {
                success: false,
                message: error.message || 'Failed to save Wellness',
            };
        }
    }
    @MessagePattern({ cmd: 'addIncentiveData' })
    async addIncentiveData(@Payload() data: any) {
        try {
            const { user, step, ...stepData } = data;
            const stepResult = user.steps_data.wellness;
            const onboardingID = user.id;
            const org_id = user.org_id;
            const campaign = await this.campaignService.create({
                ...stepResult.data,
                organization_id: org_id,
                created_by: user.id,
                updated_by: user.id,
                location_ids: 0,
                department_ids: 0,
                tab_order: 1,
                d_start_date: stepResult.data.start_date,
                d_end_date: stepResult.data.end_date,
                tab_titled: '',
            });
            const campaign_id = campaign.id;
            const reward = await this.campaignRewardService.create({
                campaign_id: campaign_id,
                order_id: 1,
                reward_name: stepResult.data.campaign_name,
                org_tab_setting: '1,2,3',
            });
            const reward_id = reward.id;
            const defaultActivityData = {
                campaign_id: campaign_id,
                reward_id: reward_id,
                quentity: 1,
                required_by_spouse: 'Y',
                required_by_user: 'Y',
                frequincy: 'U',
                frequincy_max_point: 1,
                point_for_each: 1,
                max_point: 1,
                start_date: stepResult.data.start_date,
                end_date: stepResult.data.end_date,
                point_end_date: stepResult.data.end_date,
                created_by: user.id,
                updated_by: user.id,
                status: 1,
            };
            const updatedActivityData = stepResult.data.activity_data.map(
                (item) => {
                    return {
                        ...defaultActivityData, // Start with default values
                        ...item, // Override with actual data
                    };
                },
            );
            const insertedActivityDatas =
                await this.campaignActivityService.createMany(
                    updatedActivityData,
                );
            const related_activity = insertedActivityDatas
                .map((item) => item.id)
                .filter((id) => id !== undefined && id !== null)
                .join(',');

            const defaultRewardData = {
                reward_id: reward_id,
                point_user: 1,
            };
            const updatedRewardData = stepResult.data.rewards.map((item) => {
                return {
                    ...defaultRewardData, // Fill in default fields
                    ...item, // Override with actual data
                };
            });

            const insertedRewardData =
                await this.cashRewardService.createMany(updatedRewardData);

            const cash_ids = insertedRewardData
                .map((item) => item.id)
                .filter((id) => id !== undefined && id !== null)
                .join(',');

            await this.campaignRewardService.updateRecord(
                { id: reward_id },
                {
                    cash_reward: 1,
                    related_activity: related_activity,
                    cash_ids: cash_ids,
                },
            );
            await this.onboardingService.updateRecord(
                { id: onboardingID },
                {
                    camp_id: campaign_id,
                },
            );
            // --- Final response ---
            return {
                success: true,
                message: 'Wellness data saved successfully',
                data: { steps_data: stepResult },
            };
        } catch (error) {
            console.error('Wellness error', error);
            return {
                success: false,
                message: error.message || 'Failed to save Wellness',
            };
        }
    }
}
