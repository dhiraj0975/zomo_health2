import { CommonDateService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { AssessmentsService } from "src/modules/healthassessment/assessments/assessments.service";
import { AuthorizationsService } from "src/modules/healthcheckup/authorizations/authorizations.service";
import { BiometricsService } from "src/modules/healthcheckup/biometrics/biometrics.service";
import { TobaccoUsesService } from "src/modules/healthcheckup/tobaccouses/tobaccouses.service";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { ActivityFeedService } from "src/modules/trackers/activityfeeds/activityfeeds.service";
import { FoodFeedService } from "src/modules/trackers/foodfeeds/foodfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { DaysUsersService } from "../../daysusers/daysusers.service";
import { ScheduleChallengeJoinUsersService } from "../../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { WeeksService } from "../../weeks/weeks.service";
import { WeeksUsersService } from "../../weeksusers/weeksusers.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class HealthHabbitChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonDateService: CommonDateService,
        private readonly biometricsService: BiometricsService,
        private readonly weeksUsersService: WeeksUsersService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly foodFeedsService: FoodFeedService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly assessmentsService: AssessmentsService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly weeksService: WeeksService,
        private readonly daysUsersService: DaysUsersService,
        private readonly activityLogService: ActivityLogService,
    ) {}

       async healthyHabitChallengeCheck(schedule: any, req: Request) {
        try{
            let schedule_id = schedule['sc']['id'];
            let challenge_id = schedule['sc']['challenge_id'];
            let scheduleuserid = schedule['id'];
            let user = Object.create(req.tokenUser);
            let weeks = await this.weeksService.listRecordHealthyHabit({challenge_id: challenge_id},null,user.id,challenge_id,scheduleuserid,);
            let current_datetime = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',user['timeZone']);
            let dataenddate = this.commonDateService.getTodayDate(schedule['sc']['start_date']).subtract(1, 'days').format('YYYY-MM-DD');
            let daydataenddate = this.commonDateService.getTodayDate(schedule['sc']['start_date']).subtract(1, 'days').format('YYYY-MM-DD');
            let tempdata;
            for(let dataweeks of weeks){
                if(!dataweeks['weekuser'] || !dataweeks['weekuser']['id'] || dataweeks['weekuser']['id']==''){
                    let datastartdate =  this.commonDateService.getTodayDate(dataenddate).add(1, 'days').format('YYYY-MM-DD');
                    dataenddate =  this.commonDateService.getTodayDate(dataenddate).add(6, 'days').format('YYYY-MM-DD');
                    tempdata = dataweeks;
                    tempdata['schedule_id']=scheduleuserid;
                    tempdata['user_id'] = user.id;
                    tempdata['week_id'] = tempdata['id'];
                    tempdata['start_date'] = datastartdate;
                    tempdata['end_date'] = dataenddate;
                    tempdata['status'] = 0;
                    delete tempdata['id'];
                    let weekUserData = await this.weeksUsersService.save(tempdata)
                    let finalweekid = weekUserData?.['id'];
                }else{
                    dataenddate = dataweeks['weekuser']['end_date'];
                    tempdata = dataweeks;
                }
                for(let datadays of dataweeks['days']){
                    if(!datadays['dayuser'] || !datadays['dayuser']['id'] || datadays['dayuser']['id']==''){
                        let daydatastartdate =  this.commonDateService.getTodayDate(daydataenddate).add(1, 'days').format('YYYY-MM-DD');
                        daydataenddate =  this.commonDateService.getTodayDate(daydataenddate).add(2, 'days').format('YYYY-MM-DD');
                        let tempdata2 = datadays;
                        tempdata2['schedule_id']=scheduleuserid;
                        tempdata2['user_id'] = user.id;
                        tempdata2['day_id'] = tempdata2['id'];
                        tempdata2['start_date'] = daydatastartdate;
                        tempdata2['end_date'] = daydataenddate;
                        tempdata2['status'] = 0;
                        delete tempdata2['id'];
                        delete tempdata2['dayuser'];
                        await this.daysUsersService.save(tempdata2);
                    }else{
                        daydataenddate = datadays['dayuser']['end_date'];
                    }
                }
            }
            return true;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    async healthyHabitChallenge(schedule: any, req: Request, show_type = 1) {
        try {       
            let result = {};
            let user = Object.create(req.tokenUser);
            let schedule_id = schedule['sc']['id'];
            let id = schedule['sc']['challenge_id'];
            let scheduleEndDate = schedule['sc']['end_date'];
            let scheduleid = schedule['id'];
            let requirementBased = schedule['ch']['requirementbased'];
            let totalweekactivities = schedule['sc']['enteratotalactivity'] ?? 0;
            let current_datetime = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',user['timeZone']);
            let weeks = await this.scheduleChallengeJoinUsersService.healthyHabbitAllActivity(
                `scj.challenge_id=${id} AND scj.schedule_id=${schedule_id} AND scj.user_id=${user.id}`
            );  
            if(weeks.length){
                let weekTrans = await this.translatorService.frontendReadTranslation( req.lang, 'Week', `/LC_MESSAGES/Challenge/MyChallenges`, `static`);
                let week = 1;
                for (const ele of weeks) {
                    let translationMessage = await this.translatorService.readTranslation(
                        req.lang || 'eng',
                        `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}/dynamic.json`
                    );
                    if (!translationMessage) {
                        translationMessage = await this.translatorService.readTranslation(
                            'eng',
                            `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}/dynamic.json`
                        );
                    }
                    if (ele.weeks_manual_activity) {
                        const customName = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            `week_activity_name_${ele['challenge_id']}_${ele['week_id']}`,
                            `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,
                            `dynamic`
                        );
                        if (customName !== `week_activity_name_${ele['challenge_id']}_${ele['week_id']}`) {
                            ele.weeks_manual_activity = customName;
                        }
                    }
                    if (ele.weeks_site_activity_desc) {
                        const customName = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            `week_activity_description_${ele['challenge_id']}_${ele['week_id']}`,
                            `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,
                            `dynamic`
                        );
                        if (customName !== `week_activity_description_${ele['challenge_id']}_${ele['week_id']}`) {
                            ele.weeks_site_activity_desc = customName;
                        }
                    }
                    if (ele.weeks_manual_desc) {
                        const customName = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            `week_description_${ele['challenge_id']}_${ele['week_id']}`,
                            `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,
                            `dynamic`
                        );
                        if (customName !== `week_description_${ele['challenge_id']}_${ele['week_id']}`) {
                            ele.weeks_manual_desc = customName;
                        }
                    }
                    if (ele?.weeks_tabmanual) {
                        const customName = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            `week_tabmanual_${ele['challenge_id']}_${ele['week_id']}`,
                            `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,
                            `dynamic`
                        );
                        if (customName !== `week_tabmanual_${ele['challenge_id']}_${ele['week_id']}`) {
                            ele.weeks_tabmanual = customName;
                        }
                    } else {
                        if (!ele?.weeks_tabmanual || ele?.weeks_tabmanual === '') {
                            ele.weeks_tabmanual = `${weekTrans}${week}`;
                        }
                    }
                    ele['ac'] = { id: ele.ac_id, activity_name: ele.ac_activity_name };
                    ele['weeks'] = {
                        logofile: ele?.weeks_logofile ? S3_URL + ele.weeks_logofile : schedule['challengeDetails']['custom_logo'],
                        manual_activity: ele.weeks_manual_activity,
                        manual_desc: ele.weeks_manual_desc,
                        site_activity_desc: ele.weeks_site_activity_desc,
                        tabmanual: ele.weeks_tabmanual,
                    };
                    week = week + 1;
                }
            }         

            result['all'] = weeks;
            let completedweeks = 0;
            let totaldays = 0;
            result['totaladdedweekcomp'] = 0;
            let totalweeks = weeks?.length; 
            result['totaladdedweek'] = weeks?.length;   
            let date_validation_setting = schedule['sc']['date_validation_setting'];
            let start_date_schedule = schedule['sc']['start_date'];
            let end_date_schedule = schedule['sc']['end_date'];
            let completeddays = 0;
            let CustomtotalWeekpercantage = (100/totalweeks);
            let CustomtotalWeekpercantageComplete = 0;
            let dataentryarray = [];
            if(schedule['ch']['requirementbased']==1 && schedule['ch']['numberofweek'] != 0){
                totalweeks = result['totaladdedweek'] = schedule['ch']['numberofweek'];
                CustomtotalWeekpercantage = (100/totalweeks);
            }
            let numberofweek = schedule['ch']['numberofweek'];
            let numberofday = (schedule['ch']['numberofday']=='' || schedule['ch']['numberofday']==0) ? 1 : schedule['ch']['numberofday'];
            result['numberofweek'] = numberofweek;
            result['numberofday'] = numberofday;            
            for (let i = 0; i < weeks.length; i++) {
                let wid = weeks[i]['week_id'];
                weeks[i]['status_act'] = 0;
                weeks[i]['notcompleted'] = 0;
                if (weeks[i]?.['ac']?.['activity_name'] && weeks[i]['ac']['activity_name'].trim() != "") {
                    let weekstart_date = weeks[i]['start_date'];
                    let weekend_date = weeks[i]['end_date'];
                    let actname = weeks[i]['ac']['activity_name'].replace(/ /g, '_').replace(/\(/g, '').replace(/\)/g, '').toLowerCase();
                    let datewherecondition = "";
                    let activity_id = weeks[i]['activity_id'];

                    if (actname == "health_risk_assessment") {
                        if (date_validation_setting == "Yes") {
                            datewherecondition = ` AND(healthassessment.date BETWEEN '${this.commonDateService.getTodayDate(weekstart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(weekend_date).format('YYYY-MM-DD')} 23:59:59')`;
                        } 
                        let healthdata = await this.assessmentsService.listRecord(`healthassessment.user_id = ${user.id} AND healthassessment.activity_id = ${activity_id} AND healthassessment.status != 2 ${datewherecondition}`,{'healthassessment.date': 'DESC'});

                        if (healthdata.length >= 1) {
                            weeks[i]['status_act'] = 1;
                            weeks[i]['activitydetail'] = healthdata;
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }

                    if (actname == "activity_tracker-_walking" || actname == "activity_tracker-_running" || actname == "activity_tracker-_cycling" || actname == "activity_tracker-_swimming") {
                        if (date_validation_setting == "Yes") {
                            datewherecondition = ` AND(healthassessment.date BETWEEN '${this.commonDateService.getTodayDate(weekstart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(weekend_date).format('YYYY-MM-DD')} 23:59:59')`;
                        }
                        let data = await this.activityFeedsService.listRecord(`food.user_id in (${user.id}) AND (food.activityTypeId = ${activity_id} OR appName='AppleHealthKit' OR appName='GoogleFit') ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});
                        if (data.length >= 1) {
                            let mstep = weeks[i]['steps'];
                            let mduration = weeks[i]['duration'];
                            let mdistance = weeks[i]['distance'];
                            let mcalories = weeks[i]['calories'];

                            let calories = data[0]['calories'];
                            let distance = data[0]['distance'];
                            let steps = data[0]['steps'];
                            let duration = data[0]['duration'];
                            if (actname == "activity_tracker-_walking") {
                                    if (mstep <= steps && mduration <= duration && mdistance <= distance && mcalories <= calories) {
                                        weeks[i]['status_act'] = 1;
                                    } else {
                                        weeks[i]['notcompleted'] = 1;
                                    }
                            }
                            if (actname == "activity_tracker-_running" || actname == "activity_tracker-_cycling" || actname == "activity_tracker-_swimming") {
                                    if (mduration <= duration && mdistance <= distance && mcalories <= calories) {
                                        weeks[i]['notcompleted'] = 1;
                                    } else {
                                        weeks[i]['notcompleted'] = 1;
                                    }
                            }
                            weeks[i]['activitydetail'] = data[0];
                        }
                    }

                    if (actname == "water_tracker") {
                        if (date_validation_setting == "Yes") {
                            datewherecondition = ` AND(food.timestamp BETWEEN '${this.commonDateService.getTodayDate(weekstart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(weekend_date).format('YYYY-MM-DD')} 23:59:59')`;
                        }
                        let waterdata = await this.foodFeedsService.listRecord(`food.user_id = ${user.id} AND food.activityTypeId = ${activity_id}  ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});
                        let mwaterlogunit = weeks[i]['waterlogunit'];
                        let mamount = weeks[i]['amount'];

                        if (waterdata.length >= 1) {
                            let waterlogunit = waterdata[0]['foodUnit'];
                            let amount = waterdata[0]['amount'];
                            weeks[i]['activitydetail'] = waterdata[0];
                            if (mwaterlogunit <= waterlogunit && mamount <= amount) {
                                    weeks[i]['status_act'] = 1;
                            } else {
                                    weeks[i]['notcompleted'] = 1;
                            }
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }

                    if (actname == "food_tracker") {
                        if (date_validation_setting == "Yes") {
                            datewherecondition = ` AND(food.timestamp BETWEEN '${this.commonDateService.getTodayDate(weekstart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(weekend_date).format('YYYY-MM-DD')} 23:59:59')`;
                        }
                        let mmeal;
                        let meal = weeks[i]['meal'];
                        if (meal == "Breakfast") {
                            mmeal = 1;
                        } else if (meal == "Lunch") {
                            mmeal = 3;
                        } else if (meal == "Snack") {
                            mmeal = 4;
                        } else if (meal == "Dinner") {
                            mmeal = 5;
                        } else {
                            mmeal = 6;
                        }
                        let mquantity = weeks[i]['quantity'];
                        let fooddata = await this.foodFeedsService.listRecord(`food.user_id = ${user.id} AND food.activityTypeId = ${activity_id} ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});

                        if (fooddata.length >= 1) {
                            let meal = fooddata[0]['mealTypeId'];
                            let quantity = fooddata[0]['amount'];
                            weeks[i]['activitydetail'] = fooddata[0];
                            if (mmeal == meal && mquantity <= quantity) {
                                    weeks[i]['status_act'] = 1;
                            } else {
                                    weeks[i]['notcompleted'] = 1;
                            }
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }

                    if (actname == "blood_pressure" || actname == "bmi" || actname == "total_cholesterol" || actname == "hdl" || actname == "triglycerides" || actname == "blood_pressure" || actname == "ldl" || actname == "glucose_or_ac1") {
                        if (date_validation_setting == "Yes") {
                            datewherecondition = ` AND(hb.created BETWEEN '${this.commonDateService.getTodayDate(weekstart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(weekend_date).format('YYYY-MM-DD')} 23:59:59')`;
                        }
                        let biodata = await this.biometricsService.biometricsListRecord(
                            `hb.user_id = ${user.id} AND hb.status !=2
                            AND(
                                activity_id REGEXP '^${activity_id},' OR
                                activity_id REGEXP ',${activity_id}$' OR
                                activity_id REGEXP ',${activity_id},' OR
                                activity_id = ${activity_id} 
                                )
                            ${datewherecondition}
                            `
                            ,['hb.created'])?.[0];
                        if (biodata) {
                            weeks[i]['activitydetail'] = biodata;
                            weeks[i]['status_act'] = 1;
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }

                    if (actname == "physician_form" || actname == "dental_visit_form" || actname == "optometrist_form") {
                        if (date_validation_setting == "Yes") {
                            datewherecondition = ` AND(a.updated BETWEEN '${this.commonDateService.getTodayDate(weekstart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(weekend_date).format('YYYY-MM-DD')} 23:59:59')`;
                        }
                        let formdata = await this.authorizationsService.listRecord(`a.user_id = ${user.id} AND a.status != 2 AND a.activity_id = ${activity_id} ${datewherecondition}`,null,{'a.updated': 'DESC'})
                        if (formdata.length >= 1) {
                            weeks[i]['activitydetail'] = formdata[0];
                            weeks[i]['status_act'] = 1;
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }
                    if (actname == "tobacco_affidavit") {
                        if (date_validation_setting == "Yes") {
                            datewherecondition = ` AND(tu.updated BETWEEN '${this.commonDateService.getTodayDate(weekstart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(weekend_date).format('YYYY-MM-DD')} 23:59:59')`;
                        }
                        let tformdata = await this.tobaccoUsesService.listRecord(`tu.user_id = ${user.id} AND tu.activity_id = ${activity_id} AND tu.status != 2 ${datewherecondition}`,null,{'tu.updated': 'DESC'})
                        if (tformdata.length >= 1) {
                            weeks[i]['activitydetail'] = tformdata[0];
                            weeks[i]['status_act'] = 1;
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }
                }
                if (weeks[i]['status'] == 1 || weeks[i]['status_act'] == 1) {                   
                    completedweeks++;
                    if(schedule['ch']['requirementbased']==1){
                        CustomtotalWeekpercantageComplete += CustomtotalWeekpercantage;
                        dataentryarray[weeks[i]['week_id']] = weeks[i]['week_id'];
                    }else{
                        CustomtotalWeekpercantageComplete += CustomtotalWeekpercantage;
                    }
                    result['totaladdedweekcomp']++;
                }            
                let days = await this.daysUsersService.listRecord(`du.week_id = ${wid} AND du.challenge_id = ${id} AND du.schedule_id = ${scheduleid} AND du.user_id = ${user.id} AND du.status != 2`,
                    {day_id : 'ASC'},
                    ['du','ac.activity_name','days.site_activity_desc','days.manual_activity','days.manual_desc','days.logofile','days.manuallink','days.m_long','days.m_yesno','days.m_short','days.m_numeric']);
                result['all'][i] = weeks[i];
                totaldays = days?.length;
                let d = days;
                if(days.length){
                    for(let ele of days){
                        let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}/dynamic.json`);
                        if(!translationMessage){
                            translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}/dynamic.json`);
                        }

                        const getTranslation = (prefix, fallback) => {
                            const key = `${prefix}_${ele.challenge_id}_${ele.week_id}_${ele.day_id}`;
                            const translation = translationMessage.find(item => item.type === key);
                            return translation?.translate || fallback;
                        };

                        if(ele.manual_activity){
                            ele.manual_activity = getTranslation('week_days_activity_name', ele.manual_activity);
                        }

                        if(ele.site_activity_desc){
                            ele.site_activity_desc = getTranslation('week_days_activity_description', ele.site_activity_desc);
                        }

                        if(ele.manual_desc){
                            ele.manual_desc = getTranslation('week_days_description', ele.manual_desc);
                        }

                        if(ele['days']){
                            if(ele['days'].manual_activity){
                                ele['days'].manual_activity = getTranslation('week_days_activity_name', ele['days'].manual_activity);
                            }

                            if(ele['days'].site_activity_desc){
                                ele['days'].site_activity_desc = getTranslation('week_days_activity_description', ele['days'].site_activity_desc);
                            }

                            if(ele['days'].manual_desc){
                                ele['days'].manual_desc = getTranslation('week_days_description', ele['days'].manual_desc);
                            }
                        }
                    }
                    result['all'][i]['weekdaystotal'] = totaldays;
                    result['all'][i]['weekdaystotalcomp'] = 0;
                }
                else{
                   weeks[i]['complete'] = false;
                }
                result['all'][i]['Total'] = numberofday;
                result['all'][i]['Progress'] = CustomtotalWeekpercantage;            
                let disableactivitytempweek = '';
                let timezone = user['timeZone'] ? user['timeZone'].trim() : 'UTC';
                weeks[i]['start_date_comp'] = weeks[i]['start_date'];
                if(timezone.trim() != ""){
                    if(timezone.trim() == "Pacific Standard Time (PST)"){
                        timezone = "America/Los_Angeles";
                    }
                    if(timezone.trim() == "Mountain Standard Time (MST)"){
                        timezone = "America/Denver";
                    }
                    if(timezone.trim() == "Central Standard Time (CST)"){
                        timezone = "America/Chicago";
                    }
                    if(timezone.trim() == "Eastern Standard Time (EST)"){
                        timezone = "America/New_York";
                    } 
                    let startDate = moment.tz(moment(weeks[i]['start_date']).format('YYYY-MM-DD') +' '+ moment(result['all'][0]['start_date']).format('HH:mm:ss'), 'YYYY-MM-DD HH:mm:ss', timezone);  
                    startDate = timezone != 'UTC' ? startDate.tz('UTC').format('YYYY-MM-DD HH:mm:ss') : startDate.format('YYYY-MM-DD HH:mm:ss'); 
                    weeks[i]['start_date_comp'] = startDate;                                                
                } 
                if(schedule['sc']['enable_week_log']==1 && this.commonDateService.getTodayDate(moment(current_datetime).format('YYYY-MM-DD')).unix() < this.commonDateService.getTodayDate(moment(weeks[i]['start_date_comp']).format('YYYY-MM-DD')).unix() ){ disableactivitytempweek = 'disabled="disabled"'; }
                if(schedule['ch']['requirementbased']==1 && this.commonDateService.getTodayDate(moment(current_datetime).format('YYYY-MM-DD')).unix() < this.commonDateService.getTodayDate(moment(weeks[i]['start_date_comp']).format('YYYY-MM-DD')).unix() ){ disableactivitytempweek = 'disabled="disabled"'; }

                let weekStartedStatus = 'yes';
                let showButtonStatus = '';
                if(this.commonDateService.getTodayDate(current_datetime).unix() <= this.commonDateService.getTodayDate(weeks[i]['start_date_comp']).unix()){
                    showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Week Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    weekStartedStatus = 'no';
                }
                let challengeEndDate = scheduleEndDate;
                for (let j = 0; j < d.length; j++) {                
                    if(d[j]['days'] && d[j]['days']['logofile'] && (d[j]['days']['logofile'].includes('chday') || d[j]['days']['logofile'].includes('challenge'))){
                        d[j]['days']['logofile'] = S3_URL + d[j]['days']['logofile']
                    }
                    let did = d[j]['day_id'];

                    //buttom condition start
                    let showButton = (weekStartedStatus == 'yes') ? 'yes' : 'no';
                    let complete = false;
                    if(schedule['sc']['enable_week_log'] == 1){
                        challengeEndDate = moment(moment(scheduleEndDate).format('YYYY-MM-DD') + ' 23:59:59').add(7, 'days').format('YYYY-MM-DD HH:mm:ss')
                    }
                    if(this.commonDateService.getTodayDate(current_datetime).unix() >= this.commonDateService.getTodayDate(challengeEndDate).unix()){
                        showButton = 'no'; 
                        showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Challenge has ended', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    }

                    let disableactivitytemp = '';
                    let timezoneUser = user['timeZone'] ? user['timeZone'].trim() : '';                    
                    if(timezoneUser.trim() != ""){
                        if(timezone.trim() == "Pacific Standard Time (PST)"){
                            timezone = "America/Los_Angeles";
                        }
                        if(timezone.trim() == "Mountain Standard Time (MST)"){
                            timezone = "America/Denver";
                        }
                        if(timezone.trim() == "Central Standard Time (CST)"){
                            timezone = "America/Chicago";
                        }
                        if(timezone.trim() == "Eastern Standard Time (EST)"){
                            timezone = "America/New_York";
                        } 
                        let startDate = moment.tz(moment(d[j]['start_date']).format('YYYY-MM-DD') +' '+ moment(result['all'][0]['start_date']).format('HH:mm:ss'), 'YYYY-MM-DD HH:mm:ss', timezoneUser);  
                        startDate = timezone != 'UTC' ? startDate.tz('UTC').format('YYYY-MM-DD HH:mm:ss') : startDate.format('YYYY-MM-DD HH:mm:ss'); 
                        d[j]['start_date'] = startDate;                                                
                    }
                    if(schedule['sc']['enable_week_log']==1 && this.commonDateService.getTodayDate(current_datetime).unix() < this.commonDateService.getTodayDate(d[j]['start_date']).unix() ){ disableactivitytemp = 'disabled="disabled"'; }
                    if(schedule['ch']['requirementbased']==1){ 
                        disableactivitytemp = disableactivitytempweek; 
                    }
                    d[j]['buttonText'] = null;
                    if(d[j]['status'] == 0){
                        if (schedule['ch']['requirementbased'] != 1 || weeks[i]['status'] != 1) {
                            if (showButton == 'yes') {
                                complete = false;
                                showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Incomplete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            }
                        }else if(disableactivitytemp=='' || schedule['ch']['requirementbased']!=1){
                            complete = true;
                        }
                        if (disableactivitytemp === '') {
                            if (requirementBased !== 1 || weeks[i]['status'] != 1) {
                                if (showButton === 'yes') {
                                    const lockIs = (schedule['sc']['is_set_weekend'] === 1 && d[j]['linkstatus'] === 0) ? 1 : 0;
                                    d[j]['buttonText'] = await this.translatorService.frontendReadTranslation(req.lang,'Mark As Complete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Incomplete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                }
                            } else {
                                if (disableactivitytemp === '' || requirementBased !== 1) {
                                    d[j]['buttonText'] = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    showButton = 'no';
                                }
                            }
                        }
                    }else{
                        complete = true;
                        if (disableactivitytemp === '' || requirementBased !== 1) {
                            d[j]['buttonText'] = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            showButton = 'no';
                        }
                    }
                    d[j]['m_long'] = d[j]['m_long']?.trim();
                    d[j]['showButton'] = showButton;
                    d[j]['showButtonStatus'] = showButtonStatus;
                    d[j]['complete'] = complete;
                    d[j]['disableactivitytemp'] = disableactivitytemp;
                    d[j]['disableactivitytempweek'] = disableactivitytempweek;
                    weeks[i]['showButton'] = showButton;
                    weeks[i]['complete'] = complete;
                    //buttom condition end

                    d[j]['status_act'] = 0;
                    d[j]['notcompleted'] = 0;
                    if (d[j]?.['ac']?.['activity_name'] && d[j]['ac']['activity_name'] != "") {
                        let daystart_date = d[j]['start_date'];
                        let dayend_date = d[j]['end_date'];
                        let actname = d[j]['ac']['activity_name']
                        .replace(/ /g, '_')
                        .replace(/\(|\)/g, '')
                        .toLowerCase();
                        let datewherecondition = "";
                        let activity_id = d[j]['activity_id'];

                        if (actname == "health_risk_assessment") {
                            if (date_validation_setting == "Yes") {
                                datewherecondition = ` AND(healthassessment.date BETWEEN '${this.commonDateService.getTodayDate(daystart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(dayend_date).format('YYYY-MM-DD')} 23:59:59')`;
                            }
                            let healthdata = await this.assessmentsService.listRecord(`healthassessment.user_id = ${user.id} AND healthassessment.activity_id = ${activity_id} AND healthassessment.status != 2 ${datewherecondition}`,{'healthassessment.date': 'DESC'});
                            if (healthdata.length >= 1) {
                                d[j]['status_act'] = 1;
                                d[j]['activitydetail'] = healthdata;
                            } else {
                                d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "activity_tracker-_walking" || actname == "activity_tracker-_running" || actname == "activity_tracker-_cycling" || actname == "activity_tracker-_swimming") {
                            if (date_validation_setting == "Yes") {
                                datewherecondition = ` AND(food.timestamp BETWEEN '${this.commonDateService.getTodayDate(daystart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(dayend_date).format('YYYY-MM-DD')} 23:59:59')`;
                            }
                            let data = await this.activityFeedsService.listRecord(`food.user_id in (${user.id}) AND (food.activityTypeId = ${activity_id} OR appName='AppleHealthKit' OR appName='GoogleFit') ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});
                            if (data.length >= 1) {
                                let mstep = d[j]['steps'];
                                let mduration = d[j]['duration'];
                                let mdistance = d[j]['distance'];
                                let mcalories = d[j]['calories'];

                                let calories = data[0]['calories'];
                                let distance = data[0]['distance'];
                                let steps = data[0]['steps'];
                                let duration = data[0]['duration'];
                                if (actname == "activity_tracker-_walking") {
                                    if (mstep <= steps && mduration <= duration && mdistance <= distance && mcalories <= calories) {
                                        d[j]['status_act'] = 1;
                                    } else {
                                        d[j]['notcompleted'] = 1;
                                    }
                                }
                                if (actname == "activity_tracker-_running" || actname == "activity_tracker-_cycling" || actname == "activity_tracker-_swimming") {
                                    if (mduration <= duration && mdistance <= distance && mcalories <= calories) {
                                        d[j]['notcompleted'] = 1;
                                    } else {
                                        d[j]['notcompleted'] = 1;
                                    }
                                }
                                d[j]['activitydetail'] = data[0];
                            }
                        }
                        if (actname == "water_tracker") {
                            if (date_validation_setting == "Yes") {
                                datewherecondition = ` AND(food.timestamp BETWEEN '${this.commonDateService.getTodayDate(daystart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(dayend_date).format('YYYY-MM-DD')} 23:59:59')`;
                            }
                            let waterdata = await this.foodFeedsService.listRecord(`food.user_id = ${user.id} AND food.activityTypeId = ${activity_id}  ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});

                            let mwaterlogunit = d[j]['waterlogunit'];
                            let mamount = d[j]['amount'];

                            if (waterdata.length >= 1) {
                                let waterlogunit = waterdata[0]['foodUnit'];
                                let amount = waterdata[0]['amount'];
                                weeks[i]['activitydetail'] = waterdata[0];
                                if (mwaterlogunit <= waterlogunit && mamount <= amount) {
                                        d[j]['status_act'] = 1;
                                } else {
                                        d[j]['notcompleted'] = 1;
                                }
                            } else {
                                d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "food_tracker") {
                            if (date_validation_setting == "Yes") {
                                datewherecondition = ` AND(food.timestamp BETWEEN '${this.commonDateService.getTodayDate(daystart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(dayend_date).format('YYYY-MM-DD')} 23:59:59')`;
                            }
                            let mmeal;
                            let meal = weeks[i]['meal'];
                            if (meal == "Breakfast") {
                                mmeal = 1;
                            } else if (meal == "Lunch") {
                                mmeal = 3;
                            } else if (meal == "Snack") {
                                mmeal = 4;
                            } else if (meal == "Dinner") {
                                mmeal = 5;
                            } else {
                                mmeal = 6;
                            }
                            let mquantity = d[j]['quantity'];
                            let fooddata = await this.foodFeedsService.listRecord(`food.user_id = ${user.id} AND food.activityTypeId = ${activity_id} ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});

                            if (fooddata.length >= 1) {
                                let meal = fooddata[0]['mealTypeId'];
                                let quantity = fooddata[0]['amount'];
                                d[j]['activitydetail'] = fooddata[0];

                                if (mmeal == meal && mquantity <= quantity) {
                                    d[j]['status_act'] = 1;
                                } else {
                                    d[j]['notcompleted'] = 1;
                                }
                            } else {
                                d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "blood_pressure" || actname == "bmi" || actname == "total_cholesterol" || actname == "hdl" || actname == "triglycerides" || actname == "blood_pressure" || actname == "ldl" || actname == "glucose_or_ac1") {
                            if (date_validation_setting == "Yes") {
                                datewherecondition = ` AND(hb.created BETWEEN '${this.commonDateService.getTodayDate(daystart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(dayend_date).format('YYYY-MM-DD')} 23:59:59')`;
                            }
                            let biodata = await this.biometricsService.biometricsListRecord(
                                        `hb.user_id = ${user.id} AND hb.status !=2
                                        AND(
                                            activity_id REGEXP '^${activity_id},' OR
                                            activity_id REGEXP ',${activity_id}$' OR
                                            activity_id REGEXP ',${activity_id},' OR
                                            activity_id = ${activity_id} 
                                            )
                                        ${datewherecondition}
                                        `
                                        ,['hb.created'])?.[0];

                            if (biodata.length >= 1) {
                                    d[j]['activitydetail'] = biodata[0];
                                    d[j]['status_act'] = 1;
                            } else {
                                    d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "physician_form" || actname == "dental_visit_form" || actname == "optometrist_form") {
                            if (date_validation_setting == "Yes") {
                                datewherecondition = ` AND(a.updated BETWEEN '${this.commonDateService.getTodayDate(daystart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(dayend_date).format('YYYY-MM-DD')} 23:59:59')`;
                            }
                            let formdata = await this.authorizationsService.listRecord(`a.user_id = ${user.id} AND a.status != 2 AND a.activity_id = ${activity_id} ${datewherecondition}`,null,{'a.updated': 'DESC'})
                            if (formdata.length >= 1) {
                                    d[j]['activitydetail'] = formdata[0];
                                    d[j]['status_act'] = 1;
                            } else {
                                    d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "tobacco_affidavit") {
                            if (date_validation_setting == "Yes") {
                                datewherecondition = ` AND(tu.updated BETWEEN '${this.commonDateService.getTodayDate(daystart_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(dayend_date).format('YYYY-MM-DD')} 23:59:59')`;
                            }
                            let tformdata = await this.tobaccoUsesService.listRecord(`tu.user_id = ${user.id} AND tu.activity_id = ${activity_id} AND tu.status != 2 ${datewherecondition}`,null,{'tu.updated': 'DESC'})
                            if (tformdata.length >= 1) {
                                    d[j]['activitydetail'] = tformdata[0];
                                    d[j]['status_act'] = 1;
                            } else {
                                    d[j]['notcompleted'] = 1;
                            }
                        }
                    }                               
                    if(schedule['ch']['requirementbased']!=1){
                        if (result['all'][i]['status'] != 1 && (d[j]['status'] == 1 || d[j]['status_act'] == 1)) {
                            completeddays++;
                            CustomtotalWeekpercantageComplete += (CustomtotalWeekpercantage != 0 ? (CustomtotalWeekpercantage/d.length) : 0);
                            result['all'][i]['weekdaystotalcomp'] +=1;
                        }
                    }
                    else{                    
                        if (result['all'][i]['status'] != 1 && (d[j]['status'] == 1 || d[j]['status_act'] == 1)) {   
                            if (!dataentryarray[d[j]['week_id']]) {
                                dataentryarray[d[j]['week_id']] = [];
                            }
                            dataentryarray[d[j]['week_id']].push(d[j]['week_id']);                                                    
                            if(dataentryarray[d[j]['week_id']] && numberofday == dataentryarray[d[j]['week_id']].length){                                                       
                                completedweeks++;
                                CustomtotalWeekpercantageComplete += CustomtotalWeekpercantage;
                                result['totaladdedweekcomp']++;
                            }
                            result['all'][i]['weekdaystotalcomp'] +=1;
                        }
                    }
                    result['all'][i]['days'] = d;
                }
                if (weeks[i]['status'] == 1 || weeks[i]['status_act'] == 1) {
                    result['all'][i]['weekdaystotalcomp'] = totaldays;
                }
                if(weeks[i]['status'] == 0 && weeks[i]['complete'] == false){
                    if(schedule['sc']['is_hide_weeklabel'] == 0 && disableactivitytempweek ==''){
                        weeks[i]['weekButtonText'] = await this.translatorService.frontendReadTranslation(req.lang,'Mark Week As Complete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    }
                }else{
                    if(disableactivitytempweek =='' || schedule['sc']?.is_all_activities != 1){
                        weeks[i]['weekButtonText'] = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        weeks[i]['complete'] = true;
                    }
                }
                if(this.commonDateService.getTodayDate(current_datetime).unix() >= this.commonDateService.getTodayDate(challengeEndDate).unix()){
                    weeks[i]['showButtonStatus'] = await this.translatorService.frontendReadTranslation(req.lang,'Challenge has ended', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                }
            }
            if (result['totaladdedweekcomp'] > result['totaladdedweek']) {
                result['totaladdedweekcomp'] = result['totaladdedweek'];
            }
            result['totalweekactivities'] = totalweekactivities;
            result['singleactivityper'] = result['totalweekactivities'] != 0 ? 100 / result['totalweekactivities'] : 0;
            result['totalcompactivities'] = (result['totalweekactivities'] < completeddays) ? result['totalweekactivities'] : completeddays;
            result['progress'] = CustomtotalWeekpercantageComplete;
            if (result['progress'] > 100) {
                result['progress'] =  100;
            }
            if(show_type == 2){
                if(result['totaladdedweekcomp']){
                    delete(result['totaladdedweekcomp'])
                }
                if(result['totaladdedweek']){
                    delete(result['totaladdedweek'])
                }
                if(result['singleactivityper']){
                    delete(result['singleactivityper'])
                }
                if(result['totalcompactivities']){
                    delete(result['totalcompactivities'])
                }
                if(result['totalweekactivities']){
                    delete(result['totalweekactivities'])
                }
                if(result['progress']){
                    delete(result['progress'])
                }
                if(result['numberofweek']){
                    delete(result['numberofweek'])
                }
                if(result['numberofday']){
                    delete(result['numberofday'])
                }
                if(result['all'] && result['all']?.length>0){
                    result['all'] = result['all']?.map(({ days, manual_activity, weeks_manual_activity, notcompleted, weeks_tabmanual, weeks_manual_desc, weekButtonText, complete, showButtonStatus }) => ({
                        days: days?.map(({ id, manual_activity, manual_desc, completion_status, showButtonStatus, complete, day_id, notcompleted, week_id }) => ({
                            id,
                            manual_activity,
                            manual_desc,
                            week_id,
                            day_id,
                            completion_status,
                            showButtonStatus, 
                            complete,
                            notcompleted
                        })),
                        weeks_manual_desc: days?.length == 0 ? null : weeks_manual_desc,
                        weekButtonText: days?.length == 0 ? null : weekButtonText,
                        complete,
                        showButtonStatus,
                        weeks_tabmanual,
                        manual_activity,
                        weeks_manual_activity,
                        notcompleted
                    }));
                }

            }

            if(result['all']?.length){
                await Promise.all(result['all']?.map((ele)=>{
                    if(ele['days'] && ele['days']?.length){
                        ele['days'] = ele['days']?.sort((a, b) => a.id - b.id);
                    }
                }));
            }
        return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}