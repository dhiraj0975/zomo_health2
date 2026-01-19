import {
    ActivityEntity, appConstant, AssessmentEmotionalAssessmentEntity,
    AssessmentHraBiometricEntity,
    AssessmentOptionsEntity, AssessmentsEntity,
    BiometricsEntity,
    BodyFeedsEntity, CampaignActivityEntity,
    CampaignEntity,
    EmotionalWellBeingPostEntity,
    EventCategoryEntity,
    EventEntity,
    EventGlobalEventsEntity, EventUserBookingListsEntity,
    FtBiometricsEntity,
    MyPlanActivityEntity,
    MyPlanAssignActivityEntity,
    MyPlanAssignBlockEntity,
    MyPlanAssignPlanEntity,
    MyPlanAssignRuleEntity,
    MyPlanAssignUserPlanEntity,
    MyPlanBlocksEntity,
    MyPlanBusinessRuleEntity,
    MyPlanCompleteActivityEntity,
    MyPlanCompleteBlockEntity,
    MyPlanDescriptionEntity,
    MyPlanJoinUserPlanEntity,
    MyPlanPlansEntity,
    ScheduleChallengeEntity,
    TobaccoUsesEntity,
    UserDetailsEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MyPlanActivityController } from "./activity/activity.controller";
import { MyPlanActivityService } from "./activity/activity.service";
import { MyPlanAssignActivityController } from "./assignactivity/assignactivity.controller";
import { MyPlanAssignActivityService } from "./assignactivity/assignactivity.service";
import { MyPlanAssignBlockController } from "./assignblock/assignblock.controller";
import { MyPlanAssignBlockService } from "./assignblock/assignblock.service";
import { MyPlanAssignPlanController } from "./assignplan/assignplan.controller";
import { MyPlanAssignPlanService } from "./assignplan/assignplan.service";
import { MyPlanAssignPlanUserController } from './assignplan/userassignplan.controller';
import { MyPlanAssignRuleController } from "./assignrule/assignrule.controller";
import { MyPlanAssignRuleService } from "./assignrule/assignrule.service";
import { MyPlanAssignUserPlanController } from "./assignuserplan/assignuserplan.controller";
import { MyPlanAssignUserPlanService } from "./assignuserplan/assignuserplan.service";
import { MyPlanBlocksController } from "./blocks/blocks.controller";
import { MyPlanBlocksService } from "./blocks/blocks.service";
import { MyPlanBusinessRuleController } from "./bussinessrule/bussinessrule.controller";
import { MyPlanBusinessRuleService } from "./bussinessrule/bussinessrule.service";
import { MyPlanCompleteActivityController } from "./completeactivity/completeactivity.controller";
import { MyPlanCompleteActivityService } from "./completeactivity/completeactivity.service";
import { MyPlanCompleteBlockController } from "./completeblock/completeblock.controller";
import { MyPlanCompleteBlockService } from "./completeblock/completeblock.service";
import { MyPlanDescriptionController } from "./description/description.controller";
import { MyPlanDescriptionService } from "./description/description.service";
import { FrontService } from "./front/front.service";
import { MyPlanJoinUserPlanController } from "./joinuserplan/joinuserplan.controller";
import { MyPlanJoinUserPlanService } from "./joinuserplan/joinuserplan.service";
import { MyPlanPlansController } from "./plans/plans.controller";
import { MyPlanPlansService } from "./plans/plans.service";
import {MyPlanAssignPlanAdminController} from "@/modules/myplan/assignplan/admin-assign-plan.controller";
@Module({
    imports: [
        TypeOrmModule.forFeature([MyPlanActivityEntity, MyPlanAssignActivityEntity, MyPlanAssignBlockEntity, MyPlanAssignPlanEntity, MyPlanAssignRuleEntity, MyPlanAssignUserPlanEntity, MyPlanBlocksEntity, MyPlanBusinessRuleEntity, MyPlanCompleteActivityEntity, MyPlanCompleteBlockEntity, MyPlanDescriptionEntity, MyPlanJoinUserPlanEntity, MyPlanPlansEntity, EventCategoryEntity, ScheduleChallengeEntity, BiometricsEntity, AssessmentHraBiometricEntity, FtBiometricsEntity, BodyFeedsEntity, CampaignEntity, UserDetailsEntity, EventEntity, EventGlobalEventsEntity, AssessmentOptionsEntity, ActivityEntity, EmotionalWellBeingPostEntity, TobaccoUsesEntity, AssessmentEmotionalAssessmentEntity, EventUserBookingListsEntity, CampaignActivityEntity, AssessmentsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([MyPlanActivityEntity, MyPlanAssignActivityEntity, MyPlanAssignBlockEntity, MyPlanAssignPlanEntity, MyPlanAssignRuleEntity, MyPlanAssignUserPlanEntity, MyPlanBlocksEntity, MyPlanBusinessRuleEntity, MyPlanCompleteActivityEntity, MyPlanCompleteBlockEntity, MyPlanDescriptionEntity, MyPlanJoinUserPlanEntity, MyPlanPlansEntity, EventCategoryEntity, ScheduleChallengeEntity, BiometricsEntity, AssessmentHraBiometricEntity, FtBiometricsEntity, BodyFeedsEntity, CampaignEntity, UserDetailsEntity, EventEntity, EventGlobalEventsEntity, AssessmentOptionsEntity, ActivityEntity, EmotionalWellBeingPostEntity, TobaccoUsesEntity, AssessmentEmotionalAssessmentEntity, EventUserBookingListsEntity, CampaignActivityEntity, AssessmentsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        MyPlanActivityService, MyPlanAssignActivityService, MyPlanAssignBlockService, MyPlanAssignPlanService, MyPlanAssignRuleService, MyPlanAssignUserPlanService, MyPlanBlocksService, MyPlanBusinessRuleService, MyPlanCompleteActivityService, MyPlanCompleteBlockService, MyPlanDescriptionService, MyPlanJoinUserPlanService, MyPlanPlansService, FrontService,
        {
            provide: 'COMMON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.COMMON_SERVICE_HOST_PROD ,
                        port: Number(process.env.COMMON_SERVICE_PORT_PROD),
                    }
                })
            }
        }
    ],
    controllers: [MyPlanActivityController, MyPlanAssignActivityController, MyPlanAssignBlockController, MyPlanAssignPlanController, MyPlanAssignRuleController, MyPlanAssignUserPlanController, MyPlanBlocksController, MyPlanBusinessRuleController, MyPlanCompleteActivityController, MyPlanCompleteBlockController, MyPlanDescriptionController, MyPlanJoinUserPlanController, MyPlanPlansController, MyPlanAssignPlanUserController,MyPlanAssignPlanAdminController ],
    exports: [MyPlanActivityService, MyPlanAssignActivityService, MyPlanAssignBlockService, MyPlanAssignPlanService, MyPlanAssignRuleService, MyPlanAssignUserPlanService, MyPlanBlocksService, MyPlanBusinessRuleService, MyPlanCompleteActivityService, MyPlanCompleteBlockService, MyPlanDescriptionService, MyPlanJoinUserPlanService, MyPlanPlansService, FrontService ],
})
export class MyPlanModule {}
