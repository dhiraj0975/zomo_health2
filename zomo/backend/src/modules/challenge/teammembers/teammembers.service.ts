import { appConstant, CommonArrayService, CommonFileService, tableConstant, TeamMembersEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { TeamMembersInterface } from 'src/interface/challenge';
import { Repository } from 'typeorm';
@Injectable()
export class TeamMembersService {
    constructor(
        @InjectRepository(TeamMembersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTeamMembersRepository: Repository<TeamMembersEntity>,
        @InjectRepository(TeamMembersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTeamMembersRepository: Repository<TeamMembersEntity>,
        private readonly commonFileService: CommonFileService,
        private readonly commonArrayService: CommonArrayService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = 'ASC';
        const orderBy = 'teamMember.user_order';
        let queryResult = await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `users.id = teamMember.user_id`,
        )
        .leftJoinAndMapOne(
            'teamMember.department',
            tableConstant.COMPANIES.TBL_DEPARTMENT,
            'department',
            `department.id = users.department_id`,
        )
        .leftJoinAndMapOne(
            'teamMember.locations',
            tableConstant.COMPANIES.TBL_LOCATION,
            'locations',
            `locations.id = users.location`,
        )
        .leftJoinAndMapOne(
            'teamMember.team',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'team',
            `teamMember.team_id= team.id`,
        )
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = team.schedule_id AND scheduleJoin.status !=2`,
        )
        .leftJoinAndMapOne(
            'teamMember.invitechallengeUsers',
            tableConstant.CHALLENGE.TBL_CH_INVITE_USER,
            'invitechallengeUsers',
            `users.id = invitechallengeUsers.user_id AND invitechallengeUsers.team_id = team.id AND invitechallengeUsers.status =1`,
        )
        .where(condition)
        .select(['users.id', 'users.first_name','users.last_name', 'users.profile_image', 'teamMember.status', 'teamMember.id', 'teamMember.team_id', 'teamMember.user_id', 'teamMember.user_order','scheduleJoin.trek_level_id','scheduleJoin.in_ranking','scheduleJoin.id','department.dept_name','locations.location_name','locations.city','locations.state','locations.lname','teamMember.iscaptain','invitechallengeUsers'])
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaTeamMembersRepository.create(data);
        return await this.writeReplicaTeamMembersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaTeamMembersRepository.metadata);
        return await this.writeReplicaTeamMembersRepository.createQueryBuilder('tm')
            .leftJoinAndMapOne(
                'tm.scheduleJoin',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                'scheduleJoin',
                `tm.user_id = scheduleJoin.user_id`,
            )
            .update(TeamMembersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async updateMultiple(whereOptions:any = {}, setData:any = {}) {
        setData = await this.commonFileService.filterDataByEntityColumns(setData, this.writeReplicaTeamMembersRepository.metadata);
        let ids = whereOptions['id'];
        return await this.writeReplicaTeamMembersRepository .createQueryBuilder('tm')
          .update(TeamMembersEntity)
          .set(setData)
          .where('id IN (:...ids)', { ids })
          .execute();
    }
    async delete(condition: any){
        await this.writeReplicaTeamMembersRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null, joinTale: any = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.teamSchedule',
            tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE,
            'teamSchedule',
            `teamMember.team_id = teamSchedule.team_id`,
        );
        if(joinTale && joinTale.length > 0){
            for(let i = 0; i < joinTale.length; i++){
                query = query.leftJoinAndMapOne(
                    `teamMember.${joinTale[i].alias}`,
                    joinTale[i].table,
                    joinTale[i].alias,
                    joinTale[i].on,
                );
            }
        }
        return await query.where(condition)
        .orderBy(`teamMember.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async listRecord(condition: any, joinType: any = null, orderBy: any = null, fields = ['users.id', 'users.first_name','users.last_name','users.profile_image','users.email', 'teamMember','team.id', 'team.tname','team.created_by' ,'team.logo', 'team.team_size', 'team.status','team.group_id']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember');
        if(joinType === 'inner'){
            query = query.innerJoinAndMapOne(
                'teamMember.users',
                tableConstant.TBL_USERS,
                'users',
                `users.id = teamMember.user_id AND users.status = 1`,
            );
        }else{
            query = query.leftJoinAndMapOne(
                'teamMember.users',
                tableConstant.TBL_USERS,
                'users',
                `users.id = teamMember.user_id AND users.status = 1`,
            );
        }
        
        query = query.leftJoinAndMapOne(
            'teamMember.team',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'team',
            `teamMember.team_id= team.id`,
        )
        query = query.where(condition)
        .select(fields)
        .orderBy(`teamMember.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return await query.getMany();
    }
    async joinListRecord(condition: any, orderBy: any = null, fields = ['users.id', 'users.first_name','users.last_name','users.profile_image', 'teamMember','team.id', 'team.tname','team.created_by' ,'team.logo', 'team.team_size', 'team.status','team.group_id']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `users.id = teamMember.user_id`,
        )
        .leftJoinAndMapOne(
            'teamMember.team',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'team',
            `teamMember.team_id = team.id`,
        )
        .innerJoinAndMapMany(
            'teamMember.scheduleUser',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleUser',
            `scheduleUser.schedule_id = team.schedule_id AND scheduleUser.user_id = teamMember.user_id AND scheduleUser.status != 2`,
        )
        .where(condition)
        .select(fields)
        .orderBy(`teamMember.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async countBaton(condition: any, field: any = null ) {
        field = field ?? ['teamMember', 'scheduleJoin','users',]
        return await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.status !=2 `,
        )
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `users.id = scheduleJoin.user_id AND users.status = 1`,
        )
            .where(condition)
            .select(field)
            .getMany();
    }
    async getMaxOrder(condition: any) {
        let result = this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.status !=2 `,
        )
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `users.id = scheduleJoin.user_id AND users.status = 1`,
        )
        .where(condition)
        .select(['MAX(user_order) AS max_order']);
        result = await result.getRawOne();
        if(result){
            return (result['max_order'] != '') ? result['max_order'] : 0;
        }else{
            return 0;
        }
    }
    async relayRaceChallegeOntimeSession(condition: any, user_id: any) {
       const data = this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.selfTeam',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'selfTeam',
            `teamMember.team_id= selfTeam.id`,
        )
        .leftJoinAndMapMany(
            'selfTeam.selfTeamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'selfTeamMember',
            `teamMember.team_id = selfTeamMember.team_id AND selfTeamMember.status = 1`,
        )
        .leftJoinAndMapOne(
            'selfTeamMember.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = selfTeamMember.user_id AND user.status = 1`,
        )
        .leftJoinAndMapOne(
            'teamMember.team',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'team',
            `teamMember.team_id= team.id AND team.status != 2`,
        )
        .leftJoinAndMapOne(
            'teamMember.schedule',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
            'schedule',
            `team.schedule_id = schedule.id AND DATE_FORMAT(schedule.end_date,'%Y-%m-%d') > DATE_FORMAT(NOW(),'%Y-%m-%d')`,
        )
        .leftJoinAndMapOne(
            'teamMember.ch',
            tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
            'ch',
            `schedule.challenge_id = ch.id AND ch.bio_challenge_type ='Relay_race' `,
        )
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `scheduleJoin.schedule_id = schedule.id AND scheduleJoin.user_id = ${user_id} AND scheduleJoin.status != 2`,
        )
            .where(condition)
            .select(['teamMember','schedule','ch','scheduleJoin', 'selfTeam', 'selfTeamMember', 'user'])
            .orderBy(`teamMember.id `, 'DESC');
            return await data.getMany()
    }
    async lastTurnCompleteUser(condition: any, status: any = null) {
        if(status && status ==''){
            condition['baton_status']= 3;
        }
        let totalUsers = await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.status !=2 `,
        )
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `users.id = scheduleJoin.user_id AND users.status = 1`,
        )
            .where(condition)
            .orderBy(`teamMember.user_order `, 'DESC')
            .getOne();
            if(totalUsers && totalUsers['TeamMember'] && totalUsers['TeamMember']['baton_start']){
				return totalUsers['TeamMember']['baton_start'];
			}else{
				return '';
			}
    }
    async teamDetails(condition: any ) {
        return await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.schedule',
            tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE,
            'schedule',
            `teamMember.team_id = schedule.team_id`,
        )
        .leftJoinAndMapOne(
            'teamMember.team',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'team',
            `teamMember.team_id= team.id`,
        )
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = team.schedule_id AND scheduleJoin.status != 2`,
        )
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `users.id = scheduleJoin.user_id`,
        )
        .where(condition)
        .select(['teamMember.team_id','teamMember.user_id', 'schedule.schedule_id', 'schedule.team_id', 'team.id', 'team.tname','team.created_by' ,'team.logo', 'team.team_size', 'team.status','team.group_id','scheduleJoin','users'])
        .orderBy('teamMember.user_order', 'ASC')
        .getMany();
    }
    async teamMembers(condition: any ) : Promise<TeamMembersInterface[]> {
        return await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `users.id = teamMember.user_id`,
        )
        .leftJoinAndMapOne(
            'teamMember.department',
            tableConstant.COMPANIES.TBL_DEPARTMENT,
            'department',
            `department.id = users.department_id`,
        )
        .leftJoinAndMapOne(
            'teamMember.locations',
            tableConstant.COMPANIES.TBL_LOCATION,
            'locations',
            `locations.id = users.location`,
        )
        .leftJoinAndMapOne(
            'teamMember.team',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'team',
            `teamMember.team_id= team.id`,
        )
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = team.schedule_id AND scheduleJoin.status !=2`,
        )
        .leftJoinAndMapOne(
            'teamMember.invitechallengeUsers',
            tableConstant.CHALLENGE.TBL_CH_INVITE_USER,
            'invitechallengeUsers',
            `users.id = invitechallengeUsers.user_id AND invitechallengeUsers.team_id = team.id AND invitechallengeUsers.status =1`,
        )
        .where(condition)
        .select(['users.id', 'users.first_name','users.last_name', 'users.profile_image', 'teamMember.status', 'teamMember.id', 'teamMember.team_id', 'teamMember.user_id', 'teamMember.user_order','scheduleJoin.trek_level_id','scheduleJoin.in_ranking','scheduleJoin.id','scheduleJoin.schedule_id','department.id','department.dept_name','locations.id','locations.location_name','locations.city','locations.state','locations.lname','teamMember.iscaptain','invitechallengeUsers'])
        .orderBy('teamMember.user_order', 'ASC')
        .getMany();
    }
    async currentJoinTeamMember(condition: any, schedule_id: any ) {
        let allgetteams =  await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.scheduleUser',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleUser',
            `scheduleUser.user_id = teamMember.user_id AND schedule_id = ${schedule_id} AND scheduleUser.status !=2`,
        )
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `scheduleUser.user_id = users.id and users.status = 1`,
        )
            .where(condition)
            .select(['users', 'teamMember', 'scheduleJoin.users'])
            .getMany();
          let data_member = {};
          let all_member = [];
          if(allgetteams && allgetteams.length){
            for(let member of allgetteams){
                data_member['id'] = member['id'];
                data_member['team_id'] = member['team_id'];
                data_member['org_id'] = member['org_id'];
                data_member['user_id'] = member['user_id'];
                data_member['user_order'] = member['user_order'];
                data_member['created_date'] = member['created_date'];
                data_member['iscaptain'] = member['iscaptain'];
                data_member['baton_status'] = member['baton_status'];
                data_member['baton_start'] = member['baton_start'];
                data_member['status'] = member['status'];
                data_member['user']['id'] = member['users']['id'];
                data_member['user']['first_name'] = member['users']['first_name'];
                data_member['user']['name'] = member['users']['name'];
                data_member['user']['last_name'] = member['users']['last_name'];
                data_member['user']['profile_image'] = member['users']['profile_image'];
                data_member['user']['department_id'] = member['users']['department_id'];
                data_member['user']['location'] = member['users']['location'];
                data_member['user']['status'] = member['users']['status'];
                all_member.push(data_member);
            }
          }
          return all_member;
    }
    async currentJoinTeamMemberData(condition: any, schedule_id: any ) {
        let allgetteams =  await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.scheduleUser',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleUser',
            `scheduleUser.user_id = teamMember.user_id AND schedule_id = ${schedule_id} AND scheduleUser.status !=2`,
        )
        .leftJoinAndMapOne(
            'teamMember.users',
            tableConstant.TBL_USERS,
            'users',
            `scheduleUser.user_id = users.id and users.status = 1`,
        )
            .where(condition)
            .select(['users', 'teamMember', 'scheduleUser'])
            .getMany();
          let all_member = [];
          if(allgetteams && allgetteams.length && allgetteams['scheduleUser']!==null){
            for(let member of allgetteams){
                let data_member = Object.create(null);
                if(!data_member['user']){
                    data_member['user'] = Object.create(null)
                }
                data_member['id'] = member['id'];
                data_member['team_id'] = member['team_id'];
                data_member['org_id'] = member['org_id'];
                data_member['user_id'] = member['user_id'];
                data_member['join_id'] = member?.['scheduleUser']?.['id'];
                data_member['user_order'] = member['user_order'];
                data_member['created_date'] = member['created_date'];
                data_member['iscaptain'] = member['iscaptain'];
                data_member['baton_status'] = member['baton_status'];
                data_member['baton_start'] = member['baton_start'];
                data_member['status'] = member['status'];
                data_member['user']['id'] = member?.['users']?.['id'] || '';
                data_member['user']['first_name'] = member?.['users']?.['first_name'] || '';
                data_member['user']['name'] = member?.['users']?.['first_name'] + ' ' + member?.['users']?.['last_name'] || '';
                data_member['user']['last_name'] = member?.['users']?.['last_name'] || '';
                data_member['user']['profile_image'] = member?.['users']?.['profile_image'] || '';
                data_member['user']['department_id'] = member?.['users']?.['department_id'] || '';
                data_member['user']['location'] = member?.['users']?.['location'] || '';
                data_member['user']['status'] = member?.['users']?.['status'] || '';
                all_member.push(data_member);
            }
          }
          return all_member;
    }
    async getTeamMembersIds(condition: any, type: any = 'string') {
        const memberIds =  await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .where(condition)
        .select(['teamMember.user_id'])
        .getMany();
        if(type == 'string'){
            return memberIds.map((team) => team.user_id).join(',');
        }else{
            return memberIds.map((team) => team.user_id);
        }
    }
    async teamMemberList(condition: any) {
        return await this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .leftJoinAndMapOne(
            'teamMember.team',
            tableConstant.CHALLENGE.TBL_CH_TEAMS,
            'team',
            `teamMember.team_id= team.id`,
        )
        .where(condition)
        .select(['teamMember.id','teamMember.user_id', 'team.id', 'team.tname','team.created_by' ,'team.logo', 'team.team_size', 'team.status','team.group_id',])
        .getMany();
    }
    async getTeamMembersChallengeData(userId:any){
        const teamMembers = await this.readReplicaTeamMembersRepository.createQueryBuilder('TeamMember')
                    .leftJoinAndMapOne(
                        'TeamMember.team', // Mapping the team relation to 'TeamMember.team'
                        tableConstant.CHALLENGE.TBL_CH_TEAMS,            // Join with the 'Team' table
                        'Team',            // Alias
                        'TeamMember.team_id = Team.id' // Join condition
                    )
                    .leftJoinAndMapOne(
                        'TeamMember.schedule', // Mapping the schedule relation to 'TeamMember.schedule'
                        tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,           // Join with the 'Schedule' table
                        'Schedule',            // Alias
                        'Team.schedule_id = Schedule.id' // Join condition
                    )
                    .leftJoinAndMapOne(
                        'TeamMember.challenge', // Mapping the challenge relation to 'TeamMember.challenge'
                        tableConstant.CHALLENGE.TBL_CH_CHALLENGE,            // Join with the 'Challenge' table
                        'ch',                   // Alias for the challenge
                        'Schedule.challenge_id = ch.id AND ch.bio_challenge_type = "Relay_race"'
                    )
                    .leftJoinAndMapOne(
                        'TeamMember.scheduleUser', // Mapping the ScheduleUser relation to 'TeamMember.scheduleUser'
                        tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,           // Join with the 'ScheduleUser' table
                        'Scheduleuser',            // Alias
                        `Scheduleuser.schedule_id = Schedule.id AND Scheduleuser.user_id = ${userId}`
                    )
                    .where(`TeamMember.user_id = ${userId}`)
                    .andWhere('TeamMember.status = 1')
                    .andWhere('Schedule.status = 1')
                    .andWhere("DATE_FORMAT(Schedule.end_date, '%Y-%m-%d') > DATE_FORMAT(NOW(), '%Y-%m-%d')")
                    .select([
                        'TeamMember.id', 
                        'TeamMember.status', 
                        'Team', 
                        'Schedule', 
                        'ch', 
                        'Scheduleuser'
                    ])
                    .orderBy('TeamMember.id', 'DESC')
        return teamMembers.getMany();
    } 
    async countTeamMember(condition: any) {
        let query = this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .where(condition);
        return await query.getCount();
    }
    async getLockTeamCancelle(condition: any) {
        let query = this.readReplicaTeamMembersRepository.createQueryBuilder('teamMember')
        .where(condition)
        .orderBy('teamMember.id', 'DESC');
        return await query.getMany();
    }
}
