import {
    AcOlympicDataEntity, appConstant, BannedWordEntity,
    BingoWeekLabelsEntity,
    BioWeightEntity, BrokerEntity,
    CardsEntity,
    ChallengeActivityEntity,
    ChallengeEntity,
    ChallengeExternalLinkEntity,
    ChallengeTagsEntity,
    ChatEntity,
    ChatSettingsEntity,
    CommitmentLevelsEntity,
    DaysEntity,
    DaysUsersEntity,
    FitnessActivityEntity,
    FitnessUsersActivityEntity,
    GroupsEntity,
    HealthActivityEntity,
    HealthRequestEntity,
    HealthUsersActivityEntity,
    HealthWeekEntity,
    InviteTempEntity,
    InviteUserEntity,
    MoveMoreParksEntity,
    OrgInvitesEntity,
    RecipeEntity,
    ScheduleChallengeAgreementEntity,
    ScheduleChallengeEntity,
    ScheduleChallengeJoinUsersEntity,
    SquaresEntity,
    SquareUsersEntity,
    StepCheckpointsEntity,
    TeamMembersEntity,
    TeamScheduleEntity,
    TeamsEntity,
    TokensEntity,
    UserEntity,
    WeeksEntity, WeeksStepsEntity, WeeksUsersEntity, WeightRequestEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannedWordController } from "../chat/bannedword/bannedword.controller";
import { BannedWordService } from "../chat/bannedword/bannedword.service";
import { ChatController } from "../chat/chat/chat.controller";
import { ChatService } from "../chat/chat/chat.service";
import { ChatSettingsController } from "../chat/chatsettings/chatsettings.controller";
import { ChatSettingsService } from "../chat/chatsettings/chatsettings.service";
import { NotificationsController } from '../notifications/notifications.controller';
import { UserService } from '../user/user/user.service';
import { AcOlympicDataController } from "./acolympicdata/acolympicdata.controller";
import { AcOlympicDataService } from "./acolympicdata/acolympicdata.service";
import { BingoWeekLabelsController } from "./bingoweeklabels/bingoweeklabels.controller";
import { BingoWeekLabelsService } from "./bingoweeklabels/bingoweeklabels.service";
import { BioWeightController } from "./bioweight/bioweight.controller";
import { BioWeightService } from "./bioweight/bioweight.service";
import { CardsController } from "./cards/cards.controller";
import { CardsService } from "./cards/cards.service";
import { ChallengeController } from "./challenge/challenge.controller";
import { ChallengeService } from "./challenge/challenge.service";
import { ChallengeActivityController } from "./challengeactivity/challengeactivity.controller";
import { ChallengeActivityService } from "./challengeactivity/challengeactivity.service";
import { CommitmentLevelsController } from "./commitmentlevels/commitmentlevels.controller";
import { CommitmentLevelsService } from "./commitmentlevels/commitmentlevels.service";
import { DaysController } from "./days/days.controller";
import { DaysService } from "./days/days.service";
import { DaysUsersController } from "./daysusers/daysusers.controller";
import { DaysUsersService } from "./daysusers/daysusers.service";
import { ChalengeExternalLinkController } from './externallinkuser/externallinkuser.controller';
import { ChallengeExternalLinkService } from './externallinkuser/externallinkuser.service';
import { FitnessActivityController } from "./fitnessactivity/fitnessactivity.controller";
import { FitnessActivityService } from "./fitnessactivity/fitnessactivity.service";
import { FitnessUsersActivityController } from "./fitnessusersactivity/fitnessusersactivity.controller";
import { FitnessUsersActivityService } from "./fitnessusersactivity/fitnessusersactivity.service";
import { FrontService } from "./front/front.service";
import { GroupsController } from "./groups/groups.controller";
import { GroupsService } from "./groups/groups.service";
import { HealthActivityController } from "./healthactivity/healthactivity.controller";
import { HealthActivityService } from "./healthactivity/healthactivity.service";
import { HealthRequestController } from "./healthrequest/healthrequest.controller";
import { HealthRequestService } from "./healthrequest/healthrequest.service";
import { HealthUsersActivityController } from "./healthusersactivity/healthusersactivity.controller";
import { HealthUsersActivityService } from "./healthusersactivity/healthusersactivity.service";
import { HealthWeekController } from "./healthweek/healthweek.controller";
import { HealthWeekService } from "./healthweek/healthweek.service";
import { InviteTempController } from "./invitetemp/invitetemp.controller";
import { InviteTempService } from "./invitetemp/invitetemp.service";
import { InviteUserController } from "./inviteuser/inviteuser.controller";
import { InviteUserService } from "./inviteuser/inviteuser.service";
import { MoveMoreParksController } from "./movemoreparks/movemoreparks.controller";
import { MoveMoreParksService } from "./movemoreparks/movemoreparks.service";
import { OrgInvitesController } from "./orginvites/orginvites.controller";
import { OrgInvitesService } from "./orginvites/orginvites.service";
import { RecipeController } from "./recipe/recipe.controller";
import { RecipeService } from "./recipe/recipe.service";
import { ScheduleChallengeController } from "./schedulechallenge/schedulechallenge.controller";
import { ScheduleChallengeService } from "./schedulechallenge/schedulechallenge.service";
import { ScheduleChallengeAgreementController } from "./schedulechallengeagreement/schedulechallengeagreement.controller";
import { ScheduleChallengeAgreementService } from "./schedulechallengeagreement/schedulechallengeagreement.service";
import { ScheduleChallengeJoinUsersController } from "./schedulechallengejoinusers/schedulechallengejoinusers.controller";
import { ScheduleChallengeJoinUsersService } from "./schedulechallengejoinusers/schedulechallengejoinusers.service";
import { SquaresController } from "./squares/squares.controller";
import { SquaresService } from "./squares/squares.service";
import { SquareUsersController } from "./squareusers/squareusers.controller";
import { SquareUsersService } from "./squareusers/squareusers.service";
import { stepCheckpointsController } from "./stepcheckpoints/stepcheckpoints.controller";
import { StepCheckpointsService } from "./stepcheckpoints/stepcheckpoints.service";
import { ChallengeTagsController } from './tags/tags.controller';
import { ChallengeTagsService } from './tags/tags.service';
import { TeamMembersController } from "./teammembers/teammembers.controller";
import { TeamMembersService } from "./teammembers/teammembers.service";
import { TeamsController } from "./teams/teams.controller";
import { TeamsService } from "./teams/teams.service";
import { TeamScheduleController } from "./teamschedule/teamschedule.controller";
import { TeamScheduleService } from "./teamschedule/teamschedule.service";
import { TokensController } from "./tokens/tokens.controller";
import { TokensService } from "./tokens/tokens.service";
import { UserChallengeHelperService } from './userschedulechallenge/userChallengeHelper.service';
import { BingoChallengeService } from './userschedulechallenge/userchallenges/bingoChallenge.service';
import { FitnessChallengeService } from './userschedulechallenge/userchallenges/fitnessChallenge.service';
import { FootballStepChallengeService } from './userschedulechallenge/userchallenges/footballStepChallenge.service';
import { HealthHabbitActivityChallengeService } from './userschedulechallenge/userchallenges/healthHabbitActivityChallenge.service';
import { HealthHabbitChallengeService } from './userschedulechallenge/userchallenges/healthHabbitChallenge.service';
import { HydrateChallengeService } from './userschedulechallenge/userchallenges/hydrateChallenge.service';
import { MileLayoutChallengeService } from './userschedulechallenge/userchallenges/mileLayoutChallenge.service';
import { MoveMoreChallengeService } from './userschedulechallenge/userchallenges/movemoreChallenge.service';
import { RandomActChallengeService } from './userschedulechallenge/userchallenges/randomactChallenge.service';
import { RelayRaceChallengeHelperService } from './userschedulechallenge/userchallenges/relayRaceChallenge.service';
import { SleepChallengeService } from './userschedulechallenge/userchallenges/sleepChallenge.service';
import { StepChallengeService } from './userschedulechallenge/userchallenges/stepChallenge.service';
import { TrekStepChallengeService } from './userschedulechallenge/userchallenges/trekstepChallenge.service';
import { WeightProgressChallengeService } from './userschedulechallenge/userchallenges/weightProgressChallenge.service';
import { UserDashboardChallengeController } from './userschedulechallenge/userDashboardChallenge.controller';
import { UserScheduleChallengeController } from './userschedulechallenge/userSchedulechallenge.controller';
import { UserScheduleChallengeService } from './userschedulechallenge/userScheduleChallenge.service';
import { WeeksController } from "./weeks/weeks.controller";
import { WeeksService } from "./weeks/weeks.service";
import { WeeksStepsController } from "./weekssteps/weekssteps.controller";
import { WeeksStepsService } from "./weekssteps/weekssteps.service";
import { WeeksUsersController } from "./weeksusers/weeksusers.controller";
import { WeeksUsersService } from "./weeksusers/weeksusers.service";
import { WeightRequestController } from "./weight-request/weight-request.controller";
import { WeightRequestService } from "./weight-request/weight-request.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([AcOlympicDataEntity, BannedWordEntity, BingoWeekLabelsEntity, BioWeightEntity, CardsEntity, ChallengeEntity, ChallengeActivityEntity, ChatEntity, ChatSettingsEntity, CommitmentLevelsEntity, DaysEntity, DaysUsersEntity, FitnessActivityEntity, FitnessUsersActivityEntity, GroupsEntity, HealthActivityEntity, HealthRequestEntity, HealthUsersActivityEntity, HealthWeekEntity, InviteTempEntity, InviteUserEntity, MoveMoreParksEntity, OrgInvitesEntity, RecipeEntity, ScheduleChallengeEntity, ScheduleChallengeAgreementEntity, ScheduleChallengeJoinUsersEntity, SquaresEntity, SquareUsersEntity, StepCheckpointsEntity, TeamMembersEntity, TeamsEntity, TeamScheduleEntity, TokensEntity, WeeksEntity, WeeksStepsEntity, WeeksUsersEntity,UserEntity,BrokerEntity,WeightRequestEntity, ChallengeExternalLinkEntity, ChallengeTagsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([AcOlympicDataEntity, BannedWordEntity, BingoWeekLabelsEntity, BioWeightEntity, CardsEntity, ChallengeEntity, ChallengeActivityEntity, ChatEntity, ChatSettingsEntity, CommitmentLevelsEntity, DaysEntity, DaysUsersEntity, FitnessActivityEntity, FitnessUsersActivityEntity, GroupsEntity, HealthActivityEntity, HealthRequestEntity, HealthUsersActivityEntity, HealthWeekEntity, InviteTempEntity, InviteUserEntity, MoveMoreParksEntity, OrgInvitesEntity, RecipeEntity, ScheduleChallengeEntity, ScheduleChallengeAgreementEntity, ScheduleChallengeJoinUsersEntity, SquaresEntity, SquareUsersEntity, StepCheckpointsEntity, TeamMembersEntity, TeamsEntity, TeamScheduleEntity, TokensEntity, WeeksEntity, WeeksStepsEntity, WeeksUsersEntity,UserEntity,BrokerEntity,WeightRequestEntity, ChallengeExternalLinkEntity, ChallengeTagsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [AcOlympicDataService, BannedWordService, BingoWeekLabelsService, BioWeightService, CardsService, ChallengeService, ChallengeActivityService, ChatService, ChatSettingsService, CommitmentLevelsService, DaysService, DaysUsersService, FitnessActivityService, FitnessUsersActivityService, GroupsService, HealthActivityService, HealthRequestService, HealthUsersActivityService, HealthWeekService, InviteTempService, InviteUserService, MoveMoreParksService, OrgInvitesService, RecipeService, ScheduleChallengeService, ScheduleChallengeAgreementService, ScheduleChallengeJoinUsersService, SquaresService, SquareUsersService, StepCheckpointsService, TeamMembersService, TeamsService, TeamScheduleService, TokensService, WeeksService, WeeksStepsService, WeeksUsersService , UserService, FrontService, UserChallengeHelperService,UserScheduleChallengeService,
        HealthHabbitChallengeService,HealthHabbitActivityChallengeService,HydrateChallengeService,SleepChallengeService,BingoChallengeService, WeightProgressChallengeService,FootballStepChallengeService,StepChallengeService,RelayRaceChallengeHelperService,FitnessChallengeService,MileLayoutChallengeService,MoveMoreChallengeService,RandomActChallengeService,TrekStepChallengeService,WeightRequestService, ChallengeExternalLinkService,
        NotificationsController,
        ChallengeTagsService,
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
        },
        {
            provide: 'CRON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.CRON_SERVICE_HOST_PROD,
                        port: Number(process.env.CRON_SERVICE_PORT_PROD),
                    }
                })
            }
        },
     ],
    controllers: [AcOlympicDataController, BannedWordController, BingoWeekLabelsController, BioWeightController, CardsController, ChallengeController, ChallengeActivityController, ChatController, ChatSettingsController, CommitmentLevelsController, DaysController, DaysUsersController, FitnessActivityController, FitnessUsersActivityController, GroupsController, HealthActivityController, HealthRequestController, HealthRequestController, HealthUsersActivityController, HealthWeekController, InviteTempController, InviteUserController, MoveMoreParksController, OrgInvitesController, RecipeController, ScheduleChallengeController, ScheduleChallengeAgreementController, ScheduleChallengeJoinUsersController, SquaresController, SquareUsersController, stepCheckpointsController, TeamMembersController, TeamsController, TeamScheduleController, TokensController, WeeksController, WeeksStepsController, WeeksUsersController, UserDashboardChallengeController, UserScheduleChallengeController,WeightRequestController,ChalengeExternalLinkController,ChallengeTagsController],
    exports: [AcOlympicDataService, BannedWordService, BingoWeekLabelsService, BioWeightService, CardsService, ChallengeService, ChallengeActivityService, ChatService, ChatSettingsService, CommitmentLevelsService, DaysService, DaysUsersService, FitnessActivityService, FitnessUsersActivityService, GroupsService, HealthActivityService, HealthRequestService, HealthUsersActivityService, HealthWeekService, InviteTempService, InviteUserService, MoveMoreParksService, OrgInvitesService, RecipeService, ScheduleChallengeService, ScheduleChallengeAgreementService, ScheduleChallengeJoinUsersService, SquaresService, SquareUsersService, StepCheckpointsService, TeamMembersService, TeamsService, TeamScheduleService, TokensService, WeeksService, WeeksStepsService, WeeksUsersService,UserService, FrontService, UserChallengeHelperService, UserScheduleChallengeService,
       HealthHabbitChallengeService,HealthHabbitActivityChallengeService,HydrateChallengeService,SleepChallengeService,BingoChallengeService, WeightProgressChallengeService,FootballStepChallengeService,StepChallengeService,RelayRaceChallengeHelperService,FitnessChallengeService,MileLayoutChallengeService,MoveMoreChallengeService,RandomActChallengeService,TrekStepChallengeService, WeightRequestService, ChallengeExternalLinkService, ChallengeTagsService,
     ],
})
export class ChallengeModule {}
