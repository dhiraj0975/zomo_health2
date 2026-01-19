import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    ScheduleChallengeEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import { PaginateWithChallengeInput } from 'src/input';
import { FindOptionsWhere, Repository } from 'typeorm';
@Injectable()
export class ScheduleChallengeService extends BaseService<ScheduleChallengeEntity> {
    constructor(
        @InjectRepository(ScheduleChallengeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaScheduleChallengeRepository: Repository<ScheduleChallengeEntity>,
        @InjectRepository(ScheduleChallengeEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaScheduleChallengeRepository: Repository<ScheduleChallengeEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaScheduleChallengeRepository,writeReplicaScheduleChallengeRepository, 'scheduleChallenge', commonArrayService);
    }
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
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
                : 'sc.added_date';
        let queryResult = await this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
        .leftJoinAndMapOne(
            'sc.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = sc.org_id`,
          )
        .leftJoinAndMapOne(
            'sc.challenge',
            tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
            'ch',
            `ch.id = sc.challenge_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaScheduleChallengeRepository.create(data);
        return await this.writeReplicaScheduleChallengeRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaScheduleChallengeRepository.metadata);
        return await this.writeReplicaScheduleChallengeRepository.createQueryBuilder('sc')
            .update(ScheduleChallengeEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaScheduleChallengeRepository.delete(condition);
    }
    async findOne(condition: any, user_id: string = null) {
        let cond = `joinUser.schedule_id = sc.id AND joinUser.status = 1`;
        if(user_id){
            cond += ` AND joinUser.user_id = ${user_id}`;
        }
        return await this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
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
        .leftJoinAndMapMany(
            'sc.tags',
            tableConstant.CHALLENGE.TBL_CH_TAGS,
            'tags',
            `FIND_IN_SET(tags.id, REPLACE(sc.tag_id, ' ', '')) > 0 AND tags.status = 1`,
        )
        .where(condition)
        .getOne();
    }
    async challengeFindOne(fields: any,condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
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
          .orderBy(`sc.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
          .getOne(); 
    }
    async listRecord(condition: FindOptionsWhere<ScheduleChallengeEntity> | string, orderBy: object = null, fields: string[] = ['sc.id', 'sc.challenge_id', 'sc.custom_cname', 'ch.challenge_type','company'], groupBy: string = null):Promise<ScheduleChallengeEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
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
        if(groupBy){
            query = query
            .groupBy(groupBy)
            .orderBy(`sc.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            return await query.getRawMany();
        }
        return await query.getMany();
    }
    async joinChallenge(condition: any, req: Request ) {
        return await this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
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
        .leftJoinAndMapMany(
            'sc.tags',
            tableConstant.CHALLENGE.TBL_CH_TAGS,
            'tags',
            `FIND_IN_SET(tags.id, REPLACE(sc.tag_id, ' ', '')) > 0 AND tags.status = 1`,
        )
        .where(condition)
        .select(['ch', 'sc','invitechallengeUsers.team_id','invitechallengeUsers.id','tags.id','tags.title'])
        .orderBy('sc.start_date', 'ASC')
        .getMany();
    }
    async scheduleChallegeDetail(condition: any,  req: Request) {
        return await this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
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
        .leftJoinAndMapMany(
            'sc.tags',
            tableConstant.CHALLENGE.TBL_CH_TAGS,
            'tags',
            `FIND_IN_SET(tags.id, REPLACE(sc.tag_id, ' ', '')) > 0 AND tags.status = 1`,
        )
        .where(condition)
        .select(['ch','sc','team.id','company.id','company.company_name','scheduleChallengeAgreement.id','scheduleChallengeAgreement.agreement_text','scheduleChallengeAgreement.status','invitechallengeUsers.team_id','invitechallengeUsers.id','tags.id','tags.title'])
        .orderBy('sc.start_date', 'ASC')
        .getMany();
    }
    async scheduleChallegeData(condition: any) {
        return await this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
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
            .select(['ch', 'sc','company.company_name'])
            .orderBy('sc.start_date', 'ASC')
            .getOne();
    }
    async findChallenge(condition: any,fields: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaScheduleChallengeRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async challengeFindOneReport(condition: string, orderBy: object = null, fields: string[] = ['sc.id']): Promise<ScheduleChallengeEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
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
            .orderBy(`sc.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async getChallengeDetailsForCampaign(i_id: number, org_id: number): Promise<any> {
        try {
            const result = await this.readReplicaScheduleChallengeRepository
                .createQueryBuilder('s')
                .innerJoin('ch_challenge', 'c', 'c.id = s.challenge_id')
                .select([
                    'CASE WHEN s.custom_cname != "" AND s.custom_cname IS NOT NULL THEN s.custom_cname ELSE c.challenge_name END AS ChallengeName',
                    'DATE_FORMAT(s.start_date, "%M %D, %Y") AS StartDate',
                    'DATE_FORMAT(s.end_date, "%M %D, %Y") AS EndDate',
                    'DATE_FORMAT(s.reg_start_date, "%M %D, %Y") AS RegistrationStartDate',
                    'DATE_FORMAT(s.reg_end_date, "%M %D, %Y") AS RegistrationEndDate'
                ])
                .where('s.id = :i_id', { i_id })
                .andWhere('s.org_id = :org_id', { org_id })
                .getRawOne();

            if (result) {
                return {
                    ChallengeName: result.ChallengeName,
                    StartDate: result.StartDate,
                    EndDate: result.EndDate,
                    RegistrationStartDate: result.RegistrationStartDate,
                    RegistrationEndDate: result.RegistrationEndDate
                };
            }

            return {};
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
