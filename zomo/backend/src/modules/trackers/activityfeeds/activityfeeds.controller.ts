import { TeamMembersService } from '@/modules/challenge/teammembers/teammembers.service';
import { AnctivityFeedsDto, appConstant, CommonArrayService, CommonDateService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ScheduleChallengeService } from "src/modules/challenge/schedulechallenge/schedulechallenge.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { PaginateWithFoodInput } from '../input';
import { ActivityFeedService } from "./activityfeeds.service";
import { CreateActivityFeedsInput, SyncStepsInput } from './input';
@Controller('tracker/activity-feeds')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ActivityFeedsController {
    constructor(
        private readonly activityFeedsService: ActivityFeedService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly teamMembersService: TeamMembersService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithFoodInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `food.acId !=0 AND food.status != 2 `;
            if(postData?.user_id){
                where +=`AND food.user_id = '${postData?.user_id}' `;
            }
            if(postData?.activityId){
                where +=`AND food.activityId = '${postData?.activityId}' `;
            }
            if(req.tokenUser?.role_id == appConstant.ROLE.REGISTERED && postData?.collectionDate){
                let collectionDate = postData?.collectionDate ?  this.commonDateService.getTodayDate(postData?.collectionDate) : this.commonDateService.getTodayDate();
                postData.start_date = collectionDate.clone().startOf('month').format('YYYY-MM-DD');
                postData.end_date = collectionDate.clone().endOf('month').format('YYYY-MM-DD');
            }
            if(postData?.start_date && postData?.end_date){
                where += ` AND food.collectionDate BETWEEN '${this.commonDateService.getTodayDate(postData?.start_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(postData?.end_date).format('YYYY-MM-DD')} 23:59:59'`;
            }
            if (postData?.search_str) {
                where += `AND(food.userName LIKE '%${postData?.search_str}%' OR food.parentName LIKE '%${postData?.search_str}%' OR food.activityName LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.activityFeedsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AnctivityFeedsDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.acId) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { acId: postData?.acId, status: Not(2) };
            let biometricDetails = await this.activityFeedsService.findOne(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(AnctivityFeedsDto, biometricDetails, req.lang)
            );
            let duration = this.commonDateService.formatTime(biometricDetails.duration);
            if(duration){
                biometricDetails['d_hour'] = duration.split(':')[0]
                biometricDetails['d_minutes'] = duration.split(':')[1]
                biometricDetails['d_seconds'] = duration.split(':')[2]
            }
            if(biometricDetails.startTime.includes(':')){
                biometricDetails['s_hour'] = biometricDetails.startTime.split(':')[0];
                biometricDetails['s_minutes'] = biometricDetails.startTime.split(':')[1];
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateActivityFeedsInput) {
        try {
            postData['appName'] = postData?.appName ?? 'User Entry';
            postData['user_id'] = postData?.user_id ?? req.tokenUser?.id;
            postData['userName'] = postData?.userName ?? req.tokenUser?.username;
            postData['appId'] = postData?.appId ?? ' ';
            postData['logType'] = postData?.logType ?? 'Manual';
            postData['logId'] = postData?.logId ?? 0;
            postData['activityId'] = postData?.activityId ?? 0;
            postData['parentId'] = postData?.parentId ?? 0;
            postData['parentName'] = postData?.parentName ?? ' ';
            postData['calories'] = postData?.calories ?? 0;
            postData['steps'] = postData?.steps ?? 0;
            postData['collectionDate'] = postData?.collectionDate ? this.commonDateService.getTodayDate(postData?.collectionDate).format('YYYY-MM-DD') : this.commonDateService.getTodayDate().format('YYYY-MM-DD');
            postData['isFavorite'] = postData?.isFavorite ?? ' ';
            postData['description'] = postData?.description ?? ' ';
            if(!postData?.activityName && !postData?.activityId){
                postData['activityName'] =  'default' // fot 'Activity Tracker';
                postData['activityId'] = 7;
            }
            if(postData?.startTime){
                postData['hasStartTime']   = 'true';
            }
            else{
                postData['hasStartTime']   = '';
                postData['startTime']   = '00:00';
            }
            if (
                !postData?.unit ||
                !postData?.user_id ||
                !postData?.userName ||
                !postData?.appId ||
                !postData?.logType ||
                !postData?.appName ||
                (postData?.activityId == undefined || postData?.activityId == null),
                (postData?.parentId == undefined || postData?.parentId == null),
                !postData?.parentName ||
                !postData?.activityName ||
                (postData?.calories == undefined || postData?.calories == null),
                !postData?.distance ||
                (postData?.duration == undefined || postData?.duration == null),
                (postData?.steps == undefined || postData?.steps == null),
                !postData?.hasStartTime ||
                !postData?.isFavorite ||
                (postData?.logId == undefined || postData?.logId == null),
                !postData?.startTime ||
                !postData?.timeFormat ||
                !postData?.description ||
                !postData?.collectionDate 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const activityType = this.commonService.getActivityData(postData?.activityName, postData?.unit, postData?.distance);
            postData['activityType'] = activityType['type'];
            postData['activityTypeId'] = activityType['typeId'];
            postData['distance'] = activityType['distance'];
            postData['steps'] = activityType['steps'];
            await this.activityFeedsService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ACTIVITY_LOG"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.acId) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {acId: postData?.acId, status: Not(2)};
            const recordDetails = await this.activityFeedsService.findOne(where);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.activityFeedsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {description: recordDetails}, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'DELETE_ACTIVITY_LOG'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateActivityFeedsInput) {
        try {
            if (
                !postData?.acId
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {acId: postData?.acId, status: Not(2)};
            const recordDetails = await this.activityFeedsService.findOne(where);
            if (!recordDetails) {
                await this.activityFeedsService.save(
                    postData
                );
            }
            postData['activityName'] = postData?.activityName ?? recordDetails.activityName;
            if(recordDetails.distance != postData?.distance){
                const activityType = this.commonService.getActivityData(postData?.activityName , postData?.unit, postData?.distance);
                postData['activityType'] = activityType['type'];
                postData['activityTypeId'] = activityType['typeId'];
                postData['distance'] = activityType['distance'];
                postData['steps'] = activityType['steps'];
            }
            delete postData?.unit;
            await this.activityFeedsService.update(where, postData);
            this.activityLogService.create({...recordDetails, id: recordDetails.acId}, {...postData, id: postData.acId}, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'UPDATE_ACTIVITY_LOG'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user_id = postData?.user_id ?? req.tokenUser?.id;
            let collectionDate = postData?.collectionDate ?  this.commonDateService.getTodayDate(postData?.collectionDate).format('YYYY-MM-DD') : this.commonDateService.getTodayDate().format('YYYY-MM-DD');
            let where = `food.user_id = '${user_id}' AND food.status = 1`;
            if(postData?.logType){
                where += ` AND food.logType = '${postData?.logType}'`;
            }
            if(postData?.appName){
                where += ` AND food.appName = '${postData?.appName}'`;
            }
            if(postData['collect_date']){
                where += ` AND food.collectionDate Between '${this.commonDateService.getTodayDate(postData['collect_date']['start_date']).format('YYYY-MM-DD')}' AND '${this.commonDateService.getTodayDate(postData['collect_date']['end_date']).format('YYYY-MM-DD')}'`;
            }
            let challengeDetails;
            if(postData?.schedule_id){
                challengeDetails = await this.scheduleChallengeService.findOne({
                    id: postData?.schedule_id
                });
                 if(challengeDetails){
                    if(challengeDetails?.is_set_weekend == 1){
                        let currentDateUser = this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
                        let countstepswith = challengeDetails?.countstepswith;
                        
                        const startDay:any = this.commonDateService.DateTimeFormat(challengeDetails?.start_date);
                        let dayOfWeek = startDay.day();
                        if (dayOfWeek > 0 && dayOfWeek <= 5) {
                            challengeDetails.start_date = startDay.format('YYYY-MM-DD');
                        } else {
                            challengeDetails.start_date = startDay.day(8).format('YYYY-MM-DD'); // 8 will always get us to the next Monday
                        }
                        const endDate:any = this.commonDateService.DateTimeFormat(challengeDetails?.end_date);
                        dayOfWeek = endDate.day();
                        if (dayOfWeek > 0 && dayOfWeek <= 5) {
                            challengeDetails.end_date = endDate.format('YYYY-MM-DD');
                        } else {
                            const daysSinceLastFriday = (dayOfWeek + 2) % 7;
                            challengeDetails.end_date = endDate.subtract(daysSinceLastFriday, 'days').startOf('day').format('YYYY-MM-DD');
                        }
                        where += ` AND food.collectionDate BETWEEN '${challengeDetails.start_date} 00:00:00' AND '${challengeDetails.end_date} 23:59:59'`;
                        if(postData?.logType == null || postData?.logType == undefined){
                            if (countstepswith == 'realstep') {
                                where += " AND food.logType = 'Tracker'";
                            }else{
                                where += " AND food.logType in('Tracker','Manual')";
                            }
                            where += " AND WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5";
                        }
                        where += ` AND food.collectionDate BETWEEN '${challengeDetails.start_date} 00:00:00' AND '${currentDateUser} 23:59:59'`;
                    }
                    if(challengeDetails?.challenge?.bio_challenge_type == 'Relay_race' && postData?.team_id){
                        const getMemberDetails = await this.teamMembersService.findOne({team_id: postData?.team_id, user_id: user_id, org_id: challengeDetails?.org_id, status: 1}); 
                        if(getMemberDetails && getMemberDetails?.baton_start && getMemberDetails?.baton_start != '0000-00-00'){
                            let startDate = this.commonDateService.getTodayDate(getMemberDetails?.baton_start);
                            let endDate = this.commonDateService.getTodayDate(challengeDetails?.baton_start).add(10, 'minutes');
                            where += ` AND food.collectionDate BETWEEN '${startDate.format('YYYY-MM-DD')}' AND '${endDate.format('YYYY-MM-DD')}' AND TIME(food.timestamp) BETWEEN '${startDate.format('HH:mm:ss')}' AND '${endDate.format('HH:mm:ss')}'`;
                        }
                    }
                }
            }
            if(postData?.start_date && postData?.end_date){
                if(challengeDetails){
                    if(challengeDetails.start_date && this.commonDateService.getTodayDate(postData?.start_date).isBefore(this.commonDateService.getTodayDate(challengeDetails.start_date))){
                        postData.start_date = this.commonDateService.getTodayDate(challengeDetails.start_date).format('YYYY-MM-DD')
                    }
                    let activity = [];
                    if(challengeDetails.s_activity_tracker){
                        activity.push(7)
                    }
                    if(challengeDetails.s_steps){
                        activity.push(11)
                    }
                    if(challengeDetails.s_cycling){
                        activity.push(17)
                    }
                    if(challengeDetails.s_running){
                        activity.push(16)
                    }
                    if(challengeDetails.s_swimming){
                        activity.push(18)
                    }
                    if(challengeDetails.s_walking){
                        activity.push(15)
                    }
                    if(activity.length){
                        where += ` AND (food.activityTypeId IN(${activity}) OR food.appName = 'AppleHealthKit' OR food.appName = 'GoogleFit')`;
                    }else{
                        where += ` AND (food.appName = 'AppleHealthKit' OR food.appName = 'GoogleFit')`;
                    }
                }
                where += ` AND food.collectionDate BETWEEN '${this.commonDateService.getTodayDate(postData?.start_date).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(postData?.end_date).format('YYYY-MM-DD')} 23:59:59'`;
            }else if(postData?.collectionDate){
                where += ` AND food.collectionDate = '${collectionDate}'`;
            }
            let resultedData = await this.activityFeedsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AnctivityFeedsDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('graph-stat')
    async graphStat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user_id = postData?.user_id ?? req.tokenUser?.id;
            if (
                !user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let { startOfMonth, endOfMonth } = this.commonDateService.getStartAndEndOfMonth(postData?.date);
            let where = `food.user_id = ${user_id} AND food.collectionDate BETWEEN '${startOfMonth} 00:00:00' AND '${endOfMonth} 23:59:59' AND food.status = 1`;
            let resultedData = await this.activityFeedsService.listRecord(where, { 'food.collectionDate': 'ASC' }, ['food.activityName', 'food.calories','food.steps', 'food.collectionDate']);
            let totals = {};
            resultedData.map(item => {
                let date = item.collectionDate;
                if (!totals.hasOwnProperty(date)) {
                    totals[date] = {
                        activityName: item.activityName,
                        totalSteps: 0,
                        totalCalories: 0
                    };
                }
                totals[date].totalSteps += item.steps;
                totals[date].totalCalories += item.calories;
            });
            totals = Object.keys(totals).map(date => {
                return {
                    date: date,
                    activityName: totals[date].activityName,
                    totalSteps: totals[date].totalSteps,
                    totalCalories: totals[date].totalCalories
                };
            });
            let worstDay = await this.activityFeedsService.listRecord(
                `food.user_id = ${user_id} AND food.status = 1`,
                { 'food.distance': 'ASC'},
                ['activityName', 'collectionDate', 'SUM(distance) as totalDistance', 'timestamp'],
                true
            );
            worstDay = worstDay.sort((a, b) => a.totalDistance - b.totalDistance);
            worstDay = await Promise.all(worstDay.map(async ele =>{
                if(ele.collectionDate == '0000-00-00'){
                    ele.collectionDate = this.commonDateService.getTodayDate(ele?.timestamp).format('YYYY-MM-DD');
                }
                const formattedDate = this.commonDateService.DateTimeFormat(ele.collectionDate);
                const monthName = await this.commonDateService.DateTimeFormat(formattedDate, 'MMMM');
                const translatedMonth = await this.translatorService.frontendReadTranslation(req.lang, monthName?.toString()?.substring(0, 3), `/LC_MESSAGES/Common/Month`, `static`);
                ele['collectionDate']= `${translatedMonth.toString()} ${await this.commonDateService.DateTimeFormat(formattedDate, 'D, YYYY')}`;
                return ele;
            }));
            let bestDay = await this.activityFeedsService.listRecord(
                `food.user_id = ${user_id} AND food.status = 1`,
                { 'food.distance': 'DESC'},
                ['activityName', 'collectionDate', 'SUM(distance) as totalDistance'],
                true
            );
            bestDay = bestDay.sort((a, b) => b.totalDistance - a.totalDistance);
            bestDay = await Promise.all(bestDay.map(async ele =>{
                const formattedDate = this.commonDateService.DateTimeFormat(ele.collectionDate);
                const monthName = await this.commonDateService.DateTimeFormat(formattedDate, 'MMMM');
                const translatedMonth = await this.translatorService.frontendReadTranslation(req.lang, monthName?.toString()?.substring(0, 3), `/LC_MESSAGES/Common/Month`, `static`);
                ele['collectionDate']= `${translatedMonth.toString()} ${await this.commonDateService.DateTimeFormat(formattedDate, 'D, YYYY')}`;
                return ele;
            }))
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {calenderData: totals, worstDay : worstDay, bestDay: bestDay},
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    @Post('healthkit-sync-steps')
    async syncSteps(@Req() req: Request, @Res() res: Response, @Body() postData: SyncStepsInput) {
        try {
            const user = req.tokenUser;
            let { user_id, data_type, app_name, steps, appId, timezone } = postData;
            if (!user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if((user.role_id != appConstant.ROLE.REGISTERED && user.role_id != appConstant.ROLE.SPOUSE) || user.id != user_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            const userId = user_id ?? user.id;
            timezone = timezone ?? 'UTC';
            let activity_name = '';
            let activity_type = '';
            let timestamp = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
            timestamp = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',user.timezone ?? 'UTC');
            let timestampUpdate = timestamp;
            let startTime = await this.commonDateService.DateTimeFormat(timestamp, 'HH:mm');
            let timeFormat = await this.commonDateService.DateTimeFormat(timestamp, 'a'); 
            if(data_type == 1) {
                activity_name = 'Steps';
                activity_type = 'Steps';
            }
            if(data_type == 2) {
                activity_name = 'Cycling';
                activity_type = 'Activity Tracker- Cycling';
            }
            let where = `food.user_id = '${userId}' AND food.activityName = '${activity_name}' AND food.appName in('GoogleFit','AppleHealthKit') AND food.status = 1`;
            where += ` AND food.collectionDate in(${steps.map(item => `'${item.date}'`).join(',')})`;
            let existingData = await this.activityFeedsService.listRecord(where, null,['food.acId', 'food.collectionDate', 'food.calories', 'food.steps']);
            const combinedData = existingData.reduce((acc, item) => {
                const acId = item.acId;
                const date = item.collectionDate;
                if (!acc[date]) {
                    acc[date] = {};
                }
                acc[date][acId] = item;
                return acc;
            }, {});
            let removeRecords = [];
            for(const stepEntry of steps) {
                let calories = 0;
                let duration = 0;
                let distance = 0;
                let steps = parseInt(stepEntry.steps);
                let collectionDate = this.commonDateService.getTodayDate(stepEntry.date).format('YYYY-MM-DD');
                if(data_type == 1) {
                    distance = Number((steps / 2112).toFixed(2));
                }
                if(data_type == 2) {
                    distance = Number((steps / 1147.86).toFixed(2));
                }
                if(stepEntry.calories && stepEntry.calories > 0) {
                    calories = stepEntry.calories;
                }
                let existingRecord = combinedData[collectionDate] ?? {};
                if(steps == 0){
                    let acIds = Object.keys(existingRecord)[0];
                    removeRecords.push(acIds);
                }
                if(Object.keys(existingRecord).length > 1){
                    let acIds = Object.keys(existingRecord);
                    removeRecords = [...removeRecords,...acIds];
                }
                if(Object.keys(existingRecord).length == 1){
                    let acId = Object.keys(existingRecord)[0];
                    let Update = {
                        hasStartTime: 'true',
                        startTime: startTime,
                        timeFormat: timeFormat,
                        appId,
                        timestamp: timestampUpdate,
                        distance,
                        steps,
                        duration
                    };
                    if(calories > 0){
                        Update['calories'] = calories;
                    }
                    await this.activityFeedsService.update({acId},Update);
                    this.activityLogService.create({...existingRecord[acId], id: existingRecord[acId].acId}, {...Update, id: existingRecord[acId].acId}, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, req.tokenUser?.id);
                }
                else{
                    let saveData = {
                        user_id: userId,
                        userName: user.email,
                        logType: 'Tracker',
                        appName: app_name,
                        activityName: activity_name,
                        calories,
                        distance,
                        steps,
                        duration,
                        startTime,
                        timeFormat,
                        collectionDate,
                        activityType: activity_type,
                        hasStartTime: 'true',
                        appId,
                        timezone,
                        parentName: '',
                        isFavorite: '',
                        description: '',
                        activityId: 0,
                        parentId: 0,
                        logId: 0,
                        activityTypeId: data_type == 2 ? 17 : 0,
                        timestamp: timestampUpdate
                    }
                    await this.activityFeedsService.save(saveData);
                }
            }
            if(removeRecords.length){
                await this.activityFeedsService.update({acId: In(removeRecords)},{status: 2});   
                removeRecords.map(item => {
                    this.activityLogService.create({id: item}, {status: 2}, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, req.tokenUser?.id, 'delete');
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Common_Data_Sync_Success", '/LC_MESSAGES/Api'),
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    
}