import {
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    ScheduleChallengeEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { cronAppConstant } from 'src/common';
import { AssessmentHraBiometricService } from 'src/module/healthassessment';
import { BiometricsService } from 'src/module/healthcheckup';
import { FtBiometricsService } from 'src/module/tracker';
import { UserService } from 'src/module/user/user.service';
import { BioWeightService } from '../bioweight/bioweight.service';
import { ScheduleChallengeJoinUsersService } from '../schedule-challenge-join-users/schedule-challenge-join-users.service';
import { TeamsService } from '../team/teams.service';
import { UserChallengeHelperService } from '../userChallengeHelper.service';

@Injectable()
export class WeightChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly teamsService: TeamsService,
        private readonly userService: UserService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly commonArrayService: CommonArrayService,
        private readonly bioWeightService: BioWeightService,
        private readonly biometricsService: BiometricsService,
        private readonly ftBiometricsService: FtBiometricsService,
        private readonly hraBiometricsService: AssessmentHraBiometricService,
        private readonly commonHealthService: CommonHealthService,
    ) {}

    async weightChallengeReport(schedule: Partial<ScheduleChallengeEntity>,condition: string = '',result_type: number = 1,paginateObj: any = null, role_id = null) {
        try {
            let result;
            // condition += ` AND scj.status = 1`;
            if (schedule['ch']['bio_challenge_type'] == 'Weight_progress') {
                result = await this.weightChallengeTeamReport(
                    schedule,
                    condition,
                    result_type,
                    paginateObj,
                );
            }
            if (schedule['ch']['bio_challenge_type'] == 'Weight_progress_withoutTeam') {
                result = await this.weightChallengeWithoutTeamReport(
                    schedule,
                    condition,
                    result_type,
                    paginateObj,
                    role_id
                );
            }
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }
    async weightChallengeWithoutTeamReport(schedule: Partial<ScheduleChallengeEntity>,condition: string = '',result_type: number = 1,paginateObj: any = null, role_id = null) {
        try {
            let gStartDate;
            let startDate;
            let endDate;
            let rangeStartDate;
            let rangeEndDate;
            let weightWhere;
            let result = [];
            let usersDailyDetail = {};
            endDate = this.commonDateService.DateTimeFormat(schedule?.['start_date'],'timestamp',);
            endDate = this.commonDateService.DateTimeFormat(schedule?.['end_date'],'timestamp',);
            let now: any = this.commonDateService.DateTimeFormat('now','timestamp',);
            if (now >= endDate) {
                now = endDate;
            }
            let totaldays = Math.floor((endDate - startDate) / (60 * 60 * 24)) + 1;
            let uptodays = Math.floor((now - startDate) / (60 * 60 * 24)) + 1;
            if (uptodays === 0) {
                uptodays = 1;
            }

            let userList = [];
            //ZOMO-4322 remove this code for score value
            let joinTable = [
                {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'teamMember', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, 'on' : `teamMember.user_id = user.id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'teamSchedule', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, 'on' : `teamMember.team_id = teamSchedule.team_id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamSchedule.schedule_id = scj.schedule_id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'team', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAMS, 'on' : `teamMember.team_id= team.id` , 'connect' : 'user', 'type' : 'LEFT' },
            ];
            let fields = ['user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option',
                'teamMember.id','teamMember.user_id','teamMember.team_id','teamSchedule.id','teamSchedule.team_id','scj.id','scj.schedule_id',
                'scj.challenge_id','team.id','team.tname','team.group_id'];
            // let fields = ['user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option','scj.id','scj.schedule_id','scj.challenge_id'];
            userList = await this.userService.list(condition.replace(/User/gi, "user"),null,fields,null,joinTable);
            
            
            let timezoneData =await this.userService.getOrgAdminAndCompanyTimezoneFromCompanyId(`User.org_id in(${schedule?.org_id}) AND User.status !=2`);
            let bioWeightUsers;
            if(userList && userList.length){
                let allUsersIds = userList.map(item => item.id.toString());
                if (schedule['backdating_frequency'] &&this.commonDateService.DateTimeFormat(schedule['backdating_frequency']) > this.commonDateService.DateTimeFormat(schedule['start_date'])) {
                    gStartDate = this.commonDateService.DateTimeFormat(schedule['backdating_frequency'],'YYYY-MM-DD HH:mm:ss');
                } else {
                    gStartDate = this.commonDateService.DateTimeFormat(schedule['start_date'],'YYYY-MM-DD HH:mm:ss');
                }
                let gEndDate = this.commonDateService.DateTimeFormat(schedule['end_date'],'YYYY-MM-DD') + ' 23:59:59';
                let allBioWeightData;
                if (schedule['s_rangestartdate'] != null && schedule['s_rangeenddate'] != null ) {
                    startDate = this.commonDateService.DateTimeFormat(schedule?.['rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                    endDate = this.commonDateService.getTodayDate(schedule['rangeenddate']).format('YYYY-MM-DD') + ' 23:59:59';
                    gStartDate = this.commonDateService.DateTimeFormat(schedule?.['s_rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                    gEndDate = this.commonDateService.getTodayDate(schedule['s_rangeenddate']).format('YYYY-MM-DD') + ' 23:59:59';
                    weightWhere = ` ((weight.added_date BETWEEN '${startDate}' AND '${endDate} 23:59:59') OR (weight.added_date BETWEEN '${gStartDate}' AND '${gEndDate}') )`;
                    allBioWeightData = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule?.id} AND weight.status = 1 AND ${weightWhere}`,{ added_date: 'DESC' },['weight','user'],null,['user'],);
                }
                else{
                    weightWhere = ` (weight.added_date BETWEEN '${gStartDate}' AND '${gEndDate}')`;
                    allBioWeightData = await this.bioWeightService.listRecord(`weight.user_id in(${allUsersIds.join(',')}) AND weight.schedule_id = ${schedule?.id} AND weight.status = 1 AND ${weightWhere}`,{ added_date: 'DESC' },['weight','user'],null,['user'],);
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
                let yard = schedule['yard'];
                let k = 0;
                if(result_type == 2 && role_id && role_id == 1){
                    for(let userId of Object.keys(bioWeightUsers)){
                        let weightData = bioWeightUsers[userId];
                        if (!usersDailyDetail[userId]) usersDailyDetail[userId] = {};
                        for (let record of weightData) {
                            let collectionDate = this.commonDateService.DateTimeFormat(record.added_date,'YYYY-MM-DD');
                            usersDailyDetail[userId][collectionDate] = Number(record.weight || 0);
                        }
                    }
                }
                for (let i = 0; i < userList.length; i++) {
                    let tuser = userList[i];
                    let totalWeightLoss = 0;
                    let userScore = 0;
                    let weightLossPerTot = 0;
                    const usersId = tuser.id;
                    if (bioWeightUsers.hasOwnProperty(usersId)) {
                        tuser.weightInfo = bioWeightUsers[usersId] || [];
                        let userWeights = [...(bioWeightUsers[usersId] || [])];
                        let firstWeight = 0;
                        if (userWeights.length > 0) {
                            let firstWeightArr = userWeights.pop();
                            firstWeight = Number(firstWeightArr.weight || 0);
                        }
                        let lastWeight = 0;
                        if (userWeights.length > 0) {
                            let lastWeightArr = userWeights[0];
                            lastWeight = Number(lastWeightArr.weight || 0);
                        }
                        let diffWeight = firstWeight - lastWeight;
                        if (userWeights.length < 1 || diffWeight <= 0) {
                            diffWeight = 0;
                        }
                        let weightLossPer = 0;
                        if (diffWeight !== 0) {
                            weightLossPer = Math.round(((diffWeight * 100) / firstWeight) * 100) / 100;
                        }
                        tuser.weightloosper = weightLossPer;
                        weightLossPerTot += weightLossPer;
                        totalWeightLoss += diffWeight;
                        totalWeightLoss = Number(totalWeightLoss.toFixed(2));
                        userScore = yard ? diffWeight * yard : diffWeight;
                        userScore = Math.round(userScore);
                        const touchdowns = (totalWeightLoss * yard) / 100;
                        tuser.score = userScore;
                        tuser.totalweightloss = totalWeightLoss;
                        tuser.touchdown = Math.floor(touchdowns);
                        tuser.firstWeightValue = firstWeight;
                        tuser.lastWeightValue = lastWeight;
                        result[k] = tuser;
                        k++;
                    } else {
                        tuser.weightloosper = 0;
                        tuser.score = 0;
                        tuser.totalweightloss = 0;
                        tuser.touchdown = 0;
                        tuser.weightInfo = [];
                        result[k] = tuser;
                        k++;
                    }
                }
                if (schedule.rank_type === 'weight_loss_per') {
                    result.sort((a, b) => {
                        if (b.weightloosper > a.weightloosper) return 1;
                        if (b.weightloosper < a.weightloosper) return -1;
                        if (b.totalweightloss > a.totalweightloss) return 1;
                        if (b.totalweightloss < a.totalweightloss) return -1;
                        return 0;
                    });
                } else {
                    result.sort((a, b) => {
                        if (b.totalweightloss > a.totalweightloss) return 1;
                        if (b.totalweightloss < a.totalweightloss) return -1;
                        if (b.weightloosper > a.weightloosper) return 1;
                        if (b.weightloosper < a.weightloosper) return -1;
                        return 0;
                    });
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
                    let dWeight = "No";
                    if (schedule.start_date !== null && schedule.end_date !== null) {
                        const weightInfo = [...item.weightInfo]; 
                        const firstWeightArr = weightInfo.pop();
                        const lastWeightArr = weightInfo.shift();
                        const rangeStartDate = this.commonDateService.DateTimeFormat(schedule.start_date);
                        const rangeEndDate = this.commonDateService.DateTimeFormat(schedule.end_date);
                        const firstDate = firstWeightArr ? this.commonDateService.DateTimeFormat(firstWeightArr.added_date) : null;
                        const lastDate = lastWeightArr  ? this.commonDateService.DateTimeFormat(lastWeightArr.added_date) : null;

                        if (firstDate && firstDate.isBetween(rangeStartDate, rangeEndDate, undefined, '[]')) {
                            firstWeight = "Yes";
                        } else {
                            firstWeight = "No";
                        }
                        if (lastDate && lastDate.isBetween(rangeStartDate, rangeEndDate, undefined, '[]')) {
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
                        const weightInfoDates = item.weightInfo.map(sub => this.commonDateService.DateTimeFormat(sub.added_date,'YYYY-MM-DD'));
                        for (let day = 0; day < 7; day++) {
                            const checkDate = this.commonDateService.DateTimeFormat(gStartDate).add(day, 'days').format('YYYY-MM-DD');
                            if (weightInfoDates.includes(checkDate)) {
                                dWeight = firstWeight = "Yes";
                            }
                        }
                        dWeight = "No";
                        for (let day = 0; day < 7; day++) {
                            const checkDate = this.commonDateService.DateTimeFormat(schedule['end_date']).subtract(day, 'days').format('YYYY-MM-DD');
                            if (weightInfoDates.includes(checkDate)) {
                                dWeight = lastWeight = "Yes";
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
                    item['dWeight'] = dWeight;
                }
            }
            else {
                startDate = this.commonDateService.DateTimeFormat(schedule?.['start_date'],'YYYY-MM-DD');
                endDate = this.commonDateService.DateTimeFormat(schedule?.['end_date'],'YYYY-MM-DD');
                if (schedule['backdating_frequency'] &&this.commonDateService.DateTimeFormat(schedule['backdating_frequency']) > this.commonDateService.DateTimeFormat(schedule['start_date'])) {
                    gStartDate = this.commonDateService.DateTimeFormat(schedule['backdating_frequency'],'YYYY-MM-DD HH:mm:ss');
                } else {
                    gStartDate = this.commonDateService.DateTimeFormat(schedule['start_date'],'YYYY-MM-DD HH:mm:ss');
                }
                let gEndDate = this.commonDateService.DateTimeFormat(schedule['end_date'],'YYYY-MM-DD') + ' 23:59:59';
                if (schedule['s_rangestartdate'] != null &&schedule['s_rangeenddate'] != null) {
                    gStartDate = this.commonDateService.DateTimeFormat(schedule?.['rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                    gEndDate = this.commonDateService.getTodayDate(schedule['s_rangeenddate']).format('YYYY-MM-DD') + ' 23:59:59';
                }
                weightWhere = ` AND((weight.added_date BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59') OR (weight.added_date BETWEEN '${gStartDate}' AND '${gEndDate}') )`;
                if (schedule['s_rangestartdate'] != null && schedule['s_rangeenddate'] != null ) {
                    startDate = this.commonDateService.DateTimeFormat(schedule?.['rangestartdate'],'YYYY-MM-DD HH:mm:ss',);
                    endDate = this.commonDateService.getTodayDate(schedule['rangeenddate']).format('YYYY-MM-DD') + ' 23:59:59';
                    rangeStartDate = this.commonDateService.DateTimeFormat(schedule?.['s_rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                    rangeEndDate = this.commonDateService.getTodayDate(schedule['s_rangeenddate']).format('YYYY-MM-DD')  + ' 23:59:59';
                    weightWhere = ` AND((weight.added_date BETWEEN '${startDate}' AND '${endDate}') OR (weight.added_date BETWEEN '${rangeStartDate}' AND '${rangeEndDate}') )`;
                }
                let getWhereCondition;
                getWhereCondition = await this.commonDateService.getWhereCondition(timezoneData,'added_date',gStartDate,gEndDate,
                        {
                            conType: 'BETWEEN',
                            useType: '',
                            secondField: '',
                            dateChackedFormat: 'fullDate',
                            alias: 'weight',
                        },
                    );
                let allBioWeightData: any = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule?.id} AND weight.status = 1 AND ${getWhereCondition}`,{ added_date: 'DESC' },['weight','user'],null,['user'],);
                getWhereCondition = await this.commonDateService.getWhereCondition(timezoneData,'created',gStartDate,gEndDate,
                        {
                            conType: 'BETWEEN',
                            useType: '',
                            secondField: '',
                            dateChackedFormat: 'fullDate',
                            alias: 'biometrics',
                        },
                    );
                let allHCBiometricDatas = await this.biometricsService.listRecord(`user.org_id = ${schedule?.org_id} AND biometrics.status = 1 AND ${getWhereCondition}`, null, ['biometrics.id','biometrics.user_id','biometrics.weight','biometrics.created','user'],);
                getWhereCondition = await this.commonDateService.getWhereCondition(timezoneData,'added_date',gStartDate,gEndDate,
                        {
                            conType: 'BETWEEN',
                            useType: '',
                            secondField: '',
                            dateChackedFormat: 'fullDate',
                            alias: 'food',
                        },
                    );
                let allFTBiometricDatas = await this.ftBiometricsService.listRecord(`user.id = ${schedule?.org_id} AND food.type = 1 AND food.status = 1 AND ${getWhereCondition}`, null, ['food']);
                getWhereCondition = await this.commonDateService.getWhereCondition(timezoneData,'date',gStartDate,gEndDate,
                        {
                            conType: 'BETWEEN',
                            useType: '',
                            secondField: '',
                            dateChackedFormat: 'fullDate',
                            alias: 'healthassessment',
                        },
                    );
                let allHRABiometricDatas = await this.hraBiometricsService.listRecord(`user.id = ${schedule?.org_id} AND healthassessment.status = 1 AND ${getWhereCondition}`, null, ['healthassessment'],[tableConstant.TBL_USERS]);
                allHCBiometricDatas.forEach(h_bio => {
                    const dataarr = {
                        user_id: h_bio.user_id,
                        weight: h_bio.weight,
                        added_date: h_bio.created,
                        type: 'hc_biometrics'
                    };

                    allBioWeightData.push(dataarr);
                });
                allFTBiometricDatas.forEach(f_bio => {
                    const dataarr = {
                        id: f_bio.food_id,
                        user_id: f_bio.food_user_id,
                        weight: f_bio.food_weight,
                        added_date: f_bio.food_added_date,
                        type: 'ft_biometrics'
                    };

                    allBioWeightData.push(dataarr);
                });
                allHRABiometricDatas.forEach(hra_bio => {
                    const dataarr = {
                        user_id: hra_bio.healthassessment_user_id,
                        weight: hra_bio.healthassessment_weight,
                        added_date: hra_bio.healthassessment_date,
                        type: 'hra_biometrics'
                    };

                    allBioWeightData.push(dataarr);
                });

                allBioWeightData.sort((a, b) => this.commonDateService.getTodayDate(b.added_date).valueOf() - this.commonDateService.getTodayDate(a.added_date).valueOf());
                bioWeightUsers = allBioWeightData.reduce((acc, val) => {
                        let userId = val.user_id;
                        if (!acc[userId]) {
                            acc[userId] = [];
                        }
                        acc[userId].push(val); 
                        return acc;
                    }, {});
                let joinTable = [
                    {'alias':'userSetting', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : `userSetting.user_id = user.id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `scj.user_id = user.id` , 'connect' : 'user', 'type' : 'INNER' },
                    {'alias':'bioweight', 'table' : tableConstant.CHALLENGE.TBL_CH_BIO_WEIGHT, 'on' : `bioweight.id = scj.user_id` , 'connect' : 'user', 'type' : 'LEFT' },
                ];
                let fields = ['user.email','user.id','user.code','user.role_id','user.relationship_id','user.username','user.first_name','user.middle_name','user.last_name',
                    'user.securitycode','user.employeeid','user.gender','user.dob','user.date_of_hire','user.on_insurance_plan','user.insurance_plan_name','user.is_camp_eligible','user.status',
                    'userSetting.id','userSetting.jobtitle','userSetting.wphone','userSetting.wphone_ext',
                    'Location.lname','Location.location_name','Location.id','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option',
                    'bioweight.user_id','bioweight.added_date','scj.id','scj.schedule_id','scj.challenge_id',];
                userList = await this.userService.list(`${condition}`.replace(/User/gi, "user"),{'bioweight.added_date' : 'DESC'},fields,null,joinTable);

                let k = 0;
                for (let tuser of userList) {
                    let users_id = tuser.id;
                    let totalWeightLoss = 0;
                    if (bioWeightUsers.hasOwnProperty(users_id)) {
                        // bioWeightUsers[users_id] = bioWeightUsers[users_id].filter(item => item.weight && item.weight != '' && item.weight != null);
                        tuser.weightInfo = bioWeightUsers[users_id];
                        let userWeights = [...bioWeightUsers[users_id]];
                        let firstWeightArr = userWeights.pop();
                        let firstWeight = Number(firstWeightArr.weight ?? 0);
                        let lastWeightArr = userWeights.length > 0 ? userWeights[0] : firstWeightArr;
                        let lastWeight = Number(lastWeightArr.weight ?? 0);
                        let diffWeight = lastWeight == 0 ? 0 : firstWeight - lastWeight;
                        if (bioWeightUsers[users_id].length < 1 || diffWeight <= 0) {
                            diffWeight = 0;
                        }
                        tuser.score = diffWeight;
                        totalWeightLoss += diffWeight;
                        totalWeightLoss = Number(totalWeightLoss.toFixed(2));
                        tuser.firstWeightValue = firstWeight;
                        tuser.lastWeightValue = lastWeight;
                        tuser.totalweightloss = totalWeightLoss;
                        let weightLossPercent = 0;
                        if (diffWeight !== 0) {
                            weightLossPercent = Math.round((diffWeight * 100 / firstWeight) * 100) / 100;
                        }

                        tuser.weightloosper = weightLossPercent;
                        result[k] = tuser;
                    } else {
                        tuser.weightloosper = 0;
                        tuser.totalweightloss = 0;
                        tuser.score = 0;
                        tuser.weightInfo = [];
                        result[k] = tuser;
                    }
                    k++;
                }
                if (result && result.length > 0) {
                    if (schedule['rank_type'] == 'weight_loss_per') {
                        result.sort(function(a, b) {
                            const rtmp = b.weightloosper > a.weightloosper ? 1 : (b.weightloosper === a.weightloosper ? 2 : -1);
                            if (rtmp === 1) {
                                return 1;
                            } else if (rtmp === 2) {
                                return b.score > a.score ? 1 : (b.score === a.score ? 0 : -1);
                            } else {
                                return -1;
                            }
                        });
                    } else {
                        result.sort(function(a, b) {
                            const rtmp = b.score > a.score ? 1 : (b.score === a.score ? 2 : -1);
                            if (rtmp === 1) {
                                return 1;
                            } else if (rtmp === 2) {
                                return b.weightloosper > a.weightloosper ? 1 : (b.weightloosper === a.weightloosper ? 0 : -1);
                            } else {
                                return -1;
                            }
                        });
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
                        let dWeight = "No";
                        if (schedule.s_rangestartdate && schedule.s_rangeenddate) {
                            const weightInfo = [...item.weightInfo]; 
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
                            const weightInfoDates = item.weightInfo.map(sub => this.commonDateService.DateTimeFormat(sub.added_date,'YYYY-MM-DD'));
                            for (let day = 0; day < 7; day++) {
                                const checkDate = this.commonDateService.DateTimeFormat(gStartDate).add(day, 'days').format('YYYY-MM-DD');
                                if (weightInfoDates.includes(checkDate)) {
                                    dWeight = firstWeight = "Yes";
                                }
                            }
                            dWeight = "No";
                            for (let day = 0; day < 7; day++) {
                                const checkDate = this.commonDateService.DateTimeFormat(schedule['end_date']).subtract(day, 'days').format('YYYY-MM-DD');
                                if (weightInfoDates.includes(checkDate)) {
                                    dWeight = lastWeight = "Yes";
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
                        item['dWeight'] = dWeight;
                    }
                }
            }
            // if (result_type == 1 && role_id && role_id == 1) { // ZOMO-4322
            if (result_type == 1) {
                const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                let total = userList?.length || 0;
                let resultDetails = this.commonArrayService.paginationResponseChallengeReport(userList, total, finalPaginateObj);
                return resultDetails;
            }
            if(result_type == 2){
                let clm_name_arr;
                let resultData = {};
                clm_name_arr = [...cronAppConstant.USER_HEADER_DATA];
                let clm_name_arr_details;
                let total_days = 0;
                const startdate: any = this.commonDateService.DateTimeFormat(schedule?.['start_date']);
                const enddate: any = this.commonDateService.DateTimeFormat(schedule?.['end_date']);
                if(role_id && role_id == 1){
                    clm_name_arr_details = structuredClone(clm_name_arr);
                    clm_name_arr.push(
                        'FIRST WEIGHT ENTERED',
                        'LAST WEIGHT ENTERED',
                        'TOTAL WEIGHT LOSS',
                        'RANK',
                    );
                    const today = this.commonDateService.DateTimeFormat('now'); 
                    total_days = enddate.diff(startdate, 'days') + 1;
                    if (today.isSameOrBefore(enddate)) {
                        total_days = today.diff(startdate, 'days') + 1;
                    }
                    for (let day = 0; day < total_days; day++) {
                        clm_name_arr_details.push(startdate.clone().add(day, 'days').format('MM-DD-YYYY'));
                    }
                }
                else{
                    clm_name_arr.push(
                        'RANK',
                        'FIRST WEIGHT ENTERED',
                        'LAST WEIGHT ENTERED',
                        'MET CHALLENGE REQUIREMENTS',
                    );
                }
                
                if(result.length){
                    const clm_data_user = await Promise.all(
                        result.map(async (user) => {
                            const row: any[] = [];
                            const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                            row.push(...Object.values(tempdatainfo));
                            if(role_id && role_id == 1){
                                row.push(user?.firstWeightValue || '');
                                row.push(user?.lastWeightValue || '');
                                row.push(user?.totalweightloss || 0);
                                row.push(user?.rank || '');
                            }
                            else{
                                row.push(user?.rank || '');
                                row.push(user?.firstWeight || '');
                                row.push(user?.lastWeight || '');
                                row.push(user?.metGoal || '');
                            }
                            return row;
                        }),
                    );
                    let userSheetData = [clm_name_arr, ...clm_data_user];
                    resultData['user'] = userSheetData;

                    if(role_id && role_id == 1){
                        const clm_data_user = await Promise.all(
                            result.map(async (user) => {
                                const row: any[] = [];
                                const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr_details);
                                row.push(...Object.values(tempdatainfo));
                                for (let day = 0; day < total_days; day++) {
                                    const dateStr = this.commonDateService.DateTimeFormat(startdate).add(day, 'days').format('YYYY-MM-DD');
                                    if (usersDailyDetail.hasOwnProperty(user.id) && usersDailyDetail[user.id].hasOwnProperty(dateStr.trim())) {
                                        row.push(usersDailyDetail[user.id][dateStr.trim()]);
                                    } else {
                                        row.push('');
                                    }
                                }
                                return row;
                            }),
                        );
                        let userSheetData = [clm_name_arr_details, ...clm_data_user];
                        resultData['weight'] = userSheetData;
                    }
                    
                }
                return resultData;
            }
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }
    async weightChallengeTeamReport(schedule: Partial<ScheduleChallengeEntity>, condition: string = '', result_type: number = 1, paginateObj: any = null) {
        try {
            let gStartDate;
            let startDate;
            let endDate;
            let rangeStartDate;
            let rangeEndDate;
            let weightWhere;
            if (schedule['backdating_frequency'] && this.commonDateService.DateTimeFormat(schedule['backdating_frequency']) > this.commonDateService.DateTimeFormat(schedule['start_date'])) {
                gStartDate = this.commonDateService.DateTimeFormat(schedule['backdating_frequency'],'YYYY-MM-DD HH:mm:ss');
            } else {
                gStartDate = this.commonDateService.DateTimeFormat(schedule['start_date'],'YYYY-MM-DD HH:mm:ss');
            }
            let gendDate = this.commonDateService.DateTimeFormat(schedule['end_date'],'YYYY-MM-DD HH:mm:ss');
            weightWhere = ` AND((weight.added_date BETWEEN '${startDate}' AND '${endDate} 23:59:59') OR (weight.added_date BETWEEN '${rangeStartDate}' AND '${rangeEndDate} 23:59:59') )`;
            if (schedule['s_rangestartdate'] != null && schedule['s_rangeenddate'] != null) {
                startDate = this.commonDateService.DateTimeFormat(schedule?.['rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                endDate = this.commonDateService.getTodayDate(schedule['rangeenddate']).format('YYYY-MM-DD');
                rangeStartDate = this.commonDateService.DateTimeFormat(schedule?.['s_rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                rangeEndDate = this.commonDateService.getTodayDate(schedule['s_rangeenddate']).format('YYYY-MM-DD');
                weightWhere = ` AND((weight.added_date BETWEEN '${startDate}' AND '${endDate} 23:59:59') OR (weight.added_date BETWEEN '${rangeStartDate}' AND '${rangeEndDate} 23:59:59') )`;
            }

            let now: any = this.commonDateService.DateTimeFormat('now','timestamp',);
            if (now >= endDate) {
                now = endDate;
            }
            let totaldays = Math.floor((endDate - startDate) / (60 * 60 * 24)) + 1;
            let uptodays = Math.floor((now - startDate) / (60 * 60 * 24)) + 1;
            if (uptodays === 0) {
                uptodays = 1;
            }
            let result = [];
            let userList = [];
            let joinTable = [
                {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'teamMember', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, 'on' : `teamMember.user_id = user.id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'teamSchedule', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, 'on' : `teamMember.team_id = teamSchedule.team_id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamSchedule.schedule_id = scj.schedule_id And teamMember.user_id = scj.user_id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'team', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAMS, 'on' : `teamMember.team_id= team.id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'group', 'table' : tableConstant.CHALLENGE.TBL_CH_GROUPS, 'on' : `team.group_id = group.id` , 'connect' : 'user', 'type' : 'LEFT' },
            ];
            let fields = ['user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option','teamMember','teamSchedule','scj.id','scj.schedule_id','scj.challenge_id','scj.status',
                'team.id','team.tname','team.schedule_id','team.team_size','group.id','group.name'];
            userList = await this.userService.list(condition.replace(/User/gi, "user"),null,fields,null,joinTable);
            if (result_type == 1) {
                const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                let total = userList?.length || 0;
                let resultDetails = this.commonArrayService.paginationResponseChallengeReport(userList, total, finalPaginateObj);
                return resultDetails;
            }
            
            let bioWeightUsers;
            if(userList.length){
                let allUsersIds = userList.map(item => item.id.toString());
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
                    allBioWeightData = await this.bioWeightService.listRecord(`weight.user_id in(${allUsersIds.join(',')}) AND weight.schedule_id = ${schedule?.id} AND weight.status = 1`,{ added_date: 'DESC' },['weight','user'],null,['user'],);
                }
                allBioWeightData.sort((a, b) => this.commonDateService.getTodayDate(a.added_date).valueOf() - this.commonDateService.getTodayDate(b.added_date).valueOf());
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
                for (let tuser of userList) {
                    let totalweightloss = 0;
                    let userscore = 0;
                    let users_id = tuser.id;
                    tuser.weightInfo = bioWeightUsers[users_id] || [];
                    let team_members =(userList.filter((usr) => usr?.team?.id == tuser?.team?.id) || [])?.length;
                    tuser.team['team_member'] = team_members;
                    if (bioWeightUsers.hasOwnProperty(users_id)) {
                        let weights = [...tuser.weightInfo];
                        let firstweight = 0;
                        let lastweight = 0;
                        if (weights.length > 0) {
                            let firstweightarr = weights[0];
                            firstweight = Number(firstweightarr.weight) || 0;
                        }
                        if (weights.length > 0) {
                            let lastweightobj = weights.pop();
                            lastweight = Number(lastweightobj.weight) || 0;
                        }
                        let diffweight = firstweight - lastweight;
                        if (weights.length < 1 || diffweight <= 0) {
                            diffweight = 0;
                        }
                        totalweightloss += diffweight;
                        totalweightloss = parseFloat(totalweightloss.toFixed(2));
                        userscore = yard ? diffweight * yard : diffweight;
                        userscore = parseInt(userscore.toFixed(0));

                        let touchdowns = (totalweightloss * yard) / 100;
                        let weightloosper = 0;
                        if (diffweight !== 0 && firstweight !== 0) {
                            weightloosper = Math.round((diffweight * 100 / firstweight) * 100) / 100;
                        }
                        tuser.weightloosper = weightloosper;
                        tuser.score = userscore;
                        tuser.totalweightloss = totalweightloss;
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
                }
                /* need to add one codition for 1003 */
                if (schedule.rank_type === 'weight_loss_per') {
                    result.sort((a, b) => {
                        if (b.weightloosper > a.weightloosper) return 1;
                        if (b.weightloosper < a.weightloosper) return -1;
                        if (b.totalweightloss > a.totalweightloss) return 1;
                        if (b.totalweightloss < a.totalweightloss) return -1;
                        
                        return 0;
                    });
                } else {
                    result.sort((a, b) => {
                        if (b.totalweightloss > a.totalweightloss) return 1;
                        if (b.totalweightloss < a.totalweightloss) return -1;
                        if (b.weightloosper > a.weightloosper) return 1;
                        if (b.weightloosper < a.weightloosper) return -1;

                        return 0;
                    });
                }
            }
            else{
                let allBioWeightData = [];
                if (schedule['s_rangestartdate'] != null && schedule['s_rangeenddate'] != null ) {
                    startDate = this.commonDateService.DateTimeFormat(schedule?.['rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                    endDate = this.commonDateService.getTodayDate(schedule['rangeenddate']).format('YYYY-MM-DD') + ' 23:59:59';
                    rangeStartDate = this.commonDateService.DateTimeFormat(schedule?.['s_rangestartdate'],'YYYY-MM-DD HH:mm:ss');
                    rangeEndDate = this.commonDateService.getTodayDate(schedule['s_rangeenddate']).format('YYYY-MM-DD') + ' 23:59:59';
                    weightWhere = ` ((weight.added_date BETWEEN '${startDate}' AND '${endDate} 23:59:59') OR (weight.added_date BETWEEN '${rangeStartDate}' AND '${rangeEndDate}') )`;
                    allBioWeightData = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule?.id} AND weight.status = 1 AND ${weightWhere}`,{ added_date: 'DESC' },['weight','user'],null,['user'],);
                }
                else{
                    allBioWeightData = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule?.id} AND weight.status = 1`,{ added_date: 'DESC' },['weight','user'],null,['user'],);
                }
                bioWeightUsers = {};
                let dateranges = [];
                if(schedule['daterange']){
                    dateranges = schedule['daterange'];
                }
                let i = 0;
                for (let item of allBioWeightData) {
                    if (dateranges && dateranges.length > 0) {
                        for (let key = 0; key < dateranges.length; key++) {
                            const daterange = dateranges[key];
                            const rangeStartDate = this.commonDateService.getTodayDate(daterange.startdate);
                            const rangeEndDate = this.commonDateService.getTodayDate(daterange.enddate).endOf('day');
                            const addedDate = this.commonDateService.getTodayDate(item.added_date);
                            if (addedDate.isSameOrAfter(rangeStartDate) && addedDate.isSameOrBefore(rangeEndDate)) {
                                if (!dateranges[key].data) {
                                    dateranges[key].data = {};
                                }
                                const userId = item.user_id;
                                const bioweightId = item.id;
                                if (!dateranges[key].data[userId]) {
                                    dateranges[key].data[userId] = {};
                                }
                                dateranges[key].data[userId][bioweightId] = {
                                    weight: item.weight
                                };
                            }
                        }
                    }
                    const userId = item.user_id;
                    if (!bioWeightUsers[userId]) {
                        bioWeightUsers[userId] = {};
                    }
                    bioWeightUsers[userId][i] = item;
                    i++;
                }
                let joinTable = [
                    {'alias':'userSetting', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : `userSetting.user_id = user.id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `scj.user_id = user.id AND scj.status = 1` , 'connect' : 'user', 'type' : 'INNER' },
                    {'alias':'bioweight', 'table' : tableConstant.CHALLENGE.TBL_CH_BIO_WEIGHT, 'on' : `bioweight.id = scj.user_id` , 'connect' : 'user', 'type' : 'LEFT' },
                ];
                let fields = ['user.email','user.id','user.code','user.role_id','user.relationship_id','user.username','user.first_name','user.middle_name','user.last_name',
                    'user.securitycode','user.employeeid','user.gender','user.dob','user.date_of_hire','user.on_insurance_plan','user.insurance_plan_name','user.is_camp_eligible','user.status',
                    'userSetting.jobtitle','userSetting.wphone','userSetting.wphone_ext',
                    'Location.lname','Location.location_name','Location.id','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option',
                    'bioweight.user_id','bioweight.added_date','scj.id','scj.schedule_id','scj.challenge_id',];
                userList = await this.userService.list(`${condition} AND User.org_id = ${schedule?.org_id}`.replace(/User/gi, "user"),{'bioweight.added_date' : 'DESC'},fields,null,joinTable);

                let Departments = {};
                let k = 0;
                for (let tuser of userList) {
                    tuser.score = 0;
                    tuser.weightloosper = 0;
                    let diffweight = 0;
                    let users_id = tuser.id;
                    let team_members =(userList.filter((usr) => usr?.team?.id == tuser?.team?.id) || [])?.length;
                    tuser.team['team_member'] = team_members;
                    if (bioWeightUsers[users_id]) {
                        tuser.weightInfo = Object.values(bioWeightUsers[users_id]);
                        const weightInfo = JSON.parse(JSON.stringify(Object.values(bioWeightUsers[users_id])));
                        const lastWeightArr = weightInfo[0];
                        const firstWeightArr = weightInfo[weightInfo.length - 1];
                        let firstweight;
                        let lastweight;
                        if (schedule.s_rangestartdate && schedule.s_rangeenddate) {
                            const s_range_startDate = this.commonDateService.DateTimeFormat(schedule.s_rangestartdate, 'YYYY-MM-DD');
                            const s_range_endDate = this.commonDateService.DateTimeFormat(schedule.s_rangeenddate, 'YYYY-MM-DD').endOf('day');
                            const firstAdded = this.commonDateService.DateTimeFormat(firstWeightArr.added_date);
                            const lastAdded = this.commonDateService.DateTimeFormat(lastWeightArr.added_date);
                            if (firstAdded.isBetween(s_range_startDate, s_range_endDate, null, '[]')) {
                                firstweight = Number(firstWeightArr.weight);
                            }
                            if (lastAdded.isBetween(s_range_startDate, s_range_endDate, null, '[]')) {
                                lastweight = Number(lastWeightArr.weight);
                            }
                            if (firstweight !== '' && lastweight !== '') {
                                diffweight = Number(firstweight) - Number(lastweight);
                            }
                        } else {
                            firstweight = Number(firstWeightArr.weight);
                            lastweight = Number(lastWeightArr.weight);
                            diffweight = firstweight - lastweight;
                        }
                        let weightloosper = 0;
                        if (Object.keys(weightInfo).length < 1) {
                            diffweight = 0;
                        } else {
                            if (firstweight !== '' && lastweight !== '') {
                                weightloosper = Math.round((((firstweight * 100) / lastweight) - 100) * 100) / 100;
                                if (diffweight > 0) {
                                    weightloosper = Math.round((((firstweight - lastweight) * 100) / firstweight) * 100) / 100;
                                }
                            } else {
                                weightloosper = 0;
                            }
                        }
                        if (diffweight <= 0) {
                            diffweight = 0;
                            weightloosper = 0;
                        }
                        tuser.score = diffweight;
                        tuser.weightloosper = weightloosper;
                        if (dateranges && dateranges.length > 0) {
                            tuser.dateranges = {};
                            for (let key = 0; key < dateranges.length; key++) {
                                const daterange = dateranges[key];
                                tuser.dateranges[key] = 0;
                                if (daterange.data && daterange.data[users_id]) {
                                    const userData = daterange.data[users_id];
                                    const weightKeys = Object.keys(userData);
                                    if (weightKeys.length >= 2) {
                                        const last = userData[weightKeys[0]];
                                        const first = userData[weightKeys[weightKeys.length - 1]];
                                        if (last.weight < first.weight) {
                                            tuser.dateranges[key] = Math.round((((first.weight * 100) / last.weight) - 100) * 100) / 100;
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        tuser.weightInfo = [];
                        tuser.team = { id: '', tname: '', schedule_id: '' };
                        tuser.teamMember = { id: '', team_id: '', user_id: '', iscaptain: '' };
                        tuser.teamSchedule = { id: '', team_id: '', schedule_id: '' };
                        tuser.totalweightloss = 0;
                        tuser.touchdown = 0;
                    }
                    result[k] = tuser;
                    k++;
                    const deptId = tuser?.department?.id;
                    if (deptId) {
                        if (Departments[deptId]) {
                            Departments[deptId] += 1;
                        } else {
                            Departments[deptId] = 1;
                        }
                    }
                }
                if (schedule.rank_type === 'weight_loss_per') {
                    result.sort((a, b) => {
                        if (b.weightloosper > a.weightloosper) return 1;
                        if (b.weightloosper < a.weightloosper) return -1;
                        return b.score > a.score ? 1 : -1;
                    });
                } else {
                    result.sort((a, b) => {
                        if (b.score > a.score) return 1;
                        if (b.score < a.score) return -1;
                        return b.weightloosper > a.weightloosper ? 1 : -1;
                    });
                }
            }
            let rank = 1;
            let prevRank = 1;
            let index = 0;
            let teamReportData = Object.create(null);
            let groupReportData = Object.create(null);
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
                if (schedule?.s_rangestartdate && schedule?.s_rangeenddate) {
                    const weightInfo = [...item.weightInfo]; 
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
                    const weightInfoDates = item.weightInfo.map(sub => this.commonDateService.DateTimeFormat(sub.added_date,'YYYY-MM-DD'));
                    for (let day = 0; day < 7; day++) {
                        const checkDate = this.commonDateService.DateTimeFormat(gStartDate).add(day, 'days').format('YYYY-MM-DD');
                        if (weightInfoDates.includes(checkDate)) {
                            firstWeight = "Yes";
                        }
                    }
                    // for (let day = 0; day < 7; day++) {
                    //     const checkDate = this.commonDateService.DateTimeFormat(schedule['end_date']).subtract(day, 'days').format('YYYY-MM-DD');
                        const checkDate = this.commonDateService.DateTimeFormat(schedule['end_date']).format('YYYY-MM-DD');
                        if (weightInfoDates?.length > 1 && weightInfoDates[weightInfoDates.length -1] <= checkDate) {
                            lastWeight = "Yes";
                        }
                    // }
                    if (firstWeight === "Yes" && lastWeight === "Yes") {
                        metGoal = "Yes";
                    } else {
                        metGoal = "No";
                    }
                }
                item['metGoal'] = metGoal;
                item['firstWeight'] = firstWeight;
                item['lastWeight'] = lastWeight;
                if (item?.team?.id) {
                    if (teamReportData[item?.team?.id]) {
                        teamReportData[item?.team?.id]['TEAM NAME'] = item?.team?.tname || '';
                        teamReportData[item?.team?.id]['TEAM SIZE'] = item?.team?.team_size || '';
                        teamReportData[item?.team?.id]['TEAM MEMBERS'] = item?.team?.team_member || '';
                        teamReportData[item?.team?.id]['TOTAL WEIGHT LOSS'] += item?.score || '';
                        teamReportData[item?.team?.id]['RANK'] = item?.rank || '';
                    } else {
                        teamReportData[item?.team?.id] = {
                            'TEAM NAME': item?.team?.tname || '',
                            'TEAM SIZE': item?.team?.team_size || '',
                            'TEAM MEMBERS': item?.team?.team_size || '',
                            'TOTAL WEIGHT LOSS': item?.score || '',
                            'RANK': item?.rank || '',
                        };
                    }
                    if(schedule.rank_type == 'weight_loss_per_avg'){
                        let totalWeightPer = result.filter(u => u?.team?.id == item?.team?.id).reduce((acc, curr) => acc + (curr.weightloosper || 0), 0);
                        item.team['totalWeightPer'] = item?.team?.team_member && item?.team?.team_member != 0 ? Number((totalWeightPer / item.team.team_member).toFixed(2)) : 0;
                        teamReportData[item?.team?.id]['TOTAL WEIGHT LOSS PER'] = item?.team?.totalWeightPer || 0;
                    }
                    if (schedule?.team == 1) {
                        if (schedule?.group_status == 1) {
                            teamReportData[item?.team?.id]['GROUP NAME'] = item?.group?.name || '';
                            teamReportData[item?.team?.id]['TEAM NAME'] = item?.team?.tname || '';
                            teamReportData[item?.team?.id]['RANK'] = item?.rank || '';
                        }
                    }
                }
                if (item?.group) {
                    if (groupReportData[item.group?.id]) {
                        groupReportData[item?.group?.id]['GROUP NAME'] = item?.group?.name || '';
                        groupReportData[item?.group?.id]['GROUP TEAMS'] += 1;
                        groupReportData[item?.group?.id]['RANK'] = item?.rank || '';
                    } else {
                        groupReportData[item.group?.id] = {
                            'GROUP NAME': item?.group?.name || '',
                            'GROUP TEAMS': 0,
                            'RANK': item?.rank || '',
                        };
                    }
                }
            }
            if(result_type == 2){
                let clm_name_arr;
                let resultData = {};
                clm_name_arr = [...cronAppConstant.USER_HEADER_DATA];
                if(schedule.team){
                    clm_name_arr.push('TEAM')
                }
                clm_name_arr.push('RANK');
                
                if(userList.length){
                    const clm_data_user = await Promise.all(
                        userList.map(async (user) => {
                            const row: any[] = [];
                            const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                            row.push(...Object.values(tempdatainfo));
                            if(schedule.team){
                                row.push(user?.team?.tname || '');
                            }
                            row.push(user?.rank || '');
                            // row.push(user?.firstWeight || '');
                            // row.push(user?.lastWeight || '');
                            // row.push(user?.metGoal || '');
                            return row;
                        }),
                    );
                    let userSheetData = [clm_name_arr, ...clm_data_user];
                    resultData['user'] = userSheetData;
                }
                let teamdatainfos =[];
                let groupdatainfos =[];
                if (schedule?.team == 1 && teamReportData && Object.keys(teamReportData).length > 0) {
                    for (let [teamId, teamData] of Object.entries(teamReportData)) {
                        let data =[];
                        data.push(teamData?.['TEAM NAME'] || '');
                        data.push(teamData?.['TEAM SIZE'] || '0');
                        data.push(teamData?.['TEAM MEMBERS'] || '0');
                        data.push(teamData?.['TOTAL WEIGHT LOSS'] || '0');
                        if(schedule.rank_type == 'weight_loss_per_avg'){
                            data.push(teamData?.['TOTAL WEIGHT LOSS PER'] || '0');
                        }
                        if (schedule?.group_status == 1) {
                            data.push(teamData?.['GROUP NAME'] || '');
                        }
                        data.push(teamData?.['RANK'] || '');
                        teamdatainfos.push(data);
                    }
                    clm_name_arr = ['TEAM', 'TEAM SIZE', 'TEAM MEMBERS'];
                    clm_name_arr.push('TOTAL WEIGHT LOSS');
                    if(schedule.rank_type == 'weight_loss_per_avg'){
                        clm_name_arr.push('TOTAL WEIGHT LOSS PER');
                    }
                    if (schedule?.group_status == 1) {
                        clm_name_arr.push('GROUP NAME');
                    }
                    clm_name_arr.push('RANK');
                    let userSheetData = [clm_name_arr, ...teamdatainfos];
                    resultData['team'] = userSheetData;
                }
                if (schedule?.group_status == 1 && groupReportData && Object.keys(groupReportData).length > 0) {
                    for (let [groupId, groupData] of Object.entries(groupReportData)) {
                        let data =[];
                        data.push(result[0]?.['company']?.['company_name'] || '');
                        data.push(groupData?.['GROUP NAME'] || '');
                        data.push(groupData?.['GROUP TEAMS'] || '');
                        data.push(groupData?.['RANK'] || '');
                        groupdatainfos.push(data);
                    }
                    clm_name_arr = [];
                    clm_name_arr = [...cronAppConstant.GROUP_HEADER_DATA,'RANK'];
                    let userSheetData = [clm_name_arr, ...groupdatainfos];
                    resultData['group'] = userSheetData;
                }
                return resultData;
            }
           return result;
        } catch (error) {
            throw new Error(error);
        }
    }

    async challengeUserDetails(schedule: Partial<ScheduleChallengeEntity>, condition: string = '', teamCondition: string = '', groupCondition: string = ''): Promise<any[]> {
        try{
            let where = `${condition} AND User.org_id = ${schedule?.org_id}`;
            let joinTable = [];
            let fields = ['User','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option'];

            let teamProcType = (schedule['teamproctype'] && schedule['team'] == 1) ? schedule['teamproctype'] : 1;
            if(schedule['team'] == 1 && teamProcType == 2) {
                if(teamCondition){
                    where = `${condition} AND User.org_id = ${schedule?.org_id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`
                    fields = [...fields,'teamMember.id','teamMember.user_id','teamMember.team_id','scj.id','scj.schedule_id','scj.challenge_id'];
                    joinTable =[tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS];
                }
            }
            let userList = await this.userService.challengeReportPaginate(where, null, fields, joinTable,);
            return userList ?? [];
        }
        catch(error){
            throw new Error(error.message);
        }
    }
}
