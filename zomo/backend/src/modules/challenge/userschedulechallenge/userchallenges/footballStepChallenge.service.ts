import { CommonDateService, CommonService } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { ActivityFeedService } from "src/modules/trackers/activityfeeds/activityfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { BioWeightService } from "../../bioweight/bioweight.service";
import { TeamMembersService } from "../../teammembers/teammembers.service";
import { TeamsService } from "../../teams/teams.service";
import { WeeksStepsService } from "../../weekssteps/weekssteps.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class FootballStepChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly weeksStepsService: WeeksStepsService,
        private readonly teamsService: TeamsService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly teamMembersService: TeamMembersService,
        private readonly bioWeightService: BioWeightService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
    ) {}

    async footballStepChallenge(schedule: any, req: Request, show_type = 1) {
        try {
            let result = Object.create(null);
            req.tokenUser = JSON.parse(JSON.stringify(req.tokenUser));
            let user_id = req.tokenUser?.id;
            let schedule_id = schedule['sc']['id'];
            let orgId = schedule['sc']['org_id'];
            let totalDays = schedule['challengeDetails']['totaldays'];
            let upToDays = schedule['challengeDetails']['uptodays'];
            schedule['Activity'] = Object.create(null);
            if(show_type == 2 ){
                let where = `food.user_id = '${req.tokenUser?.id}' AND food.status = 1`;
                where += ` AND food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${this.commonDateService.DateTimeFormat(schedule.sc.end_date,'YYYY-MM-DD')} 23:59:59'`;
                let resultedData = await this.activityFeedsService.listRecord(
                    where,
                    {'food.collectionDate': 'DESC'},
                    ['SUM(steps) as steps', 'user_id','activityName'],
                    'food.activityName'
                );
                await Promise.all(resultedData.map(async (item) => {
                    item.steps = item.steps ? parseInt(item.steps).toLocaleString() : '0';
                }));
                let translationParams = await this.translatorService.frontendReadTranslation(req.lang, 'Steps', `/LC_MESSAGES/Trackers/Exercise`, `static`);
                const allowedActivities = ["Walking", "Running", "Cycling", "Swimming"];
                let walkingSteps = 0;
                const filteredData = resultedData.reduce((acc, item) => {
                    if (allowedActivities.includes(item.activityName)) {
                        acc.push(item);
                    } else {
                        walkingSteps += Number(item.steps);
                    }
                    return acc;
                }, []);
                let walkingEntry = filteredData.find(item => item.activityName === "Walking");
                if (walkingSteps > 0) {
                    if (walkingEntry) {
                        walkingEntry.steps = (Number(walkingEntry.steps) + walkingSteps).toLocaleString();
                    } else {
                        filteredData.push({ steps: walkingSteps.toLocaleString(), user_id: resultedData[0]?.user_id, activityName: "Walking" });
                    }
                }
                if(!filteredData.find(item => item.activityName === "Running")){
                    filteredData.push({ steps: 0, user_id: resultedData[0]?.user_id, activityName: "Running" });
                }
                if(!filteredData.find(item => item.activityName === "Cycling")){
                    filteredData.push({ steps: 0, user_id: resultedData[0]?.user_id, activityName: "Cycling" });
                }
                if(!filteredData.find(item => item.activityName === "Swimming")){
                    filteredData.push({ steps: 0, user_id: resultedData[0]?.user_id, activityName: "Swimming" });
                }
                result['dashboardData'] = filteredData.sort((a, b) => {
                    return allowedActivities.indexOf(a.activityName) - allowedActivities.indexOf(b.activityName);
                });
                const translatedData = await Promise.all(result['dashboardData'].map(async (item) => {
                    let translation = await this.translatorService.frontendReadTranslation(req.lang, `${item?.activityName}`, `/LC_MESSAGES/Trackers/Exercise`, `static`);
                    return { ...item, 'activityName_trans': translation, step_trans: translationParams };
                }));
                result['dashboardData'] = translatedData;
                return result
            }
            let stepWeeks = await this.weeksStepsService.listRecord({schedule_id: schedule_id},{id: 'ASC'});  
            result['stepweeks'] = stepWeeks;
            const findAll = [];
            let findAllString;
            if (schedule.sc.s_activity_tracker === 1) {
                findAll.push(7);
            }
            if (schedule.sc.s_steps === 1) {
                findAll.push(11);
            }
            if (schedule.sc.s_walking === 1) {
                findAll.push(15);
            }
            if (schedule.sc.s_running === 1) {
                findAll.push(16);
            }
            if (schedule.sc.s_cycling === 1) {
                findAll.push(17);
            }
            if (schedule.sc.s_swimming === 1) {
                findAll.push(18);
            }

            if (findAll?.length > 0) {
                findAllString = `(${findAll.join(',')})`;
            } else {
                findAllString = '("")';
            }

            let dailySteps = schedule.ch.numberofsteps;
            let numberOfSteps = schedule.ch.numberofsteps;
            if (schedule.sc.numberofsteps && schedule.sc.numberofsteps !== 0 && schedule.sc.numberofsteps !== "") {
                dailySteps = numberOfSteps = schedule.sc.numberofsteps;
            }
            let countUserWithZero = schedule.sc.countuserwithzero;
            const dailyMaxStepsCnt = schedule.sc.dailymaxstepscnt;
            const countStepsWith = schedule.sc.countstepswith;
            let logType;
            if (countStepsWith === 'realstep') {
                logType = " AND logType='Tracker'";
            } else {
                logType = "AND logType in('Tracker','Manual')";
            }
            let yardFrequency = schedule['sc']['yardfrequency'];
            let individualMeetGoal = schedule['sc']['individualmeetgoal'];
            let yard = schedule['sc']['yard'];   
            let rank_type = schedule['sc']['rank_type'];
            let where = `food.collectionDate BETWEEN '${this.commonDateService.getTodayDate(schedule['sc']['start_date']).format('YYYY-MM-DD')}' AND '${this.commonDateService.getTodayDate(schedule['sc']['end_date']).format('YYYY-MM-DD')}' ${logType} AND food.status = 1`;
            let allStepsData = await this.activityFeedsService.listRecord(`food.user_id in (${req.tokenUser?.id}) AND (food.activityTypeId in ${findAllString} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,{'food.collectionDate': 'DESC'}, ['SUM(steps) as steps', 'user_id','collectionDate'], 'food.collectionDate');
            const tempStepYes = Object.create(null);

            allStepsData.map(getSteps => {
                const collectionDate = this.commonDateService.getTodayDate(getSteps.collectionDate).format('YYYY-MM-DD');
                const steps = parseInt(getSteps.steps); 
                tempStepYes[collectionDate] = steps;
            });
            
            result['currentUserDetail'] = tempStepYes;
            
            const allTeams = Object.create(null);
            let tempStep = Object.create(null);
            const startDate = moment(schedule.sc.start_date).unix();
            let myGroupID:any = '';
            let myTeamID:any = '';
            if(schedule['sc']['team']==1) {
                const getAllTeams = await this.teamsService.getAllTeams(`team.org_id = ${orgId} AND team.schedule_id = ${schedule_id}`);
                for (const [key, value] of Object.entries(getAllTeams)) {
                    if(value['teamMember'] && value['teamMember']?.length > 0){
                        value['teamMember'] = Object.values(value['teamMember']).filter((item)=> item['user']);
                    }
                    let teamData = Object.create(null);
                    let groupKey = value.group_id;
                    if (!result['myTeamDetails']) { result['myTeamDetails'] = Object.create(null); }
                    if(value['challengeGroups'] && value['challengeGroups']['logo'] && value['challengeGroups']['logo']?.length < 2){
                        value['challengeGroups']['logo'] = this.commonService.getIconPath(value['challengeGroups']['logo'],S3_URL)
                    }
                    if(value && value['logo'] && value['logo']?.length < 2){
                        value['logo'] = this.commonService.getIconPath(value['logo'],S3_URL)
                    }
                    if(value.tname){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${value['schedule_id']}_${value['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgId}/${value.schedule_id}`,`dynamic`);
                        value.tname = (customName == '' || customName == `team_name_${value['schedule_id']}_${value['id']}`) ? value['tname'] : customName;
                    }
                    
                    let totalMembers = 0;
                    let totalRealSteps = 0;
                    let totalYards = 0;
                    let teamAverageSteps = 0;
                    let teamRealSteps = 0;
                    const getTeamMembers = await this.teamMembersService.teamMembers(`scheduleJoin.schedule_id = ${schedule_id} AND users.status = 1 AND teamMember.status = 1 AND teamMember.team_id = ${value['id']}`);
                    const userCheckArray = getTeamMembers.map(member => member['users'].id);
                    totalMembers = userCheckArray?.length;
                    const allUsersId = userCheckArray.join(',');
                    let getalldataforcurrent = userCheckArray.includes(req.tokenUser?.id);
                    let allStepsDataUser = Object.create(null);
                    let tempStepYes = Object.create(null);
                    let currentDataTeam = Object.create(null);
                    let tempStepYesGoalYes = Object.create(null);
                    let dailyAverageSteps = 0;
                    let totalmembersoriginal = 0;
                    let currentTouchdown = 0;
                    let allStepsData
                    if (allUsersId.trim() != "") {
                        if(allUsersId.includes(user_id.toString())){
                            myTeamID = value['id'];
                            myGroupID = groupKey;
                            
                            result['myTeamDetails']['id'] = value['id'];
                            result['myTeamDetails']['group_id'] = myGroupID;
                            result['myTeamDetails']['tname'] = value['tname'];
                            result['myTeamDetails']['created_by'] = value['created_by'];
                            result['myTeamDetails']['created_date'] = value['created_date'];
                            result['myTeamDetails']['is_team'] = '1';
                            result['myTeamDetails']['logo'] = value['logo'];
                            result['myTeamDetails']['team_size'] = value['team_size'];
                        }
                        allStepsData = await this.activityFeedsService.listRecord(`food.user_id in (${allUsersId}) AND (food.activityTypeId in ${findAllString} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,{'food.collectionDate': 'DESC'}, ['SUM(steps) as steps', 'user_id','collectionDate'], 'food.collectionDate, food.user_id');
                        allStepsData.map(getSteps => {
                            if(getSteps && typeof getSteps === 'object'){
                                getSteps= Object.create(getSteps);
                                const userId = getSteps.user_id;
                                const steps = parseInt(getSteps.steps); 
                                if (tempStep[userId]) {
                                    tempStep[userId] += steps;
                                } else {
                                    tempStep[userId] = steps;
                                }
                                totalRealSteps += steps;
                                const collectionDate = this.commonDateService.getTodayDate(getSteps.collectionDate).format('YYYY-MM-DD');
                                if (tempStepYes[collectionDate]) {
                                    tempStepYes[collectionDate] += steps;
                                } else {
                                    tempStepYes[collectionDate] = steps;
                                }
                                if (!tempStepYesGoalYes[collectionDate]) {
                                    tempStepYesGoalYes[collectionDate] = Object.create(null);
                                }
                                tempStepYesGoalYes[collectionDate][userId] = steps;
                            }
                        });
                        if(countUserWithZero?.trim() == "No"){
                            totalMembers = Object.keys(tempStep)?.length;
                            }
                        if (tempStep) {
                            allStepsDataUser = tempStep;
                            tempStep = Object.create(null);
                        }

                        if (individualMeetGoal.trim() == "no") {
                            if (schedule['sc']['is_nolimit'] == 1) {
                                if (yardFrequency.trim() == "weekly") {
                                    for (let weekWiseCount of stepWeeks) {
                                        if (!weekWiseCount['Challengeweeksteps']) {
                                            weekWiseCount['Challengeweeksteps'] = Object.create(null);
                                        }
                                        if (!weekWiseCount['Challengeweeksteps'][value.id]) {
                                            weekWiseCount['Challengeweeksteps'][value.id] = Object.create(null);
                                        }
                                        for (let ele of Object.keys(tempStepYes)) {
                                            let tempStepYesKey = ele;
                                            let getSteps = tempStepYes[ele];
                                            let yardsCount = 0;
                                            const upToDiffU = moment(tempStepYesKey).unix() - moment(startDate).unix();
                                            const uptodaysup = Math.floor(upToDiffU / (60 * 60 * 24)) + 1;
                                            const dailyRealSteps = getSteps;
                                            dailyAverageSteps = (totalMembers !== 0) ? dailyRealSteps / totalMembers : 0;
                                            let todayCompleted = "No";
                                            if (dailyAverageSteps >= numberOfSteps) {
                                                todayCompleted = "Yes";
                                            }

                                            if (yardFrequency.trim() === "daily") {
                                                if (rank_type === "average_steps") {
                                                    if (dailyAverageSteps >= numberOfSteps) {
                                                        yardsCount += yard;
                                                    }
                                                } else {
                                                    if (dailyRealSteps >= numberOfSteps) {
                                                        yardsCount += yard;
                                                    }
                                                }
                                            }
                                            totalYards += yardsCount;
                                            tempStep[`${tempStepYesKey}`] = {
                                                dailyaveragesteps: dailyAverageSteps,
                                                dailyrealsteps: dailyRealSteps,
                                                yardsearned: totalYards
                                            };
                                            let currentTouchdown = 0;
                                            if (totalYards !== 0) {
                                                currentTouchdown = Math.floor(totalYards / 100);
                                            }
                                            currentDataTeam[`${tempStepYesKey}`] = {
                                                dailyaveragesteps: dailyAverageSteps,
                                                dailyrealsteps: dailyRealSteps,
                                                todaycompleted: todayCompleted,
                                                yardsearned: totalYards
                                            };
                                        }
                                        for (const getSteps of allStepsData) {
                                            const collectionDate = moment(getSteps.collectionDate);
                                            const startDate = moment(weekWiseCount.start_date);
                                            const endDate = moment(weekWiseCount.end_date);

                                            if (collectionDate.isSameOrAfter(startDate) && collectionDate.isSameOrBefore(endDate)) {
                                                if (weekWiseCount['Challengeweeksteps']?.[value['id']]?.[getSteps['user_id']]?.['Completedstep']) {
                                                    weekWiseCount['Challengeweeksteps'][value['id']][getSteps['user_id']]['Completedstep'] += parseInt(getSteps['steps']);
                                                } else {
                                                    if (!weekWiseCount['Challengeweeksteps'][value['id']][getSteps['user_id']]) {
                                                        weekWiseCount['Challengeweeksteps'][value['id']][getSteps['user_id']] = Object.create(null);
                                                    }
                                                    weekWiseCount['Challengeweeksteps'][value['id']][getSteps['user_id']]['Completedstep'] = parseInt(getSteps['steps']);
                                                }
                                            }
                                        }
                                        if (weekWiseCount['Challengeweeksteps'][value['id']] && !weekWiseCount['Challengeweeksteps'][value['id']]) {
                                            for (const weekWiseCountInner of weekWiseCount['Challengeweeksteps'][value['id']]) {
                                                if (weekWiseCount['Challengeweeksteps'][value['id']]['Completeyard']) {
                                                    weekWiseCount['Challengeweeksteps'][value['id']]['Completeyard'] += Math.floor(weekWiseCountInner['Completedstep'] / (weekWiseCount['Challengeweeksteps']['week_steps'] * weekWiseCount['Challengeweeksteps']['days_week'])) * 50;
                                                } else {
                                                    weekWiseCount['Challengeweeksteps'][value['id']]['Completeyard'] = Math.floor(weekWiseCountInner['Completedstep'] / (weekWiseCount['Challengeweeksteps']['week_steps'] * weekWiseCount['Challengeweeksteps']['days_week'])) * 50;
                                                }
                                            }
                                        }
                                        if (weekWiseCount['Challengeweeksteps'][value['id']]['Completeyard'] && weekWiseCount['Challengeweeksteps'][value['id']]['Completeyard'] != 0) {
                                            totalYards += Math.floor(parseInt(weekWiseCount['Challengeweeksteps'][value['id']]['Completeyard']) / 100) * 100;
                                        }
                                    }
                                    currentTouchdown = 0;
                                    if (totalYards !== 0) {
                                        currentTouchdown = Math.floor(totalYards / 100);
                                    }

                                }
                                else {
                                    currentTouchdown = 0
                                    totalYards = 0;
                                    for (let weekWiseCount of stepWeeks) {
                                        if (weekWiseCount && typeof weekWiseCount === 'object') {
                                            weekWiseCount = Object.create(weekWiseCount);
                                            let j = 0;
                                            const startDate = moment(weekWiseCount['start_date']);
                                            const endDate = moment(weekWiseCount['end_date']);
                                            const loop = Math.round(Math.abs(endDate.diff(startDate, 'days')));
                                            if (!weekWiseCount['Challengeweeksteps']) {
                                                weekWiseCount['Challengeweeksteps'] = Object.create(null);
                                            }
                                            if (!weekWiseCount['Challengeweeksteps'][value.id]) {
                                                weekWiseCount['Challengeweeksteps'][value.id] = Object.create(null);
                                            }
                                            for (let i = 1; i <= loop + 1; i++) {
                                                const currentDate = moment(startDate).add(j, 'days');
                                                const dateKey = currentDate.format('YYYY-MM-DD');

                                                if (Object.prototype.hasOwnProperty.call(tempStepYes, dateKey)) {
                                                    if (weekWiseCount['Challengeweeksteps'][value.id]) {
                                                        const completedStepsKey = 'Completedstep';
                                                        if (weekWiseCount['Challengeweeksteps'][value.id][completedStepsKey]) {
                                                            weekWiseCount['Challengeweeksteps'][value.id][completedStepsKey] += parseInt(tempStepYes[dateKey]);
                                                        } else {
                                                            weekWiseCount['Challengeweeksteps'][value.id][completedStepsKey] = parseInt(tempStepYes[dateKey]);
                                                        }
                                                    }
                                                }
                                                j++;
                                                currentDataTeam[dateKey] = {
                                                    dailyrealSteps: tempStepYes[dateKey],
                                                    todaycompleted: tempStepYes[dateKey],
                                                    yardsearned: totalYards
                                                };
                                            }

                                            if (weekWiseCount['Challengeweeksteps'][value.id] && weekWiseCount['Challengeweeksteps'][value.id]['Completedstep']) {
                                                weekWiseCount['Challengeweeksteps'][value.id]['Completedstep'] = parseInt(weekWiseCount?.['Challengeweeksteps']?.[value.id]?.['Completedstep']);
                                                const completedStep = weekWiseCount?.['Challengeweeksteps']?.[value.id]?.['Completedstep'] ?? 0;
                                                const weekSteps = weekWiseCount?.['week_steps'] ?? 0;

                                                weekWiseCount['Challengeweeksteps'][value.id]['Completeyard'] = Math.ceil(completedStep / (weekSteps * totalMembers)) * 50;
                                                totalYards += weekWiseCount['Challengeweeksteps'][value.id]['Completeyard'];

                                                if (totalYards !== 0) {
                                                    weekWiseCount['Challengeweeksteps'][value.id]['Completetouchdown'] = Math.floor(weekWiseCount['Challengeweeksteps'][value.id]['Completeyard'] / 100);
                                                    currentTouchdown += weekWiseCount['Challengeweeksteps'][value.id]['Completetouchdown'];
                                                }
                                            }
                                        }
                                    }
                                }
                                tempStepYes = Object.create(null);
                            }
                            else {
                                if (Object.keys(tempStepYes)?.length > 0) {
                                    for (let ele of Object.keys(tempStepYes)) {
                                        let tempStepYesKey = ele;
                                        let getSteps = tempStepYes[ele];
                                        let yardsCount = 0;
                                        const upToDiffU = moment(tempStepYesKey).unix() - moment(startDate).unix();
                                        const uptodaysup = Math.floor(upToDiffU / (60 * 60 * 24)) + 1;
                                        const dailyRealSteps = getSteps;
                                        dailyAverageSteps = (totalMembers !== 0) ? dailyRealSteps / totalMembers : 0;
                                        let todayCompleted = "No";
                                        if (dailyAverageSteps >= numberOfSteps) {
                                            todayCompleted = "Yes";
                                        }

                                        if (yardFrequency.trim() === "daily") {
                                            if (rank_type === "average_steps") {
                                                if (dailyAverageSteps >= numberOfSteps) {
                                                    yardsCount += yard;
                                                }
                                            } else {
                                                if (dailyRealSteps >= numberOfSteps) {
                                                    yardsCount += yard;
                                                }
                                            }
                                        }
                                        totalYards += yardsCount;
                                        tempStep[`${tempStepYesKey}`] = {
                                            dailyaveragesteps: dailyAverageSteps,
                                            dailyrealsteps: dailyRealSteps,
                                            yardsearned: totalYards
                                        };
                                        let currentTouchdown = 0;
                                        if (totalYards != 0) {
                                            currentTouchdown = Math.floor(totalYards / 100);
                                        }
                                        currentDataTeam[`${tempStepYesKey}`] = {
                                            dailyaveragesteps: dailyAverageSteps,
                                            dailyrealsteps: dailyRealSteps,
                                            todaycompleted: todayCompleted,
                                            yardsearned: totalYards
                                        };
                                    }
                                }
                                tempStepYes = Object.create(null);
                            }
                        }
                        else{
                            dailyAverageSteps = 0;
                            tempStepYes = tempStepYesGoalYes;
                            totalmembersoriginal = allStepsData?.length;
                        }

                        if (tempStepYes && Object.keys(tempStepYes).length > 0) {
                            let totalRealSteps = 0;
                            let totalYards = 0;
                            let yardCheck = 0;
                            let weeksCount = 1;
                            for (let i = 1; i <= totalDays; i++) {
                                let reached = 0;
                                let dailyAverageSteps = 0;
                                let dailyRealSteps = 0;
                        
                                const datematch = moment(schedule.sc.start_date).add(i ==0 ? 0 : i - 1, 'days');
                                const datematchStr = datematch.format('YYYY-MM-DD');
                                if ((i-1) !== 0 && ((i-1) % 7) === 0 && yardFrequency.trim() !== "daily") {
                                    if (yardCheck !== 0 && (yardCheck / totalMembers) >= (numberOfSteps * 7)) {
                                        totalYards += yard;
                                    }
                                    yardCheck = 0;
                                    weeksCount++;
                                    const numberofstepsinfo = await this.weeksStepsService.findOne({challenge_id: schedule.ch.id, schedule_id: schedule.sc.id, week_no: weeksCount}) ?? {week_steps: 0};
                                    numberOfSteps = numberofstepsinfo.week_steps;
                                }

                                if (Object.prototype.hasOwnProperty.call(tempStepYes,datematchStr) && totalDays !== i) {
                                    let yardsCount = 0;
                                    const userSteps = tempStepYes[datematchStr]?.[user_id];
                                    if (userSteps >= numberOfSteps) {
                                        reached++;
                                    }
                                    totalRealSteps = userSteps;
                                    yardCheck += userSteps;
                                    const upToDiffU = datematch.unix() - startDate;
                                    const uptodaysup = Math.floor(upToDiffU / (1000 * 60 * 60 * 24)) + 1;
                                    dailyAverageSteps = (uptodaysup !== 0) ? totalRealSteps / uptodaysup : 0;
                                    const dailyRealSteps = totalRealSteps;
                            
                                    let todaycompleted = "No";
                                    if(userCheckArray?.length == reached) {
                                        todaycompleted = "Yes";
                                        if(yardFrequency.trim() == "daily"){
                                            yardsCount += yard;
                                        }
                                    }else{
                                        todaycompleted = "No";
                                    }

                                    if (yardFrequency.trim() == "daily" && todaycompleted == "Yes") {
                                        totalYards += yardsCount;
                                        tempStep[datematchStr] = {
                                            dailyaveragesteps: dailyAverageSteps,
                                            dailyrealsteps: dailyRealSteps,
                                            yardsearned: yardsCount
                                        };
                                        currentDataTeam[datematchStr] = {
                                            dailyaveragesteps: dailyAverageSteps,
                                            dailyrealsteps: dailyRealSteps,
                                            todaycompleted: todaycompleted,
                                            yardsearned: yardsCount
                                        };
                                    } else {
                                        tempStep[datematchStr] = {
                                            dailyaveragesteps: dailyAverageSteps,
                                            dailyrealsteps: dailyRealSteps
                                        };

                                        currentDataTeam[datematchStr] = {
                                            dailyaveragesteps: dailyAverageSteps,
                                            dailyrealsteps: dailyRealSteps,
                                            todaycompleted: todaycompleted
                                        };
                                    }
                                }
                            }
                        }
                    }

                    let getuserteam = false;
                    let usersindividulweight=Object.create(null);
                    for(let tuser of getTeamMembers) {
                        let useridteam = tuser.user_id;
                        let stepswalks, realstepswalks;
                        if (tuser['users'] && tuser['users']['profile_image']) {
                            tuser['users']['profile_image'] = S3_URL + tuser['users']['profile_image']
                        }else{
                            tuser['users']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'
                        }

                        if (tuser['users'] && (tuser['users']['first_name'] && tuser['users']['last_name'])) {
                            tuser['users']['name'] = tuser['users']['first_name'] + ' '+ tuser['users']['last_name'];
                        }
                        if(tuser?.['department'] && req?.lang != 'eng'){
                            let deptName = await this.translatorService.frontendReadTranslation(req.lang,`department_name_${tuser?.['department']?.id}`, `/LC_MESSAGES/OrgAdmin/Department/${orgId}/${tuser?.['department']?.id}`,`dynamic`);
                            tuser['department']['dept_name'] = (deptName == '' || deptName == `department_name_${tuser?.['department']?.id}`) ? tuser?.['department']?.dept_name : deptName;
                        }
                        if (Object.prototype.hasOwnProperty.call(allStepsDataUser,useridteam)) {
                            stepswalks = allStepsDataUser[useridteam];
                            realstepswalks = allStepsDataUser[useridteam];
                            if (dailyMaxStepsCnt && dailyMaxStepsCnt != 0) {
                                let updailymaxstepscnt = dailyMaxStepsCnt * upToDays;
                                if (stepswalks > updailymaxstepscnt) {
                                    stepswalks = updailymaxstepscnt;
                                }
                                stepswalks = parseFloat(stepswalks.toString().replace(/-/g, ""));
                            }
                            if (stepswalks === "") {
                                stepswalks = 0;
                                realstepswalks = 0;
                            }
                        } else {
                            stepswalks = 0;
                            realstepswalks = 0;
                        }
                        if (user_id === useridteam) {
                            getuserteam = true;
                        }
                        let yardsCount = 0;
                        let dailyrealstepsUser = allStepsData?.find(ele=> ele.user_id == useridteam)?.['steps'] || 0;
                        dailyrealstepsUser = parseInt(dailyrealstepsUser);
                        dailyAverageSteps = (totalMembers !== 0) ? dailyrealstepsUser / totalMembers : 0;
                        let todayCompleted = "No";
                        if (dailyAverageSteps >= numberOfSteps) {
                            todayCompleted = "Yes";
                        }
                        if (yardFrequency.trim() === "daily") {
                            if (rank_type === "average_steps") {
                                if (dailyAverageSteps >= numberOfSteps) {
                                    yardsCount += yard;
                                }
                            } else {
                                if (dailyrealstepsUser >= numberOfSteps) {
                                    yardsCount += yard;
                                }
                            }
                        }
                        teamData[useridteam] = {
                            'userdetail': tuser['users'],
                            'department': tuser['department'],
                            'user_id': tuser['users']['id'],
                            'first_name': tuser['users']['first_name'],
                            'last_name': tuser['users']['last_name'],
                            'name':tuser['users']['name'],
                            'profile_image': tuser['users']['profile_image'],
                            'dept_name' : tuser['department'] ? tuser['department']['dept_name']: '',
                            'location_name' : tuser['locations'] ? tuser['locations']['lname']: '',
                            'locations': tuser['locations'],
                            'teamMember': tuser['teamMember'],
                            'realcompletedsteps': realstepswalks,
                            'is_captain': tuser?.iscaptain,
                            'yard': yardsCount,
                            'touchdown': realstepswalks != 0 ? parseFloat(((realstepswalks / yard) || 0).toFixed(2)) : 0,
                            completedsteps: stepswalks
                        };
                        if (totalYards != 0) {
                            usersindividulweight[useridteam] = parseFloat(((stepswalks / totalYards) || 0).toFixed(2));
                        }
                    }
                    teamData = Object.values(teamData);
                    let touchdown = 0;
                    let totalyardss = 0;
                    if (totalMembers != 0 && totalRealSteps != 0) {
                        teamAverageSteps = totalRealSteps / totalMembers / upToDays;
                    }
                    if (totalYards != 0) {
                        touchdown = Math.floor(totalYards / 100);
                        totalyardss = touchdown * 100;
                    }
                    teamRealSteps = totalRealSteps;
                    if (schedule.sc.group_status === 1 && groupKey !== 0) {
                        if (!allTeams['Groups']) allTeams['Groups'] = Object.create(null);
                        if (!allTeams['Groups'][groupKey]) allTeams['Groups'][groupKey] = Object.create(null);
                        allTeams['Groups'][groupKey] = {
                            teamyards: totalYards,
                            teamyardss: totalyardss,
                            touchdown: touchdown,
                            teamaveragesteps: teamAverageSteps,
                            teamsteps: teamRealSteps,
                        };
                        if (Object.prototype.hasOwnProperty.call(allTeams['Groups'][groupKey],'groupmember')) {
                            allTeams['Groups'][groupKey].groupmember += teamData.length;
                        } else {
                            allTeams['Groups'][groupKey]['groupmember'] = teamData ? Object.keys(teamData).length : 0;
                            allTeams['Groups'][groupKey]['uptodays'] = upToDays ?? 0;
                        }
                        if (Object.prototype.hasOwnProperty.call(allTeams['Groups'][groupKey],'totalstepscompleted')) {
                            allTeams['Groups'][groupKey].totalstepscompleted += teamRealSteps;
                        } else {
                            allTeams['Groups'][groupKey]['totalstepscompleted'] = teamRealSteps;
                        }
                        allTeams['Groups'][groupKey]['name'] = value['challengeGroups']?.name;
                        allTeams['Groups'][groupKey]['logo'] = value['challengeGroups']?.logo;
                        allTeams['Groups'][groupKey]['group_id'] = groupKey;
                    }
                    if (!allTeams['Teams']) allTeams['Teams'] = Object.create(null);
                    if (!allTeams['Teams'][key]) allTeams['Teams'][key] = Object.create(null);
                    allTeams['Teams'][key] = {
                        Team: value,
                        teamyards: totalYards,
                        teamyardss: totalyardss,
                        touchdown: touchdown,
                        teamaveragesteps: teamAverageSteps,
                        teamsteps: teamRealSteps,
                        teamMember: teamData,
                    };
                    if (getuserteam) {
                        result.datecollected = currentDataTeam || null;
                        if (!result['currentteam']) result['currentteam'] = Object.create(null);
                        result.currentteam.datecollected = currentDataTeam || null;
                        result.touchdown = touchdown || 0;
                        result.currentteam.touchdown = touchdown || 0;
                        result.teamyards = totalYards || 0;
                        result.currentteam.teamyards = totalYards || 0;
                        result.currentteam = {...result.currentteam,...value};
                        result.currentteam.teamMember = teamData;
                        result.usersindividulweight = usersindividulweight;
                    }
                    teamData = Object.create(null);
                }
                if (result?.['currentteam']?.['Team']?.['created_by'] && result?.['currentteam']?.['Team']?.['created_by'] == req.tokenUser?.id){
                    result['team_exist'] = 'yes';
                }
                if (schedule['sc']['group_status'] == 1 && allTeams['Groups'] && Object.keys(allTeams['Groups'])?.length) {
                allTeams['Groups'] = Object.values(allTeams['Groups']);
                allTeams['Groups']?.forEach((group) => {
                    if(allTeams['groupmember'] !=0 && allTeams['uptodays']){
                        group['groupavg']= Math.round(((allTeams['totalstepscompleted'] / allTeams['groupmember']) / allTeams['uptodays']));
                    }else{
                        group['groupavg']=0;
                    }
                });
                if (schedule.sc.group_order === 0) {
                    allTeams?.['Groups']?.sort((a, b) => b.groupavg - a.groupavg);
                } else {
                    allTeams?.['Groups']?.sort((a, b) => b.groupmember - a.groupmember);
                }
                } 
                if(allTeams?.['Teams'] && Object.keys(allTeams?.['Teams'])?.length){
                    allTeams['Teams'] = Object.values(allTeams?.['Teams']);
                    for(let ele of allTeams?.['Teams']){
                        if(ele['teamMember'] && Object.keys(ele['teamMember'])?.length){
                            ele['teamMember'] = Object.values(ele['teamMember']) ?? [];
                        }
                        else{
                            ele['teamMember'] = [];
                        }
                        if (!(schedule.in_ranking == 0 && ele.teamMember.length == 0) || ele.group_id == 0 || ele.group_id != 0) {
                            if(!(schedule.in_ranking == 0 && ele.teamMember.length == 0)){
                                ele['show_team']= 1;
                            }
                            else{
                                ele['show_team']= 0;
                            }
                        }
                    }
                }
                if (rank_type === "touchdown") {
                    allTeams?.['Teams']?.sort((a, b) => b.touchdown - a.touchdown);
                } else if (rank_type === "average_steps") {
                    allTeams?.['Teams']?.sort((a, b) => b.teamaveragesteps - a.teamaveragesteps);
                } else {
                    allTeams?.['Teams']?.sort((a, b) => {
                        const rdifference = b.teamyards - a.teamyards;
                        if (rdifference !== 0) {
                            return rdifference;
                        }
                        return b.teamsteps - a.teamsteps;
                    });
                }
                result['allteams'] = allTeams;
            }
            else{
                let currentDataTeam = [];
                let totalYards = 0;
                if(tempStepYes){
                    let totalRealSteps = 0;
                    let yardCheck = 0;
                    let weeksCount = 1;
                    const numberofstepsinfo = await this.weeksStepsService.findOne({challenge_id: schedule.ch.id, schedule_id: schedule.sc.id, week_no: 1}) ?? {week_steps: 0};
                    let numberOfSteps = 0;
                    if (numberofstepsinfo && numberofstepsinfo.week_steps !== undefined) {
                        numberOfSteps = numberofstepsinfo?.week_steps;
                    }
                    totalDays
                    for (let i = 0; i <= totalDays; i++) {
                        let reached = 0;
                        let dailyAverageSteps = 0;
                        const datematch = moment(schedule.sc.start_date).add(i, 'days');
                        const datematchStr = datematch.format('YYYY-MM-DD');
                        if (i % 7 === 0 && i !== 0) {
                            if (yardCheck !== 0 && yardCheck >= (numberOfSteps * 7)) {
                                totalYards += yard;
                            }
                            yardCheck = 0;
                            weeksCount++;
                            const numberofstepsinfo = await this.weeksStepsService.findOne({challenge_id: schedule.ch.id, schedule_id: schedule.sc.id, week_no: weeksCount}) ?? {week_steps: 0};
                            numberOfSteps = numberofstepsinfo.week_steps;
                        }
                        if (Object.prototype.hasOwnProperty.call(tempStepYes,datematchStr) && totalDays !== i) {
                            if (tempStepYes[datematchStr] >= numberOfSteps) {
                                reached++;
                            }
                            totalRealSteps += tempStepYes[datematchStr];
                            yardCheck += tempStepYes[datematchStr];
                    
                            const upToDiffU = datematch.unix() - startDate;
                            const uptodaysup = Math.floor(upToDiffU / (1000 * 60 * 60 * 24)) + 1;
                            dailyAverageSteps = (uptodaysup !== 0) ? totalRealSteps / uptodaysup : 0;
                            const dailyRealSteps = totalRealSteps;
                            const todaycompleted = (reached !== 0) ? "Yes" : "No";
                    
                            tempStep[datematchStr] = {
                                dailyaveragesteps: dailyAverageSteps,
                                dailyrealsteps: dailyRealSteps
                            };
                            currentDataTeam[datematchStr] = {
                                dailyaveragesteps: dailyAverageSteps,
                                dailyrealsteps: dailyRealSteps,
                                todaycompleted: todaycompleted
                            };
                        }
                    }
                }
                let touchdown = 0;
                let totalyardss = 0;
                if (typeof totalYards !== 'undefined' && totalYards !== 0) {
                    touchdown = Math.floor(totalYards / 100);
                    totalyardss = touchdown * 100;
                }
                if (typeof currentDataTeam !== 'undefined' && Object.keys(currentDataTeam).length > 0) {
                    result.datecollected = currentDataTeam;
                    if (totalYards !== 0) {
                        touchdown = Math.floor(totalYards / 100);
                        totalyardss = touchdown * 100;
                    }
                    result.touchdown = touchdown;
                    result.teamyards = totalYards;
                }
            }
            let w = 0;
            const resultData = {};
            const additionalday = result?.['stepweeks'].length;
            const ucurrentDateMore = moment();
            if(result?.['stepweeks'] && result?.['stepweeks']?.length){
                const currentTimestamp = this.commonDateService.getTodayDate();
                for(let ele of result?.['stepweeks']){
                    const weekData = JSON.parse(JSON.stringify(ele));
                    const isBetween = currentTimestamp.isBetween(this.commonDateService.getTodayDate(ele.start_date).format('YYYY-MM-DD'), this.commonDateService.getTodayDate(ele.end_date).format('YYYY-MM-DD'), null, '[]');
                    ele['start_date'] = this.commonDateService.getTodayDate(ele.start_date).unix();
                    ele['end_date'] = this.commonDateService.getTodayDate(ele.end_date).unix();
                    ele['current_week'] = isBetween;
                    if(ele['Challengeweeksteps']){
                        ele['Challengeweeksteps'] = Object.values(ele['Challengeweeksteps']);
                        ele['Challengeweeksteps'] = ele['Challengeweeksteps'].filter(element => {
                            if (Object.keys(element).length === 0) {
                                return false; 
                            }
                            if (element['teamMember'] && typeof element['teamMember'] === 'object' && Object.keys(element['teamMember']).length) {
                                element['teamMember'] = Object.values(element['teamMember']);
                            }
                            return true;
                        });
                    }
                    const startweekdate = moment(weekData.start_date);
                    let endweekdate;
                    if (weekData.week_no === additionalday) {
                        endweekdate = moment(schedule.sc.end_date);
                    } else {
                        endweekdate = moment(weekData.end_date);
                    }
                    if (ucurrentDateMore.isBetween(startweekdate.format('YYYY-MM-DD'), endweekdate.format('YYYY-MM-DD'), undefined, '[]')) {
                        if (schedule.sc.team !== 1) {
                            schedule.sc.numberofsteps = weekData.week_steps;
                        }
                    }
                    for (let i = 0; i <= 6; i++) {
                        let fill_square = 0;
                        const datematch = startweekdate.clone().add(i, 'days');
                        const dateKey = datematch.format('YYYY-MM-DD');
                        let element ={};
                        element['dailyrealsteps'] = {
                            'dailyaveragesteps': 0,
                            'dailyrealsteps': 0,
                            'todaycompleted': 'No',
                        };
                        if (result.datecollected && result.datecollected[dateKey]) {
                            if (result.datecollected[dateKey].todaycompleted === "Yes") {
                                fill_square = 1;
                                element['dailyrealsteps'] = result.datecollected[dateKey];
                            }
                            else{
                                element['dailyrealsteps'] = result.datecollected[dateKey]
                            }
                        }
                        if ((i % 7) === 0) {
                            w++;
                        }
                        element['fill_square'] = fill_square;
                        element['date'] = dateKey;
                        let startMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(dateKey, 'ddd')?.toString(), `/LC_MESSAGES/Common/Common`,`static`);
                        element['day_name'] = startMonthName;
                        if(!resultData[w]){
                            resultData[w] = [];
                        }
                        if(result.currentUserDetail[dateKey]){
                            element['dailyrealsteps']['steps'] = result.currentUserDetail[dateKey];
                        }
                        else{
                            element['dailyrealsteps']['steps'] = 0;
                        }
                        resultData[w].push(element);
                    }
                }
                let i = 1;
                for(let ele of result?.['stepweeks']){
                    ele['weekData'] = resultData[i];
                    i++
                }
            }
            let groupArray = [];
            if(allTeams['Groups']){
                for(let ele of JSON.parse(JSON.stringify(allTeams['Groups']))){
                    let group = {
                        group_id: ele.group_id,
                        name: ele.name,
                        logo: ele.logo,
                        groupmember: ele.groupmember ?? 0,
                        uptodays: ele.uptodays,
                        totalstepscompleted: ele.totalstepscompleted,
                        progress: ele.groupavg,

                    }; 
                    if(schedule.in_ranking == 0){
                        group['show_group']= 1;
                    }
                    else if (schedule.in_ranking == 1 && myGroupID == group?.group_id){
                        group['show_group']= 1;
                    }
                    else{
                        group['show_group']= 0;
                    }
                    group['yards'] = allTeams['Teams']?.filter(team => team?.Team?.group_id === ele.group_id)?.reduce((acc, team) => acc + (team.teamyards || 0), 0) || 0;
                    group['touchdown'] = allTeams['Teams']?.filter(team => team?.Team?.group_id === ele.group_id)?.reduce((acc, team) => acc + (team.touchdown || 0), 0) || 0;
                    groupArray.push({...group});
                }
            }
            result['allgroups'] = groupArray;
            if (allTeams['Teams']) {
                let teamArray = [];
                for (let element of JSON.parse(JSON.stringify(allTeams['Teams']))) {
                    let memberArray = [];
                    if (element['teamMember'] && element['teamMember'].length) {
                        for (let member of element['teamMember']) {
                            memberArray.push({
                                userdetail: {
                                    id: member.user_id,
                                    name: member.name,
                                    profile_image: member.profile_image,
                                    first_name: member.first_name,
                                    last_name: member.last_name,
                                    email: member.email,
                                    code: member.code,
                                },
                                user_id: member.user_id,
                                profile_image: member.profile_image,
                                dept_name: member.dept_name,
                                location_name: member.location_name,
                                locations: member.locations,
                                department: member.department,
                                is_captain: member.is_captain,
                                totalsteps: member.completedsteps,
                                progress: member.percentage,
                                perdaylog: result.perdaylogrequired,
                                touchdown: member?.touchdown,
                                yard: member?.yard,
                            });
                        }
                    }
                    teamArray.push({
                        id: element.Team.id,
                        group_id: element.Team.group_id,
                        tname: element.Team.tname,
                        logo: element.Team.logo,
                        team_size: element.Team.team_size,
                        totalsteps: element.teamsteps,
                        teamyard: element.teamyards,
                        touchdown: element.touchdown,
                        progress: element.teamaveragesteps,
                        teamMember: memberArray,
                        show_team: element.show_team,
                    });
                }
                result['allteams'] = teamArray;
            }
            if(result['datecollected']){
                let datecollected = [];
                for(let ele of Object.keys(result['datecollected'])){
                    datecollected.push({...result['datecollected'][ele], date: ele});
                }
                result['datecollected'] = datecollected.length ? datecollected : result['datecollected'];
            }
            if(result['currentteam']){
                let datecollected = [];
                for(let ele of Object.keys(result['currentteam']['datecollected'])){
                    datecollected.push({...result['currentteam']['datecollected'][ele], date: ele});
                }
                result['currentteam']['datecollected'] = datecollected.length ? datecollected : result['currentteam']['datecollected'];
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    async BiometricFootballChallenge(schedule: any, req: Request, show_type = 1){
        try{
            let result = Object.create(null);
            req.tokenUser = JSON.parse(JSON.stringify(req.tokenUser));
            let userId = req.tokenUser?.id;
            let schedule_id = schedule['sc']['id'];
            let orgId = schedule['sc']['org_id'];
            let yard = schedule?.sc?.yard;
            result.touchdown ,result.totalweightlossinpound ,result.lastweight ,result.weightdiff , result.secondlastweight , result.totalweightloss = 0;
            result.bteamid , result.bteamname , result.created_by , result.minutes ,result.bio_weight= '';
            result.userweight=[]
            
            let myGroupID: any = '';
            let myTeamID: any = '';
            if (schedule['sc']['team'] == 1) {
                const allgetteams: any = await this.teamsService.getAllTeams(`team.org_id = ${orgId} AND team.schedule_id = ${schedule_id}`);
                let groupId = 0;
                let teamId = 0;
                let allTeams = Object.create(null);
                let allgroups = Object.create(null);
                let topusers = Object.create(null);
                let j = 0
                for (const [key, getteam] of allgetteams.entries()){
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                    }
                    let teamcreatedBy = 0;
                    groupId = getteam['group_id'];
                    teamId = getteam['id'];
                    teamcreatedBy = getteam['created_by'];
            
                    if (!allTeams['Teams']) {
                        allTeams['Teams'] = Object.create(null);
                    }
                    if (!allTeams['Teams'][teamId]) {
                        allTeams['Teams'][teamId] = Object.create(null);
                    }
                    if (!result['myTeamDetails']) {
                        result['myTeamDetails'] = Object.create(null);
                    }
            
                    let teamName = await this.translatorService.frontendReadTranslation(req.lang, `team_name_${schedule_id}_${teamId}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgId}/${schedule_id}`, `dynamic`);
                    teamName = (teamName == '' || teamName == `team_name_${schedule_id}_${teamId}`) ? getteam['tname'] : teamName;
                    getteam['tname'] = teamName;
                    let icons = getteam['logo'];
                    if (icons?.length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                        let iconimages = icons;
                        getteam['logo'] = S3_URL + iconimages;
                    } else {
                        getteam['logo'] = this.commonService.getIconPath(icons, S3_URL);
                    }
                    allTeams['Teams'][teamId] = getteam;
                    if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                        if (!allgroups['Groups']) {
                            allgroups['Groups'] = Object.create(null);
                        }
                        if (!allgroups['Groups'][groupId]) {
                            allgroups['Groups'][groupId] = Object.create(null);
                        }
                        allgroups['Groups'][groupId]['group_id'] = groupId;
                        allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                        allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                    }
                    if (getteam['teamMember'] && getteam['teamMember']?.length > 0) {
                        let allUsersIdArray = getteam['teamMember'].map(member => member['user']?.id).filter(id => id); 
                        const allUsersId: any = allUsersIdArray.join(',');                  
                        if (allUsersIdArray.includes(userId)) {
                            myTeamID = teamId;
                            myGroupID = groupId;
                            result['bteamid'] = teamId;
                            result['bteamname'] = getteam['tname'];
                            result['created_by'] = getteam['created_by'];
                            result['myTeamDetails']['id'] = teamId;
                            result['myTeamDetails']['group_id'] = myGroupID;
                            result['myTeamDetails']['tname'] = getteam['tname'];
                            result['myTeamDetails']['created_by'] = getteam['created_by'];
                            result['myTeamDetails']['created_date'] = getteam['created_date'];
                            result['myTeamDetails']['is_team'] = '1';
                            result['myTeamDetails']['logo'] = getteam['logo'];
                            result['myTeamDetails']['team_size'] = getteam['team_size'];
                        }
                        if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                            if(schedule.in_ranking == 0){
                                allgroups['Groups'][groupId]['show_group']= 1;
                            }
                            else if (schedule.in_ranking == 1 && myGroupID && myGroupID == groupId){
                                allgroups['Groups'][groupId]['show_group']= 1;
                            }
                            else{
                                allgroups['Groups'][groupId]['show_group']= 0;
                            }
                        }
                        let Allbioweightdatas = await this.bioWeightService.listRecord(
                            `weight.user_id IN (${allUsersId}) AND weight.schedule_id = ${schedule_id} AND weight.status =1`, 
                            { 'weight.added_date': 'DESC', 'weight.id': 'DESC' }
                        );
                        if (schedule.sc.s_rangestartdate && schedule.sc.s_rangeenddate) {
                            let range_startDate = schedule['sc']['rangestartdate'];
                            let range_endDate = this.commonDateService.getTodayDate(schedule['sc']['rangeenddate']).add(1, 'days').format('YYYY-MM-DD hh:mm:ss');
                            let s_range_startDate = schedule['sc']['s_rangestartdate'];
                            let s_range_endDate = this.commonDateService.getTodayDate(schedule['sc']['s_rangeenddate']).add(1, 'days').format('YYYY-MM-DD hh:mm:ss');
                            Allbioweightdatas = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule_id} AND weight.status = 1 AND ((weight.added_date BETWEEN '${range_startDate}' AND '${range_endDate}') OR (weight.added_date BETWEEN '${s_range_startDate}' AND '${s_range_endDate}') )`,
                                {'weight.added_date': 'DESC', 'weight.id': 'DESC'},
                                ['weight.id','weight.user_id','weight.weight','weight.schedule_id','weight.schedule_join_id','weight.created_date','weight.modified_date','weight.added_date']
                            );
                        } 
                        
                        let bioweightuserss = {};
                        if (Allbioweightdatas.length > 0) {
                            bioweightuserss = Allbioweightdatas.reduce((acc, item) => {
                                const userId = item.user_id;
                                if (!acc[userId]) {
                                    acc[userId] = []; 
                                }
                                acc[userId].push(item);
                                return acc;
                            }, {});
                        }
                        if (bioweightuserss[userId] && Object.keys(bioweightuserss[userId]).length > 0) {
                            result.userweight = bioweightuserss[userId];
                        }
                        let totalweightloss = 0;
                        let teammemberscore = [];
                        let usersindividulweight = {};
                        let keyM = 0;
                        for (let getMember of getteam['teamMember']) {
                            let teamuserid = getMember.user.id;
                            if (getMember['user'] && getMember['user']['profile_image'] && getMember['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: getMember['user']['profile_image']}))) {
                                getMember['user']['profile_image'] = S3_URL + getMember['user']['profile_image'];
                            }
                            else{
                                getMember['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                            }
                            getMember['user']['name'] = '';
                            if(getMember?.department && req?.lang != 'eng'){
                                let deptName = await this.translatorService.frontendReadTranslation(req.lang,`department_name_${getMember?.department?.id}`, `/LC_MESSAGES/OrgAdmin/Department/${orgId}/${getMember?.department?.id}`,`dynamic`);
                                getMember.department['dept_name'] = (deptName == '' || deptName == `department_name_${getMember?.department?.id}`) ? getMember?.department?.dept_name : deptName;
                            }
                            if(getMember?.locations && req?.lang != 'eng'){
                                if (getMember?.locations.location_name) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.location_name = (customName == '' || customName == `location_name_${getMember?.locations['id']}`) ? getMember?.locations['location_name'] : customName;
                                }
                                if (getMember?.locations.address1) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.address1 = (customName == '' || customName == `location_address1_${getMember?.locations['id']}`) ? getMember?.locations['address1'] : customName;
                                }
                                if (getMember?.locations.address2) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.address2 = (customName == '' || customName == `location_address2_${getMember?.locations['id']}`) ? getMember?.locations['address2'] : customName;
                                }
                                if (getMember?.locations.lname) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.lname = (customName == '' || customName == `location_lname_${getMember?.locations['id']}`) ? getMember?.locations['lname'] : customName;
                                }
                                if (getMember?.locations.city) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.city = (customName == '' || customName == `location_city_${getMember?.locations['id']}`) ? getMember?.locations['city'] : customName;
                                }
                                if (getMember?.locations.state) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.state = (customName == '' || customName == `location_state_${getMember?.locations['id']}`) ? getMember?.locations['state'] : customName;
                                }
                                if (getMember?.locations.country) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.country = (customName == '' || customName == `location_country_${getMember?.locations['id']}`) ? getMember?.locations['country'] : customName;
                                }
                            }
                            if (getMember['user'] && (getMember['user']['first_name'] && getMember['user']['last_name'])) {
                                getMember['user']['name'] = getMember['user']['first_name'] + ' '+ getMember['user']['last_name'];
                                delete(getMember['user']['first_name']);
                                delete(getMember['user']['last_name']);
                            }
                            getMember['in_ranking'] = getMember?.['scheduleJoin']?.in_ranking || 0;
                            getMember['is_captain'] = getMember?.iscaptain;
                            getMember['userdetail'] = getMember['user'];
                            delete(getMember['user']);
                            if (bioweightuserss[teamuserid]) {
                                let bioWeightArray = []; 
                                if (!Array.isArray(bioweightuserss[teamuserid])) {
                                    bioWeightArray = Object.values(bioweightuserss[teamuserid]);
                                } else {
                                    bioWeightArray = bioweightuserss[teamuserid];
                                }
                                let firstweightarr = bioWeightArray.pop();
                                // ZOMO-2747
                                if(bioWeightArray.length == 1){
                                    if(bioWeightArray[0]['added_date'] == firstweightarr['added_date']){
                                        bioWeightArray = [firstweightarr];
                                        firstweightarr = [];
                                    }
                                }
                                // ZOMO-2747
                                let firstweight = firstweightarr ? firstweightarr['weight'] || 0 : 0;
                                let lastweight = bioWeightArray.length > 0 ? bioWeightArray[0]['weight'] || 0 : 0;
                                let diffweight = firstweight - lastweight;
                                if (bioweightuserss[teamuserid] && Object.keys(bioweightuserss[teamuserid]).length < 1) {
                                    diffweight = 0;
                                }
                                if (diffweight <= 0) diffweight = 0;
                                getMember['uweightloss'] = diffweight;
                                let weightloosper = 0;
                                if(diffweight != 0){
                                    weightloosper = (firstweight != 0) ? parseFloat(((diffweight*100)/firstweight).toFixed(3)) : 0;
                                }
                                getMember['weightloosper'] = weightloosper;
                                totalweightloss = totalweightloss + diffweight;
                                totalweightloss = parseFloat(totalweightloss.toFixed(2))
                                let userscore = diffweight * yard;
                                getMember.score = Math.round(userscore);
                                teammemberscore.push(getMember);
                                if (teamuserid != null) {
                                    if (!topusers[teamuserid]) {
                                        topusers[teamuserid] = Object.create(null);
                                    }
                                } 
                                topusers[teamuserid]['id'] = getMember['userdetail']['id'];
                                topusers[teamuserid]['name'] = getMember['userdetail']['name'];
                                topusers[teamuserid]['profile_image'] = getMember['userdetail']['profile_image'];
                                topusers[teamuserid]['tname'] = teamName;
                                topusers[teamuserid]['touchdown'] = Number(((diffweight * yard) / 100).toFixed(2));
                                topusers[teamuserid]['score'] = getMember.score;
                                getMember['touchdown'] = Number((getMember.score / 100).toFixed(2));
                                if (teamuserid === userId) {
                                    result.lastweight = lastweight;
                                    result.weightdiff = diffweight > 0 ? `+${diffweight.toFixed(2)}` : `${diffweight.toFixed(2)}`;
                                    if (diffweight !== 0) {
                                        const calculatedDiff = lastweight - firstweight;
                                        result.weightdiff = calculatedDiff > 0 ? `+${calculatedDiff.toFixed(2)}` : `${calculatedDiff.toFixed(2)}`;
                                    }
                                    result.secondlastweight = firstweight;
                                    result.mypoundlost = diffweight;
                                }
                                if (result.bteamid == teamId) {    
                                    usersindividulweight[teamuserid] = (yard != 0 ? (diffweight / yard) : 0).toFixed(2);
                                }
                            }
                            keyM++;
                        }
                        if (Object.keys(usersindividulweight).length > 0) {
                            result.usersindividulweight = usersindividulweight;
                        }
                        if (result.bteamid == teamId) {
                            result.totalweightlossinpound = totalweightloss;
                            result.totalweightloss = (totalweightloss * yard) % 100;
                            result.touchdown = Math.floor((totalweightloss * yard) / 100);
                        }
                        totalweightloss *= yard;
                        if (schedule.sc.group_status == 1 && groupId != 0) {
                            if (!allTeams['Teams'][key]) {
                                allTeams['Teams'][key] = Object.create(null);
                            }
                            allTeams['Teams'][key]['weightloss'] = Number((totalweightloss / yard).toFixed(2));
                            allTeams['Teams'][key]['touchdown'] = Math.floor((totalweightloss / 100));
                        }
                        allTeams['Teams'][teamId]['weightloss'] = Number((totalweightloss / yard).toFixed(2));
                        allTeams['Teams'][teamId]['touchdown'] = Math.floor((totalweightloss / 100));
                        allTeams['Teams'][teamId]['score'] = allTeams['Teams'][teamId]['teamMember']?.reduce((sum, item) => {
                            return sum + (item?.score ?? 0);
                        }, 0);
                        if (allUsersIdArray.includes(userId)) {
                            result['myTeamDetails']['teamMember'] = allTeams['Teams'][teamId]['teamMember'];
                        }
                        j++
                    }
                }
                if (result.created_by && result.created_by === userId) {
                    result.team_exist = 'yes';
                }
                let sortedTeams = [];
                if (allTeams['Teams']) {
                    if (schedule['sc']['rank_type'] == "weight_loss_per") {
                        sortedTeams = this.teamsService.sortTeamsByOnField(allTeams['Teams'], 'touchdown');
                    } else {
                        sortedTeams = this.teamsService.sortTeamsByOnField(allTeams['Teams'], 'weightloss');
                    }
                }
                let sortedGroups = [];
                if (allgroups['Groups']) {
                    if (schedule['sc']['rank_type'] == "weight_loss_per") {
                        sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'], 'touchdown');
                    } else {
                        sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'], 'weightloss');
                    }
                }
                if (sortedGroups) {
                    for (let groupKey in sortedGroups) {
                        let gID = sortedGroups[groupKey]['group_id'];
                        let groupName = await this.translatorService.frontendReadTranslation(req.lang, `group_name_${schedule_id}_${gID}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgId}/${schedule_id}`, `dynamic`);
                        groupName = (groupName == '' || groupName == `group_name_${schedule_id}_${gID}`) ? sortedGroups[groupKey]['name'] : groupName;
                        sortedGroups[groupKey]['name'] = groupName;
                        let icons = sortedGroups[groupKey]['logo'];
                        if (icons?.length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                            let iconimages = icons;
                            sortedGroups[groupKey]['logo'] = S3_URL + iconimages;
                        } else {
                            sortedGroups[groupKey]['logo'] = this.commonService.getIconPath(icons, S3_URL);
                        }
                    }
                }
                if (sortedTeams && sortedTeams.length > 0 && show_type == 1) {
                    result['allteams'] = sortedTeams;
                }
                if (sortedGroups && sortedGroups.length > 0 && show_type == 1) {
                    result['allgroups'] = sortedGroups;
                }
                if(topusers && Object.keys(topusers).length > 0){
                    if (schedule['sc']['rank_type'] == "weight_loss_per") {
                        topusers = Object.values(topusers).sort((a, b) => b['touchdown'] - a['touchdown']);
                    } else {
                        topusers = Object.values(topusers).sort((a, b) => b['score'] - a['score']);
                    }
                }
                if (topusers.length >= 10) {
                    topusers = topusers.slice(0, 10);
                }
                if(topusers && topusers.length > 0){
                    result['toptenusers'] = topusers;
                }
                let bio_weight_array = await this.bioWeightService.listRecord({
                    schedule_id: schedule_id,
                    user_id: userId,
                    status: 1
                }, { 'weight.added_date': 'DESC', 'weight.id': 'DESC' });
                
                result['bio_weight']=bio_weight_array
            }
            if(show_type == 2){
                if(result && result?.['myTeamDetails'] && result?.['myTeamDetails']?.['teamMember'] && result?.['myTeamDetails']?.['teamMember'].length > 0){
                    const matchedMember = result['myTeamDetails']['teamMember'].find(
                        (member) => member.user_id === userId
                    );
                    if (matchedMember) {
                        if (!result['userData']) {
                            result['userData'] = Object.create(null);
                        }
                        result['userData'] = matchedMember;
                        result['userData']['touchdown'] = Math.floor((result['userData']['score'] / 100)) || 0
                    }
                }
                if(result['userData']){
                    delete(result['userData']['scheduleJoin'])
                }
                if(result['myTeamDetails']){
                    delete(result['myTeamDetails']);
                }
                if(result['toptenusers']){
                    delete(result['toptenusers']);
                }
                if(result['bio_weight']){
                    delete(result['bio_weight']);
                }
                if(result['userweight']){
                    delete(result['userweight'])
                }
                if(result['usersindividulweight']){
                    delete(result['usersindividulweight'])
                }
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

}