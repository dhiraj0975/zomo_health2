import { appConstant, CommonArrayService, CommonService, SCTeamMembersDto, tableConstant, TeamMembersDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { BrokerService } from 'src/modules/broker/broker.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateTeamMembersInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    UpdateTeamMembersInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeJoinUsersService } from '../schedulechallengejoinusers/schedulechallengejoinusers.service';
import { TeamMembersService } from './teammembers.service';
const moment = require('moment-timezone');
@Controller('challenge/team-members')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class TeamMembersController {
    constructor(
        private readonly teamMembersService: TeamMembersService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly brokerService: BrokerService,
         private readonly commonService: CommonService,
         private readonly scheduleChallengeService: ScheduleChallengeService,
    ) {}

    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.team_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }  
            let where = `teamMember.team_id = ${postData?.team_id} AND teamMember.status NOT IN (2) AND (users.id != '' AND users.id IS NOT NULL) AND users.status = 1`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'full_name' , false, 'users');
            }
            const resultedData = await this.teamMembersService.paginateList(
                where,
                postData,
            );
            let checkCaptaion = await this.teamMembersService.findOne({
                team_id: postData?.team_id,
                iscaptain: 1,
                status: 1
            });
            if (checkCaptaion) {
                resultedData['assignCaptainStatus'] = 1;
            } else {
                resultedData['assignCaptainStatus'] = 0;
            }
            
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(SCTeamMembersDto, resultedData['list'], req.lang)
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
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateTeamMembersInput) {
        try {
            if (!postData?.user_id || !postData?.org_id || !postData?.team_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.teamMembersService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateTeamMembersInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.teamMembersService.findOne({
                id: postData?.id,user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.teamMembersService.update({ id: postData?.id, user_id: postData?.user_id},{...postData});
            if(recordDetails['teamSchedule'] && recordDetails['teamSchedule']?.schedule_id){
                await this.scheduleChallengeJoinUsersService.update({ user_id: recordDetails.user_id, schedule_id: recordDetails['teamSchedule']?.schedule_id},{status : postData?.status});
            }
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Member updated successfully.')
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.teamMembersService.findOne({
                id: postData?.id,user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.teamMembersService.update({id: postData?.id, user_id: postData?.user_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Member removed successfully.')
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.teamMembersService.findOne({id: postData?.id, user_id: postData?.user_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(TeamMembersDto, resultedData, req.lang)
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('team-members')
    async teamMembers(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            if (!postData?.team_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }    
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let user = Object.create(req.tokenUser)
            let roleId = user.role_id;
            let userId = user.id;
            // Check for Broker-Admin, Broker, Regional-Admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }  
            let result = await this.teamMembersService.teamMembers(`teamMember.team_id = ${postData?.team_id} AND teamMember.status NOT IN (2) AND (users.id != '' AND users.id IS NOT NULL) AND users.status = 1`);
            result = <any>(
                await this.commonArrayService.formatToDto(SCTeamMembersDto, result, req.lang)
            );
            if(result.length > 0) {
                let challengeData = await this.scheduleChallengeService.challengeFindOne(['sc.id','sc.time_elapsed'],{id: result[0]?.['scheduleJoin']?.['schedule_id']});
                for(let ele of result){
                    if(ele.baton_start == '' || ele.baton_start == '0000-00-00 00:00:00'){
                        let TotalTimeinMinutes = challengeData?.time_elapsed ?? 0;
                        const memberDuration = moment.duration(TotalTimeinMinutes, 'minutes');
                        const memberHours = Math.floor(memberDuration.asHours());
                        const memberMinutes = memberDuration.minutes();
                        const memberSecond = memberDuration.seconds();
                        ele['timeRemaining'] = memberHours.toString().padStart(2, '0')+':'+memberMinutes.toString().padStart(2, '0')+':'+memberSecond.toString().padStart(2, '0');
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
                message: await this.translatorService.frontendReadTranslation(req.lang,`The Team Member Has Been Added Successfully`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
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
}