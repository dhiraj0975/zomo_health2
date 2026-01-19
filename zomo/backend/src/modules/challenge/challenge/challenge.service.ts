import {
  appConstant,
  BaseService,
  ChallengeEntity,
  CommonArrayService,
  CommonFileService,
  tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeService extends BaseService<ChallengeEntity> {
    constructor(
        @InjectRepository(ChallengeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeRepository: Repository<ChallengeEntity>,
        @InjectRepository(ChallengeEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeRepository: Repository<ChallengeEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaChallengeRepository,writeReplicaChallengeRepository,'challenge', commonArrayService);
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
                : 'challenge.id';
        const queryResult = await this.readReplicaChallengeRepository.createQueryBuilder('challenge')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaChallengeRepository.create(data);
        return await this.writeReplicaChallengeRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaChallengeRepository.metadata);
        return await this.writeReplicaChallengeRepository.createQueryBuilder('c')
            .update(ChallengeEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaChallengeRepository.delete(condition);
    }
    async findOne(condition: any) {
        return await this.readReplicaChallengeRepository.createQueryBuilder('challenge')
        .leftJoinAndMapMany(
            'challenge.org_invite',
            tableConstant.CHALLENGE.TBL_CH_ORG_INVITES,
            'org_invite',
            `org_invite.challenge_id = challenge.id`,
          )
          .leftJoinAndMapOne(
            'org_invite.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = org_invite.org_id AND company.status = 1`,
          )
          .leftJoinAndMapMany(
            'challenge.fitness',
            tableConstant.CHALLENGE.TBL_CH_FITNESS_ACTIVITY,
            'fitness',
            `fitness.challenge_id = challenge.id AND fitness.status != 2`,
          )
          .leftJoinAndMapMany(
            'challenge.weeks',
            tableConstant.CHALLENGE.TBL_CH_WEEKS,
            'weeks',
            `weeks.challenge_id = challenge.id AND weeks.status = 1`,
          )
          .leftJoinAndMapOne(
            'weeks.activity',
            tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY,
            'activity',
            `activity.id = weeks.activity_id AND activity.status = 1`,
          )
          .leftJoinAndMapOne(
            'weeks.health_activity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'health_activity',
            `health_activity.id = weeks.activity_id AND health_activity.status = 1`,
          )
          .leftJoinAndMapMany(
            'weeks.days',
            tableConstant.CHALLENGE.TBL_CH_DAYS,
            'days',
            `days.week_id = weeks.id AND days.challenge_id = challenge.id AND days.status = 1`,
          )
          .leftJoinAndMapOne(
            'days.activity',
            tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY,
            'activities',
            `activities.id = days.activity_id AND activities.status = 1`,
          )
          .leftJoinAndMapOne(
            'days.health_activity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'health_activities',
            `health_activities.id = days.activity_id AND health_activities.status = 1`,
          )
        .where(condition)
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaChallengeRepository.find({
            where: condition,
            order: orderBy,
        });
    }
    async listRecordJoinChallenge(condition: any, orderBy: any = null , field : any = null) {
        let data = this.readReplicaChallengeRepository.createQueryBuilder('ch')
                  .leftJoinAndMapOne(
                    'ch.ac',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'ac',
                    `ac.id = ch.activity_id`,
                  )
                  .where(condition);
                  if (field !== null){
                    data.select(field)
                  }
      return await data.getMany();
    }
    async addActiveChallengeList(condition: any, orderBy: any = null, fields: any = ['challenge'], org_id) {
      if (!orderBy) {
        orderBy = { id: 'DESC' };
      }
      return await this.readReplicaChallengeRepository.createQueryBuilder('challenge')
      .leftJoinAndSelect(tableConstant.CHALLENGE.TBL_CH_ORG_INVITES, 'org_invite', 'org_invite.challenge_id = challenge.id')
      .leftJoin(
        qb => qb
          .select('COUNT(challenge_id)', 'counted')
          .addSelect('challenge_id')
          .addSelect('org_id')
          .from(tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE, 'sc')
          .where(`sc.org_id = ${org_id} AND sc.status !=2`)
          .groupBy('sc.challenge_id'),
        'sc',
        'challenge.id = sc.challenge_id'
      )
      .where(condition)
      .select(fields)
      .getRawMany(); 
    }
}
