import {
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    ScheduleChallengeEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { cronAppConstant } from 'src/common';
import { UserService } from 'src/module/user/user.service';
import { BioWeightService } from '../bioweight/bioweight.service';
import { TeamsService } from '../team/teams.service';

@Injectable()
export class FootballChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly bioWeightService: BioWeightService,
        private readonly teamsService: TeamsService,
        private readonly commonHealthService: CommonHealthService,
    ) {}

    async footballChallengeReport(schedule: Partial<ScheduleChallengeEntity>,condition: string = '',result_type: number = 1,paginateObj: any = null, teamCondition: string = '', role_id = null) {
        try {
            let result;
            condition += ` AND scj.status = 1`;
            if (schedule['ch']['bio_challenge_type'] == 'Football') {
                result = await this.footballChallengeReportHelper(
                    schedule,
                    condition.replace(/User/gi, "user"),
                    result_type,
                    paginateObj,
                    teamCondition,
                    role_id
                );
            }
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }
    async footballChallengeReportHelper(schedule: Partial<ScheduleChallengeEntity>, condition: string = '', result_type: number = 1, paginateObj: any = null, teamCondition: string = '', role_id = null) {
        try {
            let gStartDate;
            let startDate;
            let endDate;
            let rangeStartDate;
            let rangeEndDate;
            let weightWhere;
            let result = [];
            startDate = this.commonDateService.DateTimeFormat(schedule?.['start_date'],'timestamp');
            endDate = this.commonDateService.DateTimeFormat(schedule?.['end_date'],'timestamp',);
            let now: any = this.commonDateService.DateTimeFormat('now','timestamp',);
            if (now >= endDate) {
                now = endDate;
            }
            let totalDays = Math.floor((endDate - startDate) / (60 * 60 * 24)) + 1;
            let uptoDays = Math.floor((now - startDate) / (60 * 60 * 24)) + 1;
            if (uptoDays === 0) {
                uptoDays = 1;
            }

            let userList = [];
            let joinTable = [
                {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'teamMember', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, 'on' : `teamMember.user_id = user.id AND teamMember.status !=2`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'teamSchedule', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, 'on' : `teamMember.team_id = teamSchedule.team_id  AND teamSchedule.status !=2` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamSchedule.schedule_id = scj.schedule_id And teamMember.user_id = scj.user_id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'team', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAMS, 'on' : `teamMember.team_id= team.id AND team.status !=2` , 'connect' : 'user', 'type' : 'LEFT' },
            ];
            let fields = ['user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option','teamMember','teamSchedule','scj.id','scj.schedule_id','scj.challenge_id',
                'team.id','team.tname','team.schedule_id','team.team_size','team.status'];
            userList = await this.userService.list(condition + ' AND team.status != 2',null,fields,null,joinTable);
            let allTeams = await this.teamsService.getTeamAllReport(
                `team.status != 2 AND team.org_id = ${schedule?.org_id} AND scj.schedule_id = ${schedule?.id} ${teamCondition}`,
                [
                    'team.id',
                    'team.tname',
                    'team.group_id',
                    'team.team_size',
                    'teamSchedule.id',
                    'challengeGroups.id',
                    'challengeGroups.name',
                ],
            );
            userList = await Promise.all(
                userList.map(async (item) => {
                    if (item.hasOwnProperty('password')) {
                        delete item?.password;
                    }
                    if (item.hasOwnProperty('new_password')) {
                        delete item?.new_password;
                    }
                    return item;
                })
            );

            if (result_type == 1 && (!role_id || role_id != 1)) {
                const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                let total = userList?.length || 0;
                let resultDetails = this.commonArrayService.paginationResponseChallengeReport(userList, total, finalPaginateObj);
                return resultDetails;
            }
            
            let teamData = {};
            let bioWeightUsers;
            if(userList.length){
                let allUsersId = userList.map(item => item.id.toString());
                let allBioWeightData;
                if (schedule['s_rangestartdate'] != null && schedule['s_rangeenddate'] != null ) {
                    startDate = this.commonDateService.DateTimeFormat(schedule?.['rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                    endDate = this.commonDateService.getTodayDate(schedule['rangeenddate']).format('YYYY-MM-DD') + ' 23:59:59';
                    rangeStartDate = this.commonDateService.DateTimeFormat(schedule?.['s_rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                    rangeEndDate = this.commonDateService.getTodayDate(schedule['s_rangeenddate']).format('YYYY-MM-DD') + ' 23:59:59';
                    weightWhere = ` ((weight.added_date BETWEEN '${startDate}' AND '${endDate} 23:59:59') OR (weight.added_date BETWEEN '${rangeStartDate}' AND '${rangeEndDate}') )`;
                    allBioWeightData = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule?.id} AND weight.status = 1 AND ${weightWhere}`,{ added_date: 'DESC' },['weight','user'],null,['user'],);
                }
                else{
                    allBioWeightData = await this.bioWeightService.listRecord(`weight.user_id in(${allUsersId.join(',')}) AND weight.schedule_id = ${schedule?.id} AND weight.status = 1`,{ added_date: 'DESC' },['weight','user'],null,['user'],);
                }
                allBioWeightData.sort((a, b) => this.commonDateService.getTodayDate(b.added_date).valueOf() - this.commonDateService.getTodayDate(a.added_date).valueOf());
                bioWeightUsers = allBioWeightData.reduce((acc, val) => {
                        let userId = val.user_id;
                        if (!acc[userId]) {
                            acc[userId] = [];
                        }
                        acc[userId].push(val); 
                        return acc;
                    }, {});
                let k = 0;
                let yard = schedule?.yard;
                for (let i = 0; i < userList.length; i++) {
                    const tuser = userList[i];
                    let totalWeightLoss = 0;
                    let usersScore = 0;
                    const users_id = tuser.id;
                    const team_id = tuser?.team?.id;
                    tuser.weightinfo = bioWeightUsers[users_id] || [];
                    if (bioWeightUsers.hasOwnProperty(users_id)) {
                        let firstWeight = 0;
                        let lastWeight = 0;
                        if (bioWeightUsers[users_id].length > 0) {
                            const userWeights = [...bioWeightUsers[users_id]]; 
                            const firstWeightArr = userWeights.pop();
                            firstWeight = firstWeightArr.weight;
                            if (userWeights.length > 0) {
                                lastWeight = userWeights[0].weight;
                            }
                        }
                        let diffWeight = firstWeight - lastWeight;
                        if (bioWeightUsers[users_id].length < 1 || diffWeight <= 0) {
                            diffWeight = 0;
                        }
                        tuser.diffweight = diffWeight;
                        totalWeightLoss += diffWeight;
                        totalWeightLoss = parseFloat(totalWeightLoss.toFixed(2));
                        usersScore = Math.round(diffWeight * yard);
                        const touchdowns = (totalWeightLoss * yard) / 100;
                        let weightLoosPer = 0;
                        if (diffWeight !== 0 && firstWeight !== 0) {
                            weightLoosPer = Math.round((diffWeight * 100 / firstWeight) * 100) / 100;
                        }
                        tuser.weightloosper = weightLoosPer;
                        tuser.score = usersScore;
                        tuser.totalweightloss = totalWeightLoss;
                        tuser.touchdown = Math.floor(touchdowns);
                        result[k] = tuser;
                        k++;
                    } else {
                        tuser.weightloosper = 0;
                        tuser.score = 0;
                        tuser.totalweightloss = 0;
                        tuser.touchdown = 0;
                        result[k] = tuser;
                        k++;
                    }
                    if(!teamData[team_id]) {
                        teamData[team_id] = {
                            weightloss: 0,
                            touchdown: 0,
                            score: 0,
                            weightloosper: 0,
                            teammember: 0,
                        };
                    }
                    teamData[team_id]['weightloss'] += tuser.totalweightloss;
                    teamData[team_id]['touchdown'] += tuser.touchdown;
                    teamData[team_id]['score'] += tuser.score;
                    teamData[team_id]['weightloosper'] += tuser.weightloosper;
                    teamData[team_id]['teammember'] += 1;
                }
                for (const team of allTeams) {
                    const id = team?.id;
                    if (!id) continue;
                    const teamSummary = teamData[id] ??= {
                        weightloss: 0,
                        touchdown: 0,
                        score: 0,
                        weightloosper: 0,
                        teammember: 0,
                    };
                    Object.assign(team, teamSummary);
                }
                if (schedule.rank_type === 'weight_loss_per') {
                    result.sort((a, b) => {
                        if (b.weightloosper > a.weightloosper) return 1;
                        if (b.weightloosper === a.weightloosper) {
                            return b.score > a.score ? 1 : -1;
                        }
                        return -1;
                    });
                    allTeams.sort((a, b) => {
                        if (b['weightloosper'] > a['weightloosper']) return 1;
                        if (b['weightloosper'] === a['weightloosper']) {
                            return b['score'] > a['score'] ? 1 : -1;
                        }
                        return -1;
                    });
                } else {
                    result.sort((a, b) => {
                        if (b.score > a.score) return 1;
                        if (b.score === a.score) {
                            return b.weightloosper > a.weightloosper ? 1 : -1;
                        }
                        return -1;
                    });
                    allTeams.sort((a, b) => {
                        if (b['score'] > a['score']) return 1;
                        if (b['score'] === a['score']) {
                            return b['weightloosper'] > a['weightloosper'] ? 1 : -1;
                        }
                        return -1;
                    });
                }
            }

            let rank = 1;
            let prevRank = 1;
            let index = 0;
            for(let item of result)  {
                if (!item['rank']) {
                    item['rank'] = 0;
                }
                prevRank = result[index != 0 ? index -1 : index]['score'];
                if (index != 0 && prevRank != item['score']) {
                    rank += 1;
                }
                index++;
                item['rank'] = rank;
                let metGoal = '';
                let firstWeight = 'No';
                let lastWeight = 'No';
                if (schedule.s_rangestartdate !== null && schedule.s_rangeenddate !== null) {
                    const weightInfo = [...item.weightinfo]; 
                    const firstWeightArr = weightInfo.pop();
                    const lastWeightArr = weightInfo.shift();
                    const rangestartDate = this.commonDateService.DateTimeFormat(startDate);
                    const rangeendDate = this.commonDateService.DateTimeFormat(endDate);
                    const s_rangeStartDate = this.commonDateService.DateTimeFormat(rangeStartDate);
                    const s_rangeEndDate = this.commonDateService.DateTimeFormat(rangeEndDate);
                    const firstDate = firstWeightArr ? this.commonDateService.DateTimeFormat(firstWeightArr.added_date) : null;
                    const lastDate = lastWeightArr  ? this.commonDateService.DateTimeFormat(lastWeightArr.added_date) : null;

                    if (firstDate && firstDate.isBetween(rangestartDate, rangeendDate, undefined, '[]')) {
                        firstWeight = "Yes";
                    } else {
                        firstWeight = "No";
                    }
                    if (lastDate && lastDate.isBetween(s_rangeStartDate, s_rangeEndDate, undefined, '[]')) {
                        lastWeight = "Yes";
                    } else {
                        lastWeight = "No";
                    }
                    if (firstWeight !== 'No' && lastWeight !== 'No') {
                        metGoal = "Yes";
                    } else {
                        metGoal = "No";
                    }
                } 
                else {
                    const weightInfoDates = item.weightinfo.map(sub => this.commonDateService.DateTimeFormat(sub.added_date,'YYYY-MM-DD'));
                    for (let day = 0; day < 7; day++) {
                        const checkDate = this.commonDateService.DateTimeFormat(gStartDate).add(day, 'days').format('YYYY-MM-DD');
                        if (weightInfoDates.includes(checkDate)) {
                            firstWeight = "Yes";
                        }
                    }
                    for (let day = 0; day < 7; day++) {
                        const checkDate = this.commonDateService.DateTimeFormat(schedule['end_date']).subtract(day, 'days').format('YYYY-MM-DD');
                        if (weightInfoDates.includes(checkDate)) {
                            lastWeight = "Yes";
                        }
                    }
                    if (firstWeight === "Yes" && lastWeight === "Yes") {
                        metGoal = "Yes";
                    } else {
                        metGoal = "No";
                    }
                }
                item['metGoal'] = metGoal;
                item['firstWeight'] = firstWeight;
                item['lastWeight'] = lastWeight;
            }

            if (result_type == 1 && role_id && role_id == 1) {
                const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                let total = result?.length || 0;
                let resultDetails = this.commonArrayService.paginationResponseChallengeReport(result, total, finalPaginateObj);
                return resultDetails;
            }

            if(result_type == 2){
                let clm_name_arr = cronAppConstant.USER_HEADER_DATA;
                if(role_id && role_id == 1) {
                    clm_name_arr.push(
                        'TOTAL WEIGHT LOSS',
                        'SCORE',
                        'TOUCHDOWN',
                    );
                }
                if(schedule?.team == 1){
                    clm_name_arr = [...clm_name_arr,'TEAM'];
                }
                clm_name_arr = [...clm_name_arr,'RANK'];
                
                let resultData = {};
                const clm_data_user = await Promise.all(
                    result.map(async (user) => {
                        const row: any[] = [];
                        const tempDataInfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                        row.push(...Object.values(tempDataInfo));
                        if(role_id && role_id == 1) {
                            row.push(user?.totalweightloss || 0)
                            row.push(user?.score || 0)
                            row.push(user?.touchdown || 0)
                        }
                        row.push(user?.team?.tname || '')
                        row.push(user.rank)
                        return row;
                    }),
                );
                let userSheetData = [clm_name_arr, ...clm_data_user];
                resultData['user'] = userSheetData;

                /* team processing */
                clm_name_arr =  ['TEAM', 'TEAM SIZE', 'TEAM MEMBERS', 'TOTAL WEIGHT LOSS', 'TOTAL YARDS', 'TOTAL TOUCHDOWNS', 'RANK'];
                rank = 1;
                const clm_data_team = await Promise.all(
                    allTeams.map(async (item) => {
                        const row: any[] = [];
                        row.push(item?.tname)
                        row.push(item?.team_size)
                        row.push(item?.['teammember'])
                        row.push(item?.['weightloss'] ?? 0)
                        row.push(item?.['weightloss'] ?? 0)
                        row.push(item?.['touchdown'] ?? 0)
                        row.push(rank++)
                        return row;
                    }),
                );
                let teamSheetData = [clm_name_arr, ...clm_data_team];
                resultData['team'] = teamSheetData;
                return resultData;
            }
        } catch (error) {
            throw new Error(error);
        }
    }

}
