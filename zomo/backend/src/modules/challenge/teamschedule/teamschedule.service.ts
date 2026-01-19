import { appConstant, CommonFileService, tableConstant, TeamScheduleEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class TeamScheduleService {
    constructor(
        @InjectRepository(TeamScheduleEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTeamScheduleRepository: Repository<TeamScheduleEntity>,
        @InjectRepository(TeamScheduleEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTeamScheduleRepository: Repository<TeamScheduleEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaTeamScheduleRepository.create(data);
        return await this.writeReplicaTeamScheduleRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaTeamScheduleRepository.metadata);
        return await this.writeReplicaTeamScheduleRepository.createQueryBuilder('ts')
            .update(TeamScheduleEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaTeamScheduleRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaTeamScheduleRepository.createQueryBuilder('teamSchedule')
        .leftJoinAndMapOne(
            'teamSchedule.teams',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'teams',
            `teams.id = teamSchedule.team_id`,
          )
        .where(condition)
        .orderBy(`teamSchedule.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async checkTeamNotFull(condition: any, groupBy: any = null, fields: any, join: boolean = false, orderBy: any = null) {
        let query = this.readReplicaTeamScheduleRepository.createQueryBuilder('TeamSchedule')
        .leftJoinAndMapOne(
            'TeamSchedule.Teams',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'Teams',
            `Teams.id = TeamSchedule.team_id`,
          );
          if(join){
            query = query
          .leftJoinAndMapOne(
            'TeamSchedule.TeamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'TeamMember',
            `Teams.id = TeamMember.team_id and TeamMember.status NOT IN (2,3)`,
          )
        }
        query = query
        .where(condition)
        .select(fields)
        .groupBy(groupBy);
        if (orderBy != null) {
          query = query.orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        }
        return await query.getMany()
    }
    async checkTeam(condition: any, fields: any) {
        let query = this.readReplicaTeamScheduleRepository.createQueryBuilder('TeamSchedule')
        .leftJoinAndMapOne(
            'TeamSchedule.Teams',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'Teams',
            `Teams.id = TeamSchedule.team_id`,
          );
        query = query
        .where(condition)
        .select(fields)
        return await query.getMany()
    }
    async listRecordJoinSchedule(condition: any, groupBy: any = null, fields: any, join: boolean = false, orderBy: any = null) {
        let query = this.readReplicaTeamScheduleRepository.createQueryBuilder('TeamSchedule')
        .leftJoinAndMapOne(
            'TeamSchedule.Teams',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'Teams',
            `Teams.id = TeamSchedule.team_id`,
          );
          if(join){
            query = query
          .leftJoinAndMapOne(
            'TeamSchedule.TeamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'TeamMember',
            `Teams.id = TeamMember.team_id`,
          )
        }
        query = query
        .where(condition)
        .select(fields);
        if (orderBy != null) {
          query = query.groupBy(groupBy);
        }
        if (orderBy != null) {
          query = query.orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        }
        return await query.getMany()
    }
    async listRecord(condition: any, orderBy: any = null, groupBy: any = null, fields: any = ['teamSchedule']) {
      if (!orderBy) {
          orderBy = { id: 'DESC' };
      }
      let query = this.readReplicaTeamScheduleRepository.createQueryBuilder('teamSchedule')
      .leftJoinAndMapOne(
        'teamSchedule.teams',
        tableConstant.CHALLENGE.TBL_CH_TEAMS,
        'teams',
        `teams.id = teamSchedule.team_id`,
      )
      .leftJoinAndMapMany(
        'teamSchedule.teamMember',
        tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
        'teamMember',
        `teams.id = teamMember.team_id AND teamMember.status NOT IN (2,3)`,
      )
      .leftJoinAndMapOne(
        'teamSchedule.scheduleChallenge',
        tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
        'scheduleChallenge',
        `scheduleChallenge.id = teamSchedule.schedule_id`,
      )
      .leftJoinAndMapMany(
        'teamSchedule.scheduleUser',
        tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
        'scheduleUser',
        `scheduleUser.schedule_id = scheduleChallenge.id AND scheduleUser.status != 2`,
      )
      .where(condition)
      .select(fields)
      .groupBy(groupBy)
      if(typeof orderBy == 'object'){
        query = query
        .orderBy(`teamSchedule.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
      }else{
        query = query
        .orderBy(orderBy);
      }
      return await query.getMany()
  }

  async getMyTeamSchduleData(condition: any, orderBy: any = null, groupBy: any = null, fields: any = ['teamSchedule']) {
      if (!orderBy) {
          orderBy = { id: 'DESC' };
      }
      let query = this.readReplicaTeamScheduleRepository.createQueryBuilder('teamSchedule')
      .leftJoinAndMapOne(
        'teamSchedule.teams',
        tableConstant.CHALLENGE.TBL_CH_TEAMS,
        'teams',
        `teams.id = teamSchedule.team_id`,
      )
      .leftJoinAndMapOne(
        'teamSchedule.teamMember',
        tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
        'teamMember',
        `teams.id = teamMember.team_id AND teamMember.status NOT IN (2,3)`,
      )
      .leftJoinAndMapOne(
        'teamSchedule.scheduleChallenge',
        tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
        'scheduleChallenge',
        `scheduleChallenge.id = teamSchedule.schedule_id`,
      )
      .leftJoinAndMapOne(
        'teamSchedule.scheduleUser',
        tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
        'scheduleUser',
        `scheduleUser.schedule_id = scheduleChallenge.id AND scheduleUser.status != 2`,
      )
      .where(condition)
      .select(fields)
      .groupBy(groupBy)
      if(typeof orderBy == 'object'){
        query = query
        .orderBy(`teamSchedule.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
      }else{
        query = query
        .orderBy(orderBy);
      }
      return await query.getMany()
  }
  async getTeamList(conditons: any, orderBy: any = null, groupBy: any = null, fields: any = ['teamSchedule']) {
    if (!orderBy) {
      orderBy = { id: 'DESC' };
    }
    let query =  this.readReplicaTeamScheduleRepository
    .createQueryBuilder('teamSchedule')
    .leftJoinAndMapOne(
      'teamSchedule.teams',
      tableConstant.CHALLENGE.TBL_CH_TEAMS,
      'teams',
      `teams.id = teamSchedule.team_id`,
    )
    .leftJoinAndMapMany(
      'teamSchedule.teamMember',
      tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
      'teamMember',
      `teamMember.team_id = teams.id AND teamMember.status NOT IN (2,3)`,
    )
    .leftJoinAndMapMany(
      'teamSchedule.scheduleUser',
      tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
      'scheduleUser',
      `teamMember.user_id = scheduleUser.user_id AND scheduleUser.schedule_id = teamSchedule.schedule_id  AND scheduleUser.status = 1`,
    )
    .where(conditons)
    .groupBy(groupBy);
    if(typeof orderBy == 'object'){
      query = query.orderBy(`teams.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
    }else{
      query = query.orderBy(orderBy);
    }
    return await query.select(fields).addSelect(`(SELECT CONCAT(u.first_name, ' ', u.last_name) FROM s_users u WHERE teamMember.iscaptain = 1 AND u.id = teamMember.user_id LIMIT 1)`, 'Captain').getRawMany();
  }
}
