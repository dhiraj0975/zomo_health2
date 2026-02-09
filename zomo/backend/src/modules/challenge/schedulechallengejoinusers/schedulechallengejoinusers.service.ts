import {
    appConstant,
    BaseService, CommonArrayService,
    CommonDateService,
    CommonFileService,
    ScheduleChallengeJoinUsersEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranslationService } from "../../translation/translation.service";
const moment = require('moment-timezone');
@Injectable()
export class ScheduleChallengeJoinUsersService  extends BaseService<ScheduleChallengeJoinUsersEntity> {
    constructor(
        @InjectRepository(ScheduleChallengeJoinUsersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaScheduleChallengeJoinUsersRepository: Repository<ScheduleChallengeJoinUsersEntity>,
        @InjectRepository(ScheduleChallengeJoinUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaScheduleChallengeJoinUsersRepository: Repository<ScheduleChallengeJoinUsersEntity>,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaScheduleChallengeJoinUsersRepository,writeReplicaScheduleChallengeJoinUsersRepository,'scheduleChallengeJoinUsers',commonArrayService);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaScheduleChallengeJoinUsersRepository.create(data);
        return await this.writeReplicaScheduleChallengeJoinUsersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaScheduleChallengeJoinUsersRepository.metadata);
        let result =  this.writeReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
            .update(ScheduleChallengeJoinUsersEntity)
            .set(data)
            .where(condition);
            return await result.execute();
    }
    async delete(condition: any){
        await this.writeReplicaScheduleChallengeJoinUsersRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaScheduleChallengeJoinUsersRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async myChallenge(condition: string, fields: any[] = ['ch.id', 'ch.challenge_type','ch.bio_challenge_type','ch.challenge_name','ch.challenge_desc','ch.icon','ch.logo','ch.numberofsteps','ch.oz_water_per_day','ch.requirementbased','ch.numberofweek','ch.numberofday', 'sc','scj.id','scj.trek_level_id','scj.relay_race_detail','scj.added_date','scj.in_ranking', 'scj.completed_lock_locations','scj.in_week_complete','scj.in_park_complete','ac.id','ac.activity_name','tags.id','tags.title']) {
        return await this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
        .leftJoinAndMapOne(
            'scj.sc',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
            'sc',
            `sc.id = scj.schedule_id AND sc.status = 1`,
        )
        .leftJoinAndMapOne(
            'scj.ch',
            tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
            'ch',
            `ch.id = sc.challenge_id AND ch.status = 1`,
        )
        .leftJoinAndMapOne(
            'scj.ac',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'ac',
            `ac.id = ch.activity_id AND ac.status = 1`,
        )
        .leftJoinAndMapOne(
            'scj.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = sc.org_id AND company.status = 1`,
        )
        .leftJoinAndMapMany(
            'sc.tags',
            tableConstant.CHALLENGE.TBL_CH_TAGS,
            'tags',
            `FIND_IN_SET(tags.id, REPLACE(sc.tag_id, ' ', '')) > 0 AND tags.status = 1`,
        )
            .where(condition)
            .select(fields)
            .orderBy('scj.added_date', 'DESC')
            .getMany();
    }
    async getSingleChallenge(condition: any ) {
        return await this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
        .leftJoinAndMapOne(
            'scj.sc',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
            'sc',
            `sc.id = scj.schedule_id AND sc.status = 1`,
        )
        .leftJoinAndMapOne(
            'scj.ch',
            tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
            'ch',
            `ch.id = sc.challenge_id AND ch.status = 1`,
        )
        .leftJoinAndMapOne(
            'scj.ac',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'ac',
            `ac.id = ch.activity_id AND ac.status = 1`,
        )
        .leftJoinAndMapOne(
            'scj.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = sc.org_id AND company.status = 1`,
        )
        .where(condition)
        .select(['ch.id', 'ch.challenge_type','ch.bio_challenge_type','ch.challenge_name','ch.challenge_desc','ch.icon','ch.logo','ch.numberofsteps','ch.oz_water_per_day','ch.requirementbased','ch.numberofweek','ch.numberofday', 'sc','scj.id','scj.trek_level_id','scj.relay_race_detail','scj.added_date','scj.in_ranking', 'scj.completed_lock_locations','scj.in_week_complete','scj.in_park_complete','ac.id','ac.activity_name'])
        .orderBy('scj.added_date', 'ASC')
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null,fields: any[] = ['scj','user.id', 'user.first_name','user.last_name', 'user.profile_image'],tableData: any = null) {
        if (!orderBy) {
            orderBy = { 'scj.id': 'ASC' };
        }
        let query = this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
        if (tableData == null) {
            query = query.leftJoinAndMapOne(
                'scj.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = scj.user_id AND user.status = 1`,
            )
        }
        query = query.where(condition)
        .select(fields)
        .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return await query.getMany();
    }
    async joinUserListRecord(condition: any, orderBy: object = null,fields: string[] = []) {
        if (!orderBy) {
            orderBy = { 'scj.id': 'DESC' };
        }
        let queryResult: any = await this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        return queryResult;
    }
    async healthyHabbitAllActivity(condition: any, orderBy: any = null, fields: any = ['weekuser.*','ac.id','ac.activity_name','weeks.manual_activity','weeks.manual_desc','weeks.logofile','weeks.site_activity_desc','weeks.tabmanual']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
        .leftJoinAndMapMany(
            'scj.weekuser',
            tableConstant.CHALLENGE.TBL_CH_WEEKS_USERS,
            'weekuser',
            `scj.id = weekuser.schedule_id AND weekuser.status != 2`,
        )
        .innerJoinAndMapMany(
            'scj.weeks',
            tableConstant.CHALLENGE.TBL_CH_WEEKS,
            'weeks',
            `weeks.id = weekuser.week_id AND weeks.status != 2`,
        )
        .leftJoinAndMapMany(
            'scj.ac',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'ac',
            `ac.id = weekuser.activity_id AND ac.status != 2`,
        )
            .where(condition)
            .select(fields)
            .orderBy(`scj.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            return await query.getRawMany();
    }
    async getWeekStartDateJoinUsers(condition: any) {
        return await this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
        .leftJoinAndMapOne(
            'scj.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = scj.user_id`,
        )
        .leftJoinAndMapOne(
            'scj.weekSteps',
            tableConstant.CHALLENGE.TBL_CH_WEEKS_STEPS,
            'weekSteps',
            'scj.schedule_id = weekSteps.schedule_id AND weekSteps.status = 1 AND DATE(weekSteps.start_date) <= DATE(scj.added_date) AND DATE(weekSteps.end_date) >= DATE(scj.added_date)',
        )
        .where(condition)
        .select('weekSteps.start_date,scj.added_date,scj.schedule_id,user.id,CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) AS name,user.profile_image,scj.in_ranking')
        .getRawMany();
    }
    async GetWeekdetail(req:any, userId: any = null, weeksfteps: any = [], AllUserStepsdataDatewise:any = [], start_date: any = null, end_date: any = null, tr_goaltype: any = null, rank_type: any = null, is_set_weekend: any = null, totaldays: any = null, numberofsteps: any = null, added_date: any = null, timezone: any = null){
        try{
            let result = [];
            let weeksarray:any = Object.create(null);
            result['currentweek'] = 'week_1';
            result['currentweeknumber'] = '1';
            result['weeksarray'] = [];
            added_date = await this.commonDateService.DateTimeFormat(added_date, 'YYYY-MM-DD');
            let scheduleDate = moment.utc(start_date).subtract(1, 'days').format('YYYY-MM-DD');
            let currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD','',timezone);
            let currentTimeStamp = await this.commonDateService.DateTimeFormat(currentDate + ' 00:00:00', 'timestamp','YYYY-MM-DD HH:mm:ss',timezone);
            let scheduleEndDate = await this.commonDateService.DateTimeFormat(end_date, 'YYYY-MM-DD');
            let scheduleEndDateTimeStamp = await this.commonDateService.DateTimeFormat(scheduleEndDate + ' 00:00:00', 'timestamp','YYYY-MM-DD HH:mm:ss');
            let basegoal = 1;
            let weeks = 1;
            weeksarray['week_1'] = Object.create(null);
            weeksarray['week_1']['start_date'] = await this.commonDateService.DateTimeFormat(start_date, 'YYYY-MM-DD');
            if (is_set_weekend === 0) {
                weeksarray['week_1']['end_date'] = moment(start_date).add(6, 'days').format('YYYY-MM-DD');
            } else {
                const dateAfterSixDays = moment(start_date).add(6, 'days');
                const dayOfWeek = dateAfterSixDays.day();
                if (dayOfWeek > 0 && dayOfWeek <= 5) {
                    weeksarray['week_1']['end_date'] = dateAfterSixDays.format('YYYY-MM-DD');
                } else {
                    const daysSinceLastFriday = (dayOfWeek + 2) % 7;
                    weeksarray['week_1']['end_date'] =  dateAfterSixDays.subtract(daysSinceLastFriday, 'days').startOf('day').format('YYYY-MM-DD');
                }
            }
            weeksarray['week_1']['weeksteps'] = 0;
            weeksarray['week_1']['week_number'] = 1;
            weeksarray['week_1']['weeksavg'] = 0;
            if(currentTimeStamp > scheduleEndDateTimeStamp){
                result['currentweek'] = 'week_'+weeksfteps.length;
                result['currentweeknumber'] = weeksfteps.length;
            }
            for (let i = 1; i <= totaldays; i++) {
                let datematch = moment.utc(scheduleDate).add(i, 'days').format('YYYY-MM-DD');
                if(currentDate == datematch){
                    result['currentweek'] = 'week_' + weeks;
                    result['currentweeknumber'] = weeks;
                }
                if(AllUserStepsdataDatewise.has(userId)){
                    if(AllUserStepsdataDatewise.get(userId).has(`${datematch}`)){
                        if(weeksarray['week_'+weeks]['weeksteps']){
                            weeksarray['week_'+weeks]['weeksteps'] += AllUserStepsdataDatewise.get(userId).get(`${datematch}`);
                        }else{
                            weeksarray['week_'+weeks]['weeksteps'] =  AllUserStepsdataDatewise.get(userId).get(`${datematch}`);
                        }
                    }
                }
                if((i%7) == 0){
                    if(weeksarray['week_'+weeks]['weeksteps'] && weeksarray['week_'+weeks]['weeksteps'] != 0){
                        weeksarray['week_'+weeks]['weeksavg'] = Math.round(weeksarray['week_'+weeks].weeksteps / (is_set_weekend === 1 ? 5 : 7));
                    } 
                    weeks++;
                    if(!weeksarray['week_'+weeks]){
                        weeksarray['week_'+weeks] = Object.create(null);
                    }
                    if(weeksfteps[weeks-1]){ 
                        weeksarray['week_'+weeks]['weeksavg'] = 0;
                        if (is_set_weekend === 0) {
                            weeksarray['week_'+weeks]['start_date'] = moment(weeksarray['week_'+(weeks-1)]['end_date']).add(1, 'days').format('YYYY-MM-DD');
                        } else {
                            const dateAfterOneDays = moment(weeksarray['week_'+(weeks-1)]['end_date']).add(1, 'days');
                            const dayOfWeek = dateAfterOneDays.day();
                            if (dayOfWeek > 0 && dayOfWeek <= 5) {
                                weeksarray['week_'+weeks]['start_date'] = dateAfterOneDays.format('YYYY-MM-DD');
                            } else {
                                const daysSinceLastFriday = (dayOfWeek + 2) % 7;
                                weeksarray['week_'+weeks]['start_date'] =  dateAfterOneDays.subtract(daysSinceLastFriday, 'days').startOf('day').format('YYYY-MM-DD');
                            }
                        }
                        if (is_set_weekend === 0) {
                            weeksarray['week_'+weeks]['end_date'] = moment(weeksarray['week_'+weeks]['start_date']).add(6, 'days').format('YYYY-MM-DD');
                        } else {
                            const dateAfterSixDays = moment(weeksarray['week_'+weeks]['start_date']).add(6, 'days');
                            const dayOfWeek = dateAfterSixDays.day();
                            if (dayOfWeek > 0 && dayOfWeek <= 5) {
                                weeksarray['week_'+weeks]['end_date'] = dateAfterSixDays.format('YYYY-MM-DD');
                            } else {
                                const daysSinceLastFriday = (dayOfWeek + 2) % 7;
                                weeksarray['week_'+weeks]['end_date'] =  dateAfterSixDays.subtract(daysSinceLastFriday, 'days').startOf('day').format('YYYY-MM-DD');
                            }
                        }
                        if ((scheduleEndDate >= weeksarray['week_'+weeks]['start_date']) && (scheduleEndDate <= weeksarray['week_'+weeks]['end_date'])){
                            weeksarray['week_'+weeks]['end_date'] = scheduleEndDate;
                        }
                        weeksarray['week_'+weeks]['week_number'] = weeks;
                        weeksarray['week_'+weeks]['weeksteps'] = 0;
                        let textOne = '';
                        let textTwo = '';
                        let textThree = '';
                        if(weeksfteps[weeks-1]){
                            textOne = await this.translatorService.frontendReadTranslation(req.lang,`Based on a`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            textTwo = await this.translatorService.frontendReadTranslation(req.lang,`Steps/Movement`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            textThree = await this.translatorService.frontendReadTranslation(req.lang,`increase from week`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        }
                        if (tr_goaltype == 1) {  
                            if(weeksfteps[weeks-1]){
                                weeksarray['week_'+weeks]['week_status'] = textOne+" "+((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? weeksfteps[weeks-1]['move_more_goal']+'%' : weeksfteps[weeks-1]['move_more_goal']+" "+textTwo)+" "+textThree+' '+(weeks-1);
                            }
                            if (rank_type == "average_steps") {
                                if(weeksarray['week_'+(weeks-1)]['weeksavg'] && weeksarray['week_'+(weeks-1)]['weeksavg'] >= numberofsteps){
                                    weeksarray['week_'+weeks]['week_goal'] = Math.round(((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? ((weeksarray['week_'+(weeks-1)]['weeksavg'] * weeksfteps[weeks-1]['move_more_goal'] / 100) + weeksarray['week_'+(weeks-1)]['weeksavg']) : (weeksarray['week_'+(weeks-1)]['weeksavg']+weeksfteps[weeks-1]['move_more_goal'])));   
                                }else{
                                    weeksarray['week_'+weeks]['week_goal'] = 0;
                                }
                            }else{
                                if(weeksarray['week_'+(weeks-1)]['weeksteps'] >= numberofsteps){
                                    weeksarray['week_'+weeks]['week_goal'] = Math.round(((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? ((weeksarray['week_'+(weeks-1)]['weeksteps'] * weeksfteps[weeks-1]['move_more_goal'] / 100) + weeksarray['week_'+(weeks-1)]['weeksteps']) : (weeksarray['week_'+(weeks-1)]['weeksteps']+weeksfteps[weeks-1]['move_more_goal']))); 
                                }else{
                                    weeksarray['week_'+weeks]['week_goal'] = 0;
                                }
                            }   
                        }else{
                            let weekSDate = await this.commonDateService.DateTimeFormat(weeksarray['week_'+weeks]['start_date'], 'timestamp','YYYY-MM-DD');
                            let weekEDate = await this.commonDateService.DateTimeFormat(weeksarray['week_'+weeks]['end_date'], 'timestamp','YYYY-MM-DD');
                            let uAddedDate = await this.commonDateService.DateTimeFormat(added_date, 'timestamp');
                            if (weekSDate <= uAddedDate && uAddedDate <= weekEDate) {
                                basegoal = weeks;
                            }
                            if(weeksfteps[weeks-1]){
                                weeksarray['week_'+weeks]['week_status'] = textOne+" "+((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? weeksfteps[weeks-1]['move_more_goal']+'%' : weeksfteps[weeks-1]['move_more_goal']+" "+textTwo)+" "+textThree+' '+basegoal;
                            }
                            if (rank_type == "average_steps") {
                                if(weeksarray['week_'+basegoal]['weeksavg'] && weeksarray['week_'+basegoal]['weeksavg'] >= numberofsteps){  
                                    weeksarray['week_'+weeks]['week_goal'] = Math.round(((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? ((weeksarray['week_'+basegoal]['weeksavg'] * weeksfteps[weeks-1]['move_more_goal'] / 100) + weeksarray['week_'+basegoal]['weeksavg']) : (weeksarray['week_'+basegoal]['weeksavg']+weeksfteps[weeks-1]['move_more_goal'])));   
                                }else{
                                    weeksarray['week_'+weeks]['week_goal'] = 0;  
                                }
                            }else{
                                if(weeksarray['week_'+basegoal]['weeksteps'] &&  weeksarray['week_'+basegoal]['weeksteps'] >= numberofsteps){
                                    weeksarray['week_'+weeks]['week_goal'] = Math.round(((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? ((weeksarray['week_'+basegoal]['weeksteps'] * weeksfteps[weeks-1]['move_more_goal'] / 100) + weeksarray['week_'+basegoal]['weeksteps']) : (weeksarray['week_'+basegoal]['weeksteps']+weeksfteps[weeks-1]['move_more_goal']))); 
                                }else{
                                    weeksarray['week_'+weeks]['week_goal'] = 0;
                                }
                            }
                        }
                    }   
                }
            }
            if(weeksarray && Object.keys(weeksarray).length > 0){
                result['weeksarray'] = weeksarray;
            }
            return result;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async getWeekDetail(req:any, userId, weeksfteps, AllStepsdataDatewise, start_date, end_date, tr_goaltype,  rank_type, is_set_weekend, totaldays, numberofsteps, added_date, fromtype ) 
    {
        let result = {};
        result['currentweek'] = 'week 1';
        let weeksarray = {};
        let scheduleDate = moment(start_date, 'YYYY-MM-DD').subtract(1, 'days').format('YYYY-MM-DD');
        let compcurrentdate = moment().format('YYYY-MM-DD');
        let checkenddate = moment(end_date, 'YYYY-MM-DD').format('YYYY-MM-DD');
        let basegoal = 1;
        let weeks = 1;
        weeksarray['week 1'] = {
            start_date: moment(start_date, 'YYYY-MM-DD').format('YYYY-MM-DD'),
            end_date: null,
            weeksteps: 0,
            week_number: 1,
            weeksavg: 0
        };
        let week1Start = moment(weeksarray['week 1'].start_date, 'YYYY-MM-DD');
        if (is_set_weekend == 0) {
            weeksarray['week 1'].end_date = week1Start.clone().add(6, 'days').format('YYYY-MM-DD');
        } else {
            let plusSix = week1Start.clone().add(6, 'days');
            let dayOfWeek = plusSix.isoWeekday(); // 1=Monday, 7=Sunday
            if (dayOfWeek > 0 && dayOfWeek <= 5) {
                weeksarray['week 1'].end_date = plusSix.format('YYYY-MM-DD');
            } else {
                weeksarray['week 1'].end_date = plusSix.clone().isoWeekday(5).format('YYYY-MM-DD');
            }
        }
        if (moment().isAfter(moment(end_date, 'YYYY-MM-DD'))) {
            result['currentweek'] = 'week ' + weeksfteps.length;
        }
        for (let i = 1; i <= totaldays; i++) {
            let datematch = moment(scheduleDate, 'YYYY-MM-DD').add(i, 'days').format('YYYY-MM-DD');
            if (compcurrentdate === datematch) {
                result['currentweek'] = 'week ' + weeks;
                result['currentweeknumber'] = weeks;
            }
            if(AllStepsdataDatewise.has(userId)) {
                if(AllStepsdataDatewise.get(userId).has(`${datematch}`)) {
                    if(weeksarray.hasOwnProperty('week ' + weeks)){
                        if(weeksarray['week '+ weeks]?.['weeksteps']) {
                            weeksarray['week '+ weeks]['weeksteps'] += AllStepsdataDatewise.get(userId).get(`${datematch}`);
                        } else {
                            weeksarray['week '+ weeks]['weeksteps'] =  AllStepsdataDatewise.get(userId).get(`${datematch}`);
                        }
                    }
                }
            }
            if (i % 7 === 0) {
                if (weeksarray['week ' + weeks] !== undefined &&
                    weeksarray['week ' + weeks]['weeksteps'] !== undefined &&
                    weeksarray['week ' + weeks]['weeksteps'] !== 0
                ) {
                    weeksarray['week ' + weeks]['weeksavg'] = Math.round(
                        weeksarray['week ' + weeks]['weeksteps'] / (is_set_weekend == 1 ? 5 : 7)
                    );
                }
                weeks++;
                if (weeksfteps[weeks - 1]) {
                    weeksarray['week ' + weeks] = {};
                    weeksarray['week ' + weeks]['weeksavg'] = 0;
                    // Calculate start_date for new week
                    let prevEnd = moment(weeksarray['week ' + (weeks - 1)]['end_date'], 'YYYY-MM-DD');
                    if (is_set_weekend == 0) {
                        weeksarray['week ' + weeks]['start_date'] = prevEnd.clone().add(1, 'days').format('YYYY-MM-DD');
                    } else {
                        let nextStart = prevEnd.clone().add(1, 'days');
                        let dayOfWeek = nextStart.isoWeekday();
                        if (dayOfWeek > 0 && dayOfWeek <= 5) {
                            weeksarray['week ' + weeks]['start_date'] = nextStart.format('YYYY-MM-DD');
                        } else {
                            // Next Monday after nextStart
                            weeksarray['week ' + weeks]['start_date'] = nextStart.clone().isoWeekday(8).format('YYYY-MM-DD');
                        }
                    }
                    // Calculate end_date for new week
                    let weekStart = moment(weeksarray['week ' + weeks]['start_date'], 'YYYY-MM-DD');
                    if (is_set_weekend == 0) {
                        weeksarray['week ' + weeks]['end_date'] = weekStart.clone().add(6, 'days').format('YYYY-MM-DD');
                    } else {
                        let plusSix = weekStart.clone().add(6, 'days');
                        let dayOfWeek = plusSix.isoWeekday();
                        if (dayOfWeek > 0 && dayOfWeek <= 5) {
                            weeksarray['week ' + weeks]['end_date'] = plusSix.format('YYYY-MM-DD');
                        } else {
                            // Last Friday before/at plusSix
                            weeksarray['week ' + weeks]['end_date'] = plusSix.clone().isoWeekday(5).format('YYYY-MM-DD');
                        }
                    }
                    // Adjust end_date if it passes challenge end
                    if (
                        checkenddate >= weeksarray['week ' + weeks]['start_date'] &&
                        checkenddate <= weeksarray['week ' + weeks]['end_date']
                    ) {
                        weeksarray['week ' + weeks]['end_date'] = checkenddate;
                    }
                    weeksarray['week ' + weeks]['week_number'] = weeks;
                    weeksarray['week ' + weeks]['weeksteps'] = 0;
                    let textOne = '';
                    let textTwo = '';
                    let textThree = '';
                    if(weeksfteps[weeks-1]){
                        textOne = await this.translatorService.frontendReadTranslation(req.lang,`Based on a`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        textTwo = await this.translatorService.frontendReadTranslation(req.lang,`Steps/Movement`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        textThree = await this.translatorService.frontendReadTranslation(req.lang,`increase from week`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    }
                    if (tr_goaltype == 1) {  
                        if(weeksfteps[weeks-1]){
                            weeksarray['week '+weeks]['week_status'] = textOne+" "+((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? weeksfteps[weeks-1]['move_more_goal']+'%' : weeksfteps[weeks-1]['move_more_goal']+" "+textTwo)+" "+textThree+' '+(weeks-1);
                        }
                        if (rank_type == "average_steps") {
                            if(weeksarray['week '+(weeks-1)]['weeksavg'] && weeksarray['week '+(weeks-1)]['weeksavg'] >= numberofsteps){
                                weeksarray['week '+weeks]['week_goal'] = Math.round(((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? ((weeksarray['week '+(weeks-1)]['weeksavg'] * weeksfteps[weeks-1]['move_more_goal'] / 100) + weeksarray['week '+(weeks-1)]['weeksavg']) : (weeksarray['week '+(weeks-1)]['weeksavg']+weeksfteps[weeks-1]['move_more_goal'])));   
                            }else{
                                weeksarray['week '+weeks]['week_goal'] = 0;
                            }
                        }else{
                            if(weeksarray['week '+(weeks-1)]['weeksteps'] >= numberofsteps){
                                weeksarray['week '+weeks]['week_goal'] = Math.round(((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? ((weeksarray['week '+(weeks-1)]['weeksteps'] * weeksfteps[weeks-1]['move_more_goal'] / 100) + weeksarray['week '+(weeks-1)]['weeksteps']) : (weeksarray['week '+(weeks-1)]['weeksteps']+weeksfteps[weeks-1]['move_more_goal']))); 
                            }else{
                                weeksarray['week '+weeks]['week_goal'] = 0;
                            }
                        }   
                    }else{
                        let weekSDate = await this.commonDateService.DateTimeFormat(weeksarray['week '+weeks]['start_date'], 'timestamp','YYYY-MM-DD');
                        let weekEDate = await this.commonDateService.DateTimeFormat(weeksarray['week '+weeks]['end_date'], 'timestamp','YYYY-MM-DD');
                        let uAddedDate = await this.commonDateService.DateTimeFormat(added_date, 'YYYY-MM-DD');
                        uAddedDate = await this.commonDateService.DateTimeFormat(uAddedDate, 'timestamp','YYYY-MM-DD');
                        if (weekSDate <= uAddedDate && uAddedDate <= weekEDate) {
                            basegoal = weeks;
                        }
                        if(weeksfteps[weeks-1]){
                            weeksarray['week '+weeks]['week_status'] = textOne+" "+((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? weeksfteps[weeks-1]['move_more_goal']+'%' : weeksfteps[weeks-1]['move_more_goal']+" "+textTwo)+" "+textThree+' '+basegoal;
                        }
                        if (rank_type == "average_steps") {
                            if(weeksarray['week '+basegoal]['weeksavg'] && weeksarray['week '+basegoal]['weeksavg'] >= numberofsteps){  
                                weeksarray['week '+weeks]['week_goal'] = Math.round(((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? ((weeksarray['week '+basegoal]['weeksavg'] * weeksfteps[weeks-1]['move_more_goal'] / 100) + weeksarray['week '+basegoal]['weeksavg']) : (weeksarray['week '+basegoal]['weeksavg']+weeksfteps[weeks-1]['move_more_goal'])));   
                            }else{
                                weeksarray['week '+weeks]['week_goal'] = 0;  
                            }
                        }else{
                            if(weeksarray['week '+basegoal]['weeksteps'] &&  weeksarray['week '+basegoal]['weeksteps'] >= numberofsteps){
                                weeksarray['week '+weeks]['week_goal'] = Math.round(((weeksfteps[weeks-1]['move_more_goal_type'] == 0) ? ((weeksarray['week '+basegoal]['weeksteps'] * weeksfteps[weeks-1]['move_more_goal'] / 100) + weeksarray['week '+basegoal]['weeksteps']) : (weeksarray['week '+basegoal]['weeksteps']+weeksfteps[weeks-1]['move_more_goal']))); 
                            }else{
                                weeksarray['week '+weeks]['week_goal'] = 0;
                            }
                        }
                    }
                }
            }
            result['lastweeknumber'] = weeks;
        }
        result['weeksarray'] = weeksarray;
        return result;
    }
    async getPopupWeekdetail(req:any, weeksarray, weeksfteps, rank_type, in_week_complete){
        let result = Object.create(null);
        let goalcompletekeyword = 'weeksteps';
        if(rank_type == 'average_steps'){
            goalcompletekeyword = 'weeksavg';
        }
        const reversedWeekData = Object.keys(weeksarray)
        .reverse()
        .reduce((acc, key) => {
            acc[key] = weeksarray[key];
            return acc;
        }, {});

        for (const [key, fweekinfo] of Object.entries(reversedWeekData)) {
            if (key !== 'week 1') {
                const goalCompleteValue = fweekinfo[goalcompletekeyword];
                const weekGoal = fweekinfo['week_goal'];
                const weekNumber = fweekinfo['week_number'];
                if (goalCompleteValue >= weekGoal && weekNumber > in_week_complete && goalCompleteValue !== 0 && weekGoal !== 0) {
                    const previousWeekIndex = weekNumber;
                    const prevWeekData = weeksfteps.find(item => item.week_no === previousWeekIndex);
                    if (prevWeekData) {
                        result = {
                            goal: prevWeekData['move_more_goal'] ?? '0',
                            type: prevWeekData['move_more_goal_type'] ?? '0',
                            id: weekNumber,
                        };
                    }
                    break;
                }
            }
        }
        return result; 
    }
    async getScheduleChallenge(condition: any) {
        try{
            const result = await this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
            .leftJoinAndMapOne(
              'scj.schedule', 
              tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
              'sc',
              'sc.id = scj.schedule_id AND sc.status = 1',
            )
            .leftJoinAndMapOne(
              'scj.ch', 
              tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
              'ch',
              'ch.id = sc.challenge_id AND ch.status = 1',
            )
            .leftJoinAndMapOne(
              'scj.company',
              tableConstant.COMPANIES.TBL_COMPANY,
              'company',
              'company.id = sc.org_id AND company.status = 1', 
            )
            .where(condition) 
            .orderBy('scj.added_date', 'DESC') 
            .getMany();
            return result;
        }
          catch(error){
            throw new Error(error.message);
          }
    }
    async checkUserJoinChallenge(condition: any ) {
        return await this.readReplicaScheduleChallengeJoinUsersRepository.createQueryBuilder('scj')
        .where(condition)
        .select(['scj.id','scj.trek_level_id','scj.relay_race_detail','scj.added_date','scj.in_ranking', 'scj.completed_lock_locations','scj.in_week_complete','scj.in_park_complete'])
        .orderBy('scj.added_date', 'ASC')
        .getOne();
    }
}
