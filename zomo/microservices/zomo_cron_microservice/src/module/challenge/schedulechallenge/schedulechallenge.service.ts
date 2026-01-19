import {
    appConstant,
    BaseService,
    CommonArrayService,
    ScheduleChallengeEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as process from 'process';
@Injectable()
export class ScheduleChallengeService extends BaseService<ScheduleChallengeEntity> {
    constructor(
        @InjectRepository(
            ScheduleChallengeEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaScheduleChallengeRepository: Repository<ScheduleChallengeEntity>,
        @InjectRepository(
            ScheduleChallengeEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaScheduleChallengeRepository: Repository<ScheduleChallengeEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaScheduleChallengeRepository,
            writeReplicaScheduleChallengeRepository,
            'scheduleChallenge',
            commonArrayService,
        );
    }
    async findOne(condition: any, user_id: string = null) {
        let cond = `joinUser.schedule_id = sc.id AND joinUser.status = 1`;
        if (user_id) {
            cond += ` AND joinUser.user_id = ${user_id}`;
        }
        return await this.readReplicaScheduleChallengeRepository
            .createQueryBuilder('sc')
            .leftJoinAndMapOne(
                'sc.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = sc.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.challenge',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'ch',
                `ch.id = sc.challenge_id AND ch.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.agreement',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_AGREEMENT,
                'agreement',
                `agreement.schedule_id = sc.id`,
            )
            .leftJoinAndMapOne(
                'sc.joinUser',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                'joinUser',
                cond,
            )
            .leftJoinAndMapMany(
                'sc.checkpoint',
                tableConstant.CHALLENGE.TBL_CH_STEP_CHECKPOINTS,
                'checkpoint',
                `checkpoint.schedule_id = sc.id AND checkpoint.status = 1`,
            )
            .leftJoinAndMapMany(
                'sc.treklevel',
                tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS,
                'treklevel',
                `treklevel.schedule_id = sc.id AND treklevel.status = 1`,
            )
            .leftJoinAndMapMany(
                'sc.weekstep',
                tableConstant.CHALLENGE.TBL_CH_WEEKS_STEPS,
                'weekstep',
                `weekstep.schedule_id = sc.id AND weekstep.status = 1`,
            )
            .leftJoinAndMapMany(
                'sc.inviteUser',
                tableConstant.CHALLENGE.TBL_CH_INVITE_USER,
                'inviteUser',
                `inviteUser.schedule_id = sc.id AND inviteUser.status = 1`,
            )
            .leftJoinAndMapMany(
                'sc.movemore',
                tableConstant.CHALLENGE.TBL_CH_MOVE_MORE_PARKS,
                'movemore',
                `movemore.schedule_id = sc.id AND movemore.status = 1`,
            )
            .leftJoinAndMapMany(
                'sc.inviteUserTemp',
                tableConstant.CHALLENGE.TBL_CH_INVITE_TEMP,
                'inviteUserTemp',
                `inviteUserTemp.schedule_id = sc.id AND inviteUserTemp.status = 1`,
            )
            .leftJoinAndMapOne(
                'inviteUserTemp.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = inviteUserTemp.user_id AND user.status = 1`,
            )
            .leftJoinAndMapMany(
                'sc.weeklabel',
                tableConstant.CHALLENGE.TBL_CH_BINGO_WEEK_LABELS,
                'weeklabel',
                `weeklabel.schedule_id = sc.id`,
            )
            .where(condition)
            .getOne();
    }
    async challengeFindOne(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaScheduleChallengeRepository
            .createQueryBuilder('sc')
            .leftJoinAndMapOne(
                'sc.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = sc.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.challenge',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'challenge',
                `challenge.id = sc.challenge_id AND challenge.status = 1`,
            )
            .where(condition)
            .select(fields)
            .orderBy(
                `sc.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getOne();
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any = [
            'sc.id',
            'sc.challenge_id',
            'sc.custom_cname',
            'ch.challenge_type',
            'company',
        ],
        groupBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaScheduleChallengeRepository
            .createQueryBuilder('sc')
            .leftJoinAndMapOne(
                'sc.challenge',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'ch',
                `ch.id = sc.challenge_id AND ch.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = sc.org_id AND company.status = 1`,
            )
            .where(condition)
            .select(fields);
        if (groupBy) {
            query = query
                .groupBy(groupBy)
                .orderBy(
                    `sc.${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                );
            return await query.getRawMany();
        }
        return await query.getMany();
    }
    async joinChallenge(condition: any, req: any) {
        return await this.readReplicaScheduleChallengeRepository
            .createQueryBuilder('sc')
            .leftJoinAndMapOne(
                'sc.ch',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'ch',
                `ch.id = sc.challenge_id AND ch.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = sc.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.invitechallengeUsers',
                tableConstant.CHALLENGE.TBL_CH_INVITE_USER,
                'invitechallengeUsers',
                `invitechallengeUsers.schedule_id = sc.id AND invitechallengeUsers.user_id = ${req.tokenUser?.id} AND invitechallengeUsers.status = 1`,
            )
            .where(condition)
            .select([
                'ch',
                'sc',
                'invitechallengeUsers.team_id',
                'invitechallengeUsers.id',
            ])
            .orderBy('sc.start_date', 'ASC')
            .getMany();
    }
    async scheduleChallegeDetail(condition: any, req: any) {
        return await this.readReplicaScheduleChallengeRepository
            .createQueryBuilder('sc')
            .leftJoinAndMapOne(
                'sc.ch',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'ch',
                `ch.id = sc.challenge_id AND ch.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = sc.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.team',
                tableConstant.CHALLENGE.TBL_CH_TEAMS,
                'team',
                `team.schedule_id = sc.id`,
            )
            .leftJoinAndMapOne(
                'sc.teamMember',
                tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
                'teamMember',
                `teamMember.team_id = team.id and teamMember.user_id = ${req.tokenUser?.id}`,
            )
            .leftJoinAndMapOne(
                'sc.scheduleChallengeAgreement',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_AGREEMENT,
                'scheduleChallengeAgreement',
                `scheduleChallengeAgreement.schedule_id = sc.id AND scheduleChallengeAgreement.challenge_id = sc.challenge_id AND scheduleChallengeAgreement.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.invitechallengeUsers',
                tableConstant.CHALLENGE.TBL_CH_INVITE_USER,
                'invitechallengeUsers',
                `invitechallengeUsers.schedule_id = sc.id AND invitechallengeUsers.user_id = ${req.tokenUser?.id} AND invitechallengeUsers.status = 1`,
            )
            .where(condition)
            .select([
                'ch',
                'sc',
                'team.id',
                'company.id',
                'company.company_name',
                'scheduleChallengeAgreement.id',
                'scheduleChallengeAgreement.agreement_text',
                'scheduleChallengeAgreement.status',
                'invitechallengeUsers.team_id',
                'invitechallengeUsers.id',
            ])
            .orderBy('sc.start_date', 'ASC')
            .getMany();
    }
    async scheduleChallegeData(condition: any) {
        return await this.readReplicaScheduleChallengeRepository
            .createQueryBuilder('sc')
            .leftJoinAndMapOne(
                'sc.ch',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'ch',
                `ch.id = sc.challenge_id AND ch.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = sc.org_id AND company.status = 1`,
            )
            .where(condition)
            .select(['ch', 'sc', 'company.company_name'])
            .orderBy('sc.start_date', 'ASC')
            .getOne();
    }
    async findChallenge(condition: any, fields: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaScheduleChallengeRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async findOneChallenge(
        fields: any[] = [],
        condition: any,
        orderBy: any = null,
    ): Promise<ScheduleChallengeEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaScheduleChallengeRepository.findOne({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async challengeFindOneReport(
        condition: string,
        orderBy: object = null,
        fields: string[] = ['sc.id'],
    ): Promise<ScheduleChallengeEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaScheduleChallengeRepository
            .createQueryBuilder('sc')
            .leftJoinAndMapOne(
                'sc.ch',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'ch',
                `ch.id = sc.challenge_id AND ch.status = 1`,
            )
            .leftJoinAndMapOne(
                'sc.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ch.activity_id AND ac.status = 1`,
            )
            .where(condition)
            .select(fields)
            .orderBy(
                `sc.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getOne();
    }
}
