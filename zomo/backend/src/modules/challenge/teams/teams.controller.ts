import { appConstant, CommonArrayService, CommonFileService, CommonService, tableConstant, TeamsDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { BrokerService } from 'src/modules/broker/broker.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateTeamsInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    ListTeamsInput,
    PaginateWithChallengeInput,
    UpdateTeamsInput
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { InviteUserService } from '../inviteuser/inviteuser.service';
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeJoinUsersService } from '../schedulechallengejoinusers/schedulechallengejoinusers.service';
import { TeamMembersService } from '../teammembers/teammembers.service';
import { TeamScheduleService } from '../teamschedule/teamschedule.service';
import { TeamsService } from './teams.service';
const S3_URL =  process.env.S3_URL_PROD
const path = require('path');
@Controller('challenge/teams')
@UseGuards(TokenGuard, RoleGuard)
export class TeamsController {
    constructor(
        private readonly teamsService: TeamsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly teamScheduleService: TeamScheduleService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly teamMembersService: TeamMembersService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly inviteUserService: InviteUserService,
        private readonly brokerService: BrokerService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let user = Object.create(req.tokenUser)
            let roleId = user.role_id;
            let userId = user.id;
            // check for broker admin, broker, regional admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN,appConstant.ROLE.BROKER,appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.WCH,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.BROKERADMIN,appConstant.ROLE.BROKER,appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id))  ? `team.status != 2` : `team.status = 1`;
            if (postData?.group_id) {
                where += ` AND team.group_id = ${postData?.group_id}`;
            }
            if (postData?.schedule_id) {
                where += ` AND team.schedule_id = ${postData?.schedule_id}`;
            }
            if (postData?.org_id) {
                where += ` AND team.org_id = ${postData?.org_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'team.tname');
            }
            const resultedData = await this.teamsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(TeamsDto, resultedData['list'], req.lang)
            );
            if(![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)){
                resultedData['reorderStatus'] = 0;
                let challengeData = await this.scheduleChallengeService.findOne({id: postData?.schedule_id});
                if (challengeData) {
                    if(challengeData?.['challenge']?.bio_challenge_type == 'Relay_race'){
                        resultedData['reorderStatus'] = 1;
                    }
                }
                if(resultedData['list'] && resultedData['list'].length){
                    await Promise.all(resultedData['list'].map(async (ele)=>{
                        if(ele.tname){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${ele['schedule_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                            ele.tname = (customName == '' || customName == `team_name_${ele['schedule_id']}_${ele['id']}`) ? ele['tname'] : customName;
                        }

                        let count = 0;
                        let cancelUser = 0;
                        let assignCaptainStatus = 0;
                        for (const member of ele.teamMember || []) {
                            const hasUser = member.user !== null && member.user !== undefined;
                            const hasScheduleJoin = member.scheduleJoin !== null && member.scheduleJoin !== undefined;
                            if (member.iscaptain == 1) {
                                assignCaptainStatus = 1;
                            }
                            if (hasUser && hasScheduleJoin) {
                                count++;
                            } else {
                                cancelUser++;
                            }
                        }
                        ele['assignCaptainStatus'] = assignCaptainStatus;
                        ele['joinUserCount'] = count;
                        ele['cancelUserCount'] = cancelUser;
                    }));
                }
            }
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
    @UseInterceptors(
        FileInterceptor("logo", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateTeamsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.schedule_id || !postData?.org_id || (postData?.group_id == undefined || postData?.group_id == null) || !postData?.tname) {
                if (file && file.filename && file.fieldname === 'logo') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            // check for broker admin, broker, regional admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                let user = Object.create(req.tokenUser)
                let roleId = user.role_id;
                let userId = user.id;
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    if (file && file.filename && file.fieldname === 'logo') {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            if (file && file.fieldname === 'logo' && file.filename) {
                postData.logo = '/challenge/' + file.filename;
            }
            const recordDetails = await this.teamsService.findOne({
                tname: postData?.tname,schedule_id: postData?.schedule_id,status: In([0,1])
            });
            if (recordDetails) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'Team name already exist.')));
            }
            let join_challenge = postData?.join_challenge;
            delete postData?.join_challenge;
            postData['status'] = postData?.status ?? 1;
            postData['team_size'] = postData?.team_size > 0 ?  postData?.team_size : 1 ;
            postData['created_by'] = postData?.created_by ?? req.tokenUser?.id;
            const team = await this.teamsService.save({...postData});
            let dynamicData = Object.create(null);
            if(team['tname']){
                let title = `team_name_${team['schedule_id']}_${team['id']}`
                dynamicData[`${title}`]= team['tname'];
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',team['org_id'],dynamicData,'Edit','MyChallenges',team['schedule_id']);
            if (file && file.fieldname === 'logo' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/schedulech/${team['schedule_id']}/team/scchateaml_${this.commonService.generateMD5(team['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                await this.teamsService.update({ id: team['id']},{logo: filename});
            }
            const teamSchedule = await this.teamScheduleService.findOne(`teams.org_id = ${postData?.org_id} AND teamSchedule.team_id = ${team['id']} AND teamSchedule.schedule_id = ${postData['schedule_id']}`);
            if(!teamSchedule){
                await this.teamScheduleService.save({
                    team_id: team['id'],
                    schedule_id: postData?.schedule_id,
                    status: 1
                })
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Team Added Successfully.')
            });
        } catch (error) {
            if (file && file.fieldname === 'logo' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @Put('update')
    @UseInterceptors(
        FileInterceptor("logo", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateTeamsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                if (file && file.filename && file.fieldname === 'logo') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.teamsService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if(postData?.tname && postData?.tname !== recordDetails.tname){
                const recordDetails = await this.teamsService.findOne({
                    tname: postData?.tname,schedule_id: postData?.schedule_id, id: Not(postData?.id),status: In([0,1])
                });
                if (recordDetails) {
                    throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'Team name already exist.')));
                }
            }
            let dynamicData = Object.create(null);
            if(postData['tname']){
                let title = `team_name_${recordDetails['schedule_id']}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['tname'];
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',recordDetails['org_id'],dynamicData,'Edit','MyChallenges',recordDetails['schedule_id']);
            if (file && file.fieldname === 'logo' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/schedulech/${postData['schedule_id']}/team/scchateaml_${this.commonService.generateMD5(postData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                postData['logo'] = filename;
            }
            await this.teamsService.update({ id: postData?.id, schedule_id: postData?.schedule_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_TEAMS, req.tokenUser?.id);
            let message;
            if(Object.keys(postData).length && postData?.hasOwnProperty('status')){
                if(postData?.status == 1) {
                    message = 'Team activated successfully.'; 
                }
                else {
                    message = 'Team deactivated successfully.'; 
                }
            } 
            else{
                message =  'Team updated successfully.';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, message)
            });
        } catch (error) {
            if (file && file.fieldname === 'logo' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.teamsService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.teamsService.update({id: postData?.id, schedule_id: postData?.schedule_id},{status:2});
            if (recordDetails) {
                const titleKey = `team_name_${recordDetails.schedule_id}_${recordDetails['id']}`;
                const dynamicData = {
                    [titleKey]: titleKey,
                };
                await this.translatorService.DynamicEngJsonData(
                    'Challenge',
                    recordDetails.org_id,
                    dynamicData,
                    'Delete',
                    'MyChallenges',
                    recordDetails['schedule_id']
                );
            }
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_TEAMS, req.tokenUser?.id,'delete');
            let teamDetails = await this.teamsService.getTeamData(`team.id = ${postData?.id}`,postData?.schedule_id.toString(),'UTC');
            if(teamDetails && teamDetails.length){
                if(teamDetails[0]['teamMember'] && teamDetails[0]['teamMember'].length){
                    for(let member of teamDetails[0]['teamMember']){
                        await this.scheduleChallengeJoinUsersService.update({user_id: member.user_id, schedule_id: postData?.schedule_id},{status: 2});
                        this.activityLogService.create(member.scj, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'remove team');
                        await this.teamMembersService.update({id: member.id},{status: 2});
                        this.activityLogService.create(member, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id, 'remove team');
                    }
                }
            }
            let inviteMemberList = await this.inviteUserService.list(`invitedUser.team_id = ${postData?.id} AND invitedUser.schedule_id = ${postData.schedule_id}`);
            for(let inviteMember of inviteMemberList){
                await this.inviteUserService.update({id: inviteMember.id},{status: 2});
                this.activityLogService.create(inviteMember, {status: 2}, tableConstant.CHALLENGE.TBL_CH_INVITE_USER, req.tokenUser?.id, 'remove team');
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Team deleted successfully.'),
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneChallengeInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.teamsService.findOne({id: postData?.id, schedule_id: postData?.schedule_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(TeamsDto, resultedData, req.lang)
            );
            if(resultedData.tname){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${resultedData['schedule_id']}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData['org_id']}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.tname = (customName == '' || customName == `team_name_${resultedData['schedule_id']}_${resultedData['id']}`) ? resultedData['tname'] : customName;
            }
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request,@Res() res: Response, @Body() postData: ListTeamsInput){
        try {
            if (postData?.type && postData?.type?.toLowerCase() == 'report') {
                if (!postData?.org_id || !postData?.schedule_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let where: any = `team.status = 1`;       
            if (postData?.schedule_id) {
                where += ` AND team.schedule_id = ${postData?.schedule_id}`;
            }
            if (postData?.org_id) {
                where += ` AND team.org_id = ${postData?.org_id}`;
            }     
            if (postData?.group_id) {
                where += ` AND team.group_id = ${postData?.group_id}`;
            }    
            let field = ['team','challengeGroups','teamMember','user']
            if(postData?.type && postData?.type?.toLowerCase() == 'report'){
                field = ['team.id','team.tname']
            }
            let result = await this.teamsService.listRecord(where, {id: 'ASC'}, field);
            result = <any>(
                await this.commonArrayService.formatToDto(TeamsDto, result, req.lang)
            );
            result.map(async (ele)=>{
                ele['logo'] = ele?.logo?.includes('challenge') ? S3_URL + ele.logo : ele.logo != '' ? this.commonService.getIconPath(ele.logo,S3_URL): ele.logo;
                if(ele['challengeGroups']){
                    ele['challengeGroups']['logo'] = ele['challengeGroups']?.logo?.includes('challenge') ? S3_URL + ele.logo : ele?.logo != '' ? this.commonService.getIconPath(ele.logo,S3_URL): ele.logo;
                }
                ele['captainDetails'] = ele?.['teamMember']?.find((element) => element.iscaptain == 1); 
                ele['captainDetails'] = ele['captainDetails'] ? ele['captainDetails']?.['user'] : ele['captainDetails']; 
                if(ele.tname){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${ele['schedule_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.tname = (customName == '' || customName == `team_name_${ele['schedule_id']}_${ele['id']}`) ? ele['tname'] : customName;
                }
                if(postData?.type && postData?.type?.toLowerCase() == 'report'){
                    delete ele?.['teamMember'];
                    delete ele?.['challengeGroups'];
                }
            });
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
    @UseGuards(AccessGuard)
    @Post('merge-team')
    async mergeTeam(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.team_id || !postData?.selected_teams || !postData?.schedule_id || !postData?.hasOwnProperty('captain_id')) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData.selected_teams = postData?.selected_teams ? Array.isArray(postData?.selected_teams) ? postData?.selected_teams : JSON.parse(postData?.selected_teams) : null;
            const inMergeTeamId = postData?.team_id;
            const outMergeTeam = (postData?.selected_teams && Array.isArray(postData?.selected_teams)) ? postData?.selected_teams : [];
            const updateTeamSizeAnd = postData?.up_team_size || '';
            const canceluserMergeAns = postData?.cancel_user_ans || '';
            const selectedCaptainId = postData?.captain_id || '';
            const schedule_id = postData?.schedule_id || '';
            let where = `team.id In(${[inMergeTeamId,...outMergeTeam].join(',')}) AND team.status =1`;
            let teamData = await this.teamsService.listRecord(where, null, ['team.id','team.schedule_id','team.tname','team.org_id','team.team_size','team.status','teamMember','user','scheduleJoin']);
            if(teamData && teamData.length){
                await Promise.all(teamData.map(async (ele)=>{
                    if(ele.tname){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${ele['schedule_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                        ele.tname = (customName == '' || customName == `team_name_${ele['schedule_id']}_${ele['id']}`) ? ele['tname'] : customName;
                    }
                }));
            }
            const inMergeTeamSizeArray = teamData
            .filter(team => team.id === inMergeTeamId)
            .map(team => team.team_size);
            let inMergeTeamSize = 0;
            if (inMergeTeamSizeArray.length > 0) {
                inMergeTeamSize = inMergeTeamSizeArray[0];
            }
            let allTeamMemberArray = teamData
            .reduce((acc, team) => acc.concat(team['teamMember']), []);
            if (canceluserMergeAns === 'No') {
                allTeamMemberArray = allTeamMemberArray
                .filter(member => member['scheduleJoin'])
                .map(member => member.id);
            } else {
                allTeamMemberArray = allTeamMemberArray?.map(member => member.id);
            }
            const totalTeamMemberMergeCount = allTeamMemberArray?.length;
            if (updateTeamSizeAnd === 'Yes') {
                const sChallengeData = {
                  id: schedule_id,
                  teamsize: totalTeamMemberMergeCount
                };
                await this.scheduleChallengeService.update({ id: schedule_id }, sChallengeData);
                const TeamData = {
                  id: inMergeTeamId,
                  team_size: totalTeamMemberMergeCount
                };
                await this.teamsService.update({ id: inMergeTeamId },TeamData);
            }
            await this.teamMembersService.update({ id: In(allTeamMemberArray)}, { iscaptain: 0, team_id: inMergeTeamId });
            if (selectedCaptainId !== '') {
                await this.teamMembersService.update({ id: selectedCaptainId }, { iscaptain: 1, team_id: inMergeTeamId });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, this.commonFileService.formatMessage('Team merged successfully.')),
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