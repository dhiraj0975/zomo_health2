import { appConstant, CommonArrayService, CommonFileService, tableConstant, TeamsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class TeamsService {
    constructor(
        @InjectRepository(TeamsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTeamsRepository: Repository<TeamsEntity>,
        @InjectRepository(TeamsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTeamsRepository: Repository<TeamsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = 'ASC';
        const orderBy = 'team.id';
        let queryResult = await this.readReplicaTeamsRepository.createQueryBuilder('team')
        .leftJoinAndMapOne(
            'team.challengeGroups',
            tableConstant.CHALLENGE.TBL_CH_GROUPS,
            'challengeGroups',
            `challengeGroups.schedule_id = team.schedule_id`,
        )
        .leftJoinAndMapMany(
            'team.teamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'teamMember',
            `teamMember.team_id = team.id AND teamMember.status NOT IN (2,3)`,
        )
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = team.schedule_id AND scheduleJoin.status = 1`,
        )
        .leftJoinAndMapOne(
            'teamMember.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = teamMember.user_id AND user.status = 1`,
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
        const savedResult = this.writeReplicaTeamsRepository.create(data);
        return await this.writeReplicaTeamsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaTeamsRepository.metadata);
        return await this.writeReplicaTeamsRepository.createQueryBuilder('t')
            .update(TeamsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaTeamsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null, fields : any = ['team']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaTeamsRepository.createQueryBuilder('team')       
        .where(condition)
        .select(fields)
        .orderBy(`team.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, field: any = ['team'], groupBy: string = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaTeamsRepository.createQueryBuilder('team')
        .leftJoinAndMapOne(
            'team.challengeGroups',
            tableConstant.CHALLENGE.TBL_CH_GROUPS,
            'challengeGroups',
            `challengeGroups.schedule_id = team.schedule_id`,
        )
        .leftJoinAndMapMany(
            'team.teamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'teamMember',
            `teamMember.team_id = team.id AND teamMember.status NOT IN (2,3)`,
        )
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = team.schedule_id AND scheduleJoin.status = 1`,
        )
        .leftJoinAndMapOne(
            'teamMember.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = scheduleJoin.user_id AND user.status = 1`,
        )
        .where(condition)
        .select(field)
        .orderBy(`team.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        if(groupBy){
            query = query.groupBy(groupBy);
        }
        return await query.getMany();
    }
    async teamDetail(condition: any) {
        const teamDetails = await this.readReplicaTeamsRepository.createQueryBuilder('team')
        .leftJoinAndMapOne(
            'team.teamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'teamMember',
            `teamMember.team_id = team.id`,
        )
        .leftJoinAndMapOne(
            'team.scj',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scj',
            `teamMember.user_id = scj.user_id AND scj.schedule_id = team.schedule_id AND scj.status != 2`,
        )
        .leftJoinAndMapOne(
            'team.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = teamMember.user_id AND scj.user_id = teamMember.user_id`,
        )
        .leftJoinAndMapOne(
            'team.userSetting',
            tableConstant.TBL_USERS_SETTINGS,
            'userSetting',
            `userSetting.user_id = teamMember.user_id`,
        )
            .where(condition)
            .select(['teamMember','user.id','user.username','user.first_name','user.last_name','user.code','user.email','user.profile_image','userSetting.device_token','scj.relay_race_push_detail','scj.id as ch_user_join_id'])
            .orderBy('teamMember.user_order', 'ASC')
            .getMany();
            teamDetails.forEach(v => {
                v['user']['name'] = v['user']['first_name']+ ' ' + v['user']['last_name'];
                v['user']['device_token'] = v['userSetting']['device_token'];
                delete v['userSetting'];
            });
            return teamDetails;
    }
    async getAllTeams(condition: any, joinTale: any = [], userJoin:any = true) {
        condition = condition + ' AND team.status = 1';
        let query = this.readReplicaTeamsRepository.createQueryBuilder('team')
        .leftJoinAndMapMany(
            'team.teamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'teamMember',
            `teamMember.team_id = team.id AND teamMember.status = 1`, 
        )
        .leftJoinAndMapOne( 
            'teamMember.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = teamMember.user_id AND user.status = 1`,
        )
        .leftJoinAndMapOne(
            'team.challengeGroups',
            tableConstant.CHALLENGE.TBL_CH_GROUPS,
            'challengeGroups',
            `challengeGroups.id = team.group_id`,
        )
        .leftJoinAndMapOne(
            'teamMember.department',
            tableConstant.COMPANIES.TBL_DEPARTMENT,
            'department',
            `department.id = user.department_id`,
        )
        .leftJoinAndMapOne(
            'teamMember.locations',
            tableConstant.COMPANIES.TBL_LOCATION,
            'locations',
            `locations.id = user.location`,
        );
        if(userJoin == true){
            query = query.innerJoinAndMapOne(
                'teamMember.scheduleJoin',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                'scheduleJoin',
                `teamMember.user_id = scheduleJoin.user_id AND team.schedule_id = scheduleJoin.schedule_id AND scheduleJoin.status != 2`, 
            );
        }else{
            query = query.leftJoinAndMapOne(
                'teamMember.scheduleJoin',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                'scheduleJoin',
                `teamMember.user_id = scheduleJoin.user_id AND team.schedule_id = scheduleJoin.schedule_id AND scheduleJoin.status != 2`, 
            );
        }
        query = query.leftJoinAndMapOne(                                                        
            'team.team_created',
            tableConstant.TBL_USERS,
            'team_created',
            `team_created.id = team.created_by AND team_created.status = 1`,
        );
        let selectedFileds = ['team.id', 'team.tname', 'team.logo', 'team.team_size','team.group_id','team.org_id','team.dept_id','team.loc_id','team.dept_with_loc_id','team.created_date','team.created_by','challengeGroups.name','challengeGroups.logo','teamMember','user.id','user.first_name', 'user.last_name','user.profile_image','user.department_id','user.location','user.status','user.org_id','department.id','department.dept_name','locations.id','locations.location_name','locations.city','locations.state','locations.lname','scheduleJoin','team_created.role_id','team_created.id'];
        if(joinTale && joinTale.length > 0){
            for(let i = 0; i < joinTale.length; i++){
                if(joinTale[i].type == 'INNER'){
                    query = query.innerJoinAndMapOne(
                        `${joinTale[i].connect}.${joinTale[i].alias}`,
                        joinTale[i].table,
                        joinTale[i].alias,
                        joinTale[i].on,
                    );
                }else{
                    query = query.leftJoinAndMapOne(
                        `${joinTale[i].connect}.${joinTale[i].alias}`,
                        joinTale[i].table,
                        joinTale[i].alias,
                        joinTale[i].on,
                    );
                }
                if(Array.isArray(joinTale[i].fields)){
                    selectedFileds = selectedFileds.concat(joinTale[i].fields);
                }else{
                    selectedFileds.push(joinTale[i].fields);
                }
            }
        }
        return query.where(condition)
        .select(selectedFileds)
        .orderBy('team.id', 'ASC')
        .getMany();
    }
    async getAllTeamWithMember(condition: any) {
        condition = condition + ' AND team.status = 1';
        let query = this.readReplicaTeamsRepository.createQueryBuilder('team')
        .leftJoinAndMapMany(
            'team.teamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'teamMember',
            `teamMember.team_id = team.id AND teamMember.status NOT IN (2,3)`, 
        )
        .leftJoinAndMapOne( 
            'teamMember.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = teamMember.user_id AND user.status = 1`,
        )
        .leftJoinAndMapOne(
            'teamMember.scheduleJoin',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scheduleJoin',
            `teamMember.user_id = scheduleJoin.user_id AND team.schedule_id = scheduleJoin.schedule_id AND scheduleJoin.status != 2`, 
        );
        let selectedFileds = ['team.id', 'team.tname', 'team.logo', 'team.team_size','team.group_id','team.org_id','teamMember','user.id','user.first_name', 'user.last_name','user.profile_image','user.department_id','user.location','user.status','user.org_id','scheduleJoin'];
        return query.where(condition)
        .select(selectedFileds)
        .orderBy('team.id', 'ASC')
        .getMany();
    }
    async getTeamData(condition: any, schedule_id: string, timeZone: string) {
        const teamDetails = await this.readReplicaTeamsRepository.createQueryBuilder('team')
        .leftJoinAndMapOne( 
            'team.teamSchedule',
            tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE,
            'teamSchedule',
            `teamSchedule.team_id = team.id`,
        )
        .leftJoinAndMapOne(
            'team.challengeGroups',
            tableConstant.CHALLENGE.TBL_CH_GROUPS,
            'challengeGroups',
            `challengeGroups.id = team.group_id`,
        )
        .leftJoinAndMapMany(
            'team.teamMember',
            tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
            'teamMember',
            `teamMember.team_id = team.id AND teamMember.status = 1`,
        )
        .leftJoinAndMapOne(
            'teamMember.scj',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scj',
            `teamMember.user_id = scj.user_id AND scj.schedule_id = ${schedule_id} AND scj.status = 1`,
        )
        .leftJoinAndMapOne(
            'teamMember.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = teamMember.user_id AND scj.user_id = teamMember.user_id AND user.status = 1`,
        )
        .leftJoinAndMapOne(
            'user.location',
            tableConstant.COMPANIES.TBL_LOCATION,
            'location',
            `location.id = user.location AND location.status = 1 AND location.deleted = 0`,
        )
        .where(condition)
        .select(['team.id', 'team.tname', 'team.logo', 'team.team_size','team.group_id','team.created_by','team.created_date','challengeGroups.name','challengeGroups.logo',
            'teamMember.id', 'teamMember.team_id','teamMember.org_id','teamMember.user_id','teamMember.user_order','teamMember.created_date','teamMember.iscaptain','teamMember.baton_start','teamMember.baton_status','teamMember.status',`DATE_FORMAT(CONVERT_TZ(teamMember.baton_start,'UTC','${timeZone}'),'%Y-%m-%d %H:%i:%s') as baton_startsss`,
            'user.id','user.first_name', 'user.last_name','user.profile_image','user.department_id','user.location','user.status',
            'scj.id','scj.user_id','scj.schedule_id','scj.status',
            'location.id','location.location_name','location.city','location.state','location.lname'
        ])
        .orderBy('teamMember.user_order', 'ASC')
        .getMany();
        return teamDetails;
    }
    sortTeamsByOnField(allteams: object[], fieldName: string, teamId: string = null, groupId: string = null): object[] {
        let teamsArray = Object.values(allteams);
        teamsArray.sort((a: any, b: any) => b[fieldName] - a[fieldName]);
        teamsArray = teamsArray.map((item, index) => ({
            ...item,
            ranking: index + 1
            }));
        if (teamId || groupId) {
            teamsArray = teamsArray.sort((a, b) => {
                if (teamId) {
                    if (a['id'] === teamId) return -1;
                    if (b['id'] === teamId) return 1;
                }
                if (groupId) {
                    if (a['group_id'] === groupId) return -1;
                    if (b['group_id'] === groupId) return 1;
                }
                return 0;
            });
        }
        return teamsArray;
    }
    async chatTeamList(condition: any, paginationParam: any = null, user_id) {
        const paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
            const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
            const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'id';
            const query = await this.readReplicaTeamsRepository
            .createQueryBuilder('team')
            .select('team.id')
            .where(condition)
            .orderBy(`team.${orderBy}`, <any>order);

            let total = await query.clone().getCount();
            const paginatedUserIds = await query
            .skip(paginateObj.skip)
            .take(paginateObj.take)
            .getRawMany()
        let ids = paginatedUserIds.map(u => u.team_id); 
        let fields = ['team.tname', 'team.id', 'team.schedule_id','COALESCE(chatCount.total, 0) AS total'];
        let teams= await this.readReplicaTeamsRepository.createQueryBuilder('team')
        .leftJoin(
            (qb) => {
              return qb
                .select('COUNT(chat.id)', 'total')
                .addSelect('chat.team_id','team_id')
                .from(tableConstant.CHALLENGE.TBL_CH_CHAT, 'chat')
                .where('chat.is_private = 0')
                .andWhere(`chat.sender_id != '${user_id}'`)
                .andWhere(`chat.read_by NOT REGEXP '^${user_id}'`)
                .andWhere(`chat.read_by NOT REGEXP '${user_id}$'`)
                .andWhere(`chat.read_by != '${user_id}'`)
                .andWhere(`chat.read_by NOT REGEXP '${user_id}'`)
                .groupBy('chat.team_id');
            },
            'chatCount',
            'team.id = chatCount.team_id'
          )
          .select(fields)
          .whereInIds(ids)
          .getRawMany();
          if(teams && teams.length){
                teams = teams.map((item) => {
                    const newItem = {};
                    Object.entries(item).forEach(([key, value]) => {
                      const newKey = key.startsWith('team_') ? key.replace('team_', '') : key;
                      newItem[newKey] = value;
                    });
                    return newItem;
                  });
            }
          return this.commonArrayService.paginationResponse(teams, total, paginateObj);
    }
    async getTeamAllReport(condition: any, field: string[] = ['team.id','team.tname']) {
        const teamDetails = await this.readReplicaTeamsRepository.createQueryBuilder('team')
        .leftJoinAndMapOne( 
            'team.teamSchedule',
            tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE,
            'teamSchedule',
            `teamSchedule.team_id = team.id`,
        )
        .leftJoinAndMapOne(
            'team.challengeGroups',
            tableConstant.CHALLENGE.TBL_CH_GROUPS,
            'challengeGroups',
            `challengeGroups.id = team.group_id`,
        )
        .leftJoinAndMapOne(
            'team.scj',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'scj',
            `teamSchedule.schedule_id = scj.schedule_id`,
        )
        .where(condition)
        .select(field)
        .orderBy('team.id', 'ASC')
        .getMany();
        return teamDetails;
    }
}
