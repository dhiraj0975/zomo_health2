import { UrlManageService } from '@/modules/common';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { CommonDateService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { CommunicationTemplateTextsService } from 'src/modules/communication/templatetexts/communicationtemplatetexts.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { UserService } from 'src/modules/user/user/user.service';
import { In } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from "../../translation/translation.service";
import { AcOlympicDataService } from '../acolympicdata/acolympicdata.service';
import { BioWeightService } from '../bioweight/bioweight.service';
import { ChallengeService } from '../challenge/challenge.service';
import { DaysUsersService } from '../daysusers/daysusers.service';
import { FitnessUsersActivityService } from '../fitnessusersactivity/fitnessusersactivity.service';
import { HealthUsersActivityService } from '../healthusersactivity/healthusersactivity.service';
import { InviteUserService } from '../inviteuser/inviteuser.service';
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeJoinUsersService } from '../schedulechallengejoinusers/schedulechallengejoinusers.service';
import { SquareUsersService } from '../squareusers/squareusers.service';
import { TeamMembersService } from '../teammembers/teammembers.service';
import { TeamScheduleService } from '../teamschedule/teamschedule.service';
import { TokensService } from '../tokens/tokens.service';
import { WeeksUsersService } from '../weeksusers/weeksusers.service';
import { UserChallengeHelperService } from './userChallengeHelper.service';
import { UserScheduleChallengeService } from './userScheduleChallenge.service';
const S3_URL =  process.env.S3_URL_PROD
const moment = require('moment-timezone');
const DEFAULT_IMAGE = 'comn/img/avatar_0001.png';
@Controller('challenge/schedule-challenge')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)

export class UserScheduleChallengeController {
    constructor(
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly challengeService: ChallengeService,
        private readonly teamScheduleService: TeamScheduleService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly inviteUserService: InviteUserService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly weeksUsersService: WeeksUsersService,
        private readonly acOlympicDataService: AcOlympicDataService,
        private readonly teamMembersService: TeamMembersService,
        private readonly tokensService: TokensService,
        private readonly fitnessUsersActivityService: FitnessUsersActivityService,
        private readonly bioWeightService: BioWeightService,
        private readonly daysUsersService: DaysUsersService,
        private readonly squareUsersService: SquareUsersService,
        private readonly healthUsersActivityService: HealthUsersActivityService,
        private readonly userScheduleChallengeService: UserScheduleChallengeService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly urlManageService: UrlManageService,
        @Inject('CRON_SERVICE')
        private cronMicroservice: ClientProxy,
        private readonly notificationsService: NotificationsService,
    ) {}
    @Post('unenroll_challenge')
    async unEnroleChallenge(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let user = req.tokenUser; 
            let user_id = user?.['id']; 
            let tmember = await this.teamScheduleService.getMyTeamSchduleData(`scheduleUser.id = ${postData?.id} AND teamMember.user_id = ${user_id}`, null, 'teamMember.user_id', ['teamSchedule', 'teamMember', 'scheduleUser']);
            await this.weeksUsersService.update({schedule_id: postData?.id, user_id: user_id},{ status: 2 });
            const weekUser = await this.weeksUsersService.listRecord({schedule_id: postData?.id, user_id: user_id},postData?.id);
            weekUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_WEEKS_USERS, req.tokenUser?.id, 'cancel registration'));
            await this.daysUsersService.update({schedule_id: postData?.id, user_id: user_id},{ status: 2 });
            const dayUser = await this.daysUsersService.listRecord({schedule_id: postData?.id, user_id: user_id});
            dayUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_DAYS, req.tokenUser?.id, 'cancel registration'));
            if(postData['ctype']=='H' && postData['bctype']==''){
                await this.scheduleChallengeJoinUsersService.update({id: postData?.id, user_id: user_id, status: 1},{ status: 2 });
                this.activityLogService.create({id: postData?.id, user_id: user_id, status: 1}, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'cancel registration');
                this.notificationsService.removeEntry(`notifications.org_id = ${user?.['org_id']} AND notifications.user_id = ${user_id} AND JSON_EXTRACT(notifications.metadata, '$.schedule_id') = ${postData?.schedule_id}`);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: [],
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Registration Cancelled Successfully',`/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                });
            }
            await this.scheduleChallengeJoinUsersService.update({id: postData?.id, status: 1},{ status: 2 });
            this.activityLogService.create({id: postData?.id, status: 1}, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'cancel registration');
            await this.acOlympicDataService.update({schedule_id: postData?.id, user_id: user_id},{ status: 2 });
            const acUser = await this.acOlympicDataService.listRecord({schedule_id: postData?.id, user_id: user_id});
            acUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_AC_OLYMPIC_DATA, req.tokenUser?.id, 'cancel registration'));
            await this.fitnessUsersActivityService.update({user_id: user_id, schedule_join_id: postData?.id},{status: 2})
            const fitnessUser = await this.fitnessUsersActivityService.listRecord({user_id: user_id, schedule_join_id: postData?.id});
            fitnessUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_FITNESS_USERS_ACTIVITY, req.tokenUser?.id, 'cancel registration'));
            await this.bioWeightService.update({user_id: user_id, schedule_join_id: postData?.id},{status: 2});
            const bioUser = await this.bioWeightService.listRecord({user_id: user_id, schedule_join_id: postData?.id});
            bioUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_BIO_WEIGHT, req.tokenUser?.id, 'cancel registration'));
            if(postData?.schedule_id){
                await this.squareUsersService.update({schedule_id: postData?.schedule_id, user_id: user_id},{status:2})
                const squareUser = await this.squareUsersService.listRecord({schedule_id: postData?.schedule_id, user_id: user_id});
                squareUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SQUARE_USERS, req.tokenUser?.id, 'cancel registration'));
            }
            if(tmember?.length && tmember?.[0]['teamMember']['team_id']){
                let teamid = tmember?.[0]['teamMember']['team_id'];
                let scheduleInfo= await this.scheduleChallengeService.findOne({id: tmember[0]['scheduleUser']['schedule_id'],org_id: tmember[0]['teamMember']['org_id'], status: 1});
                if(scheduleInfo){
                    if(postData['bctype'] == "Relay_race"){
                        postData['team_id'] = teamid;
                        postData['schedule_id'] = postData?.id;
                        postData['team_member_id'] = tmember[0]['teamMember']['id'];
                        await this.userChallengeHelperService.updateMemberReOrder('delete',postData, req);
                    }
                    if(scheduleInfo['lock_teams'] == "No"){
                       await this.teamMembersService.update({id: tmember[0]['teamMember']['id'],team_id: teamid, user_id: user_id},{status:2});  
                       const squareUser = await this.teamMembersService.listRecord({team_id: teamid, user_id: user_id});
                        squareUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id, 'cancel registration'));
                    }else{
                        await this.teamMembersService.update({id: tmember[0]['teamMember']['id'],team_id: teamid, user_id: user_id},{status:3});  
                    }                      
               }
            }
            this.notificationsService.removeEntry(`notifications.org_id = ${user?.['org_id']} AND notifications.user_id = ${user_id} AND JSON_EXTRACT(notifications.metadata, '$.schedule_id') = ${postData?.schedule_id}`);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: [],
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Registration Cancelled Successfully',`/LC_MESSAGES/Challenge/MyChallenges`,`static`)
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
    @Post('add-activity')
    async addActivity(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            if (!postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let message = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ACTIVITY_LOG");
            let record = await this.scheduleChallengeService.findOne({id: postData?.challenge_id})
            postData['schedule_id'] = record?.id
            postData['user_id'] = postData['user_id'] ?? req.tokenUser?.id;
            postData['org_id'] = postData['org_id'] ?? req.tokenUser?.org_id;
            if (record && record['challenge'] && record['challenge']['challenge_type']?.trim() === "A") {
                switch (record['challenge']['bio_challenge_type']) {
                    case "Olympics":
                        await this.userScheduleChallengeService.add_bio_activity(postData, req);
                        break;
                    case "Fitness":
                        await this.userScheduleChallengeService.add_fitness_activity(postData, req);
                        message = await this.translatorService.frontendReadTranslation(req.lang, "Activity Successfully Added", `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                        break;
                }
            }
            if (record['challenge']['challenge_type'] == "B") {
                if (record['challenge']['bio_challenge_type'] == "Football") {      
                }else if (record['challenge']['bio_challenge_type'] == "Weight_progress") {   
                }else if (record['challenge']['bio_challenge_type'] == "Weight_progress_withoutTeam") {       
                } 
            }
            if (record['challenge']['challenge_type'] == "H") {
                if (record['challenge']['bio_challenge_type'] == "Bingo_layout") {  
                } else if (record['challenge']['bio_challenge_type'] == "Healthy_habit_activity_layout") {         
                } else if (record['is_all_activities'] == 1) {        
                } else {          
                } 
                if(postData?.action == 'add' && postData?.act_id){
                    await this.healthUsersActivityService.save({
                        act_id: postData?.act_id,
                        miles: postData?.miles,
                        org_id: postData?.org_id,
                        user_id: postData['user_id'],
                        created_by: postData['user_id'],
                        updated_by: postData['user_id'],
                    });
                }
            }
            if(record['challenge']['challenge_type'] == "R"){                                   
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: [],
                message,
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
    @Post('square-verification')
    async squareVerification(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let result;
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.verified_status = postData?.verified_userid ? 0 : 1;
            postData.verified_userid = postData?.verified_userid ?? req.tokenUser?.id;
            if (!postData?.type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let notificationData = {
                title: 'Square Verification Invite',
                logo: S3_URL + postData?.custom_logo, 
                type: 'update'
            };
            if (postData?.type == 'add') {
                if(postData['frequencydata'] && postData['frequencylimit'] && postData['frequencylimit']!='' && postData['frequencylimit']!=0 && (postData['frequencydata']=='daily' || postData['frequencydata']=='weekly' || postData['frequencydata']=='monthly')){
                    if(postData['frequencydata']=='daily'){
                        let frqdata = await this.squareUsersService.listRecord(`squareuser.user_id = ${postData?.user_id} AND squareuser.status != 2 AND squareuser.schedule_id = ${postData?.schedule_id} AND DATE_FORMAT(squareuser.created_date,"%Y-%m-%d") = '${this.commonDateService.getTodayDate().format('YYYY-MM-DD')}'`,null,'square_id, DATE_FORMAT(`created_date`,"%Y-%m-%d")');
                        if(frqdata?.length>= postData['frequencylimit'] && !frqdata[postData['square_id']]){
                            let errorMsgTrans1 = await this.translatorService.frontendReadTranslation(req.lang,'You can only complete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let errorMsgTrans = errorMsgTrans1;
                            errorMsgTrans1 = await this.translatorService.frontendReadTranslation(req.lang,'Bingo square per day', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            errorMsgTrans = errorMsgTrans + ' ' + postData['frequencylimit'] + ' ' + errorMsgTrans1 + '.';
                            throw new Error(errorMsgTrans);
                        }
                    }
                    if(postData['frequencydata']=='weekly'){
                        let frqdata = await this.squareUsersService.listRecord(`squareuser.user_id = ${postData?.user_id} AND squareuser.status != 2 AND squareuser.schedule_id = ${postData?.schedule_id} AND DATE_FORMAT(squareuser.created_date,"%Y%u") = DATE_FORMAT('${this.commonDateService.getTodayDate().format('YYYY-MM-DD')}',"%Y%u")`,null,'square_id, DATE_FORMAT(`created_date`,"%Y%u")');
                        if(frqdata?.length>= postData['frequencylimit'] && !frqdata[postData['square_id']]){
                            let errorMsgTrans1 = await this.translatorService.frontendReadTranslation(req.lang,'You can only complete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let errorMsgTrans = errorMsgTrans1;
                            errorMsgTrans1 = await this.translatorService.frontendReadTranslation(req.lang,'Bingo square per week', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            errorMsgTrans = errorMsgTrans + ' ' + postData['frequencylimit'] + ' ' + errorMsgTrans1 + '.';
                            throw new Error(errorMsgTrans);
                        }
                    }
                    if(postData['frequencydata']=='monthly'){
                        let frqdata = await this.squareUsersService.listRecord(`squareuser.user_id = ${postData?.user_id} AND squareuser.status != 2 AND squareuser.schedule_id = ${postData?.schedule_id} AND DATE_FORMAT(squareuser.created_date,"%Y-%m") = '${this.commonDateService.getTodayDate().format('YYYY-MM')}'`,null,'square_id, DATE_FORMAT(`created_date`,"%Y-%m")');
                        if(frqdata?.length>= postData['frequencylimit'] && !frqdata[postData['square_id']]){
                            let errorMsgTrans1 = await this.translatorService.frontendReadTranslation(req.lang,'You can only complete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let errorMsgTrans = errorMsgTrans1;
                            errorMsgTrans1 = await this.translatorService.frontendReadTranslation(req.lang,'Bingo square per month', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            errorMsgTrans = errorMsgTrans + ' ' + postData['frequencylimit'] + ' ' + errorMsgTrans1 + '.';
                            throw new Error(errorMsgTrans);
                        }
                    }   
               }
               let check = await this.squareUsersService.findOne({square_id: postData?.square_id, user_id: postData?.user_id,card_id: postData?.card_id, schedule_id: postData?.schedule_id, status: 1 , verified_userid: postData?.verified_userid});
                if(check){
                    let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,'Challenge_Verification_Already_Sent', `/LC_MESSAGES/Api`,`static`);
                    throw new Error(errorMsgTrans);
                }
                let savedData = await this.squareUsersService.save({
                    verified_status: postData?.verified_status,
                    status: 1, 
                    verified_userid: postData?.verified_userid,
                    user_id: postData?.user_id,
                    schedule_id: postData?.schedule_id,
                    square_id: postData?.square_id,
                    card_id: postData?.card_id
                });
                postData.id = savedData?.['id'];
            }
            if (postData?.type == 'remove') {
                await this.squareUsersService.update({id: postData?.id, user_id: req.tokenUser?.id},{status: 2});
                this.activityLogService.create({id: postData?.id, user_id: req.tokenUser?.id, status: 1}, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SQUARE_USERS, req.tokenUser?.id, 'delete');
                this.notificationsService.removeEntry(`notifications.org_id = ${postData?.['org_id']} AND notifications.user_id = ${postData?.user_id} AND JSON_EXTRACT(notifications.metadata, '$.id') = ${postData?.id}`);
            }           
            if (postData?.type == 'verify') {
                await this.squareUsersService.update({id: postData?.id, verified_userid: req.tokenUser?.id},{verified_status: 1});
                this.activityLogService.create({id: postData?.id, verified_userid: req.tokenUser?.id, verified_status: 0}, {verified_status: 1}, tableConstant.CHALLENGE.TBL_CH_SQUARE_USERS, req.tokenUser?.id, 'verify');
            }    
            if(postData?.id && postData?.type != 'remove'){
                let verificationRequest: any = await this.squareUsersService.GetVerificationRequest(`squareuser.id = ${postData?.id}`);
                verificationRequest = verificationRequest?.[0];
                if (postData?.type == 'add') {
                    notificationData['message'] = `You have been Invited for Square Verification by ${verificationRequest?.user?.first_name} ${verificationRequest?.user?.last_name}.`;
                }
                if (postData?.type == 'verify') {
                    notificationData['message'] = `Your Square Verification is verified by ${verificationRequest?.verified_user?.first_name} ${verificationRequest?.verified_user?.last_name}.`;
                }
                Object.assign(notificationData, {
                    id: verificationRequest?.id, 
                    schedule_id: verificationRequest?.schedule_id, 
                    org_id: verificationRequest?.sc?.org_id ?? verificationRequest?.square?.org_id, 
                    user_id: verificationRequest?.verified_userid,
                    custom_cname: verificationRequest?.sc?.custom_cname, 
                    square_id: verificationRequest?.square_id,
                    card_id: verificationRequest?.card_id,
                    url: `https://${process.env.DOMAIN}/my-challenges/${verificationRequest?.schedule_id}`,
                    send_type: 1,
                    square_data: verificationRequest,
                })
                this.userChallengeHelperService.addNotification(notificationData, req);      
            } 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.verified_userid && postData?.verified_userid != req.tokenUser?.id ? "Card Verfication Invite Sent Successfully." : "Successfully Completed."),
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
    @Post('add-remove-captain')
    async addRemoveCaptain(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            if (!postData?.team_id || !postData?.user_id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let result = await this.userChallengeHelperService.captain_activity(postData,req);      
            let message
            if(postData?.action == 'add'){
                message = 'The Team Captian Has Been Added Successfully.'
            }      
            if(postData?.action == 'assign'){
                message = 'The Team Captain Has Been Assigned.'
            }
            if(postData?.action == 'un-assign' && postData?.action != 'assign'){
                message = 'The Team Captain Has Been Removed.'
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, message)
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

    @Post('search-user')
    async searchUser(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let userData = req.tokenUser;
            let is_team = postData?.is_team;
            let team_id = postData?.team_id;
            let search = postData?.search;
            let schedule_id = postData?.schedule_id;
            let search_for = postData?.search_for;
            let membershipcode = userData.membership_code;
            let user_id = userData.id;
            let org_id = userData.org_id;
            let role_id = userData.role_id;
            const getScheduleDetails = await this.scheduleChallengeService.scheduleChallegeData({id: postData?.schedule_id});
            let users:any = Object.create(null);
            if(getScheduleDetails){
                if(getScheduleDetails['ch']['bio_challenge_type'] == 'Random_Acts_of_Kindness' && search_for == 'send search'){
                    let is_search_type = getScheduleDetails['whocanreceiveatoken'];
                    if(is_team == 'no'){
                        users = await this.userService.usersList(`user.role_id IN (2,16) AND user.id != ${user_id} AND user.org_id = ${org_id} AND user.status = 1 AND user.membership_code = '${membershipcode}' AND (user.first_name LIKE '%${search}%' OR user.last_name LIKE '%${search}%' OR user.email LIKE '%${search}%' OR user.code LIKE '%${search}%')`,['id','CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) AS name','email','code']);
                    }else{
                        let check_team: any = '';
                        if(schedule_id && schedule_id != ''){
                            check_team = await this.teamMembersService.getTeamMembersIds(`teamMember.team_id = ${team_id} AND teamMember.org_id = ${org_id}`,'string');
                            if(check_team == ''){
                                check_team = user_id;
                            }
                        }
                        let condition = '';
                        if(is_search_type == 0){
                            condition = `user.role_id IN (2,16) AND user.org_id = ${org_id} AND user.id != ${user_id} AND user.status = 1 AND user.membership_code = '${membershipcode}' AND (user.first_name LIKE '%${search}%' OR user.last_name LIKE '%${search}%' OR CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) LIKE '%${search}%' OR user.email LIKE '%${search}%' OR user.code LIKE '%${search}%')`
                        }else{
                            condition = `user.role_id IN (2,16) AND user.org_id = ${org_id} AND user.id NOT IN (${check_team}) AND user.status = 1 AND user.membership_code = '${membershipcode}' AND (user.first_name LIKE '%${search}%' OR user.last_name LIKE '%${search}%' OR CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) LIKE '%${search}%' OR user.email LIKE '%${search}%' OR user.code LIKE '%${search}%')`
                        }
                        users = await this.userService.usersList(condition,['id','CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) AS name','email','code']);
                    }
                }else{
                    let userIds: any[] = [];
                    userIds.push(user_id);
                    const invitedUser = schedule_id != '' ? await this.inviteUserService.listRecord(`invitedUser.schedule_id = ${schedule_id} AND invitedUser.status= 1`) : [];
                    const challengeMembers = await this.scheduleChallengeJoinUsersService.listRecord(`scj.schedule_id = ${schedule_id} AND scj.status != 2 AND user.status = 1 AND user.org_id = '${org_id}'`, '' , ['scj.user_id']);
                    let allUsersIdArray = challengeMembers.map(member => member?.user_id ? member?.user_id : '');
                    userIds = [...new Set([...userIds, ...allUsersIdArray])];
                    let condition = `user.role_id IN (2,16) AND user.org_id = ${org_id} AND user.id NOT IN (${user_id}) AND user.status = 1 AND user.membership_code = '${membershipcode}' AND (user.first_name LIKE '%${search}%' OR user.last_name LIKE '%${search}%' OR CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) LIKE '%${search}%' OR user.email LIKE '%${search}%' OR user.code LIKE '%${search}%') `
                    let allUsersId = '';
                    if(role_id == 12){
                        const usersDataWellness = await this.userService.userChallengeData(userData);
                        if (usersDataWellness && usersDataWellness.length > 0) {
                            let allUsersIdArray = usersDataWellness.map(member => member?.id ? member?.id : '');
                            allUsersId = allUsersIdArray.filter(item => item !== '').join(',');
                            if(allUsersId != ''){
                                condition += ` AND user.id IN (${allUsersId})`;
                            }else{
                                condition += ` AND user.id IN (0)`;
                            }
                        }
                    }
                    if([2,16,11].includes(role_id)){
                        let createdBy = getScheduleDetails['created_by'];
                        const getUserDetails = await this.userService.findUserFullRecord(`user.id = ${createdBy}`,['user.id','user.role_id','user.org_id','user.membership_code']);
                        if(getUserDetails && getUserDetails['role_id'] == 12){
                            const usersDataWellness = await this.userService.userChallengeData(getUserDetails);
                            if(usersDataWellness){
                                let ChampallUsersIdArray = usersDataWellness.map(member => member?.id ? member?.id : '');
                                allUsersId = ChampallUsersIdArray.filter(item => item !== '').join(',');
                                if(allUsersId != ''){
                                    condition += ` AND user.id IN (${allUsersId})`;
                                }else{
                                    condition += ` AND user.id IN (0)`;
                                }
                            }
                        }
                    }
                    users = await this.userService.usersList(condition,['id','CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) AS name','email','code']);
                }
            }
            if(users?.length){
                await Promise.all(users.map(async (ele)=>{
                    ele['code_full_name'] = ele['code'] + ' - ' + ele['name'];
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: users,
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
    /* RANDOM ACT OF KINDNESS CHALLENGE */
    @Post('get-comments')
    async getComments(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let schedule_id = postData?.schedule_id;
            let org_id = req.tokenUser?.org_id;
            let user_id = req.tokenUser?.id;
            let team_id = postData?.team_id || '';
            let load_type = postData?.load_type || 'given';
            const getScheduleDetails = await this.scheduleChallengeService.scheduleChallegeData({id: postData?.schedule_id});
            if (getScheduleDetails) {
                let token_type = 'earn';
                if(getScheduleDetails['requirement_base_on'] == 0){
                    token_type = 'given';
                }
                let condition = `t.schedule_id = ${schedule_id}`;
                let is_team = getScheduleDetails['team'];
                if(is_team == 1){
                    let getTeamMembers = await this.teamMembersService.getTeamMembersIds(`teamMember.team_id = ${team_id} AND teamMember.status = 1`,'string');
                    if(load_type == 'given'){
                        condition += ` AND t.user_id IN (${getTeamMembers})`;
                    }else{
                        condition += ` AND t.to_user_id IN (${getTeamMembers})`;
                    }
                }else{
                    if(load_type == 'given'){
                        condition += ` AND t.user_id = ${user_id}`;
                    }else{
                        condition += ` AND t.to_user_id = ${user_id}`;
                    }
                }
                let getComments = await this.tokensService.getComments(condition, postData as any);
                getComments['list'] = await Promise.all(getComments['list'].map(async (comment) => {
                    if(comment['from_user_image'] && comment['from_user_image'] != '' && comment['from_user_image'] != null){
                        if(await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: comment['from_user_image']}))){
                            comment['from_user_image'] = S3_URL + comment['from_user_image'];
                        }else{
                            comment['from_user_image'] = S3_URL + DEFAULT_IMAGE;
                        }
                    }else{
                        comment['from_user_image'] = S3_URL + DEFAULT_IMAGE;
                    }
                    if(comment['t_submission_date']){
                        comment['t_submission_date'] = moment(comment['t_submission_date']).format('YYYY-MM-DD HH:mm:ss');
                    }
                    return {
                        ...comment
                    };
                })); 
                return res.json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    message: 'success',
                    data: getComments,
                });
            }
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
    /* RANDOM ACT OF KINDNESS CHALLENGE */

    @Post('delete-team-member')
    async deleteTeamMember(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.team_id || !postData?.team_member_id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let userDatas = Object.create(req.tokenUser);
            let schedule_id = postData?.schedule_id;
            let org_id = userDatas.org_id;
            let team_member_id = postData?.team_member_id;
            const checkTeamMember = await this.teamMembersService.findOne({id: postData?.team_member_id, team_id: postData?.team_id, status: 1});
            if(checkTeamMember !== null){
                const getScheduleDetails = await this.scheduleChallengeService.scheduleChallegeData({id: schedule_id});
                let teamUserId = checkTeamMember['user_id'];
                let teamId = checkTeamMember['team_id'];
                await this.scheduleChallengeJoinUsersService.update({schedule_id: schedule_id, user_id: teamUserId, status: 1},{status: 2});
                const joinUser = await this.scheduleChallengeJoinUsersService.listRecord({schedule_id: schedule_id, user_id: teamUserId})
                joinUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'remove member'));
                const removeMembere = await this.teamMembersService.update({team_id: teamId, id: team_member_id},{status:2});
                if(removeMembere?.affected > 0 && getScheduleDetails?.['ch']?.bio_challenge_type == 'Relay_race'){
                    await this.userChallengeHelperService.updateMemberReOrder('delete', postData, req);
                }
                const teamMember = await this.teamMembersService.listRecord({team_id: teamId, id: team_member_id})
                teamMember?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id, 'remove member'));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success',
                });
            }else{
                let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Sorry! team member already deleted or not found`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                throw new Error(errorMsgTrans);
            }
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

    /* MOVE MORE CHALLENGE */
    @Post('unlock-park-location')
    async unLockParkLocation(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let userDatas = Object.create(req.tokenUser);
            let schedule_id = postData?.schedule_id;
            let park_id = postData?.park_id;
            let join_id = postData?.join_id;
            let org_id = userDatas.org_id;
            let user_id = userDatas.id;
            let statusCode = 200;
            let success = 1;
            let error = 0;
            let message = 'success';
            const getScheduleDetails = await this.scheduleChallengeService.scheduleChallegeData({id: postData?.schedule_id});
            if (getScheduleDetails) {
                const getScheduleUser = await this.scheduleChallengeJoinUsersService.findOne({id: join_id});
                if (getScheduleUser) {
                    let completed_lock_locations = (getScheduleUser?.['completed_lock_locations']) ? JSON.parse(getScheduleUser['completed_lock_locations']) : [];
                    if(!completed_lock_locations.includes(park_id)){
                        completed_lock_locations.push(park_id);
                    }
                    let update_completed_lock_locations = JSON.stringify(completed_lock_locations);
                    await this.scheduleChallengeJoinUsersService.update({ id: join_id, schedule_id: schedule_id, status: 1},{completed_lock_locations : update_completed_lock_locations});
                    message = 'Next Location unlocked successfully';
                }else{
                    statusCode = 401;
                    success = 0;
                    error = 1;
                    message = 'Sorry! you are not join this challenge';
                }
            }else{
                statusCode = 401;
                success = 0;
                error = 1;
                message = 'Challenge not found';
            }
            return res.json({
                statusCode: statusCode,
                success: success,
                error: error,
                message: message,
                data: null,
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
    /* MOVE MORE CHALLENGE */
    /* RELAY RACE CHALLENGE */
    @Post('relay-race-baton-status')
    async RelayRaceBatonStatus(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let userDatas = Object.create(req.tokenUser);
            let schedule_id = postData?.schedule_id;
            let team_member_id = postData?.team_member_id;
            let action = postData?.action;
            let join_id = postData?.join_id;
            let org_id = userDatas.org_id;
            let user_id = userDatas.id;
            let orgName = userDatas.company.company_name;
            let statusCode = 200;
            let success = 1;
            let error = 0;
            let message = 'success';
            const getScheduleDetails = await this.scheduleChallengeService.scheduleChallegeData({id: schedule_id});
            let isDuplicate = 0;
            if (getScheduleDetails) {
                let hide_start_baton = (getScheduleDetails?.['hide_history']) ? getScheduleDetails?.['hide_history'] : 0;
                let auto_email_setting = (getScheduleDetails?.['auto_email']) ? getScheduleDetails?.['auto_email'] : 0;
                let time_elapsed = (getScheduleDetails?.['time_elapsed']) ? getScheduleDetails?.['time_elapsed'] : 0;
                const joinTableList = [{'alias':'scheduleJoin', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = ${schedule_id} AND scheduleJoin.status != 2` }];
                if(team_member_id == 0){
                    isDuplicate = 1;
                    const getMemberDetails = await this.teamMembersService.findOne({org_id: postData?.org_id, user_id: postData?.user_id, team_id: postData?.team_id, status: 1});
                    team_member_id = getMemberDetails ? getMemberDetails.id : team_member_id;
                }
                const getMemberDetails = await this.teamMembersService.findOne({id: team_member_id, status: 1}, null ,joinTableList);
                if (getMemberDetails && getMemberDetails['user_id'] == user_id) {
                    let team_id = getMemberDetails?.['team_id'];
                    let baton_status = getMemberDetails?.['baton_status'];
                    let user_order = getMemberDetails?.['user_order'];
                    const getMemberList = await this.teamMembersService.listRecord({team_id: team_id, org_id, status: 1});
                    if(baton_status == 1){
                        if(action == 'accept'){
                            const currnetDate = moment().utc().format('YYYY-MM-DD HH:mm:ss');
                            const updateAcc = await this.teamMembersService.update({id: team_member_id, org_id: org_id, user_id: user_id, status: 1}, {baton_status: 2, baton_start: currnetDate});
                            if(user_order == 3){
                                let type = 35;
                                let templateText = await this.communicationTemplateTextService.findOne({org_id:In([org_id,0]),type}) 
                                if(templateText){
                                    templateText['new_text'] = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                }
                                if(getMemberList && getMemberList.length > 0){
                                    for (let teamMember of getMemberList) {
                                        let date = this.commonDateService.getTodayDate().add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
                                        let team_name = teamMember?.['team']?.tname ? teamMember?.['team']?.tname : '';
                                        let toEmail = teamMember['users'].email;
                                        let full_name = teamMember['users'].first_name + ' ' + teamMember['users'].last_name;
                                        let subject = `And that’s a wrap (${team_name})! `;
                                        let emailDetails = Object.create(null);
                                        emailDetails['type'] = type;
                                        emailDetails['Company Name'] = userDatas?.company?.company_name;
                                        emailDetails['First Name'] = full_name;
                                        let emaildata = {
                                            sender: ``,
                                            receiver: toEmail,
                                            subject: subject,
                                            content: emailDetails,
                                            template: templateText?.['new_text'] || templateText?.['text']
                                        }
                                        await lastValueFrom(this.cronMicroservice.send({ cmd: 'manual_cron_start' }, { name: 'schedule-email', ...emaildata, time: date }));
                                    }
                                }
                            } else if(updateAcc?.affected > 0){
                                message = 'Your turn is successfully started';
                                let popupDetails = (getMemberDetails?.['scheduleJoin']?.['relay_race_detail']) ? JSON.parse(getMemberDetails['scheduleJoin']['relay_race_detail']) : Object.create(null);
                                let popupStatusArray:any = Object.create(null);
                                if(popupDetails == null || Object.keys(popupDetails).length == 0){
                                    popupStatusArray['join'] = '';
                                    popupStatusArray['passbaton'] = '';
                                    popupStatusArray['completeteam'] = '';                    
                                    popupStatusArray['accept'] =  1 ;                    
                                    popupStatusArray['current'] = '';    
                                    popupStatusArray['next'] = '';    
                                    popupStatusArray['beginning_mail'] = '';    
                                }else{
                                    if ('accept' in popupDetails) {
                                        popupStatusArray = JSON.parse(JSON.stringify(popupDetails));
                                        popupDetails.accept = 2;
                                        popupStatusArray.accept = 2;
                                    }
                                }    
                                if(Object.keys(popupStatusArray).length > 0){
                                    const updateJoinUser = await this.scheduleChallengeJoinUsersService.update({ id: join_id, schedule_id: schedule_id, user_id: user_id, status: 1 }, { relay_race_detail : JSON.stringify(popupStatusArray) });
                                }
                                if(auto_email_setting == 0 && user_order == 1){
                                    let skipedUserName = userDatas.first_name + ' ' + userDatas.last_name;
                                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `teamMember.user_id = user.id AND teamMember.status = 1` }];
                                    let nextGetBatonUser = await this.teamMembersService.findOne({team_id: team_id, org_id: org_id, baton_status: In([1,0]), user_order: user_order+1, status: 1},'',joinTableList);
                                    let getbatonUserName = nextGetBatonUser ? nextGetBatonUser?.['user']?.first_name + ' ' + nextGetBatonUser?.['user']?.last_name : null;
                                    const myTeamMembsers = await this.teamMembersService.teamDetails(`teamMember.team_id = ${team_id} AND teamMember.status = 1 AND users.status = 1`);
                                    if(myTeamMembsers && myTeamMembsers.length > 0){
                                        for (let teamMember of myTeamMembsers) {
                                            let toEmail = teamMember['users'].email;
                                            let emailDetails = Object.create(null);
                                            emailDetails['type'] = 32;
                                            emailDetails['name'] = teamMember['users'].first_name + ' ' + teamMember['users'].last_name;
                                            emailDetails['racer1'] = skipedUserName;
                                            emailDetails['racer2'] = getbatonUserName ?? teamMember['users'].first_name + ' ' + teamMember['users'].last_name;
                                            emailDetails['company_name'] = orgName;
                                            emailDetails['team_name'] = teamMember['team'].tname;
                                            const templateText = await this.communicationTemplateTextService.findOne({org_id: In([postData?.org_id,0]), type: 32});
                                            if(templateText){
                                                templateText['new_text'] = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                            }
                                            let emaildata = {
                                                sender: ``,
                                                receiver: toEmail,
                                                subject: 'The Virtual Relay Race Begins Now!',
                                                content: emailDetails,
                                                template: templateText?.['new_text'] || templateText?.['text']
                                            }
                                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                                        }
                                    }
                                }
                            }else{
                                statusCode = 401;
                                message = 'Sorry! your turn is not started';
                            }
                        }else if(action == 'skip'){
                            let last_order = await this.teamMembersService.getMaxOrder(`teamMember.team_id = ${team_id} AND teamMember.org_id =${org_id} AND scheduleJoin.schedule_id = ${schedule_id} AND teamMember.status = 1 AND scheduleJoin.status != 2`);
                            let updateOrder = await this.teamMembersService.update(`team_id = ${team_id} AND org_id =${org_id} AND baton_status != 3 AND user_order != 1 and user_order > ${user_order} AND status = 1`, {user_order: () => '`user_order` - 1'});
                            const updateSkip = await this.teamMembersService.update({id: team_member_id, org_id: org_id, user_id: user_id, status: 1}, {user_order: last_order, baton_status: 0});
                            const updatePass = await this.teamMembersService.update({team_id: team_id, org_id: org_id, user_order: user_order, status: 1}, {baton_status: 1});
                            if(updatePass.affected > 0){
                                message = 'Your turn is successfully skipped';
                                if(auto_email_setting == 0){
                                    let skipedUserName = userDatas.first_name + ' ' + userDatas.last_name;
                                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `teamMember.user_id = user.id AND teamMember.status = 1` }];
                                    let nextGetBatonUser = await this.teamMembersService.findOne({team_id: team_id, org_id: org_id, baton_status: 1, status: 1},'',joinTableList);
                                    let getbatonUserName = nextGetBatonUser ? nextGetBatonUser?.['user'].first_name + ' ' + nextGetBatonUser?.['user'].last_name : null;
                                    const myTeamMembsers = await this.teamMembersService.teamDetails(`teamMember.team_id = ${team_id} AND teamMember.status = 1 AND users.status = 1`);
                                    if(myTeamMembsers && myTeamMembsers.length > 0){
                                        if(!getbatonUserName || skipedUserName == getbatonUserName){
                                            if(myTeamMembsers.length > 1){
                                                getbatonUserName = myTeamMembsers[0]['users'].first_name + ' ' + myTeamMembsers[0]['users'].last_name;
                                                if(skipedUserName == getbatonUserName){
                                                    getbatonUserName = myTeamMembsers?.[1]?.['users']?.first_name + ' ' + myTeamMembsers?.[1]?.['users']?.last_name;
                                                     if(skipedUserName == getbatonUserName){
                                                        getbatonUserName = myTeamMembsers?.[2]?.['users']?.first_name + ' ' + myTeamMembsers?.[2]?.['users']?.last_name;
                                                    }
                                                }
                                            }
                                        }
                                        for (let teamMember of myTeamMembsers) {
                                            let toEmail = teamMember['users'].email;
                                            let emailDetails = Object.create(null);
                                            emailDetails['type'] = 34;
                                            emailDetails['name'] = teamMember['users'].first_name + ' ' + teamMember['users'].last_name;
                                            emailDetails['racer1'] = skipedUserName;
                                            emailDetails['racer2'] = getbatonUserName ?? teamMember['users'].first_name + ' ' + teamMember['users'].last_name;
                                            emailDetails['company_name'] = orgName;
                                            emailDetails['team_name'] = teamMember['team'].tname;
                                            const templateText = await this.communicationTemplateTextService.findOne({org_id: In([postData?.org_id,0]), type: 34});
                                            if(templateText){
                                                templateText['new_text'] = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                            }
                                            let emaildata = {
                                                sender: ``,
                                                receiver: toEmail,
                                                subject: 'Virtual Relay Race - The Baton Has Been Passed!',
                                                content: emailDetails,
                                                template: templateText?.['new_text'] || templateText?.['text']
                                            }
                                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                                        }
                                    }
                                }
                                let popupDetails = (getMemberDetails?.['scheduleJoin']?.['relay_race_detail']) ? JSON.parse(getMemberDetails['scheduleJoin']['relay_race_detail']) : Object.create(null);
                                let popupStatusArray:any = Object.create(null);
                                if(popupDetails == null || Object.keys(popupDetails).length == 0){
                                    popupStatusArray['join'] = '1';
                                    popupStatusArray['passbaton'] = '';
                                    popupStatusArray['completeteam'] = '';                    
                                    popupStatusArray['accept'] =  '';       
                                    if(hide_start_baton == 1){
                                        popupStatusArray['accept'] =  '';       
                                    }             
                                    popupStatusArray['current'] = '';    
                                    popupStatusArray['next'] = '';    
                                    popupStatusArray['beginning_mail'] = '';    
                                }else{
                                    if ('accept' in popupDetails) {
                                        popupStatusArray = JSON.parse(JSON.stringify(popupDetails));
                                        popupDetails.accept = 2;
                                        popupStatusArray.accept = 2;
                                        if(hide_start_baton == 1){
                                            popupDetails.accept =  '';   
                                            popupStatusArray.accept = '';    
                                        } 
                                    }
                                }    
                                if(Object.keys(popupStatusArray).length > 0){
                                    const updateJoinUser = await this.scheduleChallengeJoinUsersService.update({ id: join_id, schedule_id: schedule_id, user_id: user_id, status: 1 }, { relay_race_detail : JSON.stringify(popupStatusArray) });
                                }
                            }
                        }
                    }else if(baton_status == 2){
                        if(action == 'complete'){
                            let nextUserOrder = user_order + 1;
                            let complatedUserId = getMemberDetails?.['user_id'];
                            const updateComplete = await this.teamMembersService.update({id: team_member_id, org_id: org_id, user_id: complatedUserId, status: 1}, {baton_status: 3});
                            let sendEmailStatus = 0;
                            let updatePass = Object.create(null);
                            if(updateComplete.affected > 0){
                                message = 'Your turn is successfully completed';
                                if(hide_start_baton == 1){
                                    let lastMemberBatonStart = getMemberDetails?.['baton_start'];
                                    let nextMemberStartDate = moment.utc(lastMemberBatonStart).clone().add(time_elapsed, 'minutes');
                                    nextMemberStartDate = nextMemberStartDate.format('YYYY-MM-DD HH:mm:ss');
                                    updatePass = await this.teamMembersService.update({team_id: team_id, org_id: org_id, user_order: nextUserOrder, status: 1}, {baton_status: 2, baton_start: nextMemberStartDate});
                                }else{
                                    updatePass = await this.teamMembersService.update({team_id: team_id, org_id: org_id, user_order: nextUserOrder, status: 1}, {baton_status: 1});
                                }
                                if(updatePass?.affected > 0){
                                    sendEmailStatus = 1;
                                }
                            }
                            if(sendEmailStatus == 1 && auto_email_setting == 0){
                                let turnComplete = Object.create(null);
                                if(!turnComplete[team_id]){    
                                    turnComplete[team_id] = [];
                                }
                                if(!turnComplete[team_id]['userData']){    
                                    turnComplete[team_id]['userData'] = [];
                                }
                                const joinTableList = [{'alias':'scheduleJoin', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = ${schedule_id} AND scheduleJoin.status != 2` },{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `teamMember.user_id = user.id AND teamMember.status != 2` }];
                                const getCompleteMemberDetails = await this.teamMembersService.findOne(`teamMember.id = ${team_member_id} AND teamMember.team_id = ${team_id} AND scheduleJoin.schedule_id = ${schedule_id} AND teamMember.status = 1`, null ,joinTableList);
                                turnComplete[team_id]['schedule_id'] = schedule_id;
                                turnComplete[team_id]['userData'].push(getCompleteMemberDetails);
                                await this.userScheduleChallengeService.portionCompleteEmail(turnComplete[team_id], req);
                            }
                        }
                    }else if(baton_status == 3 && getMemberList?.length > 0 && getScheduleDetails?.teamsize !== getMemberList?.length){
                        message = 'Your turn is successfully completed';
                    }else{
                        statusCode = 401;
                        message = 'Sorry! you have not access start and skip baton';
                    }
                }else{
                    statusCode = 401;
                    success = 0;
                    error = 1;
                    message = 'Sorry! you are not join this challenge';
                }
            }else{
                statusCode = 401;
                success = 0;
                error = 1;
                message = 'Challenge not found';
            }
            return res.json({
                statusCode: statusCode,
                success: success,
                error: error,
                message: message,
                data: null,
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

    @Post('reorder-team-member')
    async ReorderTeamMember(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try{
            if (!postData?.schedule_id || !postData?.team_id || !postData?.action) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let userDatas = Object.create(req.tokenUser);
            let team_id = postData?.team_id;
            let org_id = userDatas.org_id;
            let user_id = userDatas.id;
            let action = postData?.action;
            let statusCode = 200;
            let success = 1;
            let error = 0;
            let message = 'success';
            if(action == 'org'){
                const updateReorder = await this.userChallengeHelperService.updateMemberReOrder('change',postData, req);
                if(updateReorder == 200){
                    message = 'Order changed successfully.';
                }else{
                    statusCode = 401;
                    message = await this.translatorService.frontendReadTranslation(req.lang,'Something went wrong');
                    error = 1;
                }
            }else{
                const getMemberDetails = await this.teamMembersService.findOne({team_id: team_id, user_id: user_id, org_id: org_id, status: 1}); 
                if(getMemberDetails && getMemberDetails !== null){
                    let isCaption = getMemberDetails?.['iscaptain'];
                    if(isCaption == 1){
                        const updateReorder = await this.userChallengeHelperService.updateMemberReOrder('change',postData, req);
                        if(updateReorder == 200){
                            message = 'Order changed successfully.';
                        }else{
                            statusCode = 401;
                            message = await this.translatorService.frontendReadTranslation(req.lang,'Something went wrong');
                            error = 1;
                        }
                    }else{
                        statusCode = 401;
                        message = await this.translatorService.frontendReadTranslation(req.lang,'Only captain or org admin can reorder team member', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        error = 1;
                    }
                }else{
                    statusCode = 401;
                    message = await this.translatorService.frontendReadTranslation(req.lang,'Please enter valid Team id', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    error = 1;
                }
            }
            return res.json({
                statusCode: statusCode,
                success: success,
                error: error,
                message: message,
                data: null,
            });
        }catch(error){
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

    /* RELAY RACE CHALLENGE */
    @Post('get-challenge-date')
    async getChallengeDate(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try{
            if(!postData?.challenge_id || !postData?.sdate){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const challenge = await this.challengeService.findOne({id: postData?.challenge_id, status: 1});
            let return_data ;
            if(challenge){                
                let startdate = this.commonDateService.getTodayDate(postData?.sdate).format('YYYY-MM-DD');
                let weektimeframe = challenge.weektimeframe;
                if(postData?.weektimeframe && postData?.weektimeframe >= 1){
                    weektimeframe = postData?.weektimeframe;
                }
                let enddate = moment(startdate).add(weektimeframe, 'weeks').format('MM-DD-YYYY');            
                if(challenge.challenge_type.trim() == 'A'){
                    if(challenge.bio_challenge_type.trim() == 'Olympics'){
                        return_data = enddate;
                    } else if (challenge.bio_challenge_type.trim() == 'Football_step'){
                        if(weektimeframe && weektimeframe != 0){
                            return_data = moment(enddate, 'MM-DD-YYYY').subtract(1, 'days').format('MM-DD-YYYY');
                        } else {
                            return_data = 'Activity';
                        }
                    } else {
                        return_data = 'Activity';
                    }
                } else if (challenge.challenge_type.trim() == 'B'){
                    return_data = 'Activity';
                } else if (challenge.challenge_type.trim() == 'H' && (challenge.bio_challenge_type.trim() == 'Bingo_layout' || challenge.bio_challenge_type.trim() == 'Healthy_habit_activity_layout')){
                    return_data = 'Activity';
                } else if (challenge.challenge_type.trim() == 'E' || challenge.challenge_type.trim() == 'R'){
                    return_data = 'Activity';
                }else{
                    return_data = moment(enddate, 'MM-DD-YYYY').subtract(1, 'days').format('MM-DD-YYYY');
                }
            }  
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: return_data,
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
    @Post('remove-invite')
    async removeInvite(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try{
            if(!postData?.invite_id || !postData?.team_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const checkdata = await this.inviteUserService.findOne({id: postData.invite_id, team_id: postData.team_id, status: 1});
            if(checkdata){
                const updateData = await this.inviteUserService.update({id: postData.invite_id, team_id: postData.team_id}, {status: 2}); 
                this.activityLogService.create(checkdata, {status: 2}, tableConstant.CHALLENGE.TBL_CH_INVITE_USER, req.tokenUser?.id, 'remove invite');               
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang,`The Invited User Removed Successfully`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`),
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
            }
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}