import { CommonDateService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from "typeorm";
import { FitnessActivityService } from "../../fitnessactivity/fitnessactivity.service";
import { FitnessUsersActivityService } from "../../fitnessusersactivity/fitnessusersactivity.service";
import { WeeksStepsService } from "../../weekssteps/weekssteps.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class FitnessChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonDateService: CommonDateService,
        private readonly fitnessActivityService: FitnessActivityService,
        private readonly weeksStepsService: WeeksStepsService,
        private readonly fitnessUsersActivityService: FitnessUsersActivityService,
        private readonly activityLogService: ActivityLogService,
    ) {}

    async fitnessChallenge(schedule: any, req: Request, show_type = 1) {
        try {
            let result = Object.create(null);
            let ftnsActivityIds = [];
            let weeksfteps;
            let is_custome = schedule['sc']['is_ftns_activity_custome'];
            if (is_custome == 1) {
                weeksfteps =  await this.weeksStepsService.listRecord({schedule_id: schedule['sc']['id'], status: 1, f_suggestion : Not(0)}, { id: 'ASC' }, ['week_no', 'f_suggestion']);            
                weeksfteps = weeksfteps.reduce((acc, entity) => {
                    acc[entity.week_no] = entity.f_suggestion;
                    return acc;
                }, {});            
            }
            let fitness: any = await this.fitnessActivityService.listRecord({challenge_id: schedule['ch']['id'], status: Not(2)},{alphabet : 'ASC'});
            let userActivity = await this.fitnessUsersActivityService.listRecord({schedule_id: schedule['sc']['id'], user_id: req.tokenUser?.id});
            if (userActivity && userActivity?.length > 0) {
                userActivity.map(uActivity => {
                    ftnsActivityIds.push(uActivity.ftns_activity_id);
                });
            }
            if (fitness && fitness?.length > 0) {
                await Promise.all(fitness.map(async (ele)=>{
                    if(ele.alphabet){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_activity_alphabet_${ele['challenge_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele?.['challenge_id']}`,`dynamic`);
                        ele.alphabet = !customName.includes('fitness_activity_alphabet_') ? customName : ele.alphabet;
                    }
                    if(ele.activity_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `fitness_activity_name_${ele['challenge_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele?.['challenge_id']}`,`dynamic`);
                        ele.activity_name = !customName.includes('fitness_activity_name_') ? customName : ele.activity_name;
                    }
                    if(ele.suggestion){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_activity_suggestion_${ele['challenge_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele?.['challenge_id']}`,`dynamic`);
                        ele.suggestion = !customName.includes('fitness_activity_suggestion_') ? customName : ele.suggestion;
                    }
                }));
            }   
            if(show_type == 2){
                result['ftactivity'] = fitness.map(activity => ({
                    id: activity.id, 
                    alphabet: activity.alphabet,
                    activity_name : activity.activity_name, 
                    suggestion : activity.suggestion,
                    status: ftnsActivityIds.includes(activity.id) ? 1 : 0
                }));
                result['ftactivitytotle'] = fitness?.length;
                result['ftusersactivitytotle'] = ftnsActivityIds?.length;
            }
            if(show_type == 1){
                result['ftactivity'] = fitness;
                result['ftusersactivity'] = ftnsActivityIds;
                let limitPerWeek = schedule.sc.ftns_activity_limit;
                let checkActvtyLimit = "No";

                if (limitPerWeek && limitPerWeek !== 0) {
                    const weekStart = this.commonDateService.getTodayDate().startOf('week').format('YYYY-MM-DD');
                    const weekEnd = this.commonDateService.getTodayDate().endOf('week').format('YYYY-MM-DD');
                    let userActivityData = await this.fitnessUsersActivityService.listRecord(`(activity.added_date BETWEEN '${weekStart} 00:00:00' AND '${weekEnd} 23:59:59') AND activity.user_id = ${req.tokenUser?.id} AND activity.schedule_id = ${schedule['sc']['id']}`, null, 'activity.ftns_activity_id');
                   let cmpltdInWeek = userActivityData?.length;

                    if (cmpltdInWeek >= limitPerWeek) {
                        checkActvtyLimit = "Yes";
                    }
                }

                result['checkactvtylimit'] = checkActvtyLimit;
                result['is_checkactvtylimit'] = schedule.sc.is_ftns_activity_limit;
                let totalDays = schedule['challengeDetails'].totaldays;
                const currentweek = {
                    week: 'week_1',
                    week_num: 1
                };
                const weeksArray = Object.create(null);
                let week = 1;
                let tmpWeekAlpha = 0;
                let currentStart = moment(schedule.sc.start_date);
                const compDate = moment(this.commonDateService.getTodayDate().format('YYYY-MM-DD'));
                while (totalDays > 0) {
                    const daysInWeek = totalDays >= 7 ? 7 : totalDays;
                    const currentEnd = currentStart.clone().add(daysInWeek - 1, 'days');
                    const weekKey = `week ${week}`;

                    weeksArray[weekKey] = {
                        start_date: currentStart.format('YYYY-MM-DD'),
                        end_date: currentEnd.format('YYYY-MM-DD'),
                        days: daysInWeek
                    };

                    if (compDate.isSameOrAfter(currentStart) && compDate.isSameOrBefore(currentEnd)) {
                        currentweek.week = `week_${week}`;
                        currentweek.week_num = week;
                    }

                    if (is_custome === 0 && !weeksfteps) {
                        for (let i = 0; i < daysInWeek; i++) {
                            const index = (week - 1) * 7 + i;
                            const cf = fitness[index];
                            if (!cf) continue;
                            weeksArray[weekKey].alphabet ||= {};
                            weeksArray[weekKey].suggestion ||= {};

                            weeksArray[weekKey].alphabet[cf.id] = {
                                id: cf.id,
                                alphabet: cf.alphabet,
                                detail: cf.suggestion,
                                activity_name: cf.activity_name,
                                status: 0
                            };
                            if(ftnsActivityIds.includes(cf.id)){
                                weeksArray[weekKey].alphabet[cf.id]['status']= 1; 
                            }
                            weeksArray[weekKey].suggestion[cf.id] = {
                                id: cf.id,
                                detail: cf.suggestion,
                                name: cf.activity_name
                            };
                        }
                        } else {
                        if (weeksfteps && weeksfteps[week]) {
                            const allowed = weeksfteps[week];
                            let tmpWeekAlphaCount = 0;

                            while (tmpWeekAlphaCount < allowed && fitness[tmpWeekAlpha]) {
                                const cf = fitness[tmpWeekAlpha];
                                weeksArray[weekKey].alphabet ||= {};
                                weeksArray[weekKey].suggestion ||= {};
                                weeksArray[weekKey].alphabet[cf.id] = {
                                    id: cf.id,
                                    alphabet: cf.alphabet,
                                    detail: cf.suggestion,
                                    activity_name: cf.activity_name,
                                    status: 0
                                };
                                if(ftnsActivityIds.includes(cf.id)){
                                    weeksArray[weekKey].alphabet[cf.id]['status']= 1; 
                                }
                                weeksArray[weekKey].suggestion[cf.id] = {
                                    id: cf.id,
                                    detail: cf.suggestion,
                                    name: cf.activity_name
                                };
                                tmpWeekAlpha++;
                                tmpWeekAlphaCount++;
                            }

                            const isLastWeek = !weeksfteps[week + 1];
                            if (isLastWeek && tmpWeekAlpha < fitness.length) {
                                for (let k = tmpWeekAlpha; k < fitness.length; k++) {
                                    const cf = fitness[k];
                                    weeksArray[weekKey].alphabet ||= {};
                                    weeksArray[weekKey].suggestion ||= {};
                                    weeksArray[weekKey].alphabet[cf.id] = {
                                        id: cf.id,
                                        alphabet: cf.alphabet,
                                        detail: cf.suggestion,
                                        activity_name: cf.activity_name,
                                        status: 0
                                    };
                                    if(ftnsActivityIds.includes(cf.id)){
                                        weeksArray[weekKey].alphabet[cf.id]['status']= 1; 
                                    }
                                    weeksArray[weekKey].suggestion[cf.id] = {
                                        id: cf.id,
                                        detail: cf.suggestion,
                                        name: cf.activity_name
                                    };
                                }
                            }
                        }
                    }

                    totalDays -= daysInWeek;
                    currentStart = currentEnd.clone().add(1, 'day');
                    week++;
                }
                
                result['currentweek'] = currentweek;                
                let week_list = [];                 
                for (let i = 1; i <= Object.keys(weeksArray).length; i++) {
                    if(weeksArray[`week ${i}`].alphabet){
                        week_list.push({
                            week: i,
                            name: `${await this.translatorService.frontendReadTranslation(req.lang,'Week','/LC_MESSAGES/Challenge/MyChallenges')} ${i}`,
                            status : (currentweek.week == `week_${i}` || i < currentweek.week_num) ? 1 : 0,
                            date: weeksArray[`week ${i}`] ? `${this.commonDateService.getTodayDate(weeksArray[`week ${i}`].start_date).format('MM/DD')} - ${this.commonDateService.getTodayDate(weeksArray[`week ${i}`].end_date).format('MM/DD')}` : '',
                            alphabet : weeksArray[`week ${i}`] ? Object.values(weeksArray[`week ${i}`].alphabet) : {},
                            suggestion : weeksArray[`week ${i}`] ? Object.values(weeksArray[`week ${i}`].suggestion) : {}
                        });
                    }
                }
                result['weekinfo'] = week_list;
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}