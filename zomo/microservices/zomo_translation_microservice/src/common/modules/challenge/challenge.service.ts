import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from '../shared/types';
import {
    appConstant,
    ChallengeEntity,
    ScheduleChallengeEntity,
    ChallengeActivityEntity,
    ScheduleChallengeAgreementEntity,
    HealthActivityEntity,
    GroupsEntity,
    TeamsEntity,
    CardsEntity,
    SquaresEntity,
    BingoWeekLabelsEntity,
    MoveMoreParksEntity,
    WeeksEntity,
    DaysEntity,
    FitnessActivityEntity,
} from '@common-constants';
@Injectable()
export class ChallengeModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            ChallengeEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly challengeRepo: Repository<ChallengeEntity>,

        @InjectRepository(
            ScheduleChallengeEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly scheduleChallengeRepo: Repository<ScheduleChallengeEntity>,

        @InjectRepository(
            ChallengeActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly challengeActivityRepo: Repository<ChallengeActivityEntity>,

        @InjectRepository(
            ScheduleChallengeAgreementEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly scheduleChallengeAgreementRepo: Repository<ScheduleChallengeAgreementEntity>,

        @InjectRepository(
            HealthActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly challengeHealthActivitiesRepo: Repository<HealthActivityEntity>,

        @InjectRepository(GroupsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly challengeGroupsRepo: Repository<GroupsEntity>,

        @InjectRepository(TeamsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly challengeTeamRepo: Repository<TeamsEntity>,

        @InjectRepository(CardsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly challengeCardsRepo: Repository<CardsEntity>,

        @InjectRepository(SquaresEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly challengeSquaresRepo: Repository<SquaresEntity>,

        @InjectRepository(
            BingoWeekLabelsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly challengeBingoWeekLabelsRepo: Repository<BingoWeekLabelsEntity>,

        @InjectRepository(
            MoveMoreParksEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly movemoreParksRepo: Repository<MoveMoreParksEntity>,

        @InjectRepository(WeeksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly challengeWeeksRepo: Repository<WeeksEntity>,

        @InjectRepository(DaysEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly challengeDaysRepo: Repository<DaysEntity>,

        @InjectRepository(
            FitnessActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly challengeFitnessRepo: Repository<FitnessActivityEntity>,
    ) {
        super('ChallengeModuleService');
    }

    async getChallengeList(companyId?: string): Promise<EntityKeyMap> {
        try {
            if (companyId && companyId !== '0') {
                const rows = await this.scheduleChallengeRepo
                    .createQueryBuilder('schedule')
                    .leftJoin(
                        'ch_challenge',
                        'ch',
                        'ch.id = schedule.challenge_id',
                    )
                    .select([
                        'schedule.id AS id',
                        `COALESCE(NULLIF(schedule.custom_cname, ''), ch.challenge_name) AS custom_cname`,
                    ])
                    .where('schedule.org_id = :orgId', { orgId: companyId })
                    .getRawMany();
                return rows.reduce((acc, row) => {
                    acc[row.id] = row.custom_cname;
                    return acc;
                }, {} as EntityKeyMap);
            }
            return this.fetchAndMapEntities(
                this.challengeRepo,
                {},
                'id',
                'challenge_name',
                'getChallenges',
            );
        } catch (error) {
            this.logger.error(
                `Error in getChallenges: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }

    async getChallengeActivityList(): Promise<EntityKeyMap> {
        return this.fetchAndMapEntities(
            this.challengeActivityRepo,
            { status: 1 },
            'id',
            'activity_name',
            'getChallengeActivities',
        );
    }

    async getChallengeFields(
        orgId: string,
        challengeId: string,
    ): Promise<FieldDataResult> {
        const challengeArry: Record<string, string> = {};
        const challengeLabelArry: Record<string, string> = {};

        try {
            if (orgId && orgId !== '0') {
                const scheduleChallenge = await this.scheduleChallengeRepo
                    .createQueryBuilder('schedule')
                    .leftJoin(
                        'ch_challenge',
                        'ch',
                        'ch.id = schedule.challenge_id',
                    )
                    .select([
                        'schedule.id AS id',
                        `COALESCE(NULLIF(schedule.custom_cname, ''), ch.challenge_name) AS custom_cname`,
                        'schedule.custom_desc AS custom_desc',
                        'schedule.map_button AS map_button',
                        'schedule.website_button AS website_button',
                        'schedule.info_button AS info_button',
                        'schedule.image_button AS image_button',
                        'schedule.move_more_display AS move_more_display',
                    ])
                    .where('schedule.org_id = :orgId', { orgId })
                    .andWhere('schedule.id = :id', { id: challengeId })
                    .getRawOne();

                if (!scheduleChallenge) return [{}, {}];

                const scheduleId = scheduleChallenge.id;
                challengeArry[`custom_cname_${scheduleId}`] =
                    scheduleChallenge.custom_cname;
                challengeArry[`custom_desc_${scheduleId}`] =
                    scheduleChallenge.custom_desc || '';

                if (
                    scheduleChallenge.move_more_display == 1 ||
                    scheduleChallenge.move_more_display == 2
                ) {
                    challengeArry[`custom_info_button_${scheduleId}`] =
                        scheduleChallenge.info_button || '';
                    challengeArry[`custom_website_button_${scheduleId}`] =
                        scheduleChallenge.website_button || '';
                    challengeArry[`custom_map_button_${scheduleId}`] =
                        scheduleChallenge.map_button || '';
                    challengeArry[`custom_image_button_${scheduleId}`] =
                        scheduleChallenge.image_button || '';
                }

                const agreements =
                    await this.scheduleChallengeAgreementRepo.find({
                        where: { schedule_id: parseInt(challengeId, 10) },
                        select: ['id', 'agreement_text', 'schedule_id'],
                    });
                if (agreements && agreements.length > 0) {
                    for (const agreement of agreements) {
                        challengeArry[
                            `agreement_name_${agreement.schedule_id}`
                        ] = agreement.agreement_text;
                    }
                }

                const healthActivities =
                    await this.challengeHealthActivitiesRepo.find({
                        where: {
                            org_id: parseInt(orgId, 10),
                            schedule_id: parseInt(challengeId, 10),
                        },
                        select: ['id', 'name', 'schedule_id'],
                    });
                if (healthActivities && healthActivities.length > 0) {
                    for (const activity of healthActivities) {
                        challengeArry[`name_${activity.id}`] = activity.name;
                        challengeArry[
                            `healactivity_name_${activity.schedule_id}_${activity.id}`
                        ] = activity.name;
                    }
                }

                const groups = await this.challengeGroupsRepo.find({
                    where: {
                        org_id: parseInt(orgId, 10),
                        schedule_id: parseInt(challengeId, 10),
                    },
                    select: ['id', 'name', 'schedule_id'],
                });
                if (groups && groups.length > 0) {
                    for (const group of groups) {
                        challengeArry[
                            `group_name_${group.schedule_id}_${group.id}`
                        ] = group.name;
                    }
                }

                const teams = await this.challengeTeamRepo.find({
                    where: {
                        org_id: parseInt(orgId, 10),
                        schedule_id: parseInt(challengeId, 10),
                    },
                    select: ['id', 'tname', 'schedule_id'],
                });
                if (teams && teams.length > 0) {
                    for (const team of teams) {
                        challengeArry[
                            `team_name_${team.schedule_id}_${team.id}`
                        ] = team.tname;
                    }
                }

                const cards = await this.challengeCardsRepo.find({
                    where: {
                        org_id: parseInt(orgId, 10),
                        schedule_id: parseInt(challengeId, 10),
                    },
                    select: ['id', 'name', 'description', 'schedule_id'],
                });
                if (cards && cards.length > 0) {
                    for (const card of cards) {
                        challengeArry[
                            `card_name_${card.schedule_id}_${card.id}`
                        ] = card.name;
                        challengeArry[
                            `card_description_${card.schedule_id}_${card.id}`
                        ] = this.safeDecodeAndParse(card.description || '');
                    }
                }

                const squares = await this.challengeSquaresRepo.find({
                    where: {
                        org_id: parseInt(orgId, 10),
                        schedule_id: parseInt(challengeId, 10),
                    },
                    select: ['id', 'name', 'description', 'schedule_id'],
                });
                if (squares && squares.length > 0) {
                    for (const square of squares) {
                        challengeArry[
                            `square_name_${square.schedule_id}_${square.id}`
                        ] = square.name;
                        challengeArry[
                            `square_description_${square.schedule_id}_${square.id}`
                        ] = this.safeDecodeAndParse(square.description || '');
                    }
                }

                const bingoWeekLabels =
                    await this.challengeBingoWeekLabelsRepo.find({
                        where: { schedule_id: parseInt(challengeId, 10) },
                        select: ['id', 'week_custom_name', 'schedule_id'],
                    });
                if (bingoWeekLabels && bingoWeekLabels.length > 0) {
                    for (const label of bingoWeekLabels) {
                        challengeArry[
                            `bingoweek_labels_${label.schedule_id}_${label.id}`
                        ] = label.week_custom_name;
                    }
                }

                const parkLabels = await this.movemoreParksRepo.find({
                    where: {
                        schedule_id: parseInt(challengeId, 10),
                        org_id: parseInt(orgId, 10),
                    },
                    select: ['id', 'park_name', 'schedule_id'],
                });
                if (parkLabels && parkLabels.length > 0) {
                    for (const park of parkLabels) {
                        challengeArry[
                            `movemorepark_labels_${park.schedule_id}_${park.id}`
                        ] = park.park_name;
                    }
                }

                return [challengeArry, challengeLabelArry];
            } else {
                const challenge = await this.challengeRepo.findOne({
                    where: { id: parseInt(challengeId, 10) },
                    select: [
                        'id',
                        'challenge_type',
                        'challenge_name',
                        'challenge_desc',
                    ],
                });

                if (!challenge) return [{}, {}];

                challengeArry[`challenge_name_${challenge.id}`] =
                    challenge.challenge_name;
                challengeArry[`challenge_desc_${challenge.id}`] =
                    this.safeDecodeAndParse(challenge.challenge_desc || '');

                if (challenge.challenge_type === 'H') {
                    const weeks = await this.challengeWeeksRepo.find({
                        where: { challenge_id: parseInt(challengeId, 10) },
                        select: [
                            'id',
                            'site_activity_desc',
                            'manual_activity',
                            'manual_desc',
                            'tabmanual',
                        ],
                    });

                    if (weeks && weeks.length > 0) {
                        for (const week of weeks) {
                            challengeArry[
                                `week_activity_name_${challengeId}_${week.id}`
                            ] = week.manual_activity;
                            challengeArry[
                                `week_activity_description_${challengeId}_${week.id}`
                            ] = this.safeDecodeAndParse(
                                week.site_activity_desc || '',
                            );
                            challengeArry[
                                `week_description_${challengeId}_${week.id}`
                            ] = this.safeDecodeAndParse(week.manual_desc || '');
                            challengeArry[
                                `week_tabmanual_${challengeId}_${week.id}`
                            ] = week.tabmanual;

                            const days = await this.challengeDaysRepo.find({
                                where: {
                                    week_id: week.id,
                                    status: 1,
                                },
                                select: [
                                    'id',
                                    'site_activity_desc',
                                    'manual_activity',
                                    'manual_desc',
                                ],
                            });

                            if (days && days.length > 0) {
                                for (const day of days) {
                                    challengeArry[
                                        `week_days_activity_name_${challengeId}_${week.id}_${day.id}`
                                    ] = day.manual_activity;
                                    challengeArry[
                                        `week_days_activity_description_${challengeId}_${week.id}_${day.id}`
                                    ] = this.safeDecodeAndParse(
                                        day.site_activity_desc || '',
                                    );
                                    challengeArry[
                                        `week_days_description_${challengeId}_${week.id}_${day.id}`
                                    ] = this.safeDecodeAndParse(
                                        day.manual_desc || '',
                                    );
                                }
                            }
                        }
                    }
                } else if (challenge.challenge_type === 'A') {
                    const fitnessActivities =
                        await this.challengeFitnessRepo.find({
                            where: { challenge_id: parseInt(challengeId, 10) },
                            select: [
                                'id',
                                'alphabet',
                                'activity_name',
                                'suggestion',
                            ],
                        });

                    if (fitnessActivities && fitnessActivities.length > 0) {
                        for (const activity of fitnessActivities) {
                            challengeArry[
                                `fitness_activity_alphabet_${challengeId}_${activity.id}`
                            ] = activity.alphabet;
                            challengeArry[
                                `fitness_activity_name_${challengeId}_${activity.id}`
                            ] = activity.activity_name;
                            challengeArry[
                                `fitness_activity_suggestion_${challengeId}_${activity.id}`
                            ] = activity.suggestion || '';
                        }
                    }
                }

                return [challengeArry, challengeLabelArry];
            }
        } catch (error) {
            this.logger.error(
                `Error in getChallengeFields: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }

    async getChallengeActivityFields(
        activityId: string,
    ): Promise<FieldDataResult> {
        return this.fetchSingleEntityFields(
            this.challengeActivityRepo,
            activityId,
            { status: 1 },
            { activity_name: 'activity_name', activity_desc: 'activity_desc' },
            'getChallengeActivityFields',
        );
    }
}
