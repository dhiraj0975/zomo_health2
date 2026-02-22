import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, ScheduleChallengeDto, tableConstant } from '@common-constants';
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
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { BrokerService } from 'src/modules/broker/broker.service';
import { CampaignService } from 'src/modules/campaign/campaign/campaign.service';
import { ActivePluginService } from 'src/modules/company/activeplugins/activeplugin.service';
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { UserService } from 'src/modules/user/user/user.service';
import { In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateScheduleChallengeInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    PaginateWithChallengeInput,
    UpdateScheduleChallengeInput,
    UpdateTeamMembersInput
} from "../../../input";
import { RateLimiterMiddleware } from "../../../middleware/rate-limiter.middleware";
import { fileFilter, fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { AcOlympicDataService } from '../acolympicdata/acolympicdata.service';
import { BingoWeekLabelsService } from '../bingoweeklabels/bingoweeklabels.service';
import { BioWeightService } from '../bioweight/bioweight.service';
import { CardsService } from '../cards/cards.service';
import { ChallengeService } from '../challenge/challenge.service';
import { CommitmentLevelsService } from '../commitmentlevels/commitmentlevels.service';
import { DaysService } from '../days/days.service';
import { DaysUsersService } from '../daysusers/daysusers.service';
import { FitnessUsersActivityService } from '../fitnessusersactivity/fitnessusersactivity.service';
import { GroupsService } from '../groups/groups.service';
import { HealthActivityService } from '../healthactivity/healthactivity.service';
import { InviteTempService } from '../invitetemp/invitetemp.service';
import { InviteUserService } from '../inviteuser/inviteuser.service';
import { MoveMoreParksService } from '../movemoreparks/movemoreparks.service';
import { ScheduleChallengeJoinUsersService } from '../schedulechallengejoinusers/schedulechallengejoinusers.service';
import { SquaresService } from '../squares/squares.service';
import { StepCheckpointsService } from '../stepcheckpoints/stepcheckpoints.service';
import { TeamMembersService } from '../teammembers/teammembers.service';
import { TeamsService } from '../teams/teams.service';
import { TeamScheduleService } from '../teamschedule/teamschedule.service';
import { UserChallengeHelperService } from '../userschedulechallenge/userChallengeHelper.service';
import { WeeksService } from '../weeks/weeks.service';
import { WeeksStepsService } from '../weekssteps/weekssteps.service';
import { WeeksUsersService } from '../weeksusers/weeksusers.service';
import {
    AddDataChallengeInput,
    CampaignChallengeListInput,
    CopyChallengeInput,
    ImportUsersChallengeInput,
    ScheduleListChallengeInput
} from "./input";
import { ScheduleChallengeService } from './schedulechallenge.service';
const S3_URL =  process.env.S3_URL_PROD
const moment = require('moment-timezone');
@Controller('challenge/schedule-challenge')
@UseGuards(TokenGuard, RoleGuard)
export class ScheduleChallengeController {
    constructor(
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly challengeService: ChallengeService,
        private readonly commitmentLevelsService: CommitmentLevelsService,
        private readonly stepCheckpointsService: StepCheckpointsService,
        private readonly weeksStepsService: WeeksStepsService,
        private readonly inviteTempService: InviteTempService,
        private readonly teamsService: TeamsService,
        private readonly teamScheduleService: TeamScheduleService,
        private readonly moveMoreParksService: MoveMoreParksService,
        private readonly cardsService: CardsService,
        private readonly squaresService: SquaresService,
        private readonly bingoWeekLabelsService: BingoWeekLabelsService,
        private readonly healthActivityService: HealthActivityService,
        private readonly groupsService: GroupsService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly inviteUserService: InviteUserService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly weeksUsersService: WeeksUsersService,
        private readonly acOlympicDataService: AcOlympicDataService,
        private readonly teamMembersService: TeamMembersService,
        private readonly fitnessUsersActivityService: FitnessUsersActivityService,
        private readonly bioWeightService: BioWeightService,
        private readonly brokerService: BrokerService,
        private readonly daysUsersService: DaysUsersService,
        private readonly activePluginService: ActivePluginService,
        private readonly campaignService: CampaignService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly userService: UserService,
        private readonly weeksService: WeeksService,
        private readonly daysService: DaysService,
        private readonly notificationsController: NotificationsController,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id
                || appConstant.ROLE.WCH == req.tokenUser?.role_id || appConstant.ROLE.BROKERADMIN == req.tokenUser?.role_id || appConstant.ROLE.BROKER == req.tokenUser?.role_id || appConstant.ROLE.REGIONALADMIN == req.tokenUser?.role_id) ? `sc.status != 2 AND company.status != 2 AND ch.status != 2` : `sc.status = 1 AND company.status = 1 AND ch.status = 1`;
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
            if (postData?.filter_by?.toLowerCase() == 'organization') {
                const order_by = postData?.order_by;
                const limit = postData?.limit;
                const page = postData?.page;
                postData.page = 1;
                postData.limit = 100;
                delete postData?.order_by;
                const companyData = await this.companyService.paginateList(`company.deleted = 0 AND company.status = 1 AND company.company_name LIKE '%${postData?.search_str}%'`, postData as any);
                postData.org_id = companyData && companyData.list?.length ? companyData.list.map((e)=>e.id).join(',') : null; 
                postData.order_by = order_by;
                postData.limit = limit;
                postData.page = page;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    postData.org_id = resultedData.map((e)=>e.org_id).join(',');
                }
                else{
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {
                            list: [],
                            limit: postData?.limit,
                            page: postData?.page,
                            pages: 0,
                            total: 0
                        },
                        message: 'success',
                    });
                }
            }
            if (postData?.org_id) {
                where += ` AND sc.org_id IN(${postData?.org_id.split(',')})`;
            }
            if(postData?.filter_by?.toLowerCase() == 'challenge'){
                const order_by = postData?.order_by;
                const limit = postData?.limit;
                const page = postData?.page;
                postData.limit = 100;
                delete postData?.order_by;
                delete postData?.page;
                const challengeData = await this.challengeService.paginateList(`challenge.status = 1 AND challenge.challenge_name LIKE '%${postData?.search_str}%'`, postData as any);
                postData.challenge_id = challengeData && challengeData.list?.length ? challengeData.list.map((e)=>e.id).join(',') : ''; 
                postData.order_by = order_by;
                postData.limit = limit;
                postData.page = page;
            }
            if (postData?.challenge_id) {
                where += ` AND sc.challenge_id IN(${postData?.challenge_id.split(',')})`;
            }
            if (postData?.start_date && postData?.end_date) {
                where += ` AND('${postData?.start_date}' >= sc.start_date AND '${postData?.end_date}' <= sc.end_date)`;
            }
            if (postData?.search_str && postData?.filter_by?.toLowerCase() != 'organization' && postData?.filter_by?.toLowerCase() != 'challenge') {
                postData.search_str = this.commonService.removeSpecialCharacter(postData?.search_str); 
                where += ` AND (sc.custom_cname LIKE '%${postData?.search_str}%' OR sc.custom_desc LIKE '%${postData?.search_str}%' OR sc.challenge_who LIKE '%${postData?.search_str}%' OR sc.countstepswith LIKE '%${postData?.search_str}%')`;
            }
            where += ` AND (company.id IS NOT NULL) AND company.deleted = 0`;
            let resultedData;
            if((postData?.filter_by?.toLowerCase() == 'organization' && !postData?.org_id) ||  (postData?.filter_by?.toLowerCase() == 'challenge' && !postData?.challenge_id)){
                resultedData = {list: [], total: 0, pages: 0, limit: 10, page: 1};
            }else{                
                resultedData = await this.scheduleChallengeService.paginateList(
                    where,
                    postData,
                );
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ScheduleChallengeDto, resultedData['list'], req.lang)
            );
            if(![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER , appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)){
                await Promise.all(resultedData['list'].map(async (ele) => {
                    if(ele.custom_cname){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                        ele.custom_cname = (customName == '' || customName == `custom_cname_${ele['id']}`) ? ele['custom_cname'] : customName;
                    }
                    if(ele.custom_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                        ele.custom_desc = (customName == '' || customName == `custom_desc_${ele['id']}`) ? ele['custom_desc'] : customName;
                    }
                    if(ele.info_button){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_info_button_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                        ele.info_button = (customName == '' || customName == `custom_info_button_${ele['id']}`) ? ele['info_button'] : customName;
                    }
                    if(ele.website_button){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_website_button_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                        ele.website_button = (customName == '' || customName == `custom_website_button_${ele['id']}`) ? ele['website_button'] : customName;
                    }
                    if(ele.map_button){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_map_button_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                        ele.map_button = (customName == '' || customName == `custom_map_button_${ele['id']}`) ? ele['map_button'] : customName;
                    }
                    if(ele.image_button){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_image_button_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                        ele.image_button = (customName == '' || customName == `custom_image_button_${ele['id']}`) ? ele['image_button'] : customName;
                    }
                    if(ele && ele['custom_logo'] && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: ele['custom_logo']?.replace(S3_URL,'')}))){
                        ele['custom_logo'] = S3_URL + ele['custom_logo'];
                    }
                    else if(ele && ele['challenge'] && ele['challenge']['logo'] && ele['challenge']['logo'].length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: ele['challenge']['logo'].replace(S3_URL,'')}))){
                        ele['custom_logo'] = S3_URL + ele['challenge']['logo'];
                    }else{
                        ele['custom_logo'] = this.commonService.getIconPath(ele['challenge']['logo'],S3_URL);
                    }
                }));
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
        FileInterceptor("custom_logo", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateScheduleChallengeInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.challenge_id || !postData?.org_id || !postData?.custom_cname) {
                if (file && file.filename && file.fieldname === 'custom_logo') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser)
            let roleId = user.role_id;
            let userId = user.id;
            const challenge = await this.challengeService.findOne({id: postData?.challenge_id});
            if (!challenge) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            // check for broker admin, broker, regional admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN,appConstant.ROLE.BROKER,appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    if (file && file.filename && file.fieldname === 'custom_logo') {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            if(challenge?.bio_challenge_type == 'Move_more' || challenge?.bio_challenge_type == 'Trek_step'){
                postData.s_activity_tracker = 1;
                postData.s_steps = 1;
                postData.s_walking = 1;
                postData.s_running = 1;
                postData.s_cycling = 1;
                postData.s_swimming = 1
            }
            postData.created_by = req.tokenUser?.id;
            const challengeData = await this.scheduleChallengeService.save({...postData});
            let dynamicData = Object.create(null);
            if(postData?.custom_cname){
                let title = `custom_cname_${challengeData['id']}`
                dynamicData[`${title}`]= postData?.custom_cname;
            }
            if(postData?.custom_desc){
                let title = `custom_desc_${challengeData['id']}`
                dynamicData[`${title}`]= postData?.custom_desc;
            }
            if(challenge?.bio_challenge_type == 'Move_more') {
                if (postData?.info_button) {
                    let title = `custom_info_button_${challengeData['id']}`
                    dynamicData[`${title}`] = postData?.info_button;
                } else {
                    let title = `custom_info_button_${challengeData['id']}`
                    dynamicData[`${title}`] = 'Info';
                }
                if (postData?.website_button) {
                    let title = `custom_website_button_${challengeData['id']}`
                    dynamicData[`${title}`] = postData?.website_button;
                } else {
                    let title = `custom_website_button_${challengeData['id']}`
                    dynamicData[`${title}`] = 'Website';
                }
                if (postData?.map_button) {
                    let title = `custom_map_button_${challengeData['id']}`
                    dynamicData[`${title}`] = postData?.map_button;
                } else {
                    let title = `custom_map_button_${challengeData['id']}`
                    dynamicData[`${title}`] = 'Map';
                }
                if (postData?.image_button) {
                    let title = `custom_image_button_${challengeData['id']}`
                    dynamicData[`${title}`] = postData?.image_button;
                } else {
                    let title = `custom_image_button_${challengeData['id']}`
                    dynamicData[`${title}`] = 'Image';
                }
            }
            await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id,dynamicData,'Add','MyChallenges',challengeData['id']); 
            if (file && file.fieldname === 'custom_logo' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/schedulech/${challengeData['id']}/logo/scchal_${this.commonService.generateMD5(challengeData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.')?.length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                await this.scheduleChallengeService.update({ id: challengeData['id']},{custom_logo: filename});
                postData.custom_logo = S3_URL + filename;
            }
            if(postData?.checklevel){
                postData['checklevel'] = JSON.parse(postData?.checklevel);
                postData['checklevel'] = postData['checklevel'].sort((a, b) => (a?.['checkpointdays'] ?? 1) - (b?.['checkpointdays'] ?? 1));
                for(let ele of postData?.checklevel){
                    await this.stepCheckpointsService.save({
                        challenge_id: challengeData['challenge_id'],
                        schedule_id: challengeData['id'],
                        checkpointvalue: ele['checkpointvalue'],
                        checkpointtype: ele['checkpointtype'],
                        checkpointdays: ele['checkpointdays'] ? ele['checkpointdays'] : 1,
                        created_date:this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                        status: 1
                    });
                }
                delete postData?.checklevel;
            }
            if(postData?.treklevel){
                postData['treklevel'] = JSON.parse(postData?.treklevel);
                for(let ele of postData?.treklevel){
                    await this.commitmentLevelsService.save({
                        challenge_id: challengeData['challenge_id'],
                        schedule_id: challengeData['id'],
                        level_value: ele['level_value'],
                        level_type: ele['level_type'],
                        created_date:this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                        status: 1
                    });
                }
                delete postData?.treklevel;
            }
            if(postData?.weeksteps){
                postData['weeksteps'] = JSON.parse(postData?.weeksteps);
                for(let ele of postData?.weeksteps){
                    let weekstepdata = Object.create(null);
                    if(ele['week_steps']){
                        weekstepdata['week_steps'] = ele['week_steps'];
                    }
                    weekstepdata['week_no'] = ele['week_no'];
                    weekstepdata['days_week'] = ele['days_week'] ?? 7;
                    weekstepdata['challenge_id'] = challengeData['challenge_id'];
                    weekstepdata['schedule_id'] = challengeData['id'];
                    weekstepdata['f_suggestion'] = ele['f_suggestion'] ?? 0;
                    weekstepdata['start_date'] = `${ele.start_date} 00:00:00`;
                    weekstepdata['end_date'] = `${ele.end_date} 23:59:59`;
                    weekstepdata['modified_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD hh:mm:ss');
                    weekstepdata['status'] = 1;
                    await this.weeksStepsService.save(weekstepdata);
                }
            }else{
                if(challenge?.bio_challenge_type == 'Move_more' || challenge?.bio_challenge_type == 'Fitness'){
                    const weeksteps = this.commonDateService.getWeekRanges(this.commonDateService.getTodayDate(postData?.start_date).format('YYYY-MM-DD'), this.commonDateService.getTodayDate(postData?.end_date).format('YYYY-MM-DD'))
                    let i = 0;
                    let move_more = 4;
                    for(let ele of weeksteps){
                        let weekstepdata = Object.create(null);
                        weekstepdata['week_no'] = ele['week_number'];
                        weekstepdata['days_week'] = ele['days_week'] ?? 7;
                        weekstepdata['challenge_id'] = challengeData['challenge_id'];
                        weekstepdata['schedule_id'] = challengeData['id'];
                        weekstepdata['start_date'] = `${ele.week_start} 00:00:00`;
                        weekstepdata['end_date'] = `${ele.week_end} 23:59:59`;
                        if(challenge.bio_challenge_type == 'Move_more'){
                            move_more += i;
                            weekstepdata['move_more_goal'] = ((i==0) ? 0 : move_more);
                            i++;
                        }
                        if(challenge.bio_challenge_type == 'Fitness'){
                            weekstepdata['f_suggestion'] = ele['f_suggestion'] ?? 0;
                        }
                        weekstepdata['modified_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD hh:mm:ss');
                        weekstepdata['status'] = 1;
                        await this.weeksStepsService.save(weekstepdata);
                    }
                }
            }
            if(postData?.invite_user && postData?.invite_user != ''){
                for(let ele of postData?.invite_user.split(',')){
                    const invite_user = await this.inviteTempService.findOne({user_id: ele, org_id: postData?.org_id, schedule_id: challengeData['id']});
                    if(!invite_user){
                        await this.inviteTempService.save({user_id: ele, org_id: postData?.org_id, schedule_id: challengeData['id'], status: 1, added_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD hh:mm:ss')});
                    }
                }
                delete postData?.invite_user;
            }
            this.userChallengeHelperService.addNotification({
                ...challengeData, 
                schedule_id: challengeData['id'], 
                logo: challengeData?.['custom_logo'] && challengeData?.['custom_logo'] != '' ? S3_URL + challengeData?.['custom_logo'] : this.commonService.getIconPath(challenge['logo'],S3_URL), 
                type: 'add',
                url: `https://${process.env.DOMAIN}/my-challenges/${challengeData['id']}`,
            }, req);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: { id: challengeData['id'] },
                message: await this.translatorService.frontendReadTranslation(req.lang, "Challenge schedule successfully added."),
            });
        } catch (error) {
            if (file && file.fieldname === 'custom_logo' && file.filename) {
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
        FileInterceptor("custom_logo", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateScheduleChallengeInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                if (file && file.filename && file.fieldname === 'custom_logo') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.scheduleChallengeService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    if (file && file.filename && file.fieldname === 'custom_logo') {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
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
                    if (file && file.filename && file.fieldname === 'custom_logo') {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            if (file && file.fieldname === 'custom_logo' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/schedulech/${postData['id']}/logo/scchal_${this.commonService.generateMD5(postData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.')?.length - 1]}`; 
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                postData['custom_logo'] = filename;
            }
            if(postData?.checklevel && postData?.checklevel?.length){
                postData['checklevel'] = JSON.parse(postData?.checklevel);
                postData['checklevel'] = postData['checklevel'].sort((a, b) => (a?.['checkpointdays'] ?? 1) - (b?.['checkpointdays'] ?? 1));
                for(let ele of postData?.checklevel){
                    if(!ele.id){
                        await this.stepCheckpointsService.save({
                            challenge_id: recordDetails['challenge_id'],
                            schedule_id: recordDetails['id'],
                            checkpointvalue: ele['checkpointvalue'],
                            checkpointtype: ele['checkpointtype'],
                            checkpointdays: ele['checkpointdays'] ? ele['checkpointdays'] : 1,
                            created_date:this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                            status: 1
                        });
                    }
                }
                delete postData?.checklevel;
            }
            if(postData?.start_date || postData?.end_date){
                const weekstepsNew = this.commonDateService.getWeekRanges(this.commonDateService.getTodayDate(postData?.start_date ?? recordDetails.start_date).format('YYYY-MM-DD'), this.commonDateService.getTodayDate(postData?.end_date ?? recordDetails.end_date).format('YYYY-MM-DD'))
                const weekstepsOld = this.commonDateService.getWeekRanges(this.commonDateService.getTodayDate(recordDetails.start_date).format('YYYY-MM-DD'), this.commonDateService.getTodayDate(recordDetails.end_date).format('YYYY-MM-DD'))
                if (weekstepsNew?.length != weekstepsOld?.length) {
                    if (recordDetails['challenge'].bio_challenge_type === 'Football_step') {
                        const weekStepOldData = await this.weeksStepsService.listRecord({
                            schedule_id: recordDetails['id'],
                            challenge_id: recordDetails.challenge_id,
                        },{week_no: 'ASC' });
                        for (let i = 0; i < weekStepOldData.length && i < weekstepsNew.length; i++) {
                            const oldItem = weekStepOldData[i];
                            const newItem = weekstepsNew[i];
                            const weekstepdata = {
                                start_date: `${newItem.week_start} 00:00:00`,
                                end_date: `${newItem.week_end} 23:59:59`,
                                modified_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                            };
                            await this.weeksStepsService.update({ id: oldItem.id }, weekstepdata);
                        }
                    }
                     else {
                        await this.weeksStepsService.update({ schedule_id: recordDetails['id'], challenge_id: recordDetails.challenge_id }, { status: 2 });
                        this.activityLogService.create({ schedule_id: recordDetails['id'], challenge_id: recordDetails.challenge_id, status: 1 }, { status: 2 }, tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS, req.tokenUser?.id);
                        let i = 0;
                        let move_more = 4;
                        for (let ele of weekstepsNew) {
                            let weekstepdata = Object.create(null);
                            weekstepdata['week_no'] = ele['week_number'];
                            weekstepdata['days_week'] = ele['days_week'] ?? 7;
                            if (weekstepdata['week_no']) {
                                weekstepdata['week_steps'] = ele['week_steps'];
                            }
                            weekstepdata['challenge_id'] = recordDetails['challenge_id'];
                            weekstepdata['schedule_id'] = recordDetails['id'];
                            if (recordDetails['challenge'].bio_challenge_type == 'Move_more') {
                                move_more += i;
                                weekstepdata['move_more_goal'] = ((i == 0) ? 0 : move_more);
                                i++;
                            }
                            if (recordDetails['challenge'].bio_challenge_type == 'Fitness') {
                                weekstepdata['f_suggestion'] = ele['f_suggestion'] ?? 0;
                            }
                            weekstepdata['start_date'] = `${ele.week_start} 00:00:00`;
                            weekstepdata['end_date'] = `${ele.week_end} 23:59:59`;
                            weekstepdata['modified_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD hh:mm:ss');
                            weekstepdata['status'] = 1;
                            await this.weeksStepsService.save(weekstepdata);
                        }
                    }
                }
            }
            if(postData?.weeksteps){
                postData['weeksteps'] = JSON.parse(postData?.weeksteps);
                const commitmentLevelList = await this.weeksStepsService.listRecord({schedule_id: postData?.id, challenge_id: postData?.challenge_id});
                const removedRecord = commitmentLevelList.filter(obj1 => 
                    !postData?.weeksteps?.some(obj2 => obj1.id === obj2.id)
                );
                for(let ele of postData?.weeksteps){
                    if(ele.start_date){
                        ele.start_date = `${this.commonDateService.DateTimeFormat(ele.start_date, 'YYYY-MM-DD')} 00:00:00`;
                    }
                    if(ele.end_date){
                        ele.end_date = `${this.commonDateService.DateTimeFormat(ele.end_date, 'YYYY-MM-DD')} 23:59:59`;
                    }
                    if(ele.id){
                        let recordDetails = await this.weeksStepsService.findOne({id: ele.id});
                        await this.weeksStepsService.update({id: ele.id}, ele);
                        this.activityLogService.create(recordDetails, ele, tableConstant.CHALLENGE.TBL_CH_WEEKS_STEPS, req.tokenUser?.id);
                    }
                    else{
                        await this.weeksStepsService.save(ele);
                    }
                }
                if(removedRecord.length){
                    await this.weeksStepsService.update({id: In(removedRecord.map(ele => ele.id))}, {status: 2});
                }
                delete postData?.weeksteps;
            }
            if(postData?.treklevel){
                postData['treklevel'] = JSON.parse(postData?.treklevel);
                const commitmentLevelList = await this.commitmentLevelsService.listRecord({schedule_id: postData?.id, challenge_id: postData?.challenge_id});
                const removedRecord = commitmentLevelList.filter(obj1 => 
                    !postData?.treklevel?.some(obj2 => obj1.id === obj2.id)
                );
                for(let ele of postData?.treklevel){
                    if(ele.id){
                        let recordDetails = await this.commitmentLevelsService.findOne({id: ele.id});
                        await this.commitmentLevelsService.update({id: ele.id}, ele);
                        this.activityLogService.create(recordDetails, ele, tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS, req.tokenUser?.id);
                    }else{
                        ele['challenge_id'] = postData?.challenge_id;
                        ele['schedule_id'] = postData?.id;
                        ele['status'] = 1;
                        await this.commitmentLevelsService.save(ele);
                    }
                }
                if(removedRecord.length){
                    await this.commitmentLevelsService.update({id: In(removedRecord.map(ele => ele.id))}, {status: 2});
                }
                delete postData?.treklevel;
            }
            if(postData?.hasOwnProperty('updateType') && postData?.updateType == '1'){
                if (postData?.deactive_date && postData?.deactive_date !== '') {                    
                    postData['deactive_date'] = this.commonDateService.getTodayDate(postData?.deactive_date).format('YYYY-MM-DD');
                }else{
                    postData['deactive_date'] = null;
                }
                if ((postData?.deactive_date && postData?.deactive_date !== '') && (postData?.deactive_time && postData?.deactive_time !== '')) {                    
                    postData['deactive_time'] =  moment(postData?.deactive_time, "hh:mm A").format("HH:mm");                
                }else{
                    postData['deactive_time'] = null;
                }  

                if(postData?.tr_totalgoalvalue){
                    postData['tr_totalgoalvalue'] = postData?.tr_totalgoalvalue;
                }else{
                    postData['tr_totalgoalvalue'] = 0;
                }
            }
            await this.scheduleChallengeService.update({ id: postData?.id, challenge_id: postData?.challenge_id},{...postData});
            let dynamicData = Object.create(null);
            if(postData?.custom_cname){
                let title = `custom_cname_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.custom_cname;
            }
            if(postData?.custom_desc){
                let title = `custom_desc_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.custom_desc;
            }
            if (recordDetails['challenge'].bio_challenge_type === 'Move_more') {
                if (postData?.info_button) {
                    let title = `custom_info_button_${recordDetails['id']}`
                    dynamicData[`${title}`] = postData?.info_button;
                } else {
                    let title = `custom_info_button_${recordDetails['id']}`
                    dynamicData[`${title}`] = 'Info';
                }
                if (postData?.website_button) {
                    let title = `custom_website_button_${recordDetails['id']}`
                    dynamicData[`${title}`] = postData?.website_button;
                } else {
                    let title = `custom_website_button_${recordDetails['id']}`
                    dynamicData[`${title}`] = 'Website';
                }
                if (postData?.map_button) {
                    let title = `custom_map_button_${recordDetails['id']}`
                    dynamicData[`${title}`] = postData?.map_button;
                } else {
                    let title = `custom_map_button_${recordDetails['id']}`
                    dynamicData[`${title}`] = 'Map';
                }
                if (postData?.image_button) {
                    let title = `custom_image_button_${recordDetails['id']}`
                    dynamicData[`${title}`] = postData?.image_button;
                } else {
                    let title = `custom_image_button_${recordDetails['id']}`
                    dynamicData[`${title}`] = 'Image';
                }
            }
            await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id ?? recordDetails['org_id'],dynamicData,'Edit','MyChallenges',recordDetails['id']);
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE, req.tokenUser?.id);
            if((postData?.start_date || postData?.end_date || postData?.reg_start_date || postData?.reg_end_date)){
                const recordDates = [this.commonDateService.getTodayDate(recordDetails?.start_date).format('YYYY-MM-DD') + ' 00:00:00', this.commonDateService.getTodayDate(recordDetails?.end_date).format('YYYY-MM-DD') + ' 00:00:00', this.commonDateService.getTodayDate(recordDetails?.reg_start_date).format('YYYY-MM-DD') + ' 00:00:00', this.commonDateService.getTodayDate(recordDetails?.reg_end_date).format('YYYY-MM-DD') + ' 00:00:00'];
                const datesToCheck = [postData?.start_date, postData?.end_date, postData?.reg_start_date, postData?.reg_end_date].filter(Boolean);
                const allValid = datesToCheck.every(date =>
                    this.commonDateService.isNotBeforeToday(date)
                );
                const isAnyDateSame = datesToCheck.some(
                    (date, index) => date !== recordDates[index]
                );
                if (allValid && isAnyDateSame) {
                    let notificationData: any = {
                        schedule_id: recordDetails?.id,
                        org_id: recordDetails?.org_id,
                        custom_cname: recordDetails?.custom_cname,
                        challenge_id: recordDetails?.challenge_id,
                        logo: recordDetails?.['custom_logo'] && recordDetails?.['custom_logo'] != ''
                        ? S3_URL + recordDetails?.['custom_logo']
                        : this.commonService.getIconPath(recordDetails['challenge']['logo'], S3_URL),
                        type: 'update',
                        url: `https://${process.env.DOMAIN}/my-challenges/${recordDetails['id']}`,
                    };

                    if (postData?.start_date) notificationData.start_date = postData.start_date;
                    if (postData?.end_date) notificationData.end_date = postData.end_date;
                    if (postData?.reg_start_date) notificationData.reg_start_date = postData.reg_start_date;
                    if (postData?.reg_end_date) notificationData.reg_end_date = postData.reg_end_date;

                    this.userChallengeHelperService.addNotification(notificationData, req);
                }
            }
            let message;
            if(postData?.hasOwnProperty('updateType') && postData?.updateType == '2'){
                if(postData?.status == 1) {
                    const joinUser = await this.scheduleChallengeJoinUsersService.listRecord({schedule_id: postData?.id})
                    await this.scheduleChallengeJoinUsersService.update({schedule_id: postData?.id, status: 0},{status: 1});
                    joinUser?.map(ele=>this.activityLogService.create(ele, {status: 1}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'challenge activate'));
                    message = 'Challenge schedule successfully activated.'; 
                }else {
                    const joinUser = await this.scheduleChallengeJoinUsersService.listRecord({schedule_id: postData?.id, status: 1})
                    await this.scheduleChallengeJoinUsersService.update({schedule_id: postData?.id, status: 1},{status : 0});
                    joinUser?.map(ele=>this.activityLogService.create(ele, {status: 0}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'challenge de-activate'));
                    message = 'Challenge schedule successfully deactivated.'; 
                }
            }else if(postData?.hasOwnProperty('updateType') && postData?.updateType == '3'){
                message = 'Date successfully saved.';
            }else if(postData?.hasOwnProperty('updateType') && postData?.updateType == '1'){
                if(postData?.hasOwnProperty('actionOn') && postData?.actionOn == 'add'){
                    message =  'Challenge schedule successfully added.';
                }else{
                    message =  'Challenge schedule successfully edited.';
                }
            }
          
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, message)
            });
        } catch (error) {
            if (file && file.fieldname === 'custom_logo' && file.filename) {
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
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.scheduleChallengeService.findOne({
                id: postData?.id, challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let teamIdRecords = await this.teamScheduleService.listRecord({schedule_id: postData?.id},null,null,['teamSchedule.team_id', 'teamSchedule.id']);
            const dynamicData = {};
            if (teamIdRecords?.length) {
                for (const team of teamIdRecords) {
                    const titleKey = `team_name_${postData.id}_${team.team_id}`;
                    dynamicData[titleKey] = titleKey;
                }
            }
            let teams = teamIdRecords?.map(record => record.team_id).join(',');
            let teamArray = teams != '' ? teams?.split(','): [];
            if(teamArray?.length){
                await this.teamScheduleService.update({schedule_id: postData?.id, team_id: In(teamArray)},{status:2})
                teamIdRecords?.map(ele=>this.activityLogService.create({...ele,status: 1}, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, req.tokenUser?.id, 'delete'));
                await this.teamsService.update({id: In(teamArray)},{status:2})
                if (Object.keys(dynamicData).length) {
                    await this.translatorService.DynamicEngJsonData(
                        'Challenge',
                        recordDetails.org_id,
                        dynamicData,
                        'Delete',
                        'MyChallenges',
                        postData.id
                    );
                }
                teamIdRecords?.map(ele=>this.activityLogService.create({id: ele.team_id, status: 1}, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAMS, req.tokenUser?.id, 'delete'));
                await this.teamMembersService.update({team_id: In(teamArray)},{status:2});
                const teamMember = await this.teamMembersService.listRecord({team_id: In(teamArray)})
                teamMember?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id, 'delete'));
            }
            await this.scheduleChallengeJoinUsersService.update({schedule_id: postData?.id},{status:2});
            const joinUser = await this.scheduleChallengeJoinUsersService.listRecord({schedule_id: postData?.id})
            joinUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'delete'));
            await this.inviteUserService.update({schedule_id: postData?.id},{status:2});
            const inviteUser = await this.inviteUserService.listRecord({schedule_id: postData?.id})
            inviteUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_INVITE_USER, req.tokenUser?.id, 'delete'));
            await this.bioWeightService.update({schedule_id: postData?.id},{status:2});
            const bioUser = await this.bioWeightService.listRecord({schedule_id: postData?.id})
            bioUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_BIO_WEIGHT, req.tokenUser?.id, 'delete'));
            await this.acOlympicDataService.update({schedule_id: postData?.id},{status:2});
            const olympicUser = await this.acOlympicDataService.listRecord({schedule_id: postData?.id})
            olympicUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_AC_OLYMPIC_DATA, req.tokenUser?.id, 'delete'));
            await this.fitnessUsersActivityService.update({schedule_id: postData?.id},{status:2});
            const fitnessUser = await this.fitnessUsersActivityService.listRecord({schedule_id: postData?.id})
            fitnessUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_FITNESS_USERS_ACTIVITY, req.tokenUser?.id, 'delete'));
            await this.weeksStepsService.update({schedule_id: postData?.id},{status:2});
            const weekUser = await this.weeksStepsService.listRecord({schedule_id: postData?.id})
            weekUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_WEEKS_STEPS, req.tokenUser?.id, 'delete'));
            await this.commitmentLevelsService.update({schedule_id: postData?.id},{status:2});
            const commitmentUser = await this.commitmentLevelsService.listRecord({schedule_id: postData?.id})
            commitmentUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS, req.tokenUser?.id, 'delete'));
            await this.stepCheckpointsService.update({schedule_id: postData?.id},{status:2});
            const stepCheckUser = await this.stepCheckpointsService.listRecord({schedule_id: postData?.id})
            stepCheckUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_STEP_CHECKPOINTS, req.tokenUser?.id, 'delete'));
            await this.scheduleChallengeService.update({id: postData?.id, challenge_id: postData?.challenge_id},{ status: 2 });
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE, req.tokenUser?.id, 'delete');
            this.notificationsController.removeNotification({org_id: recordDetails?.org_id, schedule_id: recordDetails?.id},req);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Challenge schedule successfully deleted.'),
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
            if (!postData?.id && !postData?.challenge_id) {
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
            const where = postData?.id ? postData?.challenge_id ? { id: postData?.id, challenge_id: postData?.challenge_id } : { id: postData?.id}: { challenge_id: postData?.challenge_id};
            let resultedData = await this.scheduleChallengeService.findOne(where);
            if (!resultedData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ScheduleChallengeDto, resultedData, req.lang)
            );
            if(resultedData && resultedData['custom_logo'] && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: resultedData['custom_logo']?.replace(S3_URL,'')}))){
                resultedData['custom_logo'] = S3_URL + resultedData['custom_logo'];
            }
            if(req.tokenUser?.role_id != appConstant.ROLE.ORGADMIN && (!resultedData['custom_logo'] || resultedData['custom_logo'] == '')){
                if(resultedData && resultedData['custom_logo'] && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: resultedData['custom_logo']?.replace(S3_URL,'')}))){
                    resultedData['custom_logo'] = S3_URL + resultedData['custom_logo'];
                }
                else if(resultedData && resultedData['challenge'] && resultedData['challenge']['logo'] && resultedData['challenge']['logo'].length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: resultedData['challenge']['logo'].replace(S3_URL,'')}))){
                    resultedData['custom_logo'] = S3_URL + resultedData['challenge']['logo'];
                }else{
                    resultedData['custom_logo'] = this.commonService.getIconPath(resultedData['challenge']['logo'],S3_URL);
                }
            }
            if(resultedData['weekstep'] && resultedData['weekstep'].length){
                resultedData['weekstep'] = resultedData['weekstep']?.sort((a, b) => a['week_no'] - b['week_no']);
            }
            if(resultedData['movemore'] && resultedData['movemore'].length){
                resultedData['movemore'] = resultedData['movemore']?.sort((a, b) => a['order_by'] - b['order_by']);
            }
            if(resultedData['checkpoint'] && resultedData['checkpoint'].length){
                resultedData['checkpoint'] = resultedData['checkpoint']?.sort((a, b) => a['id'] - b['id']);
            }
            if(resultedData['treklevel'] && resultedData['treklevel'].length){
                resultedData['treklevel'] = resultedData['treklevel']?.sort((a, b) => a['id'] - b['id']);
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ScheduleListChallengeInput){
        try {
            let where: string = ``;
            if (postData?.status != undefined || postData?.status != null) {
                where = `sc.id = ${postData?.status}`;
            } 
            if(req.tokenUser?.role_id == appConstant.ROLE.REGISTERED){
                if(postData?.id){
                    where +=  where != `` ? `sc.org_id = ${postData?.org_id} AND sc.id = ${postData?.id} AND ch.status = 1` : `sc.status = ${status} AND sc.org_id = ${postData?.org_id} AND sc.id = ${postData?.id} AND ch.status = 1`;
                }else{
                    where +=  where != `` ? `sc.org_id = ${postData?.org_id} AND ch.status = 1` : `sc.status = ${status} AND sc.org_id = ${postData?.org_id} AND ch.status = 1`;
                }
            }      
            if(postData?.challenge_type){
                where += where != `` ? ` AND(ch.challenge_type = '${postData?.challenge_type}') `: `ch.challenge_type = '${postData?.challenge_type}' `;
            }                
            if(postData?.org_id){
                where += where != `` ? ` AND(sc.org_id = ${postData?.org_id}) `: `sc.org_id = ${postData?.org_id} `;
            } 
            // inactive challenge (challengestatus = 0), active challenge (challengestatus = 1), all challenge (challengestatus = 2)
            if (this.commonService.isValidNumber(postData?.challengestatus)) {
                if (postData?.challengestatus == 0) {
                    where += where != `` ? ` AND ( sc.status = 0 ) ` : `sc.status = 0 `;
                }
                else if (postData?.challengestatus == 1) {
                    where += where != `` ? ` AND ( sc.status = 1 ) ` : `sc.status = 1 `;
                }
                else if (postData?.challengestatus == 2) {
                    where += where != `` ? ` AND ( sc.status IN (0,1) ) ` : `sc.status IN (0,1) `;
                }
            }
            let result = await this.scheduleChallengeService.listRecord(
                where,
                null,
                ['sc.id','sc.team','sc.group_status' ,'sc.challenge_id', 'sc.custom_cname', 'ch.challenge_type','company']
            );
            await Promise.all(result.map(async (ele) => {
                if (postData?.type && postData?.type?.toLowerCase() == 'report') {
                    ele['is_team'] = ele['team'] == 1 ? 1 : 0;
                    ele['is_group'] = ele['group_status'] == 1 ? 1 : 0;
                }
                delete ele['team'];
                delete ele['group_status'];
                if(ele.custom_cname){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                    ele.custom_cname = (customName == '' || customName == `custom_cname_${ele['id']}`) ? ele['custom_cname'] : customName;
                }
                if(ele.custom_desc){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                    ele.custom_desc = (customName == '' || customName == `custom_desc_${ele['id']}`) ? ele['custom_desc'] : customName;
                }
                if(ele.info_button){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_info_button_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                    ele.info_button = (customName == '' || customName == `custom_info_button_${ele['id']}`) ? ele['info_button'] : customName;
                }
                if(ele.website_button){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_website_button_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                    ele.website_button = (customName == '' || customName == `custom_website_button_${ele['id']}`) ? ele['website_button'] : customName;
                }
                if(ele.map_button){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_map_button_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                    ele.map_button = (customName == '' || customName == `custom_map_button_${ele['id']}`) ? ele['map_button'] : customName;
                }
                if(ele.image_button){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_image_button_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                    ele.image_button = (customName == '' || customName == `custom_image_button_${ele['id']}`) ? ele['image_button'] : customName;
                }
                // if(ele && ele['custom_logo'] && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: ele['custom_logo']?.replace(S3_URL,'')}))){
                //     ele['custom_logo'] = S3_URL + ele['custom_logo'];
                // }
                // else if(ele && ele['challenge'] && ele['challenge']['logo'] && ele['challenge']['logo'].length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: ele['challenge']['logo'].replace(S3_URL,'')}))){
                //     ele['custom_logo'] = S3_URL + ele['challenge']['logo'];
                // }else{
                //     ele['custom_logo'] = this.commonService.getIconPath(ele['challenge']['logo'],S3_URL);
                // }
            }));
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
    @Post('campaign-challenge-list')
    async campaignChallengeList(@Req() req: Request, @Res() res: Response, @Body() postData: CampaignChallengeListInput){
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ((req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id || appConstant.ROLE.WCH == req.tokenUser?.role_id)  && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let activePlugins = await this.activePluginService.getActivePluginList(postData?.org_id);
            const checkCampaign = await this.campaignService.findOne({
                id: postData?.campaign_id, status: Not(2), organization_id: postData?.org_id
            });
            if (!checkCampaign) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            let result = null;
            if(activePlugins.includes('Challenge')){
                let where = `sc.status = 1 AND sc.org_id = ${postData?.org_id}`;
                if (postData?.search_str) {
                    where += ` AND sc.custom_cname LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' `;
                }
                result = await this.scheduleChallengeService.listRecord(where,{ id: 'DESC' },['sc.id','sc.custom_cname']);
                await Promise.all(result.map(async (ele) => {
                    if(ele.custom_cname){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                        ele.custom_cname = (customName == '' || customName == `custom_cname_${ele['id']}`) ? ele['custom_cname'] : customName;
                    }
                    if(ele.custom_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele['id']}`,`dynamic`);
                        ele.custom_desc = (customName == '' || customName == `custom_desc_${ele['id']}`) ? ele['custom_desc'] : customName;
                    }
                }));
            }
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
    @Post('active-challenge-list')
    async addActiveChallenge(@Req() req: Request, @Res() res: Response, @Body() postData: ScheduleListChallengeInput){
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const role_id = req.tokenUser?.role_id;
            const user_id = req.tokenUser?.id;
            let org_id: number;
            if ([appConstant.ROLE.BROKERADMIN,appConstant.ROLE.BROKER,appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    role_id,
                    user_id,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
                org_id = postData?.org_id;
            } else {
                org_id = req.tokenUser?.org_id;
            }
            let challenge: any = await this.challengeService.addActiveChallengeList(`org_invite.org_id = ${org_id} AND org_invite.status !=2 AND challenge.status !=2`, null,['sc','challenge','org_invite.challenge_id'],org_id);
            challenge = await Promise.all(challenge?.map(async(ele)=>{
                ele = Object.keys(ele).reduce((acc, key) => {
                    const newKey = key.replace('challenge_', '');
                    acc[newKey] = ele[key];
                    return acc;
                  }, {});
                if(ele && ele['logo'] && ele['logo'].length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: ele['logo']}))){
                    ele['logo'] = S3_URL + ele['logo'];
                }else{
                    ele['logo'] = this.commonService.getIconPath(ele['logo'],S3_URL);
                }
                if(ele && ele && ele['icon'] && ele['icon'].length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: ele['icon']}))){
                    ele['icon'] = S3_URL + ele['icon'];
                }else{
                    ele['icon'] = this.commonService.getIconPath(ele['icon'],S3_URL);
                }
                if(!ele.id){
                    ele.id = ele.org_invite_id;
                }
                const translatedName = await this.translatorService.frontendReadTranslation(
                    req.lang,
                    `challenge_name_${ele.id}`,
                    `/LC_MESSAGES/Challenge/MyChallenges/0/${ele.id}`,
                    'dynamic'
                );
                ele.challenge_name = translatedName || ele.challenge_name;
                return ele;
            }));
            let temp =  challenge.filter(c => !(parseInt(c.counted) >= 1));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: temp?.length === 0 ? [] : temp,
                message: temp?.length === 0 ? "No Active Challenge found" : 'success',
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
    @Post('add-manual-data')
    async manual_data_add(@Req() req: Request, @Res() res: Response, @Body() postData: AddDataChallengeInput){
        try {
            let data = Object.create(null);
            let user = Object.create(req.tokenUser);
            if (postData['munualdata_week'] && postData['munualdata_week'] != "") {
                let wid = postData['weekid'];
                let longtext =  ""; 
                let numericf =  ""; 
                let manulastatus =  ""; 
                let shottext =  ""; 
                let check = "";
                let success = "";
                let schedule_id = postData['schedule_id'];
                if (postData['num']) {
                    numericf = postData['num'];
                }
                if (postData['manulastatus']) {
                    manulastatus = postData['manulastatus'];
                }
                if (postData['shottext']) {
                    shottext = postData['shottext'];
                }
                if (postData['longtext']) {
                    longtext = postData['longtext'];
                }
                let recordDetails = await this.weeksUsersService.findOne({id: wid});
                await this.weeksUsersService.update({id: wid},{m_short: shottext,m_long: longtext, m_yesno: check, m_field: numericf,status: 1});
                this.activityLogService.create(recordDetails, {m_short: shottext,m_long: longtext, m_yesno: check, m_field: numericf,status: 1}, tableConstant.CHALLENGE.TBL_CH_WEEKS_USERS, req.tokenUser?.id);
                let query = await this.weeksUsersService.listRecord({user_id: user.id, schedule_id: schedule_id},null);
                let  totalweeks = query?.length ?? 0;
                query = await this.weeksUsersService.listRecord({user_id: user.id, schedule_id: schedule_id, status: 1},null);
                let completedweeks = query?.length ?? 0;
                query = await this.daysUsersService.listRecord({user_id: user.id, schedule_id: schedule_id},null,['du.id']);
                let totaldays = query?.length ?? 0;
                query = await this.daysUsersService.listRecord({user_id: user.id, schedule_id: schedule_id, status : 1},null,['du.id']);
                let completeddays = query?.length ?? 0;
                let total = totalweeks + totaldays;
                let completed = completedweeks + completeddays;
                if (total == completed) {
                    success = "true";
                } else {
                    success = "false";
                }
                let per = 0;
                if (total != 0) {
                      per = (completed != 0 ? ((completed * 100) / total) : 0);
                     if (per == 0) {
                          per = 0.50;
                     }
                }
                data['percentage'] = per;
                data['complete'] = success;
           }
           if (postData['munualdata_day'] && postData['munualdata_day'] != "") {
                let dayid = postData['dayid'];
                let longtext = "";
                let numericf = "";
                let manulastatus = "";
                let shottext = "";
                let check = "";
                let schedule_id = postData['schedule_id'];
                if (postData['num']) {
                    numericf = postData['num'];
                }
                if (postData['manulastatus']) {
                    manulastatus = postData['manulastatus'];
                }
                if (postData['shottext']) {
                    shottext = postData['shottext'];
                }
                if (postData['longtext']) {
                    longtext = postData['longtext'];
                }
                let recordDetails = await this.daysUsersService.findOne({id: dayid});
                await this.daysUsersService.update({id: dayid},{m_short: shottext,m_long: longtext, m_yesno: check, m_field: numericf, status: 1});
                this.activityLogService.create(recordDetails, {m_short: shottext,m_long: longtext, m_yesno: check, m_field: numericf, status: 1}, tableConstant.CHALLENGE.TBL_CH_DAYS_USERS, req.tokenUser?.id);
                let query = await this.weeksUsersService.listRecord({user_id: user.id, schedule_id: schedule_id},null);
                let  totalweeks = query?.length ?? 0;
                query = await this.weeksUsersService.listRecord({user_id: user.id, schedule_id: schedule_id, status: 1},null);
                let completedweeks = query?.length ?? 0;
                query = await this.daysUsersService.listRecord({user_id: user.id, schedule_id: schedule_id},null,['du.id']);
                let totaldays = query?.length ?? 0;
                query = await this.daysUsersService.listRecord({user_id: user.id, schedule_id: schedule_id, status : 1},null,['du.id']);
                let completeddays = query?.length ?? 0;
                let total = totalweeks + totaldays;
                let completed = completedweeks + completeddays;
                let success = "";
                if (total == completed) {
                    success = "true";
                } else {
                    success = "false";
                }
                let per = 0;
                if (total != 0) {
                     per = ((completed * 100) / total);
                     if (per == 0) {
                        per = 0.50;
                     }
                }
                data['percentage'] = per;
                data['complete'] = success;
           }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
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
    @Post('add-team-member')
    async addTeamMember(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateTeamMembersInput){
        try {
            if (!postData?.team_id || !postData?.user_id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let result = await this.userChallengeHelperService.add_team_member(postData,req);        
            if(!result.error){
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: [],
                    message: result.messege,
                });
            }
            else{
                throw new HttpException(
                    {
                      statusCode: 401,
                      success: 0,
                      error: 1,
                      message: result.messege,
                      data: null,
                    },
                    HttpStatus.BAD_REQUEST,
                );
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
    @UseGuards(AccessGuard)
    @Put('copy')
    async copy(@Req() req: Request, @Res() res: Response, @Body() postData: CopyChallengeInput) {
        try {
            let scheduleID = null;
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.scheduleChallengeService.findOne({id: postData?.id});
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            const challengeData = JSON.parse(JSON.stringify(resultedData));
            delete resultedData.id;
            const oldOrgID = resultedData.org_id;
            resultedData.org_id = postData?.org_id;
            resultedData.status = 0;
            resultedData['is_copy'] = 1;
            const savedResult = await this.scheduleChallengeService.save({...resultedData});
            scheduleID = savedResult['id'];
            this.activityLogService.create(challengeData, savedResult, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE, req.tokenUser?.id, 'copy');
            const commitmentData = await this.commitmentLevelsService.listRecord({challenge_id: resultedData.challenge_id, schedule_id: postData?.id, status: Not(2)}, ['id','level_value','level_type'], {id: 'ASC'});
            if(commitmentData && commitmentData?.length){
                for(let commitment of commitmentData){
                    const commitmentRecord = JSON.parse(JSON.stringify(commitment));
                    commitment.challenge_id = resultedData.challenge_id;
                    commitment.schedule_id = scheduleID;
                    commitment.status = 1;
                    delete commitment.created_date;
                    delete commitment.id;
                    const savedData = await this.commitmentLevelsService.save({...commitment});
                    this.activityLogService.create(commitmentRecord, savedData, tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS, req.tokenUser?.id, 'copy');
                }
            }
            const stepCheckPointData = await this.stepCheckpointsService.listRecord({challenge_id: resultedData.challenge_id, schedule_id: postData?.id, status: Not(2)}, { id : 'ASC' });
            if(stepCheckPointData && stepCheckPointData?.length){
                for(let stepCheck of stepCheckPointData){
                    const stepCheckData = JSON.parse(JSON.stringify(stepCheck));
                    delete stepCheck.created_date;
                    delete stepCheck.id;
                    stepCheck.challenge_id = resultedData.challenge_id;
                    stepCheck.schedule_id = scheduleID;
                    stepCheck.status = 1;
                    const savedData = await this.stepCheckpointsService.save({...stepCheck});
                    this.activityLogService.create(stepCheckData, savedData, tableConstant.CHALLENGE.TBL_CH_STEP_CHECKPOINTS, req.tokenUser?.id, 'copy');
                }
            }
            const weekStepsData = await this.weeksStepsService.listRecord({challenge_id: resultedData.challenge_id, schedule_id: postData?.id, status: Not(2)},{week_no: 'ASC'});
            if(weekStepsData && weekStepsData?.length){
                for(let weekStep of weekStepsData){
                    const weekStepRecord = JSON.parse(JSON.stringify(weekStep));
                    delete weekStep.schedule_id;
                    delete weekStep.id;
                    delete weekStep.created_date;
                    weekStep.modified_date = new Date();
                    const savedData = await this.weeksStepsService.save({...weekStep, schedule_id: scheduleID});
                    this.activityLogService.create(weekStepRecord, savedData, tableConstant.CHALLENGE.TBL_CH_WEEKS_STEPS, req.tokenUser?.id, 'copy');
                }
            }
            if((resultedData.challenge_who == 'indi' && resultedData.org_id == oldOrgID) || (resultedData.org_id == oldOrgID)){
                const inviteTempsData = await this.inviteTempService.listRecord({org_id: oldOrgID, schedule_id: postData?.id, status: Not(2)}, { id: 'ASC' });
                if(inviteTempsData && inviteTempsData?.length){
                    for(let invitetemp of inviteTempsData){
                        const inviteTempRecord = JSON.parse(JSON.stringify(invitetemp));
                        delete invitetemp.id;
                        delete invitetemp.added_date;
                        invitetemp.schedule_id = scheduleID;
                        invitetemp.status = 1;
                        invitetemp.added_by = req.tokenUser?.id;
                        const savedData = await this.inviteTempService.save({...invitetemp});
                        this.activityLogService.create(inviteTempRecord, savedData, tableConstant.CHALLENGE.TBL_CH_INVITE_TEMP, req.tokenUser?.id, 'copy');
                    }
                }
            }
            if(resultedData.team == 1 && resultedData.team_created_from == 0){
                let where = {schedule_id: postData?.id, status: Not(2), org_id: oldOrgID};
                if(oldOrgID != resultedData.org_id){
                    where['dept_id'] = 0;
                    where['loc_id'] = 0;
                    where['dept_with_loc_id'] = 0;
                }
                const teamsData = await this.teamsService.listRecord(where, { id: 'ASC' });
                for(let team of teamsData){
                    const teamRecord = JSON.parse(JSON.stringify(team));
                    team.created_by = req.tokenUser?.id;
                    team.schedule_id = scheduleID;
                    delete team.created_date;
                    delete team.id;
                    const teamData = await this.teamsService.save({...team});
                    let dynamicData = Object.create(null);
                    if(teamData['tname']){
                        let title = `team_name_${teamData['schedule_id']}_${teamData['id']}`
                        dynamicData[`${title}`]= teamData['tname'];
                    }
                    await this.translatorService.DynamicEngJsonData('Challenge',teamData['org_id'],dynamicData,'Edit','MyChallenges',teamData['schedule_id']);
                    this.activityLogService.create(teamRecord, teamData, tableConstant.CHALLENGE.TBL_CH_TEAMS, req.tokenUser?.id, 'copy');
                    if(teamData){
                        await this.teamScheduleService.save({team_id: teamData['id'], schedule_id: scheduleID});
                    }
                }
            }
            if((resultedData.is_ftns_activity_custome && resultedData.is_ftns_activity_custome==1) || (resultedData['challenge'].bio_challenge_type && resultedData['challenge'].bio_challenge_type== 'Move_more')){
                const parksData = await this.moveMoreParksService.listRecord({ schedule_id: postData?.id, status: Not(2) }, { order_by: 'ASC' });
                await Promise.all(parksData.map(async (park)=>{
                    const parkRecord = JSON.parse(JSON.stringify(park));
                    delete park.created;
                    delete park.id;
                    park.schedule_id = scheduleID;
                    park.org_id = postData?.org_id;
                    const saveRecord = await this.moveMoreParksService.save({ ...park });
                    this.activityLogService.create(parkRecord, saveRecord, tableConstant.CHALLENGE.TBL_CH_MOVE_MORE_PARKS, req.tokenUser?.id, 'copy');
                }));
            }
            if((resultedData['challenge'].bio_challenge_type && resultedData['challenge'].bio_challenge_type == 'Bingo_layout')){
                const cardsData = await this.cardsService.paginateList({ org_id: oldOrgID, schedule_id: postData?.id, status: Not(2) }, postData as any);
                for(let card of cardsData?.list){
                    const cardRecord = JSON.parse(JSON.stringify(card));
                    delete card.created_date;
                    delete card.id;
                    card.schedule_id = scheduleID;
                    card.org_id = postData?.org_id;
                    const savedCard = await this.cardsService.save({ ...card });
                    if(savedCard && cardRecord['square']){
                        await Promise.all(cardRecord['square'].map(async (square)=>{
                            const squareRecord = JSON.parse(JSON.stringify(square));
                            delete square.id;
                            delete square.created_date;
                            square.card_id = savedCard['id'];
                            square.org_id = postData?.org_id;
                            square.schedule_id = scheduleID;
                            const savedData = await this.squaresService.save({ ...square });
                            this.activityLogService.create(squareRecord, savedData, tableConstant.CHALLENGE.TBL_CH_SQUARES, req.tokenUser?.id, 'copy');
                        }));
                        this.activityLogService.create(cardRecord, savedCard, tableConstant.CHALLENGE.TBL_CH_CARDS, req.tokenUser?.id, 'copy');
                    }
                }
                const weekData = await this.bingoWeekLabelsService.listRecord({ schedule_id: postData?.id, status: 1 });
                if(weekData){
                    await Promise.all(weekData.map(async (week)=>{
                        const weekRecord = JSON.parse(JSON.stringify(week));
                        delete week.created_date;
                        delete week.id;
                        week.schedule_id = scheduleID;
                        const savedData = await this.bingoWeekLabelsService.save({ ...week });
                        this.activityLogService.create(weekRecord, savedData, tableConstant.CHALLENGE.TBL_CH_WEEKS, req.tokenUser?.id, 'copy');
                    }));
                }
            }
            if((resultedData['challenge'].bio_challenge_type && resultedData['challenge'].bio_challenge_type == 'Healthy_habit_activity_layout')){
                const activityData = await this.healthActivityService.listRecord({ org_id: oldOrgID, schedule_id: postData?.id, status: Not(2) }, { id: 'ASC' });
                if(activityData){
                    await Promise.all(activityData.map(async (activity)=>{
                        const activityRecord = JSON.parse(JSON.stringify(activity));
                        delete activity.created;
                        delete activity.id;
                        activity.schedule_id = scheduleID;
                        activity.org_id = resultedData.org_id;
                        const savedData = await this.healthActivityService.save({ ...activity });
                        this.activityLogService.create(activityRecord, savedData, tableConstant.CHALLENGE.TBL_CH_HEALTH_ACTIVITY, req.tokenUser?.id, 'copy');
                    }));
                }
            }
            if(resultedData?.group_status == 1){
                const groupData = await this.groupsService.listRecord({ org_id: oldOrgID, schedule_id: postData?.id, status: Not(2) }, { id: 'ASC' });
                for(let group of groupData){
                    let exitGroupId = group.id;
                    const groupRecord = JSON.parse(JSON.stringify(group));
                    delete group.created_date;
                    delete group.id;
                    group.schedule_id = scheduleID;
                    group.org_id = resultedData.org_id;
                    const groupData = await this.groupsService.save({ ...group });
                    this.activityLogService.create(groupRecord, groupData, tableConstant.CHALLENGE.TBL_CH_GROUPS, req.tokenUser?.id, 'copy');
                    let where = {group_id: exitGroupId, schedule_id: scheduleID, status: Not(2), org_id: oldOrgID};
                    if(oldOrgID != resultedData.org_id){
                        where['dept_id'] = 0;
                        where['loc_id'] = 0;
                        where['dept_with_loc_id'] = 0;
                    }
                    const teamsData = await this.teamsService.listRecord(where, { id: 'ASC' });
                    for(let team of teamsData){
                        const teamRecord = JSON.parse(JSON.stringify(team));
                        team.created_by = req.tokenUser?.id;
                        team.group_id = groupData['id'];
                        delete team.created_date;
                        const teamData = await this.teamsService.save({...team});
                        let dynamicData = Object.create(null);
                        if(teamData['tname']){
                            let title = `team_name_${teamData['schedule_id']}_${teamData['id']}`
                            dynamicData[`${title}`]= teamData['tname'];
                        }
                        await this.translatorService.DynamicEngJsonData('Challenge',teamData['org_id'],dynamicData,'Edit','MyChallenges',teamData['schedule_id']);
                    this.activityLogService.create(teamRecord, teamData, tableConstant.CHALLENGE.TBL_CH_TEAMS, req.tokenUser?.id, 'copy');
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {id: scheduleID},
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Schedule challenge successfully copied.'),
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
    @Post('download-templete')
    async downloadTemplete(@Req() req: Request, @Res() res: Response, @Body() postData: ImportUsersChallengeInput) {
        try {
            if (!postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user =  req.tokenUser;
            if(user?.role_id !== appConstant.ROLE.ORGADMIN){
               if (!postData?.schedule_id || !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let org_id = user.org_id;
            if(postData?.org_id){
                org_id = postData?.org_id;
            }
            let scheduleChallengeId = postData?.schedule_id;
            let resultedData = await this.scheduleChallengeService.findOne({id: scheduleChallengeId, status: 1, org_id: org_id});
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            const challengeData = JSON.parse(JSON.stringify(resultedData));
            
            let headerData = appConstant.CHALLENE_IMPORT_USER_HEADER;
            let userWhere = ` user.status = 1 AND user.org_id = ${org_id} AND user.role_id IN (2,16)`;
            const joinTableList = [{'alias':'settings', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : `settings.user_id = user.id`, 'connect' : 'user', 'type' : 'INNER' }, {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id` , 'connect' : 'user', 'type' : 'LEFT' }, {'alias':'location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `location.id = user.location` , 'connect' : 'user', 'type' : 'LEFT' }, {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id` , 'connect' : 'user', 'type' : 'LEFT' },{'alias':'company_setting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `company_setting.org_id = user.org_id` , 'connect' : 'user', 'type' : 'LEFT' }];
            let getUsers = await this.userService.getAllUsers(userWhere,['user.id','user.code','user.username','user.first_name','user.middle_name','user.last_name','user.role_id','settings.jobtitle','user.employeeid','user.dob','user.on_insurance_plan','user.on_current_census','user.email','settings.wphone','settings.hphone', 'company.company_name','company_setting.spouse_option','department.dept_name','location.location_name','location.address1','location.address2','location.city','location.state','location.country','location.zip'],joinTableList);
            let jsonData: any[] = [];

            let companyName = '';
            let otherData = {}
            otherData = { 'Join Challenge Yes/No' : '' };
            if(challengeData?.team == 1){
                otherData = { ...otherData, 'Team Name' : '', 'Assign Captain' : '' };
            }
            if(challengeData?.tr_goaltype == 2){
                otherData = { ...otherData, 'Select Daily Goal' : '' };
            }
            if(getUsers.length > 0){
                for (let users of getUsers){
                    let country = users?.['location']?.['country'] || '';
                    let userDataRow = {
                        [headerData[0]] : users?.['company']['company_name'],
                        [headerData[1]] : users?.['code'],
                        [headerData[2]] : users?.['department']?.['dept_name'],
                        [headerData[3]] : users?.['first_name'],
                        [headerData[4]] : users?.['middle_name'],
                        [headerData[5]] : users?.['last_name'],
                        [headerData[6]] : users?.['settings']?.['jobtitle'],
                        [headerData[7]] : users?.['employeeid'],
                        [headerData[8]] : await this.commonDateService.DateTimeFormat(users?.['dob'], 'MM-DD-YYYY'),
                        [headerData[9]] : users?.['on_insurance_plan'],
                        [headerData[10]] : users?.['on_current_census'],
                        [headerData[11]] : users?.['email'],
                        [headerData[12]] : users?.['settings']?.['wphone'],
                        [headerData[13]] : users?.['settings']?.['hphone'],
                        [headerData[14]] : users?.['location']?.['location_name'] || '',
                        [headerData[15]] : users?.['location']?.['address1'] || '',
                        [headerData[16]] : users?.['location']?.['address2'] || '',
                        [headerData[17]] : users?.['location']?.['city'] || '',
                        [headerData[18]] : users?.['location']?.['state'] || '',
                        [headerData[19]] : country,
                        [headerData[20]] : users?.['location']?.['zip'] || '',
                    }
                    userDataRow = { ...userDataRow, ...otherData };
                    companyName = users?.['company']['company_name'];
                    jsonData.push(userDataRow)
                }
                const jsonString = JSON.stringify(jsonData, null, 2);
                let currnetDatetime = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD-HHmmss');
                let fileName:string = `${companyName.replace(/\s/g, "_")}_Challenge_User_Upload_Template_${currnetDatetime}.json`;
                let filePath:string = path.join(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`);
                await this.commonFileService.dirIsExist(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`);
                let data;
                try {
                    let writeFile = await this.commonFileService.writeFile(filePath, jsonString, fileName);
                    if (writeFile?.status == 'success') {
                        let excelData: any = await this.commonFileService.createJsonToFile(1, `${filePath}/${fileName}`, 'pythonjsontoxlsx.py');
                        if (excelData?.status == 'success') {
                            let filePathIn = `${filePath}/${fileName}`.replace(".json",".xlsx");
                            if (await this.commonFileService.fileExist(filePathIn)) {
                                data = await this.commonFileService.FileToBase64(filePathIn);
                            } else {
                                throw new Error(`File does not exist`);
                            }
                        }
                    } else {
                        throw new Error(`File does not exist`);
                    }
                } catch(err) {
                    throw new Error(`An error occurred: ${err}`);
                }
                fileName = fileName.replace(".json","");
                await this.commonFileService.removeFileFromLocal(`${filePath}/${fileName}.json`);
                await this.commonFileService.removeFileFromLocal(`${filePath}/${fileName}.xlsx`);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {excel_data: data,sheet_name: fileName, extension: 'xlsx'},
                    message: 'success',
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_USER_NOT_FOUND"));
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
    @Post('challenge-user-upload')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`,
                filename: fileName,
            }),
            fileFilter: fileFilter,
        }),
        AccessGuard
    )
    async challengeUserUpload(@Req() req: Request, @Res() res: Response, @Body() postData: ImportUsersChallengeInput, @UploadedFile() file: Express.Multer.File) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
        try {
            if (!postData?.schedule_id || (!file || (file && file.fieldname != 'file'))) {
                if (file && file.fieldname === 'file' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                });
            }
            let user =  req.tokenUser;
            if(user?.role_id !== appConstant.ROLE.ORGADMIN){
               if (!postData?.schedule_id || !postData?.org_id || (!file || (file && file.fieldname != 'file'))) {
                    if (file && file.fieldname === 'file' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                });
                }
            }
            let org_id = user.org_id;
            if(postData?.org_id){
                org_id = postData?.org_id;
            }
            
            postData = Object.create(postData);
            let NoSuccess = 0;
            let NoError = 0;
            let filePath: string = '';
            let excelData: any = {status: 0,message: await this.translatorService.frontendReadTranslation(req.lang, 'UNKNOWN_ERROR', `/LC_MESSAGES/Common/Common`, `static`)};
            let fileExt: string = file.originalname.split(".").pop();
            if (fileExt == 'csv') {
                excelData = await this.commonFileService.createFileToJson(file.path,'csv_to_json.py',req);
                filePath = file.path.replace(".csv",".json");
            } else {
                excelData = await this.commonFileService.createFileToJson(file.path,'excel_to_json.py',req);
                filePath = file.path.replace(".xlsx",".json");
            }
            if (excelData?.status === 0) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: excelData?.message
                });
            }
            let jsonData = await this.commonFileService.readFile(filePath);
            if (Array.isArray(jsonData) && jsonData?.length <= 1) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_DATA_NOT_FOUND")
                });
            }

            let sheetHeader = jsonData[0];
            postData.org_sheet_header = JSON.stringify(sheetHeader);

            let originalHeaderData = appConstant.CHALLENE_IMPORT_USER_HEADER;
            let scheduleChallengeId = postData?.schedule_id;
            let resultedData = await this.scheduleChallengeService.findOne({id: scheduleChallengeId, status: 1, org_id: org_id});
            if (!resultedData) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND")
                });
            }
            const challengeData = JSON.parse(JSON.stringify(resultedData));
            const challengeId = challengeData?.challenge_id;
            originalHeaderData[21] = 'Join Challenge Yes/No';
            if(challengeData?.team && challengeData.team== 1){
                originalHeaderData[22] = 'Team Name';
                originalHeaderData[23] = 'Assign Captain';
            }
            if(challengeData?.tr_goaltype && challengeData.tr_goaltype == 2){
                if(challengeData?.team && challengeData.team== 1){
                    originalHeaderData[24] = 'Select Daily Goal';
                }else{
                    originalHeaderData[22] = 'Select Daily Goal';
                }
            }

            let originalHeaderDataArray = Object.values(originalHeaderData);

            sheetHeader = sheetHeader
            .filter((item: any) => typeof item === 'string')
            .map((item: string) => item.trim())
            .filter((item: string) => item !== '');
            const differentData = originalHeaderDataArray.filter(item => !sheetHeader.includes(item));
            if(differentData.length == 0 && sheetHeader?.[21] && sheetHeader?.[21] == 'Join Challenge Yes/No'){
                if(Array.isArray(jsonData) && jsonData?.length > 1){
                    let treks: Record<string, number> = {};
                    let treksonlyValue: Record<string, number> = {};
                    if(challengeData?.tr_goaltype == 2){
                        const commitmentLevelList = await this.commitmentLevelsService.listRecord({schedule_id: scheduleChallengeId, status: 1});
                        commitmentLevelList.forEach(item => {
                            const key = `${item.level_value}${item.level_type}`;
                            treks[key] = item.id;

                            const keyValue = `${item.level_value}`;
                            treksonlyValue[keyValue] = item.id;
                        });
                    }
                    
                    let orgUsrList = await this.userService.usersList(`user.status = 1 AND user.org_id = ${org_id} AND user.role_id IN (2,16)`, ['user.id','user.code']);
                    orgUsrList = orgUsrList.reduce((acc, user) => {
                        acc[user.user_id] = user.user_code;
                        return acc;
                    }, {} as Record<number, string>);
                    if(orgUsrList && Object.keys(orgUsrList).length > 0){
                        let challengeJoinUserData = await this.scheduleChallengeJoinUsersService.joinUserListRecord({schedule_id: scheduleChallengeId, status: Not('2')},null,['id','user_id']);
                        challengeJoinUserData = challengeJoinUserData.reduce((acc, user) => {
                            acc[user.id] = user.user_id;
                            return acc;
                        }, {} as Record<number, number>);  

                        let r = 0;
                        let recordsRejected = [];
                        const addedDate = moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss');
                        const convertedDate = moment.tz(addedDate, 'UTC').tz('America/Anchorage').format('YYYY-MM-DD HH:mm:ss');
                        let TeamLists = {};
                        let JoinUserList = {};
                        if(challengeData?.team == 1){
                            const Teams:any = await this.teamsService.getAllTeamWithMember(`team.org_id = ${org_id} AND team.schedule_id = ${scheduleChallengeId} AND team.status = 1`);
                            for (let i = 0; i < Teams.length; i++) {
                                const team = Teams[i];
                                TeamLists[team.tname] = {
                                    TeamMember: {
                                        Totalmember: team.teamMember ? team.teamMember.length : 0,
                                        assignCaptain: team.teamMember.filter(member => member.iscaptain === 1).length,
                                    },
                                    Team: {
                                        tname: team.tname,
                                        team_size: team.team_size,
                                        id: team.id
                                    }
                                };

                                if (team.teamMember && team.teamMember.length > 0) {
                                    for (let j = 0; j < team.teamMember.length; j++) {
                                        const member = team.teamMember[j];
                                        if (member.scheduleJoin && member.scheduleJoin.user_id) {
                                            JoinUserList[member.scheduleJoin.user_id] = team.tname;
                                        }
                                    }
                                }
                            }
                        }
                        let challengeWeeks:any = Object.create(null);
                        let userCancelRegister = [];
                        let weekarray = {};
                        if((challengeData?.['challenge']?.challenge_type == 'H' && challengeData?.['challenge']?.bio_challenge_type == '') || (challengeData?.['challenge']?.challenge_type == 'A' && challengeData?.['challenge']?.bio_challenge_type == 'Olympics')){
                            if(challengeData?.['challenge']?.challenge_type == 'H'){
                                let weeks = await this.weeksService.listRecordJoinChallenge(`ch_weeks.challenge_id = ${challengeId} AND ch_weeks.status != 2`, null, 'ac',['ch_weeks','ac.activity_name']);
                                challengeWeeks = weeks;
                                for (let j = 0; j < weeks?.length; j++) {
                                    challengeWeeks[j]['days'] = Object.create(null);
                                    let wid = weeks[j]['id'];  
                                    let days = await this.daysService.listRecordJoinChallenge({week_id: wid,challenge_id: challengeId, status: Not(2)}, null, 'ac',['ch_days','ac.activity_name']);
                                    challengeWeeks[j]['days'] = days;
                                }
                            }else if(challengeData?.['challenge']?.challenge_type == 'A'){
                                let weeks = await this.weeksService.listRecordJoinChallenge(`ch_weeks.challenge_id = ${challengeId} AND ch_weeks.status != 2`, null, 'ch',['ch_weeks','ch.activity_name']);
                                challengeWeeks = weeks;
                                for (let j = 0; j < weeks?.length; j++) {
                                    challengeWeeks[j]['days'] = Object.create(null);
                                    let wid = weeks[j]['id'];  
                                    let days = await this.daysService.listRecordJoinChallenge({week_id: wid,challenge_id: challengeId, status: Not(2)}, null, 'ch',['ch_days','ch.activity_name']);
                                    challengeWeeks[j]['days'] = days;
                                }
                            }
                            
                            userCancelRegister = await this.scheduleChallengeJoinUsersService.joinUserListRecord(`scj.schedule_id = ${scheduleChallengeId} AND scj.status = 2`, null, ['scj.id','scj.user_id']);
                            userCancelRegister = userCancelRegister.reduce((acc, user) => {
                                acc[user.scj_user_id] = user.scj_id;
                                return acc;
                            }, {} as Record<number, number>); 
                            
                            let start_date1: any =  await this.commonDateService.DateTimeFormat(challengeData?.start_date, 'YYYY-MM-DD HH:mm:ss');
                            let end_date1: any =  await this.commonDateService.DateTimeFormat(challengeData?.end_date, 'YYYY-MM-DD HH:mm:ss');
                            let date1: any =  await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
                            let currentdate1:any =  await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
                            let addeddate1: any =  await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
            
                            let start_date: any =  await this.commonDateService.DateTimeFormat(start_date1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss','America/Anchorage');
                            let end_date: any =  await this.commonDateService.DateTimeFormat(end_date1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss','America/Anchorage');
                            let date: any =  await this.commonDateService.DateTimeFormat(date1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss','America/Anchorage');
                            let currentdate: any =  await this.commonDateService.DateTimeFormat(currentdate1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD','America/Anchorage');
                            let addeddate: any =  await this.commonDateService.DateTimeFormat(addeddate1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss','America/Anchorage');
            
                            let timeZone = req.tokenUser?.timezone;
                            if(timeZone !=''){
                                start_date =  await this.commonDateService.DateTimeFormat(start_date1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss',timeZone);
                                end_date =  await this.commonDateService.DateTimeFormat(end_date1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss',timeZone);
                                date =  await this.commonDateService.DateTimeFormat(date1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss',timeZone);
                                currentdate =  await this.commonDateService.DateTimeFormat(currentdate1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD',timeZone);
                                addeddate =  await this.commonDateService.DateTimeFormat(addeddate1, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss',timeZone);
                            }

                            weekarray = await this.commonDateService.getWeeksInRange(start_date, end_date,'week');
                        }
                        
                        let timezone = req.tokenUser['timezone'];         
                        let ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','','UTC');
                        if (timezone?.trim() !== "") {
                            ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',timezone);
                        }else{
                            ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','','America/Anchorage');
                        }
                        let ucurrentdateTS = await this.commonDateService.DateTimeFormat(ucurrentdate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');

                        const dataWithoutHeader = jsonData.slice(1);
                        for (let i = 0; i < dataWithoutHeader.length; i++) {
                            let flag = false;
                            let tmp_val = 0;
                            let j = 0;
                            let teamALjoin = "No";
                            let userJoindataHealthtmp = "No";
                            let usererror = [];
                            let teamdetail = [];
                            let newTeamMember = {};
                            let scJoinUserData = {};
                            if ((dataWithoutHeader[i][21] || '').toString().toLowerCase() === 'yes') {
                                const userCode = dataWithoutHeader[i][1];
                                const userId = Object.keys(orgUsrList).find(key => orgUsrList[key] === userCode);
                                if (!userCode || !Object.values(orgUsrList).includes(userCode)) {
                                    usererror.push(2001);
                                } else {
                                    if(challengeData?.team == 1){
                                        if(!dataWithoutHeader[i][22] || !String(dataWithoutHeader[i][22]).trim()){
                                            usererror.push(2004);
                                        }
                                    }
                                     if(challengeData?.tr_goaltype == 2){
                                        let goalKey = 22;
                                        if(challengeData?.team == 1){
                                            goalKey = 24;
                                        }
                                        if(!dataWithoutHeader[i][goalKey] || !String(dataWithoutHeader[i][goalKey]).trim()){
                                            usererror.push(2007);
                                        }
                                    }

                                    if (!Object.values(challengeJoinUserData).includes(Number(userId))) {
                                        if(challengeData?.team == 1){
                                            if(!dataWithoutHeader[i][22] || !String(dataWithoutHeader[i][22]).trim()){
                                                usererror.push(2004);
                                            }else{
                                                if(TeamLists.hasOwnProperty(dataWithoutHeader[i][22])){
                                                    teamdetail = TeamLists[dataWithoutHeader[i][22]];

                                                    newTeamMember['user_id'] = userId;
                                                    newTeamMember['team_id'] = teamdetail['Team']['id'];
                                                    newTeamMember['schedule_id'] = scheduleChallengeId;
                                                    newTeamMember['created_date'] = ucurrentdate;
                                                    newTeamMember['status'] = 1;
                                                    newTeamMember['org_id'] = org_id;
                                                    
                                                    let joinedmem = teamdetail['TeamMember']['Totalmember'];
                                                    let assignCap = teamdetail['TeamMember']['assignCaptain'];
                                                    if(teamdetail['Team']['team_size'] > 0 && joinedmem < teamdetail['Team']['team_size']){
                                                        if(!JoinUserList.hasOwnProperty(userId)){
                                                            if(dataWithoutHeader[i][23] && (dataWithoutHeader[i][23].toString().toLowerCase() == 'yes' || dataWithoutHeader[i][23].toString().toLowerCase() == 'y' || dataWithoutHeader[i][23].toString().toLowerCase() == 'true' || dataWithoutHeader[i][23].toString().toLowerCase() == '1')){
                                                                if(assignCap > 0){
                                                                   usererror.push(2010);
                                                                }else{
                                                                    newTeamMember['iscaptain'] = 1;
                                                                }
                                                            }else{
                                                                if(String(dataWithoutHeader[i][23]).trim() == '' || (dataWithoutHeader[i][23].toString().toLowerCase() == 'no' || dataWithoutHeader[i][23].toString().toLowerCase() == 'n' || dataWithoutHeader[i][23].toString().toLowerCase() == 'false' || dataWithoutHeader[i][23].toString().toLowerCase() == '0')){
                                                                    newTeamMember['iscaptain'] = 0;
                                                                }else{
                                                                    usererror.push(2009);
                                                                }
                                                            }
                                                        }else{
                                                            if(JoinUserList[userId].toString().toLowerCase() == dataWithoutHeader[i][22].toString().toLowerCase()){
                                                                usererror.push(2003);
                                                            }else{
                                                                teamALjoin = "Yes";
                                                            }
                                                        }
                                                    }else{
                                                        usererror.push(2006);
                                                    }
                                                }else{
                                                    usererror.push(2005);
                                                }
                                            }
                                        }
                                    }else{
                                        if(Object.keys(userCancelRegister).includes(userId)){
                                            userJoindataHealthtmp = "Yes";
                                        }else{
                                            usererror.push(2002);
                                        }
                                    }
                                }
                                if(challengeData?.tr_goaltype == 2){
                                    let goalKey = 22;
                                    if(challengeData?.team == 1){
                                        goalKey = 24;
                                    }
                                    let trakIds = '';
                                    if(dataWithoutHeader[i][goalKey] && dataWithoutHeader[i][goalKey] != ''){
                                        trakIds = dataWithoutHeader[i][goalKey].toString().replace(/\s+/g, '');
                                    }
                                    if(trakIds != ''){
                                        if(/^\d+$/.test(trakIds)){
                                            if(treksonlyValue.hasOwnProperty(trakIds)){
                                                scJoinUserData['trek_level_id'] = treksonlyValue[trakIds];
                                            }else{
                                                usererror.push(2011);
                                            }
                                        }else{
                                            trakIds = trakIds.toLowerCase();
                                            if(treks.hasOwnProperty(trakIds)){
                                                scJoinUserData['trek_level_id'] = treks[trakIds];
                                            }else{
                                                usererror.push(2011);
                                            }
                                        }
                                    }else{
                                        usererror.push(2007); 
                                    }
                                }
                                let insertedRecord = null;
                                if(usererror.length == 0){
                                    NoSuccess++;
                                    scJoinUserData['schedule_id'] = scheduleChallengeId;
                                    scJoinUserData['challenge_id'] = challengeId;
                                    scJoinUserData['user_id'] = userId; 
                                    scJoinUserData['added_date'] = convertedDate;
                                    scJoinUserData['status'] = 1;
                                    if(userJoindataHealthtmp == 'Yes'){
                                        scJoinUserData['id'] = userCancelRegister[userId];
                                    }
                                    insertedRecord = await this.scheduleChallengeJoinUsersService.save(scJoinUserData);

                                    if(Object.keys(insertedRecord)?.length > 0){
                                        let insertedRecordID = insertedRecord['id'];
                                        if(challengeData?.team == 1 && teamALjoin == "No"){
                                            await this.teamMembersService.save(newTeamMember);
                                            TeamLists[dataWithoutHeader[i][22]]['TeamMember']['Totalmember'] = TeamLists[dataWithoutHeader[i][22]]['TeamMember']['Totalmember'] + 1;
                                        }

                                        if(challengeData?.['challenge']?.challenge_type == 'H' && challengeData?.['challenge']?.bio_challenge_type == ''){
                                            if(Object.entries(challengeWeeks).length > 0){
                                                let challengeWeeksData:any = Object.create(null);
                                                let weekcounter = 1;
                                                for(let challengeWeek of challengeWeeks){
                                                    if(weekarray['weeks']["week_"+weekcounter] && weekarray['weeks']["week_"+weekcounter][0] && weekarray['weeks']["week_"+weekcounter][1]){
                                                        let weekDatas:any = Object.create(null);
                                                        let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}/dynamic.json`);
                                                        if(!translationMessage){
                                                            translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}/dynamic.json`);
                                                        }
                                                        if(challengeWeek.manual_activity){
                                                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_name_${challengeWeek['challenge_id']}_${challengeWeek['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}`,`dynamic`);
                                                            if (customName != `week_activity_name_${challengeWeek['challenge_id']}_${challengeWeek['id']}`) {
                                                                challengeWeek.manual_activity = customName;
                                                            }
                                                        }
                                                        if(challengeWeek.site_activity_desc){
                                                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_description_${challengeWeek['challenge_id']}_${challengeWeek['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}`,`dynamic`);
                                                            if (customName != `week_activity_description_${challengeWeek['challenge_id']}_${challengeWeek['id']}`) {
                                                                challengeWeek.site_activity_desc = customName;
                                                            }
                                                        }
                                                        if(challengeWeek.manual_desc){
                                                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_description_${challengeWeek['challenge_id']}_${challengeWeek['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}`,`dynamic`);
                                                            if (customName != `week_description_${challengeWeek['challenge_id']}_${challengeWeek['id']}`) {
                                                                challengeWeek.manual_desc = customName;
                                                            }
                                                        }
                                                        if(challengeWeek.tabmanual){
                                                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_tabmanual_${challengeWeek['challenge_id']}_${challengeWeek['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}`,`dynamic`);
                                                            if (customName != `week_tabmanual_${challengeWeek['challenge_id']}_${challengeWeek['id']}`) {
                                                                challengeWeek.tabmanual = customName;
                                                            }
                                                        }

                                                        weekDatas['schedule_id'] = insertedRecordID;
                                                        weekDatas['user_id'] = userId;
                                                        weekDatas['week_id'] = challengeWeek.id;
                                                        weekDatas['activity_id'] = challengeWeek.activity_id;
                                                        weekDatas['challenge_id'] = challengeWeek.challenge_id;
                                                        weekDatas['site_activity_desc'] = challengeWeek.site_activity_desc;
                                                        weekDatas['manual_activity'] = challengeWeek.manual_activity;
                                                        weekDatas['manual_desc'] = challengeWeek.manual_desc;
                                                        weekDatas['completion_status'] = '';
                                                        weekDatas['log_status'] = challengeWeek.log_status;
                                                        weekDatas['meal'] = challengeWeek.meal;
                                                        weekDatas['amount'] = challengeWeek.amount;
                                                        weekDatas['quantity'] = challengeWeek.quantity;
                                                        weekDatas['steps'] = challengeWeek.steps;
                                                        weekDatas['duration'] = challengeWeek.duration;
                                                        weekDatas['distance'] = challengeWeek.distance;
                                                        weekDatas['calories'] = challengeWeek.calories;
                                                        weekDatas['tabacco_status'] = challengeWeek.tabacco_status;
                                                        weekDatas['avalue'] = challengeWeek.avalue;
                                                        weekDatas['waterlogunit'] = challengeWeek.waterlogunit;
                                                        weekDatas['m_numeric'] = challengeWeek.m_numeric;
                                                        weekDatas['m_short'] = challengeWeek.m_short;
                                                        weekDatas['m_long'] = challengeWeek.m_long;
                                                        weekDatas['m_yesno'] = challengeWeek.m_yesno;
                                                        weekDatas['m_check'] = challengeWeek.m_check;
                                                        weekDatas['m_field'] = challengeWeek.m_field;
                                                        weekDatas['status'] = 0;

                                                        weekDatas['added_date'] = convertedDate;
                                                        weekDatas['update_date'] = '';

                                                        weekDatas['start_date'] = weekarray['weeks']["week_"+weekcounter][0];
                                                        weekDatas['end_date'] = moment.utc(weekarray['weeks']["week_"+weekcounter][1]).format('YYYY-MM-DD');;

                                                        const checkWeekUser = await this.weeksUsersService.findOne({week_id: challengeWeek.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeWeek.challenge_id});
                                                        let insertWeekUser = null;
                                                        if(checkWeekUser === null){
                                                            insertWeekUser = await this.weeksUsersService.save(weekDatas);
                                                        }
                                                        if(insertWeekUser){
                                                            let insertedWeekRecordID = insertWeekUser['id'];
                                                            if(challengeWeek['days'] && challengeWeek['days'].length > 0){
                                                                let j = 0;
                                                                for(let challengeDay of challengeWeek['days']){
                                                                    let dayDatas:any = Object.create(null);
                                                                    let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeDay['challenge_id']}/dynamic.json`);
                                                                    if(!translationMessage){
                                                                        translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeDay['challenge_id']}/dynamic.json`);
                                                                    }
                                                                    if(challengeDay.manual_activity){
                                                                        challengeDay.manual_activity = translationMessage.find((ele)=> ele.type == `week_days_activity_name_${ele['challenge_id']}_${ele['week_id']}_${ele['id']}`)?.['translate'] ?? challengeDay.manual_activity;
                                                                    }
                                                                    if(challengeDay.site_activity_desc){
                                                                        challengeDay.site_activity_desc = translationMessage.find((ele)=> ele.type == `week_days_activity_description_${ele['challenge_id']}_${ele['week_id']}_${ele['id']}`)?.['translate'] ?? challengeDay.site_activity_desc;
                                                                    }
                                                                    if(challengeDay.manual_desc){
                                                                        challengeDay.manual_desc = translationMessage.find((ele)=> ele.type == `week_days_description_${ele['challenge_id']}_${ele['week_id']}_${ele['id']}`)?.['translate'] ?? challengeDay.manual_desc;
                                                                    }
                                                                    
                                                                    dayDatas['schedule_id'] = insertedRecordID;
                                                                    dayDatas['user_id'] = userId;
                                                                    dayDatas['week_id'] = challengeWeek.id;
                                                                    dayDatas['day_id'] = challengeDay.id;
                                                                    dayDatas['activity_id'] = challengeDay.activity_id;
                                                                    dayDatas['challenge_id'] = challengeDay.challenge_id;
                                                                    dayDatas['site_activity_desc'] = challengeDay.site_activity_desc;
                                                                    dayDatas['manual_activity'] = challengeDay.manual_activity;
                                                                    dayDatas['manual_desc'] = challengeDay.manual_desc;
                                                                    dayDatas['completion_status'] = '';
                                                                    dayDatas['log_status'] = challengeDay.log_status;
                                                                    dayDatas['meal'] = challengeDay.meal;
                                                                    dayDatas['amount'] = challengeDay.amount;
                                                                    dayDatas['quantity'] = challengeDay.quantity;
                                                                    dayDatas['steps'] = challengeDay.steps;
                                                                    dayDatas['duration'] = challengeDay.duration;
                                                                    dayDatas['distance'] = challengeDay.distance;
                                                                    dayDatas['calories'] = challengeDay.calories;
                                                                    dayDatas['tabacco_status'] = challengeDay.tabacco_status;
                                                                    dayDatas['avalue'] = challengeDay.avalue;
                                                                    dayDatas['waterlogunit'] = challengeDay.waterlogunit;
                                                                    dayDatas['m_numeric'] = challengeDay.m_numeric;
                                                                    dayDatas['m_short'] = challengeDay.m_short;
                                                                    dayDatas['m_long'] = challengeDay.m_long;
                                                                    dayDatas['m_yesno'] = challengeDay.m_yesno;
                                                                    dayDatas['m_check'] = challengeDay.m_check;
                                                                    dayDatas['m_field'] = challengeDay.m_field;
                                                                    dayDatas['status'] = 0;
                        
                                                                    dayDatas['added_date'] = convertedDate;
                                                                    dayDatas['update_date'] = '';
                        
                                                                    let statDays = weekarray['weeks']["week_"+weekcounter][0];
                                                                    dayDatas['start_date'] = moment.utc(statDays).add(j, 'days').format('YYYY-MM-DD');
                                                                    dayDatas['end_date'] = moment.utc(dayDatas['start_date']).add(1, 'days').format('YYYY-MM-DD');

                                                                    const checkDayUser = await this.daysUsersService.findOne({day_id: challengeDay.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeDay.challenge_id});
                                                                    if(checkDayUser === null){
                                                                        let insertWeekUser = await this.daysUsersService.save(dayDatas);
                                                                    }
                                                                    j++;
                                                                }
                                                            }  
                                                        }
                                                    }
                                                    weekcounter++;
                                                }
                                            }
                                        }else if(challengeData?.['challenge']?.challenge_type == 'A' && challengeData?.['challenge']?.bio_challenge_type == 'Olympics'){
                                            if(Object.entries(challengeWeeks).length > 0){
                                                let challengeWeeksData:any = Object.create(null);
                                                let weekcounter = 1;
                                                for(let challengeWeek of challengeWeeks){
                                                    let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}/dynamic.json`);
                                                    if(!translationMessage){
                                                        translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}/dynamic.json`);
                                                    }
                                                    if(challengeWeek.manual_activity){
                                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_name_${challengeWeek['challenge_id']}_${challengeWeek['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}`,`dynamic`);
                                                        if (customName != `week_activity_name_${challengeWeek['challenge_id']}_${challengeWeek['id']}`) {
                                                            challengeWeek.manual_activity = customName;
                                                        }
                                                    }
                                                    if(challengeWeek.site_activity_desc){
                                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_description_${challengeWeek['challenge_id']}_${challengeWeek['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}`,`dynamic`);
                                                        if (customName != `week_activity_description_${challengeWeek['challenge_id']}_${challengeWeek['id']}`) {
                                                            challengeWeek.site_activity_desc = customName;
                                                        }
                                                    }
                                                    if(challengeWeek.manual_desc){
                                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_description_${challengeWeek['challenge_id']}_${challengeWeek['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}`,`dynamic`);
                                                        if (customName != `week_description_${challengeWeek['challenge_id']}_${challengeWeek['id']}`) {
                                                            challengeWeek.manual_desc = customName;
                                                        }
                                                    }
                                                    if(challengeWeek.tabmanual){
                                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_tabmanual_${challengeWeek['challenge_id']}_${challengeWeek['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeWeek['challenge_id']}`,`dynamic`);
                                                        if (customName != `week_tabmanual_${challengeWeek['challenge_id']}_${challengeWeek['id']}`) {
                                                            challengeWeek.tabmanual = customName;
                                                        }
                                                    }
                                                    if(weekarray['weeks']["week_"+weekcounter][0] && weekarray['weeks']["week_"+weekcounter][1]){
                                                        let weekDatas:any = Object.create(null);
        
                                                        weekDatas['schedule_id'] = insertedRecordID;
                                                        weekDatas['user_id'] = userId;
                                                        weekDatas['week_id'] = challengeWeek.id;
                                                        weekDatas['activity_id'] = challengeWeek.activity_id;
                                                        weekDatas['challenge_id'] = challengeWeek.challenge_id;
                                                        weekDatas['m_numeric'] = challengeWeek.m_numeric;
                                                        weekDatas['status'] = 0;
        
                                                        weekDatas['added_date'] = convertedDate;
                                                        weekDatas['update_date'] = '';
        
                                                        weekDatas['start_date'] = weekarray['weeks']["week_"+weekcounter][0];
                                                        weekDatas['end_date'] = moment.utc(weekarray['weeks']["week_"+weekcounter][1]).format('YYYY-MM-DD');;
        
                                                        const checkWeekUser = await this.weeksUsersService.findOne({week_id: challengeWeek.id, user_id: userId, schedule_id: insertedRecordID, challenge_id: challengeWeek.challenge_id});
                                                        let insertWeekUser = null;
                                                        if(checkWeekUser === null){
                                                            insertWeekUser = await this.weeksUsersService.save(weekDatas);
                                                        }else{
                                                            insertWeekUser = await this.weeksUsersService.update({week_id: challengeWeek.id, user_id: userId, schedule_id: insertedRecordID, challenge_id: challengeWeek.challenge_id}, {status: 1});
                                                        }
                                                        if(insertWeekUser){
                                                            let insertedWeekRecordID = insertWeekUser['id'];
                                                            if(challengeWeek['days'] && challengeWeek['days'].length > 0){
                                                                let j = 0;
                                                                for(let challengeDay of challengeWeek['days']){
                                                                    let dayDatas:any = Object.create(null);
                                                                    let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeDay['challenge_id']}/dynamic.json`);
                                                                    if(!translationMessage){
                                                                        translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${challengeDay['challenge_id']}/dynamic.json`);
                                                                    }
                                                                    if(challengeDay.manual_activity){
                                                                        challengeDay.manual_activity = translationMessage.find((ele)=> ele.type == `week_days_activity_name_${ele['challenge_id']}_${ele['week_id']}_${ele['id']}`)?.['translate'] ?? challengeDay.manual_activity;
                                                                    }
                                                                    if(challengeDay.site_activity_desc){
                                                                        challengeDay.site_activity_desc = translationMessage.find((ele)=> ele.type == `week_days_activity_description_${ele['challenge_id']}_${ele['week_id']}_${ele['id']}`)?.['translate'] ?? challengeDay.site_activity_desc;
                                                                    }
                                                                    if(challengeDay.manual_desc){
                                                                        challengeDay.manual_desc = translationMessage.find((ele)=> ele.type == `week_days_description_${ele['challenge_id']}_${ele['week_id']}_${ele['id']}`)?.['translate'] ?? challengeDay.manual_desc;
                                                                    }
                                                                    dayDatas['schedule_id'] = insertedRecordID;
                                                                    dayDatas['user_id'] = userId;
                                                                    dayDatas['week_id'] = challengeWeek.id;
                                                                    dayDatas['day_id'] = challengeDay.id;
                                                                    dayDatas['activity_id'] = challengeDay.activity_id;
                                                                    dayDatas['challenge_id'] = challengeDay.challenge_id;
                                                                    dayDatas['m_numeric'] = challengeDay.m_numeric;
                                                                    dayDatas['status'] = 0;
                        
                                                                    dayDatas['added_date'] = convertedDate;
                                                                    dayDatas['update_date'] = '';
                        
                                                                    let statDays = weekarray['weeks']["week_"+weekcounter][0];
                                                                    dayDatas['start_date'] = moment.utc(statDays).add(j, 'days').format('YYYY-MM-DD');
                                                                    dayDatas['end_date'] = moment.utc(dayDatas['start_date']).add(1, 'days').format('YYYY-MM-DD');
        
                                                                    const checkDayUser = await this.daysUsersService.findOne({day_id: challengeDay.id, user_id: userId, schedule_id: insertedRecordID, challenge_id: challengeDay.challenge_id});
                                                                    if(checkDayUser === null){
                                                                        let insertWeekUser = await this.daysUsersService.save(dayDatas);
                                                                    }
                                                                    j++;
                                                                }
                                                            }  
                                                        }
                                                    }
                                                    weekcounter++;
                                                }
                                            }
                                        }
                                    }
                                }else{
                                    NoError++;
                                    usererror = [...new Set(usererror)];
                                    dataWithoutHeader[i].push(usererror.join(","));
                                    recordsRejected[r] = Object.values(dataWithoutHeader[i]);
                                    r++;
                                }
                            }else{
                                if((dataWithoutHeader[i][21] || '').toString().toLowerCase() !== 'yes' && (dataWithoutHeader[i][21] || '').toString().toLowerCase() !== ''){
                                    usererror.push(2008);
                                    NoError++;
                                    usererror = [...new Set(usererror)];
                                    dataWithoutHeader[i].push(usererror.join(","));
                                    recordsRejected[r] = Object.values(dataWithoutHeader[i]);
                                    r++;
                                }
                            }
                        }
                        let dataSheet;
                        let fileName:string = '';
                        if(recordsRejected.length > 0){
                            sheetHeader.push('Error Code');

                            const allRejectedData = recordsRejected
                                .filter(row => Array.isArray(row) && row.length > 0)
                                .map(row => Object.fromEntries(sheetHeader.map((key, i) => [key, row[i] ?? ''])));


                            const jsonString = JSON.stringify(allRejectedData, null, 2);
                            let currnetDatetime = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD-HHmmss');
                            fileName = `Rejected_Import_Records_${currnetDatetime}.json`;
                            let rfilePath:string = path.join(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`);
                            await this.commonFileService.dirIsExist(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`);
                            
                            try {
                                let writeFile = await this.commonFileService.writeFile(rfilePath, jsonString, fileName);
                                if (writeFile?.status == 'success') {
                                    let excelData: any = await this.commonFileService.createJsonToFile(1, `${rfilePath}/${fileName}`, 'pythonjsontoxlsx.py');
                                    if (excelData?.status == 'success') {
                                        let filePathIn = `${rfilePath}/${fileName}`.replace(".json",".xlsx");
                                        if (await this.commonFileService.fileExist(filePathIn)) {
                                            dataSheet = await this.commonFileService.FileToBase64(filePathIn);
                                        } else {
                                            throw new Error(`File does not exist`);
                                        }
                                    }
                                } else {
                                    throw new Error(`File does not exist`);
                                }
                            } catch(err) {
                                throw new Error(`An error occurred: ${err}`);
                            }
                            fileName = fileName.replace(".json","");
                            await this.commonFileService.removeFileFromLocal(`${rfilePath}/${fileName}.json`);
                            await this.commonFileService.removeFileFromLocal(`${rfilePath}/${fileName}.xlsx`);
                        }

                        if (file && file.fieldname === 'file' && file.filename) {
                            await this.commonFileService.removeFileFromLocal(file.path);
                            await this.commonFileService.removeFileFromLocal(filePath);
                        }
                        let totalrecord = dataWithoutHeader.length;
                       
                        if(NoError > 0 && NoSuccess > 0){
                            let errMsg = await this.translatorService.frontendReadTranslation(req.lang, "No of Successful records ") +' : '+ NoSuccess;
                            errMsg += ' , Sorry ' + NoError + ' ' + await this.translatorService.frontendReadTranslation(req.lang, "records are rejected, Please download rejected records, Identify and correct the error from error code and upload again.") ;
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: {excel_data: dataSheet , sheet_name: fileName, extension: 'xlsx'},
                                message: errMsg
                            });
                        }else if(NoError > 0 && NoSuccess == 0){
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: {excel_data: dataSheet , sheet_name: fileName, extension: 'xlsx'},
                                message: await this.translatorService.frontendReadTranslation(req.lang, "Sorry") +' '+ NoError + ' '+await this.translatorService.frontendReadTranslation(req.lang, "records are rejected, Please download rejected records, Identify and correct the error from error code and upload again.")
                            });
                        }else if(NoError == 0){
                            return res.status(HttpStatus.OK).json({
                                success: 1,
                                error: 0,
                                data: null,
                                message: await this.translatorService.frontendReadTranslation(req.lang, "Successfully Imported Users.")
                            });
                        }
                    }else{
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            success: 0,
                            error: 1,
                            data: null,
                            message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_NOT_ORG_USER_FOUND")
                        });
                    }
                }else{
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND")
                    });
                }
            }else{
                this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, [challengeData], [originalHeaderDataArray, sheetHeader, differentData], req);
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_FILE")
                });
            }
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return res.status(HttpStatus.BAD_REQUEST).json({
                statusCode: 401,
                success: 0,
                error: 1,
                data: null,
                message: error?.message,
            });
        }
        });
    }
}

