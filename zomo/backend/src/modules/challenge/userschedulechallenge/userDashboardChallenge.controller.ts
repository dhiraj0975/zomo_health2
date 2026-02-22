import { NotificationsService } from '@/modules/notifications/notifications.service';
import { appConstant, CommonDateService, CommonFileService, CommonService } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { ChallengeService } from 'src/modules/challenge/challenge/challenge.service';
import { ScheduleChallengeService } from 'src/modules/challenge/schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeJoinUsersService } from 'src/modules/challenge/schedulechallengejoinusers/schedulechallengejoinusers.service';
import { TeamsService } from 'src/modules/challenge/teams/teams.service';
import { WeeksUsersService } from 'src/modules/challenge/weeksusers/weeksusers.service';
import { DepartmentService } from 'src/modules/company/departments/department.service';
import { InterlinksService } from 'src/modules/company/interlinks/interlinks.service';
import { LocationService } from 'src/modules/company/locations/location.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { UserService } from 'src/modules/user/user/user.service';
import { fileName, filesFilter } from 'src/utils/image-upload.utils';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from '../../translation/translation.service';
import { CommitmentLevelsService } from '../commitmentlevels/commitmentlevels.service';
import { DaysService } from '../days/days.service';
import { DaysUsersService } from '../daysusers/daysusers.service';
import { InviteTempService } from '../invitetemp/invitetemp.service';
import { MoveMoreParksService } from '../movemoreparks/movemoreparks.service';
import { ScheduleChallengeAgreementService } from '../schedulechallengeagreement/schedulechallengeagreement.service';
import { TeamMembersService } from '../teammembers/teammembers.service';
import { TeamScheduleService } from '../teamschedule/teamschedule.service';
import { WeeksService } from '../weeks/weeks.service';
import { JoinChallengeInput, MyChallengeInput } from './input';
import { UserChallengeHelperService } from './userChallengeHelper.service';
import { BingoChallengeService } from './userchallenges/bingoChallenge.service';
import { FitnessChallengeService } from './userchallenges/fitnessChallenge.service';
import { FootballStepChallengeService } from './userchallenges/footballStepChallenge.service';
import { HealthHabbitActivityChallengeService } from './userchallenges/healthHabbitActivityChallenge.service';
import { HealthHabbitChallengeService } from './userchallenges/healthHabbitChallenge.service';
import { HydrateChallengeService } from './userchallenges/hydrateChallenge.service';
import { MileLayoutChallengeService } from './userchallenges/mileLayoutChallenge.service';
import { MoveMoreChallengeService } from './userchallenges/movemoreChallenge.service';
import { RandomActChallengeService } from './userchallenges/randomactChallenge.service';
import { RelayRaceChallengeHelperService } from './userchallenges/relayRaceChallenge.service';
import { SleepChallengeService } from './userchallenges/sleepChallenge.service';
import { StepChallengeService } from './userchallenges/stepChallenge.service';
import { TrekStepChallengeService } from './userchallenges/trekstepChallenge.service';
import { WeightProgressChallengeService } from './userchallenges/weightProgressChallenge.service';
import { UserScheduleChallengeService } from './userScheduleChallenge.service';

const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Controller('challenge/schedule-challenge')
@UseGuards(TokenGuard, RoleGuard)
export class UserDashboardChallengeController {
    constructor(
        private readonly userService: UserService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly challengeService: ChallengeService,
        private readonly weeksUsersService: WeeksUsersService,
        private readonly teamsService: TeamsService,
        private readonly teamMembersService: TeamMembersService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
        private readonly teamScheduleService: TeamScheduleService,
        private readonly inviteTempService: InviteTempService,
        private readonly scheduleChallengeAgreementService: ScheduleChallengeAgreementService,
        private readonly commitmentLevelsService: CommitmentLevelsService,
        private readonly userScheduleChallengeService: UserScheduleChallengeService,
        private readonly weeksService: WeeksService,
        private readonly daysService: DaysService,
        private readonly daysUsersService: DaysUsersService,
        private readonly moveMoreParksService: MoveMoreParksService,
        private readonly interlinksService: InterlinksService,
        private readonly healthHabbitChallengeService: HealthHabbitChallengeService,
        private readonly healthHabbitActivityChallengeService: HealthHabbitActivityChallengeService,
        private readonly hydrateChallengeService: HydrateChallengeService,
        private readonly sleepChallengeService: SleepChallengeService,
        private readonly bingoChallengeService: BingoChallengeService,
        private readonly weightProgressChallengeService: WeightProgressChallengeService,
        private readonly footballStepChallengeService: FootballStepChallengeService,
        private readonly stepChallengeService: StepChallengeService,
        private readonly relayRaceChallengeHelperService: RelayRaceChallengeHelperService,
        private readonly fitnessChallengeService: FitnessChallengeService,
        private readonly mileLayoutChallengeService: MileLayoutChallengeService,
        private readonly moveMoreChallengeService: MoveMoreChallengeService,
        private readonly randomActChallengeService: RandomActChallengeService,
        private readonly trekStepChallengeService: TrekStepChallengeService,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * API for dashboard challegne widget data for challanges
     */
    @UseGuards(AccessGuard)
    @Post('dashboard-challenge')
    async dashboardChallenge(@Req() req: Request, @Res() res: Response, @Body() postData: MyChallengeInput){
        try{   
            let result = Object.create(null)
            if(!postData?.challenge_id){
                postData.dashboardList = 1
                let list = await this.challenge(req, postData);
                if(list == null){
                    throw new Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'ERR_NO_RECORD_FOUND',
                        ),
                    );
                }
                if(list.length > 0){
                    postData.challenge_id=list[0]
                    postData.dashboardList = 1
                    postData.show_type = 2
                    let firstChallengeList=await this.challenge(req, postData); 
                    if(firstChallengeList == null){
                        throw new Error(
                            await this.translatorService.frontendReadTranslation(
                                req.lang,
                                'ERR_NO_RECORD_FOUND',
                            ),
                        );
                    }
                    result['challengeDetails']=firstChallengeList
                    list.shift();
                    result['remainingChallengeIds']=list
                }
            }
            else if(postData?.challenge_id && postData?.challenge_id !== null){
                postData.dashboardList = 1
                postData.show_type = 2
                let list=await this.challenge(req, postData); 
                if(list == null){
                    throw new Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'ERR_NO_RECORD_FOUND',
                        ),
                    );
                }
                result['challengeDetails']=list
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

    @Post('join-challenge')
    @UseInterceptors(
        FileFieldsInterceptor([
            {
                name: 'logo',
                maxCount: 1,
            },
            {
                name: 'signature_image',
                maxCount: 1,
            },
        ],
        {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: (req, file, cb) => {
                    if (file.fieldname === 'logo') {
                        cb(null, appConstant.CHALLENGE_IMAGE_PATH);
                    } else {
                        cb(null, appConstant.CHALLENGE_SIGNATURE_PATH);
                    }
                },
                filename: fileName,
            }),
            fileFilter: filesFilter,
        }),
        AccessGuard
    )
    async joinChallenge(@Req() req: Request, @Res() res: Response, @Body() postData: JoinChallengeInput, @UploadedFiles() files: { logo?: Express.Multer.File[], signature_image?: Express.Multer.File[] }){
        try {
            let userDatas = req.tokenUser;
            let userid = userDatas?.id;
            let s : any = [];
            let where: any = ``;  
            const org_id = postData?.org_id ?? req.tokenUser?.org_id;
            const status = postData?.status ?? 1;
            if(postData?.id){
                where +=  where != `` ? `sc.org_id = ${org_id} AND sc.id = ${postData?.id} AND ch.status = 1` : `sc.status = ${status} AND sc.org_id = ${org_id} AND sc.id = ${postData?.id} AND ch.status = 1`;
            }else{
                where +=  where != `` ? `sc.org_id = ${org_id} AND ch.status = 1` : `sc.status = ${status} AND sc.org_id = ${org_id} AND ch.status = 1`;
            }
            let timezone = req.tokenUser['timezone'];         
            let ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
            if (timezone?.trim() !== "") {
                ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',timezone);
            }
            let ucurrentdateTS = await this.commonDateService.DateTimeFormat(ucurrentdate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');

            const wellnessData = await this.userService.userChallengeData(req.tokenUser);
            if(wellnessData?.length){
                where += ` AND sc.created_by Not In(${wellnessData.map(ele=>`${ele.id}`)})`;
            }
            let result:any = await this.scheduleChallengeService.joinChallenge(where, req);
            if (result?.length == 0) {
                return res.status(HttpStatus.OK).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'),
                });
            }
            let unserschedulechallege = [];
            for (let j = 0; j < result?.length; j++) {
                if (result[j]['org_id'] === 864 &&
                    result[j]['challenge_id'] === 952 &&
                    result[j]['id'] === 4094) 
                {
                    result[j]['end_date'] = '2024-03-03 00:00:00';
                }

                let showChallenge = false;
                if ((req.tokenUser?.is_camp_eligible == 1 &&
                    result[j]['eligibility'] == 1) ||
                    (req.tokenUser?.is_camp_eligible == 0 &&
                    result[j]['eligibility'] == 2)) {
                    showChallenge = true;
                }
                if ((req.tokenUser?.role_id == 2 &&
                    req.tokenUser?.is_camp_eligible == 1 &&
                    result[j]['eligibility'] == 3) ||
                    (req.tokenUser?.role_id == 2 &&
                    req.tokenUser?.is_camp_eligible == 0 &&
                    result[j]['eligibility'] == 4)) {
                    showChallenge = true;
                }
                if ((req.tokenUser?.role_id == 16 &&
                    req.tokenUser?.is_camp_eligible === 1 &&
                    result[j]['eligibility'] == 5) ||
                    (req.tokenUser?.role_id == 16 &&
                    req.tokenUser?.is_camp_eligible == 0 &&
                    result[j]['eligibility'] == 6)) {
                    showChallenge = true;
                }
                if (result[j]['eligibility'] == 0 || showChallenge) {
                    result[j]['userid'] = "";
                    let check = await this.scheduleChallengeJoinUsersService.findOne({user_id: req.tokenUser?.id, schedule_id: result[j]['id'], status: Not(2)})
                    result[j]['AlreadyjoinId'] = 0;
                    if (check && check['user_id']) {
                        result[j]['userid'] = check['user_id'];
                        result[j]['Suseridstatus'] = check['status'];
                        result[j]['AlreadyjoinId'] = check['id'];
                        result[j]['AlreadyjoinStatus'] = check['status'];
                    }
                    if (result[j]['dpt_id']?.trim() !== "" ||
                        result[j]['loc_id']?.trim() !== "") {
                        let deptid = result[j]['dpt_id']?.split(",");
                        for (let i = 0; i < deptid?.length; i++) {
                            if (deptid[i]) {
                                let department = await  this.departmentService.findOne({id: deptid[i]}, ['department','company']);
                                result[j]['company'] = "";
                                if (department && department['dept_name']) {
                                    if(!result[j]['department'] || result[j]['department'].length == 0){
                                        result[j]['department'] = [];
                                    }
                                    if(!result[j]['departmentIds'] || result[j]['departmentIds'].length == 0){
                                        result[j]['departmentIds'] = [];
                                    }
                                    result[j]['department'].push(department['dept_name']);
                                    result[j]['departmentIds'].push(department['id']);
                                }
                                if (department && department?.['company'] && department['company']['company_name']) {
                                    result[j]['company'] = department['company']['company_name'];
                                }
                            }
                        }
                    }

                    let locid = result[j]['loc_id']?.split(",");
                    for (let k = 0; k < locid?.length; k++) {
                        if (locid[k]) {
                            let location = await this.locationService.findOne({id: locid[k]});
                            if (location && location['location_name']) {
                                if(!result[j]['location'] || result[j]['location'].length == 0){
                                    result[j]['location'] = [];
                                }
                                if(!result[j]['locationIds'] || result[j]['locationIds'].length == 0){
                                    result[j]['locationIds'] = [];
                                }
                                result[j]['location'].push(location['location_name']);
                                result[j]['locationIds'].push(location['id']);
                            }
                        }
                    }

                    let field_array = ['TeamSchedule', 'Teams', 'TeamMember', 'COUNT(TeamMember.id) AS CNT'];
                    let group_by: any;
                    let join_cond = false;
                    if (result[j]['lock_teams'] === 'Yes') {
                        join_cond = true;
                        field_array = ['TeamSchedule', 'Teams', 'TeamMember', 'COUNT(TeamMember.id) AS CNT'];
                        group_by = 'TeamMember.team_id HAVING COUNT(TeamMember.id) < Teams.team_size';
                    } else {
                        field_array = ['TeamSchedule', 'Teams', '(select count(*) from ch_team_members as ctmem where ctmem.team_id = Teams.id and ctmem.status NOT IN (2,3)) as countMember'];
                        group_by = 'TeamSchedule.team_id HAVING countMember < Teams.team_size';
                    }
                    let Teams = await this.teamScheduleService.checkTeamNotFull(`TeamSchedule.schedule_id = ${result[j]['id']} AND Teams.status = 1`,group_by, field_array, join_cond);
                    let checkTeams = await this.teamScheduleService.checkTeam(`TeamSchedule.schedule_id = ${result[j]['id']} AND Teams.status = 1`,['TeamSchedule', 'Teams']);
                    if (result[j]['team'] === 1) {
                        result[j]['TeamChallenge'] = true;
                        result[j]['number_of_teams_available'] = checkTeams?.length ?? 0;
                        result[j]['number_of_teams'] = Teams?.length ?? 0;
                    }

                    /* if (result[j]['ch'] && result[j]['ch']['challenge_type'] === "A") {
                         let aid = result[j]['ch']['activity_id'];
                         let activity = await this.activityService.findOne({id: aid});
                         result[j]['Activity'] = activity;
                    } */

                    let checkdata = await this.inviteTempService.listRecord({schedule_id: result[j]['id']});
                    if (checkdata?.length > 0) {
                        userid = req.tokenUser?.id;
                        let checkuserinvitation = await this.inviteTempService.listRecord({schedule_id: result[j]['id'], user_id: userid, org_id: org_id, status: Not(2)});
                        if (checkuserinvitation?.length === 0) {
                            result[j] = null;
                        }
                    }
                } else {
                    unserschedulechallege.push(j);
                }
            }
            let cuserid = userid;
            if (unserschedulechallege?.length > 0) {
                for (let index of unserschedulechallege) {
                    delete result[index];
                }
            }
            if (result?.length > 0) {
                result = Object.values(result);
                for (let schedulekey = 0; schedulekey < result?.length; schedulekey++) {
                    let schedule = result[schedulekey];
                    if(schedule !== null){
                        if ((schedule['deactive_date'] == null || schedule['deactive_date'] == undefined) || (schedule['deactive_date'] && moment(schedule['deactive_date']) == '') || (schedule['deactive_date'] && moment(`${schedule['deactive_date']} ${schedule['deactive_time'] ?? '23:59:59'}`).isAfter(moment(ucurrentdate)))) {
                            if (schedule['challenge_who'] === 'speclocation' &&
                                schedule['locationIds'] &&
                                schedule['locationIds']?.length > 0 &&
                                !schedule['locationIds'].includes(Number(req.tokenUser?.location))) {
                                delete result[schedulekey];
                                continue;
                            }
                            if (schedule['challenge_who'] === 'specdepart' &&
                                schedule['departmentIds'] &&
                                schedule['departmentIds']?.length > 0 &&
                                !schedule['departmentIds']?.includes(req.tokenUser?.department_id)) {
                                
                                delete result[schedulekey];
                                continue;
                            }
                            let challengeName = '';
                            if (schedule?.custom_cname) {
                                challengeName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${schedule.id}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule.org_id}/${schedule.id}`,`dynamic`);
                                if (challengeName == '' || challengeName === `custom_cname_${schedule.id}`) {
                                    challengeName = schedule.custom_cname;
                                }
                            }else{
                                challengeName = await this.translatorService.frontendReadTranslation(req.lang,`challenge_name_${schedule.ch.id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${schedule.ch.id}`,`dynamic`);
                                if (challengeName == '' || challengeName === `challenge_name_${schedule.ch.id}`) {
                                    challengeName = schedule.ch.challenge_name;
                                }
                            }
                            let challengeDesc = '';
                            if (schedule?.custom_desc) {
                                challengeDesc = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${schedule.id}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule.org_id}/${schedule.id}`,`dynamic`);
                                if (challengeDesc == '' || challengeDesc === `custom_desc_${schedule.id}`) {
                                    challengeDesc = schedule.custom_desc;
                                }
                            }else{
                                challengeDesc = await this.translatorService.frontendReadTranslation(req.lang,`challenge_desc_${schedule.ch.id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${schedule.ch.id}`,`dynamic`);
                                if (challengeDesc == '' || challengeDesc === `challenge_desc_${schedule.ch.id}`) {
                                    challengeDesc = schedule.ch.challenge_desc;
                                }
                            }
                            schedule['custom_cname'] = challengeName;
                            schedule['custom_desc'] = challengeDesc;
                            //await this.fileUploadService.checkFileInBucket(schedule['custom_logo'])
                            if(schedule && schedule['custom_logo'] && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: schedule['custom_logo']?.replace(S3_URL,'')}))){
                                schedule['custom_logo'] = S3_URL + schedule['custom_logo'];
                            }else if(schedule && schedule['ch'] && schedule['ch']['logo'] && schedule['ch']['logo'].length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: schedule['ch']['logo']}))){
                                schedule['custom_logo'] = S3_URL + schedule['ch']['logo'];
                            }else{
                                schedule['custom_logo'] = this.commonService.getIconPath(schedule['ch']['logo'],S3_URL);
                            }
                            schedule['start_date'] = await this.commonDateService.DateTimeFormat(schedule?.start_date, 'YYYY-MM-DD HH:mm:ss');
                            schedule['end_date'] = await this.commonDateService.DateTimeFormat(schedule?.end_date, 'YYYY-MM-DD HH:mm:ss');
                            let startMonthName = await this.commonDateService.DateTimeFormat('now', 'MMMM');
                            if(schedule?.start_date){
                                startMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(schedule?.start_date, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                            }
                            let endMonthName = await this.commonDateService.DateTimeFormat('now', 'MMMM');
                            if(schedule?.end_date){
                                endMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(schedule?.end_date, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                            }
                            schedule['start_date_str'] = startMonthName+ ' '+this.commonDateService.DateTimeFormat(schedule?.start_date, 'D') + ', '+this.commonDateService.DateTimeFormat(schedule?.start_date, 'YYYY');
                            schedule['end_date_str'] = endMonthName+ ' '+this.commonDateService.DateTimeFormat(schedule?.end_date, 'D') + ', '+this.commonDateService.DateTimeFormat(schedule?.end_date, 'YYYY');
                            schedule['reg_start_date'] = await this.commonDateService.DateTimeFormat(schedule?.reg_start_date, 'YYYY-MM-DD HH:mm:ss');
                            schedule['reg_end_date'] = await this.commonDateService.DateTimeFormat(schedule?.reg_end_date, 'YYYY-MM-DD HH:mm:ss');
                            schedule['deactive_date'] = schedule?.deactive_date;
                            schedule['deactive_time'] = schedule?.deactive_time;
                            if (schedule?.invitechallengeUsers && schedule?.invitechallengeUsers?.id) {
                                const team = await this.teamsService.findOne({id: schedule['invitechallengeUsers']['team_id']});
                                let teamName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${schedule.id}_${team.id}`, `/LC_MESSAGES/Challenge/MyChallenges/${org_id}/${schedule.id}`,`dynamic`);
                                teamName = (teamName == '' || teamName == `team_name_${schedule.id}_${team.id}`) ? team.tname : teamName;
                                team['tname'] = teamName;
                                if(!schedule['invitechallengeUsers']['tname']){
                                    schedule['invitechallengeUsers']['tname'] = '';
                                }
                                schedule['invitechallengeUsers']['tname'] = team?.tname;
                            }

                            /* Button Show/Hide Code */
                                let regEndDate = '';
                                let regEndDateTimeStamp:any = '';
                                let regStartDateTimeStamp:any = '';
                                const regEndDateRaw = schedule?.reg_end_date;
                                const regStartDateRaw = schedule?.reg_start_date;
                                let challengeStartDateTimeStamp:any = '';
                                let challengeEndDateTimeStamp:any = '';
                                let challengeStartDate = schedule?.start_date;
                                if(schedule.backdating_frequency && schedule.backdating_frequency != ''){
                                    challengeStartDate = schedule.backdating_frequency;
                                }
                                let challengeEndDate = schedule?.end_date;
                                let buttonsData = {};
                                if (regEndDateRaw && regEndDateRaw !== '0000-00-00 00:00:00') {
                                    regEndDate = moment(regEndDateRaw).format('YYYY-MM-DD')+ ' 23:59:59';
                                    let regStartDate = moment(regStartDateRaw).format('YYYY-MM-DD') + ' 00:00:00';
                                    challengeStartDate = moment(challengeStartDate).format('YYYY-MM-DD') + ' 00:00:00';
                                    challengeEndDate = moment(challengeEndDate).format('YYYY-MM-DD') + ' 23:59:59';

                                    if (timezone) {
                                        regEndDate = await this.commonDateService.DateTimeFormat(regEndDate, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', timezone).toString() + ' 23:59:59';
                                        regStartDate = await this.commonDateService.DateTimeFormat(regStartDate, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', timezone).toString() + ' 00:00:00';
                                        challengeStartDate = await this.commonDateService.DateTimeFormat(challengeStartDate, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', timezone).toString() + ' 00:00:00';
                                        challengeEndDate = await this.commonDateService.DateTimeFormat(challengeEndDate, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', timezone).toString() + ' 23:59:59';
                                    }

                                    regEndDateTimeStamp = await this.commonDateService.DateTimeFormat(regEndDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                                    regStartDateTimeStamp = await this.commonDateService.DateTimeFormat(regStartDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                                    challengeStartDateTimeStamp = await this.commonDateService.DateTimeFormat(challengeStartDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                                    challengeEndDateTimeStamp = await this.commonDateService.DateTimeFormat(challengeEndDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                                    
                                    schedule['challengeStatus'] =  2; // Default status is 2 (Not started)
                                    schedule['challengeStatuslabel'] = await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    if(challengeStartDate && challengeStartDate !== 'Invalid date' && challengeStartDate !== '0000-00-00 00:00:00' && challengeStartDate !== '1970-01-01 00:00:00' && challengeStartDate !== '1970-01-01 00:00:00 23:59:59' && challengeStartDate !== '1970-01-01 00:00:00 00:00:00'){
                                        if(challengeStartDateTimeStamp <= ucurrentdateTS && challengeEndDateTimeStamp >= ucurrentdateTS){
                                            schedule['challengeStatus'] =  1; // 1 (Started)
                                            schedule['challengeStatuslabel'] = await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }else if(challengeStartDateTimeStamp > ucurrentdateTS){
                                            schedule['challengeStatus'] =  2; // 2 (Not started)
                                            schedule['challengeStatuslabel'] = await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }else if(challengeEndDateTimeStamp < ucurrentdateTS){
                                            schedule['challengeStatus'] =  3; // 3 (Ended)
                                            schedule['challengeStatuslabel'] = await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Ended', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }
                                    }
                                    schedule['registerStatus'] = 2; // Default status is 2 (Not started)
                                    schedule['registerStatuslabel'] = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    if(regStartDate && regStartDate !== 'Invalid date' && regStartDate !== '0000-00-00 00:00:00' && regStartDate !== '1970-01-01 00:00:00' && regStartDate !== '1970-01-01 00:00:00 23:59:59' && regStartDate !== '1970-01-01 00:00:00 00:00:00'){
                                        if(regStartDateTimeStamp <= ucurrentdateTS && regEndDateTimeStamp >= ucurrentdateTS){
                                            schedule['registerStatus'] = 1; // 1 (Started)
                                            schedule['registerStatuslabel'] = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }else if(regStartDateTimeStamp > ucurrentdateTS){
                                            schedule['registerStatus'] = 2; // 2 (Not started)
                                            schedule['registerStatuslabel'] = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }else if(regEndDateTimeStamp < ucurrentdateTS){
                                            schedule['registerStatus'] = 3; // 3 (Ended)
                                            schedule['registerStatuslabel'] = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Ended', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }
                                    }

                                    if(schedule?.AlreadyjoinId == 0){
                                        if(schedule['challengeStatus'] != 3){
                                            if(schedule['registerStatus'] == 1){
                                                if(schedule?.team == 1){
                                                    if(schedule?.userid != cuserid){
                                                        let checkAlreadyJpoinPastTeam = null;
                                                        if(schedule?.lock_teams == 'Yes'){
                                                            let join_cond = true;
                                                            let field_array = ['TeamSchedule.id', 'Teams.id','Teams.team_size','TeamMember.id','TeamMember.status','TeamMember.team_id'];
                                                            checkAlreadyJpoinPastTeam =  await this.teamScheduleService.listRecordJoinSchedule(`TeamSchedule.schedule_id = ${schedule?.id} AND TeamMember.user_id = ${userid} AND Teams.status = 1 AND TeamMember.status IN (3)`, null , field_array, join_cond, { 'TeamMember.updated': 'DESC' });
                                                            if(checkAlreadyJpoinPastTeam && checkAlreadyJpoinPastTeam?.length > 0){
                                                                let getTeamDetails = await this.teamMembersService.countTeamMember({team_id: checkAlreadyJpoinPastTeam[0]['TeamMember'].team_id, status: 1});
                                                                if(getTeamDetails >= checkAlreadyJpoinPastTeam[0]['Teams'].team_size){
                                                                    checkAlreadyJpoinPastTeam = null;
                                                                }
                                                            }
                                                        }
                                                        if(checkAlreadyJpoinPastTeam != null && checkAlreadyJpoinPastTeam?.length > 0 && schedule?.lock_teams == 'Yes'){
                                                            buttonsData['joinChallengeStatus'] = 1;
                                                            buttonsData['joinChallengeButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Join Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                                        }else{
                                                            if(schedule?.team_created_from == 1){
                                                                if(schedule?.join_team_status == 0){
                                                                    buttonsData['createTeamStatus'] = 1;
                                                                    buttonsData['createTeamButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Create a Team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                                                    if(schedule?.number_of_teams_available == 0){
                                                                        buttonsData['joinTeamStatus'] = 0;
                                                                    }else if(schedule?.number_of_teams_available > 0 && schedule?.number_of_teams > 0){
                                                                        buttonsData['joinTeamStatus'] = 1;
                                                                        buttonsData['joinTeamButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Join a Team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                                                    }else if(schedule?.number_of_teams_available > 0 && schedule?.number_of_teams == 0){
                                                                        buttonsData['joinTeamStatus'] = 0;
                                                                    }
                                                                }else{
                                                                    buttonsData['createTeamStatus'] = 1;
                                                                    buttonsData['createTeamButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Create a Team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                                                }
                                                            }else{
                                                                if(schedule?.number_of_teams_available == 0){
                                                                    buttonsData['joinTeamStatus'] = 1;
                                                                    buttonsData['joinTeamButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Team not available', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);     
                                                                    buttonsData['joinTeamButtonDisabled'] = 1;  
                                                                }else if(schedule?.number_of_teams_available > 0 && schedule?.number_of_teams > 0){
                                                                    buttonsData['joinTeamStatus'] = 1;
                                                                    buttonsData['joinTeamButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Join a Team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                                                }else if(schedule?.number_of_teams_available > 0 && schedule?.number_of_teams == 0){
                                                                    buttonsData['joinTeamStatus'] = 1;
                                                                    buttonsData['joinTeamButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'All teams are full', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);  
                                                                    buttonsData['joinTeamButtonDisabled'] = 1;  
                                                                }
                                                            }
                                                        }
                                                    }
                                                }else{
                                                    if(schedule?.userid != cuserid){
                                                        if(schedule?.ch?.challenge_type == 'E'){
                                                            buttonsData['goToChallengeStatus'] = 1;
                                                            buttonsData['goToChallengeButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Go to this Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                                            buttonsData['goToChallengeButtonredirection'] = schedule?.external_link;
                                                        }else{
                                                            buttonsData['startChallengeStatus'] = 1;
                                                            buttonsData['startChallengeButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Start this Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                                        }
                                                    }else{
                                                        if(schedule?.ch?.challenge_type == 'E'){
                                                            buttonsData['goToChallengeStatus'] = 1;
                                                            buttonsData['goToChallengeButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Go to this Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                                            buttonsData['goToChallengeButtonredirection'] = schedule?.external_link;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }else{
                                        if(schedule?.AlreadyjoinId != 0 && schedule?.AlreadyjoinStatus == 0){
                                            buttonsData['viewChallengeStatus'] = 0;
                                            buttonsData['deactiveStatusText'] = await this.translatorService.frontendReadTranslation(req.lang, 'deactivated_team_member_msg', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)+'.';
                                            buttonsData['deactiveStatus'] = 1;
                                        }else{
                                            buttonsData['viewChallengeStatus'] = 1;
                                            buttonsData['viewChallengeButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'View Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }
                                    }
                                }

                                if(schedule?.userid != cuserid && schedule?.AlreadyjoinId == 0){
                                    if(schedule?.invitechallengeUsers){
                                        buttonsData['joinInviteTeamStatus'] = 1;
                                        buttonsData['joinInviteTeamButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Join Invited Team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);      
                                        buttonsData['removeInviteTeamStatus'] = 1;
                                        buttonsData['removeInviteTeamButtonText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Remove Invited Team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);                                   
                                    }
                                }
                            /* Button Show/Hide Code */
                            schedule['buttonsData'] = {};
                            if(schedule?.AlreadyjoinId == 0){
                                if(schedule['challengeStatus'] != 3){
                                    if(schedule['registerStatus'] != 2){
                                        schedule['buttonsData'] = buttonsData;
                                    }
                                }
                            }else{
                                if(schedule?.AlreadyjoinStatus == 1 || (schedule?.AlreadyjoinId != 0 && schedule?.AlreadyjoinStatus == 0)){
                                    schedule['buttonsData'] = buttonsData;
                                }
                            }
                            if(schedule['challengeStatus'] != 3){
                                schedule['joined_count'] = 0;
                                if(schedule['challengeStatus'] != 2){
                                    let joinCount = await this.scheduleChallengeJoinUsersService.joinUserListRecord({schedule_id: schedule['id'], status: 1},null,['scj.id']);
                                    schedule['joined_count'] = joinCount?.length;
                                }
                                let start_date = this.commonDateService.getTodayDate(schedule['start_date']).startOf('day');
                                let end_date = this.commonDateService.getTodayDate(schedule['end_date']).endOf('day');
                                let current_date = this.commonDateService.getTodayDate().unix();
                                let totalDays = end_date.diff(start_date, 'days') + 1;
                                let remainingDays = 0;
                                if (current_date >= start_date.unix() && current_date <= end_date.unix()) {
                                    remainingDays = (end_date.diff(this.commonDateService.DateTimeFormat('now'), 'days')) + 1;
                                }
                                else if(current_date < start_date.unix()){
                                    remainingDays = (moment.unix(end_date).diff(moment.unix(current_date), 'days')) + 1;
                                }
                                else if(current_date > end_date.unix()){
                                    remainingDays = 0
                                }
                                schedule['remaining_days'] = schedule['challengeStatus'] != 2 ? remainingDays : totalDays;
                                if(schedule['challengeStatus'] == 1 && buttonsData['viewChallengeStatus'] == 1){
                                    schedule['streak_count'] = await this.userChallengeHelperService.streakIndicator(schedule, req);
                                }
                            }
                            s.push(schedule);
                        }
                    }
                }
            }
            let retrunDetails = Object.create(null);
            let stepFillNumber = 0;
            let message = '';
            let statusCode = 200;
            let error = 0;
            let success = 1;
            if(postData?.id){
                if(s[0]){
                    if(s[0]?.AlreadyjoinId == 0){
                        const actionButton = postData?.buttonClick;
                        let accessNextStep = true;
                        const checkChallengeAgreement = await this.scheduleChallengeAgreementService.findOne({schedule_id: postData?.id,status: 1});
                        if(checkChallengeAgreement){
                            if(!postData?.agreement_id){
                                let agreementText = await this.translatorService.frontendReadTranslation(req.lang,`agreement_name_${postData?.id}`, `/LC_MESSAGES/Challenge/MyChallenges/${org_id}/${postData?.id}`,`dynamic`);
                                agreementText = (agreementText == '' || agreementText == `agreement_name_${postData?.id}`) ? checkChallengeAgreement?.agreement_text : agreementText;
                                checkChallengeAgreement['agreement_text'] = agreementText;
                                retrunDetails['Agreement'] = checkChallengeAgreement;
                                message = await this.translatorService.frontendReadTranslation(req.lang, 'First you have to signed agreement', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                accessNextStep = false;
                                stepFillNumber = 1;
                            }else{
                                if(!retrunDetails['AgreementData']){
                                    retrunDetails['AgreementData'] = Object.create(null);
                                }
                                retrunDetails['AgreementData']['agreement_id'] = postData?.agreement_id;
                                if(postData?.signature_type && postData?.signature_type != 1){
                                    retrunDetails['AgreementData']['agreement_signed'] = postData?.agreement_signed;
                                }else{
                                    if (files?.signature_image && files?.signature_image[0]) {
                                        files.signature_image[0].originalname = this.commonFileService.formatFileName(files?.signature_image[0].originalname);
                                        let filename = `challenge/schedulech/${postData?.id}/signature/agreesing_${this.commonService.generateMD5(req.tokenUser?.id.toString())}.${files?.signature_image[0].originalname.split('.')[files?.signature_image[0].originalname.split('.')?.length - 1]}`;
                                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files?.signature_image[0].path),  filename: filename, userBucket: 'private'}));
                                        retrunDetails['AgreementData']['agreement_signed'] = filename;
                                    }
                                }
                                retrunDetails['AgreementData']['signature_type'] = postData?.signature_type;
                            }
                        }
                        if(accessNextStep == true && s[0]?.tr_goaltype == 2 && (!postData?.trek_level_id)){
                            accessNextStep = false;
                            if(s[0]?.team == 1 && ((actionButton == 'join_team' && s?.[0]?.['ch']?.['bio_challenge_type'] != 'Trek_step') || actionButton == 'invite_join_team') && !postData?.team_id){
                                accessNextStep = true; 
                            }
                            let levels = await this.commitmentLevelsService.listRecord({ schedule_id: postData?.id, status: 1 });
                            let temp = Object.create(null);
                            let levelsInfo = Object.create(null);
                            await Promise.all(levels.map(async getLevels => {
                                if(getLevels?.level_type){
                                    let message = await this.translatorService.frontendReadTranslation(req.lang, 'Daily', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    getLevels.level_type = await this.translatorService.frontendReadTranslation(req.lang, getLevels?.level_type.replace(/\b\w/g, char => char.toUpperCase()), `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    getLevels.level_type = `${message} ${getLevels?.level_type}`;
                                }
                                temp[Number(getLevels.id)] = getLevels;
                            }));

                            if (Object.keys(temp)?.length > 0) {
                                levelsInfo = temp;
                                temp = Object.create(null);
                            }

                            if(!retrunDetails['commitmentlevel']){
                                retrunDetails['commitmentlevel'] = Object.create(null);
                            }
                            message = await this.translatorService.frontendReadTranslation(req.lang, 'Please select a your daily goal', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            retrunDetails['commitmentlevel'] = Object.values(levelsInfo);
                            stepFillNumber = 2;
                        }
                        if(accessNextStep == true && s[0]?.tr_goaltype == 2 && postData?.trek_level_id){
                            if(!retrunDetails['commitmentData']){
                                retrunDetails['commitmentData'] = Object.create(null);
                            }
                            retrunDetails['commitmentData']['trek_level_id'] = postData?.trek_level_id;
                        }
                        if(accessNextStep == true){
                            let start_date1: any =  await this.commonDateService.DateTimeFormat(s[0]?.start_date, 'YYYY-MM-DD HH:mm:ss');
                            let end_date1: any =  await this.commonDateService.DateTimeFormat(s[0]?.end_date, 'YYYY-MM-DD HH:mm:ss');
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
                            let joinData:any = Object.create(null);
                            joinData['schedule_id'] = postData?.id;
                            joinData['challenge_id'] = s[0]?.challenge_id;
                            joinData['user_id'] = req.tokenUser?.id;
                            joinData['added_date'] = addeddate;
                            joinData['status'] = 1;
                            joinData['start_date'] = start_date;
                            if(postData?.trek_level_id){
                                joinData['trek_level_id'] = postData?.trek_level_id;
                            }
                            if (postData?.agreement_id && postData?.signature_type) {
                                joinData['agreement_id'] = postData?.agreement_id;
                                if(postData?.signature_type && postData?.signature_type != 1){
                                    joinData['agreement_signed'] = postData?.agreement_signed;
                                    joinData['signature_type'] = 0;
                                }else{
                                    if (files?.signature_image && files?.signature_image[0]) {
                                        files.signature_image[0].originalname = this.commonFileService.formatFileName(files?.signature_image[0].originalname);
                                        let filename = `challenge/schedulech/${postData?.id}/signature/agreesing_${this.commonService.generateMD5(req.tokenUser?.id.toString())}.${files?.signature_image[0].originalname.split('.')[files?.signature_image[0].originalname.split('.')?.length - 1]}`;
                                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files?.signature_image[0].path),  filename: filename, userBucket: 'private'}));
                                        joinData['agreement_signed'] = filename;
                                        joinData['signature_type'] = 1;
                                    }
                                }
                                joinData['agreement_name'] = postData?.agreement_name;
                            }
                            if (s[0]?.ch.bio_challenge_type == 'Relay_race') {
                                let pushdata = {};
                                pushdata['passbaton'] = "";
                                pushdata['completeteam'] = "";
                                pushdata['accept'] = "";
                                pushdata['current'] = "";
                                joinData['relay_race_push_detail'] = JSON.stringify(pushdata);
                            }

                            let insertedRecord = Object.create(null);
                            let joinAccessStatus = true;
                            if(s[0]?.team == 1 && (actionButton == 'join_team' || actionButton == 'invite_join_team')){
                                if (s[0]?.invitechallengeUsers && s[0]?.invitechallengeUsers?.team_id && postData.is_invited_challenge) {
                                    postData.team_id =  postData?.team_id ?? s[0]?.invitechallengeUsers.team_id;
                                }
                                if(!postData?.team_id){
                                    const getAllTeamsList = await this.userScheduleChallengeService.getChallengeAllTeams('join',s[0], postData, req);
                                    if(getAllTeamsList?.status != 'allreadyJoin'){
                                        retrunDetails['alredayJoinTeamId'] = getAllTeamsList?.alredayJoinTeamId || [];
                                        if(actionButton == 'join_team'){
                                            if(getAllTeamsList?.status == 'noTeams'){
                                                retrunDetails['teams'] = {};
                                                statusCode = 401;
                                                error = 1;
                                                success = 0;
                                                message = await this.translatorService.frontendReadTranslation(req.lang, 'No team found', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                            }else{
                                                retrunDetails['teams'] = getAllTeamsList?.teams || {};
                                                message = await this.translatorService.frontendReadTranslation(req.lang, 'Please select team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                            }
                                        }else{
                                            message = await this.translatorService.frontendReadTranslation(req.lang, 'Sorry invitation is removed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }
                                        stepFillNumber = 3;
                                        joinAccessStatus = false;
                                    }
                                }else if(postData?.team_id){
                                    const getAllTeamsList = await this.userScheduleChallengeService.getChallengeAllTeams('join',s[0], postData, req);
                                    if(getAllTeamsList?.status != 'allreadyJoin'){
                                        let exitTeamStatus = 'no';
                                        if(getAllTeamsList?.alredayJoinTeamId){
                                            exitTeamStatus = 'yes';
                                        }
                                        postData.exitTeamStatus = exitTeamStatus;
                                        postData.exitTeamIds = getAllTeamsList?.alredayJoinTeamId  || [];
                                        const addTeamMember = await this.userScheduleChallengeService.join_team(s[0], postData, req);
                                        if(addTeamMember != 0 && Object.keys(joinData)?.length > 0){
                                            statusCode = 401;
                                            error = 1;
                                            success = 0;
                                            if(addTeamMember == 1){
                                                message = await this.translatorService.frontendReadTranslation(req.lang, 'You have already joined this team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                            }else if(addTeamMember == 2){
                                                message = await this.translatorService.frontendReadTranslation(req.lang, 'No active challenge found', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                            }else{
                                                message = await this.translatorService.frontendReadTranslation(req.lang, 'Oh no! Just a bit too late, it seems as if your selected team has just become full!', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                            }
                                            joinAccessStatus = false;
                                        }
                                    }
                                }else{
                                    message = await this.translatorService.frontendReadTranslation(req.lang, 'Please select team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    joinAccessStatus = false;
                                }
                            }else if(s[0]?.team == 1 && actionButton == 'create_team'){
                                if(!postData?.team_name){
                                    const getAllTeamsList = await this.userScheduleChallengeService.getChallengeAllTeams('create_team',s[0], postData, req);
                                    if(getAllTeamsList?.status != 'allreadyJoin'){
                                        retrunDetails['alredayJoinTeamId'] = getAllTeamsList?.alredayJoinTeamId || [];
                                        if(getAllTeamsList?.status == 'noTeams'){
                                            retrunDetails['teams'] = {};
                                        }else{
                                            retrunDetails['teams'] = getAllTeamsList?.teams || {};
                                        }
                                        message = await this.translatorService.frontendReadTranslation(req.lang, 'Please add team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        stepFillNumber = 4;
                                        joinAccessStatus = false;
                                    }
                                }else if(postData?.team_name){
                                    const getAllTeamsList = await this.userScheduleChallengeService.getChallengeAllTeams('create',s[0], postData, req);
                                    if(getAllTeamsList?.status != 'allreadyJoin'){
                                        postData['file'] = files.logo?.[0];
                                        const createTeam = await this.userScheduleChallengeService.createTeamUser(s[0], postData, req);
                                        if(createTeam != 'error' && createTeam != ''){
                                            retrunDetails['team_id'] = createTeam;
                                            retrunDetails['team_name'] = postData?.team_name;
                                        }else{
                                            statusCode = 401;
                                            error = 1;
                                            success = 0;
                                            message = await this.translatorService.frontendReadTranslation(req.lang, 'Team is not created so try again later', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                            joinAccessStatus = false;
                                        }
                                    }
                                }else{
                                    message = await this.translatorService.frontendReadTranslation(req.lang, 'Please select team', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                }
                            }

                            if(joinAccessStatus == true && Object.keys(joinData)?.length > 0){
                                let check = await this.scheduleChallengeJoinUsersService.findOne({user_id: joinData.user_id, schedule_id: joinData.schedule_id, challenge_id: joinData.challenge_id})
                                if(check){
                                    let updateObject = { status : 1};
                                    if(check.relay_race_detail){
                                        updateObject['relay_race_detail'] = null;
                                    }
                                    if(check.agreement_id != joinData.agreement_id){
                                        updateObject['agreement_id'] = joinData.agreement_id;
                                    }
                                    if(check.agreement_name != joinData.agreement_name){
                                        updateObject['agreement_name'] = joinData.agreement_name;
                                    }
                                    if(check.agreement_signed != joinData.agreement_signed){
                                        updateObject['agreement_signed'] = joinData.agreement_signed;
                                    }
                                    if(check.signature_type != joinData.signature_type){
                                        updateObject['signature_type'] = joinData.signature_type;
                                    }
                                    await this.scheduleChallengeJoinUsersService.update({id: check['id']},updateObject);
                                    insertedRecord = check;
                                    if (s[0]?.ch.bio_challenge_type == 'Relay_race' && retrunDetails?.['team_id']) {
                                        let getTeamDetails = await this.teamMembersService.findOne(`teamMember.team_id = ${retrunDetails?.['team_id']} AND teamMember.org_id = ${org_id} AND teamMember.status != 2 AND teamMember.baton_status = 1`);
                                        if(getTeamDetails){
                                            let notificationData = {
                                                id: getTeamDetails?.id, 
                                                schedule_id: s[0]?.id, 
                                                user_id: getTeamDetails.user_id, 
                                                org_id: org_id, 
                                                custom_cname: s[0]?.custom_cname, 
                                                challenge_id: s[0]?.challenge_id,
                                                logo: s[0]?.['custom_logo'] && s[0]?.['custom_logo'] != '' ? s[0]?.['custom_logo'] : this.commonService.getIconPath(s[0]['ch']['logo'],S3_URL), 
                                                type: 'add',
                                                url: `https://${process.env.DOMAIN}/my-challenges/${s[0]['id']}`,
                                                title: `${s[0]?.custom_cname} Challenge`,
                                                message: `You have the baton. Please click on “I am ready” to start your turn or click “Skip my turn” if you are not ready.`,
                                                send_type: 1
                                            };
                                            this.userChallengeHelperService.addNotification(notificationData, req);
                                        }
                                    }
                                    /*
                                    if (this.commonDateService.getTodayDate(currentdate).isBefore(s[0]['start_date'])) {
                                        await this.addNotification({...joinData, url: `https://${process.env.DOMAIN}/my-challenges/${joinData.schedule_id}`}, req);
                                    }
                                    */

                                }else{
                                    currentdate
                                    insertedRecord = await this.scheduleChallengeJoinUsersService.save(joinData);
                                    /*
                                    if (this.commonDateService.getTodayDate(currentdate).isBefore(s[0]['start_date'])) {
                                        await this.addNotification({...joinData, url: `https://${process.env.DOMAIN}/my-challenges/${joinData.schedule_id}`}, req);
                                    }
                                    */
                                }
                            }
                            if(Object.keys(insertedRecord)?.length > 0){
                                message = await this.translatorService.frontendReadTranslation(req.lang, 'Congratulations You Have Joined The Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)+'!';
                                let insertedRecordID = insertedRecord['id'];
                                delete(retrunDetails['AgreementData']);
                                delete(retrunDetails['commitmentData']);
                                retrunDetails['joinUserId'] = insertedRecordID;
                                retrunDetails['scheduleId'] = postData?.id;
                                retrunDetails['leaderBoardPopupShowStatus'] = 0;
                                if(s[0]?.leaderboard_setting == 1 && s[0]?.ch?.bio_challenge_type == 'Move_more'){
                                    retrunDetails['leaderBoardPopupShowStatus'] = 1;
                                }else if(s[0]?.is_leaderboard_ask == 1){
                                    retrunDetails['leaderBoardPopupShowStatus'] = 1;
                                }
                                
                                retrunDetails['challengeType'] = s[0]?.ch?.challenge_type;
                                retrunDetails['bioChallengeType'] = s[0]?.ch?.bio_challenge_type;

                                let weekarray = {};
                                let challengeWeeks:any = Object.create(null);
                                if((s[0]['ch']['challenge_type'] == 'H' && s[0]['ch']['bio_challenge_type'] != 'Healthy_habit_activity_layout'  && s[0]['ch']['bio_challenge_type'] != 'Bingo_layout'  && s[0]['ch']['bio_challenge_type'] != 'Relay_race') || (s[0]['ch']['challenge_type'] == 'A' && s[0]['ch']['bio_challenge_type'] == 'Olympics') || (s[0]['ch']['bio_challenge_type'] == 'Move_more')){
                                    let id = s[0]['ch']['id'];
                                    if (id) {                        
                                        let challenges = await this.challengeService.listRecordJoinChallenge({id: id});
                                        for (let i = 0; i < challenges?.length; i++) {
                                            let c = challenges[i];
                                            
                                            if (s[0]['ch']['challenge_type'] === "H") {                                    
                                                let weeks = await this.weeksService.listRecordJoinChallenge({challenge_id: id});
                                                challengeWeeks = weeks;
                                                for (let j = 0; j < weeks?.length; j++) {
                                                    challengeWeeks[j]['ch_weeks'] = Object.create(null);
                                                    let wid = weeks[j]['id'];  
                                                    let days = await this.daysService.listRecordJoinChallenge({week_id: wid,challenge_id: id});
                                                    challengeWeeks[j]['ch_weeks']['days'] = days;
                                                }
                                                
                                            } else {
                                                let weeks = await this.weeksService.listRecordJoinChallenge({challenge_id: id}, null, 'ch');
                                                challengeWeeks = weeks;
                                                for (let j = 0; j < weeks?.length; j++) {
                                                    challengeWeeks[j]['ch_weeks'] = Object.create(null);
                                                    let wid = weeks[j]['id'];
                                                    let days = await this.daysService.listRecordJoinChallenge({week_id: wid,challenge_id: id});
                                                    
                                                    challengeWeeks[j]['ch_weeks']['days'] = days;
                                                }
                                            }
                                        }
                                    }
                                    weekarray = await this.commonDateService.getWeeksInRange(start_date, end_date,'week');
                                }
                                
                                if(s[0]['ch']['challenge_type'] == 'H' && s[0]['ch']['bio_challenge_type'] != 'Healthy_habit_activity_layout' && s[0]['ch']['bio_challenge_type'] != 'Bingo_layout' && s[0]['ch']['bio_challenge_type'] != 'Relay_race'){
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
                                                weekDatas['user_id'] = req.tokenUser?.id;
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
                                                weekDatas['added_date'] = addeddate;
                                                weekDatas['update_date'] = '';
                                                weekDatas['start_date'] = weekarray['weeks']["week_"+weekcounter][0];
                                                weekDatas['end_date'] = moment.utc(weekarray['weeks']["week_"+weekcounter][1]).format('YYYY-MM-DD');;
                                                const checkWeekUser = await this.weeksUsersService.findOne({week_id: challengeWeek.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeWeek.challenge_id});
                                                let insertWeekUser = null;
                                                if(checkWeekUser === null){
                                                    insertWeekUser = await this.weeksUsersService.save(weekDatas);
                                                }else{
                                                    insertWeekUser = await this.weeksUsersService.update({week_id: challengeWeek.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeWeek.challenge_id}, {status: 0});
                                                }
                                                if(insertWeekUser){
                                                    let insertedWeekRecordID = insertWeekUser['id'];
                                                    if(challengeWeek['ch_weeks']['days'] && challengeWeek['ch_weeks']['days'].length > 0){
                                                        let j = 0;
                                                        for(let challengeDay of challengeWeek['ch_weeks']['days']){
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
                                                            dayDatas['user_id'] = req.tokenUser?.id;
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
                                                            dayDatas['added_date'] = addeddate;
                                                            dayDatas['update_date'] = '';
                                                            let statDays = weekarray['weeks']["week_"+weekcounter][0];
                                                            dayDatas['start_date'] = moment.utc(statDays).add(j, 'days').format('YYYY-MM-DD');
                                                            dayDatas['end_date'] = moment.utc(dayDatas['start_date']).add(1, 'days').format('YYYY-MM-DD');

                                                            const checkDayUser = await this.daysUsersService.findOne({day_id: challengeDay.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeDay.challenge_id});
                                                            if(checkDayUser === null){
                                                                let insertWeekUser = await this.daysUsersService.save(dayDatas);
                                                            }else{
                                                                let insertWeekUser = await this.daysUsersService.update({day_id: challengeDay.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeDay.challenge_id}, {status: 0});
                                                            }
                                                            j++;
                                                        }
                                                    }  
                                                }
                                            }
                                            weekcounter++;
                                        }
                                    }
                                }else if(s[0]['ch']['challenge_type'] == 'A' && s[0]['ch']['bio_challenge_type'] == 'Olympics'){
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
                                                weekDatas['user_id'] = req.tokenUser?.id;
                                                weekDatas['week_id'] = challengeWeek.id;
                                                weekDatas['activity_id'] = challengeWeek.activity_id;
                                                weekDatas['challenge_id'] = challengeWeek.challenge_id;
                                                weekDatas['m_numeric'] = challengeWeek.m_numeric;
                                                weekDatas['status'] = 0;
                                                weekDatas['added_date'] = addeddate;
                                                weekDatas['update_date'] = '';
                                                weekDatas['start_date'] = weekarray['weeks']["week_"+weekcounter][0];
                                                weekDatas['end_date'] = moment.utc(weekarray['weeks']["week_"+weekcounter][1]).format('YYYY-MM-DD');;
                                                const checkWeekUser = await this.weeksUsersService.findOne({week_id: challengeWeek.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeWeek.challenge_id});
                                                let insertWeekUser = null;
                                                if(checkWeekUser === null){
                                                    insertWeekUser = await this.weeksUsersService.save(weekDatas);
                                                }else{
                                                    insertWeekUser = await this.weeksUsersService.update({week_id: challengeWeek.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeWeek.challenge_id}, {status: 1});
                                                }
                                                if(insertWeekUser){
                                                    let insertedWeekRecordID = insertWeekUser['id'];
                                                    if(challengeWeek['ch_weeks']['days'] && challengeWeek['ch_weeks']['days'].length > 0){
                                                        let j = 0;
                                                        for(let challengeDay of challengeWeek['ch_weeks']['days']){
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
                                                            dayDatas['user_id'] = req.tokenUser?.id;
                                                            dayDatas['week_id'] = challengeWeek.id;
                                                            dayDatas['day_id'] = challengeDay.id;
                                                            dayDatas['activity_id'] = challengeDay.activity_id;
                                                            dayDatas['challenge_id'] = challengeDay.challenge_id;
                                                            dayDatas['m_numeric'] = challengeDay.m_numeric;
                                                            dayDatas['status'] = 0;
                                                            dayDatas['added_date'] = addeddate;
                                                            dayDatas['update_date'] = '';
                                                            let statDays = weekarray['weeks']["week_"+weekcounter][0];
                                                            dayDatas['start_date'] = moment.utc(statDays).add(j, 'days').format('YYYY-MM-DD');
                                                            dayDatas['end_date'] = moment.utc(dayDatas['start_date']).add(1, 'days').format('YYYY-MM-DD');

                                                            const checkDayUser = await this.daysUsersService.findOne({day_id: challengeDay.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeDay.challenge_id});
                                                            if(checkDayUser === null){
                                                                let insertWeekUser = await this.daysUsersService.save(dayDatas);
                                                            }else{
                                                                await this.daysUsersService.update({day_id: challengeDay.id, user_id: req.tokenUser?.id, schedule_id: insertedRecordID, challenge_id: challengeDay.challenge_id}, {status: 0});
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
                                if(s[0]['ch']['bio_challenge_type'] == 'Move_more'){
                                    const userEmail = req.tokenUser?.email;
                                    const emailRegex = /^[_a-zA-Z0-9-]+(\.[_a-zA-Z0-9-]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\.[a-zA-Z]{2,3})$/;
                                    if(s[0]['is_mail'] && s[0]['is_mail'] == 1 && emailRegex.test(userEmail)){
                                        const getMoveMoreParks = await this.moveMoreParksService.listRecord({status: 1, schedule_id: postData?.id});
                                        let goalsetting = '';
                                        let goalsettinglabel = '';
                                        if(getMoveMoreParks && s[0]['move_more_display'] == 1){
                                            let goalsettingnext = '';
                                            if(getMoveMoreParks[1]['park_name']){
                                                goalsettingnext = 'Next stop, the '+getMoveMoreParks[1]['park_name']+'.'; 
                                            }else{
                                                getMoveMoreParks[0]['park_name'] = getMoveMoreParks[0]['park_name']+'.';
                                            }
                                            goalsetting = '<div>Meet your first goal of '+ getMoveMoreParks[0]['steps'] + ' steps/movement and you&#39;ve arrived in '+getMoveMoreParks[0]['park_name']+'!&nbsp; '+ goalsettingnext+' Keep going and you will be traveling the globe.&nbsp;</div>';
                                            goalsettinglabel = 'location';
                                        }else{
                                            goalsetting = '<div>Meet your weekly '+ s[0]['numberofsteps']+' steps/movement minimum goal for challenge participants.';
                                            goalsettinglabel = 'week';
                                        }

                                        let challengeName = s[0]['custom_cname'];
                                        if(challengeName == '' || challengeName == null){
                                            challengeName = s[0]['ch']['challenge_name'];
                                        }

                                        let startDateEmail: any =  await this.commonDateService.DateTimeFormat(s[0]?.start_date, 'MMM DD, YYYY');
                                        let endDateEmail: any =  await this.commonDateService.DateTimeFormat(s[0]?.end_date, 'MMM DD, YYYY');
                                        let emailContent = `<html><style>
                                            ul li::before {
                                            content: '\\u2022';
                                            color: #F4BA21;
                                            font-weight: bold;
                                            display: inline-block; 
                                            width: 1em;
                                            margin-left: -1em;
                                            }
                                            </style>`;
                                        emailContent += `<body bgcolor="#FFF" >
                                        <div style="width:100%; color:#28505C;">
                                        <div style="width:100%;background:#DCDDDE">
                                        <div style="width:80%;padding:30px;background:#FFF;margin:0 auto;text-align: center;">
                                        <h3>You have registered for the</h3>
                                        <h1>${challengeName}</h1>
                                        </div> 
                                        <div style="width:80%;padding:0 30px 30px 30px;background:#FFF;margin:0 auto;"><br/><br/>`;
                                        emailContent += `<div>Congratulations! You are registered for the ${challengeName}.</div>
                                        <div>&nbsp;</div>
                                        <div>The journey begins ${startDateEmail} and ends ${endDateEmail}.</div>
                                        <div>&nbsp;</div>
                                        <div>Explore the beautiful sights of the world during this movement challenge!&nbsp;</div>
                                        <div>From the USA all the way around the globe and back to the States.&nbsp;</div>
                                        <div>Read about the various sites and explore the many maps and resources along the way.&nbsp;</div>
                                        <div>&nbsp;</div>
                                        <div>How it works:</div>
                                        <div>&nbsp;</div>
                                        ${goalsetting}
                                        <div>Each ${goalsettinglabel} has a specific amount of steps/movement assigned to reach your destination.</div>
                                        <div>Log your movement manually or via tracking device www.app.zomohealth.com.&nbsp;&nbsp;</div>
                                        <div>&nbsp;</div>
                                        <div>Below are instructions on how to log various activities or sync your fitness device:</div>
                                        <div>&nbsp;</div>
                                        <div>Manual Entry:</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Log into your app.zomohealth.com account</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Click &quot;Trackers&quot;</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Click &quot;Exercise&quot;</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Choose the type of activity (walking, running, swimming, cycling)</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Enter your distance or step count</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Click &quot;Log&quot;</div>
                                        <div>Fitbit users:</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Log into your app.zomohealth.com account</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Click &quot;Trackers&quot;</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Click &quot;Fitbit Sync&quot;</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Enter your email address associated with your Fitbit account</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Click &quot;Sync&quot;</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Enter your email address and password associated with your Fitbit account</div>
                                        <div>&bull;<span style="white-space:pre"> </span>All steps will now automatically feed to your Live Well account</div>
                                        <div>All other devices must be set up via the Zomo Health app.</div>
                                        <div>&bull;<span style="white-space:pre"> </span>Please see instructions attached.</div>
                                        <div>&nbsp;</div>
                                        <div>If you have any questions, please contact support@zomohealth.com or call 877-506-5885.</div>`;

                                        if(req.tokenUser?.org_id == 1143){
                                            emailContent += `<div>Congratulations! You are registered for the ${challengeName}.</div>
                                            <div>&nbsp;</div>
                                            <div>The journey begins ${startDateEmail} and runs for 4 weeks. You have through the end of April to track and enter your steps. Explore and map out the beautiful sights of the world during this fitness challenge.</div>
                                            <div>&nbsp;</div>
                                            <div><b>How it works:</b></div>
                                            <div>&nbsp;</div>
                                            <div>Meet your weekly 35,000 steps/movement minimum goal. Four weeks participation required.
                                            <div>Log your movement manually or via your tracking device on <a href="https://app.zomohealth.com/" target="_blank">app.zomohealth.com</a>.</div>
                                            <div>&nbsp;</div>
                                            <div><b>How to log various activities or sync your fitness device:</b></div>
                                            <div>&nbsp;</div>
                                            <div>Manual Entry:</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Login to <a href="https://app.zomohealth.com/" target="_blank">app.zomohealth.com</a></div>
                                            <div>&bull;<span style="white-space:pre"> </span>Click \'Trackers\'</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Click \'Exercise\'</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Choose the type of activity (walking, running, swimming, cycling)</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Enter your distance or step count</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Click \'Log\'</div>
                                            <div>&nbsp;</div>
                                            <div>Fitbit users:</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Log into your <a href="https://app.zomohealth.com/" target="_blank">app.zomohealth.com</a> account</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Click \'Trackers\'</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Click \'Fitbit Sync\'</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Enter your email address associated with your Fitbit account</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Click \'Sync\'</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Enter your email address and password associated with your Fitbit account</div>
                                            <div>&bull;<span style="white-space:pre"> </span>Steps will feed to your <a href="https://app.zomohealth.com/" target="_blank">app.zomohealth.com</a> account. If you do not see your steps posted, click \'Sync\' on your Fitbit.
                                            <div>&nbsp;</div>
                                            <div>All other devices must be set up via the Zomo Health app. Refer to your Program Manual or watch one of these videos:</div><div>&nbsp;</div>
                                            <div><a href="https://www.screencast.com/t/HmF6HBVzIVof" target="_blank">Google Fit (Android) - Video</a></div><div>&nbsp;</div>
                                            <div><a href="https://www.screencast.com/t/0nHWYdPzeKx" target="_blank">Apple Health (IOS) - Video</a></div><div>&nbsp;</div>
                                            <div>Once you have your device set up your steps will feed to your <a href="https://app.zomohealth.com/" target="_blank">app.zomohealth.com</a> account. If you do not see your steps posted click Sync on your device.</div>`;
                                        }

                                        emailContent += `<br/><br/><br/>
                                        Thank you,<br/>
                                        <b>Zomo Health Team</b><br/>
                                        </div>
                                        </div>  
                                        <div style="padding:15px 10px;background:#414142">
                                        <table width="100%">
                                        <tr>
                                        <td align="right"><span style="color:#FFF"><span style="font-size:15px">1-877-506-5885</span> | <b><a style="text-decoration:none;color:#76B043" href="mailto:support@zomohealth.com">support@zomohealth.com</a></b></span></td>
                                        </tr>
                                        </table>
                                        </div>
                                        </div>
                                        </body>
                                        </html>`;

                                        let attachmentarray = Object.create(null);
                                        if(req.tokenUser?.org_id == 841){    
                                            const filePath = path.join(process.cwd(), 'public', "upload/challenge/WARD_MAIL_ATACHMENT_PC_AppSync_Flyers.pdf");
                                            let filename = 'WARD_MAIL_ATACHMENT_PC_AppSync_Flyers.pdf';
                                            attachmentarray['filename'] = 'WARD_MAIL_ATACHMENT_PC_AppSync_Flyers.pdf'; 
                                            attachmentarray['path'] = filePath; 
                                        }
                                        let toEmail = userEmail;
                                        let emailDetails = Object.create(null);
                                        emailDetails['challengeName'] = challengeName;
                                        emailDetails['forChallenge'] = 'Yes'
                                        let emaildata = {
                                            sender: ``,
                                            receiver: toEmail,
                                            subject: `${challengeName} Registration Confirmation`,
                                            content: emailDetails,
                                            template: emailContent,                                            
                                        }
                                        if(attachmentarray.filename){
                                            emaildata['attachment'] = [attachmentarray]
                                        }
                                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                                    }
                                }
                            }
                        }
                    }else{
                        statusCode = 401;
                        error = 1;
                        success = 0;
                        message = await this.translatorService.frontendReadTranslation(req.lang, 'You Already Joined This Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_SOMETHING_WENT_WRONG'));
                }
            }
            
            if (files?.logo && files.logo?.[0] && files.logo?.[0]?.filename && files.logo?.[0]?.fieldname === 'logo') {
                await this.commonFileService.removeFileFromLocal(files.logo?.[0]?.path);
            }
            if (files?.signature_image && files.signature_image?.[0] && files.signature_image?.[0]?.filename && files.signature_image?.[0]?.fieldname === 'signature_image') {
                await this.commonFileService.removeFileFromLocal(files.signature_image?.[0]?.path);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: statusCode,
                success: success,
                error: error,
                data: postData?.id ? retrunDetails : s,
                message: postData?.id ? message : 'success',
                stepFillNumber: stepFillNumber,
            });
        } catch (error) {
            if (files?.logo && files.logo?.[0] && files.logo?.[0]?.filename && files.logo?.[0]?.fieldname === 'logo') {
                await this.commonFileService.removeFileFromLocal(files.logo?.[0]?.path);
            }
            if (files?.signature_image && files.signature_image?.[0] && files.signature_image?.[0]?.filename && files.signature_image?.[0]?.fieldname === 'signature_image') {
                await this.commonFileService.removeFileFromLocal(files.signature_image?.[0]?.path);
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
    @Post('my-challenge')
    async myChallenge(@Req() req: Request, @Res() res: Response, @Body() postData: MyChallengeInput) {
        try {
            let resultedData = await this.challenge(req, postData);
            if(resultedData?.length > 0 && resultedData[0].error){
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: resultedData[0]?.error?.errorMsgTrans,
                });
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
    async challenge(req?: Request, postData?: MyChallengeInput) {
        try{
            const companycode = req.tokenUser['membership_code'];
            const deptid = req.tokenUser['department_id'];
            const user_id = req.tokenUser['id'];
            const org_id = postData?.org_id ?? req.tokenUser?.org_id;
            let timezone = req.tokenUser['timezone'];   
            let show_type = postData?.show_type ? postData?.show_type : 1;        
            let dashboardListData = postData?.dashboardList ? postData?.dashboardList : 2;        
            
            let ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
            let ucurrentdateonly = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD') + ' 00:00:00';
            
            if (timezone?.trim() !== "") {
                ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',timezone);
                ucurrentdateonly = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD','',timezone) + ' 00:00:00';
            }
            let ucurrentdate_more = moment.utc(ucurrentdate).subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss');
            let ucurrentdateTS = await this.commonDateService.DateTimeFormat(ucurrentdate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');

            let where =  `company.id = ${org_id} AND scj.user_id = ${user_id} AND scj.status = 1 AND sc.status = 1`;
            if(postData?.challenge_id){
                where += ` AND sc.id = ${postData?.challenge_id}`;
            }

            const wellnessData = await this.userService.userChallengeData(req.tokenUser);
            if(wellnessData?.length){
                where += ` AND sc.created_by Not In(${wellnessData.map(ele=>`${ele.id}`)})`;
            }
            let eligibility_opt = [0];
            if(req.tokenUser?.is_camp_eligible === 1 ){
                eligibility_opt.push(1);
                if(req.tokenUser?.role_id === 2 ){
                    eligibility_opt.push(3);
                }
                if(req.tokenUser?.role_id === 16 ){
                    eligibility_opt.push(5);
                }
            }
            else if(req.tokenUser?.is_camp_eligible === 0 ){
                eligibility_opt.push(2);
                if(req.tokenUser?.role_id === 2 ){
                    eligibility_opt.push(4);
                }
                if(req.tokenUser?.role_id === 16 ){
                    eligibility_opt.push(6);
                }
            }
            where += ` AND sc.eligibility In(${eligibility_opt})`;
            let resultedData = await this.scheduleChallengeJoinUsersService.myChallenge(where);
            if(resultedData?.length){
                for (let index = 0; index < resultedData?.length; index++) {
                    resultedData[index]['challengeDetails'] = Object.create(null);
                    resultedData[index]['challengeDetails']['invitation'] = true;

                    let startMonthName = await this.commonDateService.DateTimeFormat('now', 'MMMM');
                    if(resultedData[index]['added_date'] && resultedData[index]['added_date'] != null){
                        resultedData[index]['added_date'] =  moment(resultedData[index]['added_date'], 'YYYY-MM-DD HH:mm:ss').toDate();
                        let startDateM:any = await this.commonDateService.DateTimeFormat(resultedData[index]['added_date'], 'MMMM');
                        startMonthName = await this.translatorService.frontendReadTranslation(req.lang, startDateM, `/LC_MESSAGES/Common/Month`,`static`);
                    }
                    resultedData[index]['joinDate'] = startMonthName + ' ' + await this.commonDateService.DateTimeFormat(resultedData[index]['added_date'], 'D, YYYY');

                    const schedule = resultedData[index];
                    if (schedule['sc'].org_id === 864 && schedule['sc'].challenge_id === 952 && schedule['sc'].id === 4094) {
                        resultedData[index]['sc'].end_date = '2024-03-03 00:00:00';
                        schedule['sc'].end_date = '2024-03-03 00:00:00';
                    }
                    resultedData[index]['challengeDetails']['challenge_id'] = schedule['sc']['id'];

                    if(schedule['sc'] && schedule['sc']['custom_logo'] && schedule['sc']['custom_logo'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: schedule['sc']['custom_logo']}))){
                        schedule['sc']['custom_logo'] = S3_URL + schedule['sc']['custom_logo'];
                    }else if(schedule && schedule['ch'] && schedule['ch']['logo'] && schedule['ch']['logo'].length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: schedule['ch']['logo']}))){
                        schedule['sc']['custom_logo'] = S3_URL + schedule['ch']['logo'];
                    }else{
                        schedule['sc']['custom_logo'] = this.commonService.getIconPath(schedule['ch']['logo'],S3_URL);
                    }
                    if(schedule['ch'] && schedule['ch']['icon']){
                        schedule['ch']['icon'] = schedule['ch']?.['icon']?.includes('challenge') ? S3_URL + schedule['ch']['icon'] : schedule['ch']['icon'] != '' ? this.commonService.getIconPath(schedule['ch']['icon'],S3_URL): schedule['ch']['icon'];
                    }
                    if(schedule['ch'] && schedule['ch']['logo']){
                        schedule['ch']['logo'] = schedule['ch']?.['logo']?.includes('challenge') ? S3_URL + schedule['ch']['logo'] : schedule['ch']['logo'] != '' ? this.commonService.getIconPath(schedule['ch']['logo'],S3_URL): schedule['ch']['logo'];
                    }
                    if(schedule['sc']['custom_logo'] == ''){
                        schedule['sc']['custom_logo'] = this.commonService.getIconPath(schedule['sc']['custom_logo'],S3_URL)
                    }
                    resultedData[index]['challengeDetails']['challenge_name'] = schedule['sc']['custom_cname'];
                    resultedData[index]['challengeDetails']['custom_logo'] = schedule['sc']['custom_logo'];

                    if ((schedule['sc']['deactive_date'] == null || schedule['sc']['deactive_date'] == undefined) || (schedule['sc']['deactive_date'] && moment(schedule['sc']['deactive_date']) == '') || (schedule['sc']['deactive_date'] && moment(`${schedule['sc']['deactive_date']} ${schedule['sc']['deactive_time'] ?? '23:59:59'}`).isAfter(moment(ucurrentdate)))) {
                        if (schedule['sc'].start_date !== "0000-00-00 00:00:00" && schedule['sc'].start_date !== "") {
                            const now:any = await this.commonDateService.DateTimeFormat(ucurrentdate, 'timestamp');
                            let regenddate: any = schedule['sc'].start_date;
                            if (timezone?.trim() !== "") {
                                regenddate = await this.commonDateService.DateTimeFormat(regenddate, 'YYYY-MM-DD HH:mm:ss','',timezone);
                            }
                            regenddate = await this.commonDateService.DateTimeFormat(regenddate, 'timestamp');
                            let datediff = regenddate - now;
                            let remaindays = Math.floor(datediff / (60 * 60 * 24)) + 1;
                            if (remaindays < 0) {
                                remaindays = 0;
                            }
                            if (remaindays !== 0) {
                                resultedData[index]['challengeDetails']['xdayremain'] = remaindays;
                                let remaincount;
                                if(remaindays == 1){
                                    remaincount = `${remaindays} ${await this.translatorService.frontendReadTranslation(req.lang,'Day','/LC_MESSAGES/Challenge/MyChallenges')}`;
                                }else{
                                    remaincount = `${remaindays} ${await this.translatorService.frontendReadTranslation(req.lang,'Days','/LC_MESSAGES/Challenge/MyChallenges')}`;
                                }
                                resultedData[index]['challengeDetails']['xdayremain_message'] = `${await this.translatorService.frontendReadTranslation(req.lang,'The Challenge Has Not Started Yet, It Will Start In','/LC_MESSAGES/Challenge/MyChallenges')} ${remaincount}`;
                            }
                        }
                        
                        let challengeStartDate = schedule?.['sc']?.start_date;
                        let registerStartDate = schedule?.['sc']?.reg_start_date;
                        if(schedule?.['sc'].backdating_frequency && schedule?.['sc'].backdating_frequency != ''){
                            challengeStartDate = schedule?.['sc'].backdating_frequency;
                        }
                        let challengeEndDate = schedule?.['sc']?.end_date;
                        let registerEndDate = schedule?.['sc']?.reg_end_date;
                        if (timezone) {
                            challengeStartDate = await this.commonDateService.DateTimeFormat(challengeStartDate, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', timezone).toString() + ' 00:00:00';
                            challengeEndDate = await this.commonDateService.DateTimeFormat(challengeEndDate, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', timezone).toString() + ' 23:59:59';

                            registerStartDate = await this.commonDateService.DateTimeFormat(registerStartDate, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', timezone).toString() + ' 00:00:00';
                            registerEndDate = await this.commonDateService.DateTimeFormat(registerEndDate, 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', timezone).toString() + ' 23:59:59';
                        }
                        let challengeStartDateTimeStamp = await this.commonDateService.DateTimeFormat(challengeStartDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                        let challengeEndDateTimeStamp = await this.commonDateService.DateTimeFormat(challengeEndDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                        let registerStartDateTimeStamp = await this.commonDateService.DateTimeFormat(registerStartDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                        let registerEndDateTimeStamp = await this.commonDateService.DateTimeFormat(registerEndDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');

                        let challengeStatus =  2; // Default status is 2 (Not started)
                        let challengeStatuslabel = await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        if(challengeStartDate && challengeStartDate !== 'Invalid date' && challengeStartDate !== '0000-00-00 00:00:00' && challengeStartDate !== '1970-01-01 00:00:00' && challengeStartDate !== '1970-01-01 00:00:00 23:59:59' && challengeStartDate !== '1970-01-01 00:00:00 00:00:00'){
                            if(challengeStartDateTimeStamp <= ucurrentdateTS && challengeEndDateTimeStamp >= ucurrentdateTS){
                                challengeStatus =  1; // 1 (Started)
                                challengeStatuslabel = await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            }else if(challengeStartDateTimeStamp > ucurrentdateTS){
                                challengeStatus =  2; // 2 (Not started)
                                challengeStatuslabel = await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            }else if(challengeEndDateTimeStamp < ucurrentdateTS){
                                challengeStatus =  3; // 3 (Ended)
                                challengeStatuslabel = await this.translatorService.frontendReadTranslation(req.lang, 'Challenge Ended', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            }
                        }
                        
                        let registerStatus = 2; // Default status is 2 (Not started)
                        let registerStatuslabel = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        if(registerStartDate && registerStartDate !== 'Invalid date' && registerStartDate !== '0000-00-00 00:00:00' && registerStartDate !== '1970-01-01 00:00:00' && registerStartDate !== '1970-01-01 00:00:00 23:59:59' && registerStartDate !== '1970-01-01 00:00:00 00:00:00'){
                            if(registerStartDateTimeStamp <= ucurrentdateTS && registerEndDateTimeStamp >= ucurrentdateTS){
                                registerStatus = 1; // 1 (Started)
                                registerStatuslabel = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            }else if(registerStartDateTimeStamp > ucurrentdateTS){
                                registerStatus = 2; // 2 (Not started)
                                registerStatuslabel = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            }else if(registerEndDateTimeStamp < ucurrentdateTS){
                                registerStatus = 3; // 3 (Ended)
                                registerStatuslabel = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Ended', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            }
                        }
                        
                        resultedData[index]['challengeDetails']['challengeStatus'] = challengeStatus;
                        resultedData[index]['challengeDetails']['challengeStatuslabel'] = challengeStatuslabel;
                        resultedData[index]['challengeDetails']['registerStatus'] = registerStatus;
                        resultedData[index]['challengeDetails']['registerStatuslabel'] = registerStatuslabel;

                        let customdesc = '';
                        let customname = '';
                        if (schedule['sc']['custom_cname'] !== undefined) {
                            customname = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${schedule['sc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule['sc']['org_id']}/${schedule['sc']['id']}`,`dynamic`);

                            if (customname == '' || customname === `custom_cname_${schedule['sc']['id']}`) {
                                customname = schedule['sc']['custom_cname'];
                            }
                            customname = customname && customname != '' ? customname : schedule['sc']['custom_cname'];
                        }
                        if (schedule['sc']['custom_cname']?.trim() === "") {
                            customname = await this.translatorService.frontendReadTranslation(req.lang,`challenge_name_${schedule['ch']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${schedule['ch']['id']}`,`dynamic`);
                        
                            if (customname == '' || customname === `challenge_name_${schedule['ch']['id']}`) {
                                customname = schedule['ch']['challenge_name'];
                            }
                            customname = customname && customname != '' ? customname : schedule['sc']['custom_cname'];
                        }
                        resultedData[index]['challengeDetails']['customname'] = customname;
                        if (schedule['sc']['custom_desc'] !== undefined) {
                            const order = [/\r\n/g, /\n/g, /\r/g, "<p>&nbsp;</p>", "\\", "\r\n"];
                            const replace = [" ", " ", " ", "", "", " "];
                            let custom_desc = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${schedule['sc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule['sc']['org_id']}/${schedule['sc']['id']}`,`dynamic`);

                            if (custom_desc === '' || custom_desc === `custom_desc_${schedule['sc']['id']}`) {
                                custom_desc = schedule['sc']['custom_desc'];
                            }

                            customdesc = custom_desc.replace(new RegExp(order.join('|'), 'g'), function(match) {
                                return replace[order.indexOf(match)];
                            });
                            customdesc = customdesc && customdesc != '' ? customdesc : schedule['sc']['custom_desc'];
                        }
                        
                        if (schedule['sc']['custom_desc']?.trim() === "") {
                            const order = [/\r\n/g, /\n/g, /\r/g, "<p>&nbsp;</p>", "\\", "\r\n"];
                            const replace = [" ", " ", " ", "", "", " "];
                            let challenge_desc = await this.translatorService.frontendReadTranslation(req.lang,`challenge_desc_${schedule['ch']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${schedule['ch']['id']}`,`dynamic`);

                            if (challenge_desc === '' || challenge_desc === `challenge_desc_${schedule['ch']['id']}`) {
                                challenge_desc = schedule['ch']['challenge_desc'];
                            }
                        
                            customdesc = challenge_desc.replace(new RegExp(order.join('|'), 'g'), function(match) {
                                return replace[order.indexOf(match)];
                            });
                            customdesc = customdesc && customdesc != '' ? customdesc : schedule['sc']['custom_desc'];
                        }
                        resultedData[index]['challengeDetails']['customdesc'] = customdesc;
                        let iconimage = "";
                        let logoimage = "";
                        let icon:any = schedule['ch']['icon'];
                        let logo = schedule['ch']['logo'];
                        let path = "";
                        // Determine icon image
                        if (schedule['sc']['custom_logo'] !== '') {
                            iconimage = schedule['sc']['custom_logo'];
                            path = iconimage?.includes('challenge') && !iconimage?.includes(S3_URL)  ? S3_URL + iconimage : iconimage != '' && !iconimage?.includes(S3_URL) ? this.commonService.getIconPath(iconimage,S3_URL): iconimage
                            // Check if file exists in bucket (simulated)
                            if (!iconimage || (iconimage?.trim() !== '' && !await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: iconimage})))) {
                                iconimage = "walk.png";
                                path = this.commonService.getIconPath(iconimage,S3_URL);
                            }
                        } else if (icon?.length > 2) {
                            iconimage = icon;
                            path = iconimage?.includes('challenge') && !iconimage?.includes(S3_URL) ? S3_URL + iconimage : iconimage != '' && !iconimage?.includes(S3_URL) ? this.commonService.getIconPath(iconimage,S3_URL): iconimage;
                        
                            // Check if file exists in bucket (simulated)
                            if (!iconimage || (iconimage?.trim() !== '' && !await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: iconimage})))) {
                                iconimage = "walk.png";
                                path = this.commonService.getIconPath(iconimage,S3_URL);
                            }
                        } else {
                            if (icon === '') {
                                icon = 1;
                            }
                            path = this.commonService.getIconPath(icon,S3_URL);
                        }
                        resultedData[index]['challengeDetails']['path'] = path;
                        if (logo?.length > 2) {
                            logoimage = logo;
                        }
                        if(schedule['sc']['reg_start_date'] && schedule['sc']['reg_start_date'] != null){
                            schedule['sc']['reg_start_date'] =  (await this.commonDateService.DateTimeFormat(schedule['sc']['reg_start_date'], 'YYYY-MM-DD HH:mm:ss')).toString();
                        }
                        if(schedule['sc']['reg_end_date'] && schedule['sc']['reg_end_date'] != null){
                            schedule['sc']['reg_end_date'] =  (await this.commonDateService.DateTimeFormat(schedule['sc']['reg_end_date'], 'YYYY-MM-DD HH:mm:ss')).toString();
                        }
                        let startMonthName = await this.commonDateService.DateTimeFormat('now', 'MMMM');
                        if(schedule['sc']['start_date'] && schedule['sc']['start_date'] != null){
                            schedule['sc']['start_date'] =  await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'YYYY-MM-DD') + ' 00:00:00';
                            let startDateM:any = await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'MMMM');
                            startMonthName = await this.translatorService.frontendReadTranslation(req.lang, startDateM, `/LC_MESSAGES/Common/Month`,`static`);
                        }
                        resultedData[index]['challengeDetails']['sdate'] = await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'MMMM D, YYYY');
                        resultedData[index]['challengeDetails']['Tsdate'] = startMonthName + ' ' + await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'D, YYYY');

                        let endMonthName = await this.commonDateService.DateTimeFormat('now', 'MMMM');
                        if(schedule['sc']['end_date'] && schedule['sc']['end_date'] != null){
                            schedule['sc']['end_date'] =  await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'YYYY-MM-DD') + ' 00:00:00';
                            let endDateM:any = await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'MMMM');
                            endMonthName = await this.translatorService.frontendReadTranslation(req.lang, endDateM, `/LC_MESSAGES/Common/Month`,`static`);
                        }
                        resultedData[index]['challengeDetails']['edate'] = await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'MMMM D, YYYY');
                        resultedData[index]['challengeDetails']['Tedate'] = endMonthName + ' ' + await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'D, YYYY');
                        let now:any = await this.commonDateService.DateTimeFormat('now', 'timestamp');
                        let your_date:any = await this.commonDateService.DateTimeFormat(resultedData[index]['challengeDetails']['sdate'], 'timestamp', 'MMMM D, YYYY');
                        let datediff = now - your_date;
                        resultedData[index]['challengeDetails']['startdays'] = Math.floor(datediff / (60 * 60 * 24));
                        const bioType = schedule['ch']['bio_challenge_type'];
                        if (bioType !== "Olympics" || ((bioType === "Bingo_layout") && schedule['sc']['card_week_relation']!=1)) {
                            resultedData[index]['challengeDetails']['ucurrentdate'] = ucurrentdate;
                            let startdate:any = await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'timestamp');
                            let enddate:any = await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'timestamp');
                            let now:any = await this.commonDateService.DateTimeFormat(resultedData[index]['challengeDetails']['ucurrentdate'], 'timestamp');
                            if (now >= enddate) {
                                now = enddate;
                            }
                            let totaldays = Math.floor((enddate - startdate) / (60 * 60 * 24)) + 1;
                            let uptodays = Math.floor((now - startdate) / (60 * 60 * 24)) + 1;
                            if (uptodays === 0) {
                                uptodays = 1;
                            }
                            resultedData[index]['challengeDetails']['totaldays'] = totaldays;
                            resultedData[index]['challengeDetails']['uptodays']  = uptodays;
                        }
                        resultedData[index]['challengeDetails']['challengestatus'] = 'De-active';
                        if (moment(ucurrentdate).isBetween(moment(schedule['sc']['start_date']), moment(schedule['sc']['end_date']), null, '[]')) {
                            resultedData[index]['challengeDetails']['challengestatus'] = 'Active';
                        }
                        if(postData?.challenge_id){
                            if (schedule['ch']['challenge_type']?.trim() === "A") {
                                switch (schedule['ch']['bio_challenge_type']) {
                                    case "Olympics":
                                        resultedData[index]['data'] = await this.userChallengeHelperService.olympicsChallenge(schedule, req, show_type);
                                        break;
                                    case "Hydrate":
                                        resultedData[index]['data'] = await this.hydrateChallengeService.hydrateChallenge(schedule, req, show_type);
                                        break;
                                    case "Sleep_Tracking":
                                        resultedData[index]['data'] = await this.sleepChallengeService.sleepChallenge(schedule, req, show_type);
                                        break;
                                    case "Fitness":
                                        resultedData[index]['data'] = await this.fitnessChallengeService.fitnessChallenge(schedule, req, show_type);
                                        break;
                                    case "Football_step":
                                        resultedData[index]['data'] = await this.footballStepChallengeService.footballStepChallenge(schedule, req, show_type);
                                        break;
                                    case "Trek_step":
                                        resultedData[index]['challengeDetails']['invitation'] = 'invitation';
                                        resultedData[index]['data'] = await this.trekStepChallengeService.trekstepChallenge(schedule, req, show_type);
                                        break;
                                    case "Random_Acts_of_Kindness":
                                        resultedData[index]['data'] = await this.randomActChallengeService.RandomActsOfKindnessChallenge(schedule, req, show_type);
                                        break;
                                    case "Move_more":
                                        resultedData[index]['data'] = await this.moveMoreChallengeService.moveMoreChallenge(schedule, req, show_type);
                                        break;
                                    case "Mile_layout":
                                        resultedData[index]['sc']['s_walking'] = 0
                                        resultedData[index]['sc']['s_running'] = 0
                                        resultedData[index]['sc']['s_cycling'] = schedule['sc']['s_cycling'] == 1 ? 1 : 0;
                                        resultedData[index]['sc']['s_swimming'] = 0
                                        resultedData[index]['data'] = await this.mileLayoutChallengeService.MileLayoutChallenge(schedule, req ,show_type);
                                        break;
                                    case "Relay_race":
                                        resultedData[index]['data'] = await this.relayRaceChallengeHelperService.RelayraceChallenge(schedule, req, show_type);
                                        break;
                                    default:
                                        if (schedule['ac']['activity_name'] === "Steps") {
                                            resultedData[index]['data'] = await this.stepChallengeService.stepChallenge(schedule, req, show_type);
                                        }
                                        break;
                                }
                            }                        
                            if (schedule['ch']['challenge_type']?.trim() == "B") {
                                if (schedule['ch']['bio_challenge_type'] == "Football") {
                                    resultedData[index]['data'] = await this.footballStepChallengeService.BiometricFootballChallenge(schedule, req, show_type);         
                                }
                                else if (schedule['ch']['bio_challenge_type'] == "Weight_progress") {
                                    resultedData[index]['data'] = await this.weightProgressChallengeService.weightProgressChallenge(schedule, req , show_type);         
                                }else if (schedule['ch']['bio_challenge_type'] == "Weight_progress_withoutTeam") {
                                    resultedData[index]['data'] = await this.weightProgressChallengeService.weightProgressWithoutTeamChallenge(schedule, req, show_type);         
                                } 
                            }
                            if (schedule['ch']['challenge_type']?.trim() == "H") {
                                if (schedule['ch']['bio_challenge_type'] == "Bingo_layout") {
                                    if(schedule['sc']['card_week_relation'] == 1){
                                        resultedData[index]['data'] = await this.bingoChallengeService.bingoWeekChallenge(schedule, req, show_type);         
                                    }else{
                                        resultedData[index]['data'] = await this.bingoChallengeService.bingoChallenge(schedule, req, show_type);         
                                    }
        
                                    // let templinks = await this.interlinksService.listRecord({}); ZOMO-4934
                                    // const combinedLinks = templinks.reduce((acc, link) => {
                                    //     acc[link.id] = link; 
                                    //     return acc;
                                    // }, {});
                                    // resultedData[index]['data']['templinks'] = combinedLinks;
                                }else if (schedule['ch']['bio_challenge_type'] == "Healthy_habit_activity_layout") {
                                    resultedData[index]['data'] = await this.healthHabbitActivityChallengeService.healthyHabitActivityChallenge(schedule, req, show_type);         
                                }else if (schedule['sc']['is_all_activities'] == 1) {
                                    resultedData[index]['data'] = await this.healthHabbitActivityChallengeService.healthyHabitAllActivityChallenge(schedule, req, show_type);         
                                }else {      
                                    await this.healthHabbitChallengeService.healthyHabitChallengeCheck(schedule, req); 
                                    resultedData[index]['data'] = await this.healthHabbitChallengeService.healthyHabitChallenge(schedule, req, show_type);         
                                } 
                            }                    
                            if(schedule['ch']['challenge_type']?.trim() == "R"){                             
                                delete resultedData[index]['challengeDetails']['completed_lock_locations'];
                                delete resultedData[index]['challengeDetails']['trek_level_id'];
                                delete resultedData[index]['challengeDetails']['in_ranking'];
                                delete resultedData[index]['challengeDetails']['relay_race_detail']; 
                                postData['list_type'] = 'all';
                                postData['apiCall'] = 'Web';         
                                postData['schedule_id'] = schedule['sc']['id'];  
                                postData['user_id'] = user_id;
                                postData['org_id'] = org_id; 
                                postData['side'] = 'user';          
                                resultedData[index]['data'] = await this.userChallengeHelperService.recipeChallenge(postData, req, show_type);
                            }
                        }
                    }else{                        
                        delete resultedData[index];
                    }
                }
            }else{
                let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Sorry! you are not join this challenge`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                return [{ error :errorMsgTrans }];
            }
            if(resultedData?.length > 0){
                resultedData = resultedData.filter(item => item !== null)
                for(let item of resultedData){
                    let start_date = this.commonDateService.getTodayDate(item['sc']['start_date']).startOf('day');
                    let end_date = this.commonDateService.getTodayDate(item['sc']['end_date']).endOf('day');
                    let current_date = this.commonDateService.getTodayDate().unix();
                    let totalDays = end_date.diff(start_date, 'days') + 1;
                    let remainingDays = 0;
                    if (current_date >= start_date.unix() && current_date <= end_date.unix()) {
                        remainingDays = (end_date.diff(this.commonDateService.DateTimeFormat('now'), 'days')) + 1;
                    }
                    else if(current_date < start_date.unix()){
                        remainingDays = (moment.unix(end_date).diff(moment.unix(current_date), 'days')) + 1;
                    }
                    else if(current_date > end_date.unix()){
                        remainingDays = 0
                    }
                    item['sc']['joined_count'] = 0;
                    let joinCount = await this.scheduleChallengeJoinUsersService.joinUserListRecord({schedule_id: item['sc']['id'], status: 1},null,['scj.id']);
                    item['sc']['joined_count'] = joinCount?.length;
                    
                    if(item['challengeDetails']['challengeStatus'] == 1){
                        item['sc']['streak_count'] = await this.userChallengeHelperService.streakIndicator({...item?.['sc'], AlreadyjoinId: item?.id, ac: item['ac'], ch: item['ch'],}, req);
                    }
                    item['sc']['remaining_days'] = item['challengeDetails']['challengeStatus'] != 2 ? remainingDays : totalDays;
                }
            }
            if(dashboardListData && dashboardListData == 1){
                if(resultedData?.length > 0 && show_type == 1){
                    let challangeIdList = resultedData.map((item)=>item?.['sc']?.id)
                    return challangeIdList
                }else if(resultedData?.length > 0 && show_type == 2){
                    return resultedData
                }else{
                    return null
                }
            }
            return resultedData;
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
    /*
    for future use when send notification only for joined user
    async addNotification(challengeData: any, req: Request) {
        try {
            let userData = req.tokenUser;
            let twoDayBefore = this.commonDateService.getTodayDate(challengeData?.start_date).subtract(2, 'days').format('YYYY-MM-DD');
            let oneDayBefore = this.commonDateService.getTodayDate(challengeData?.start_date).subtract(1, 'days').format('YYYY-MM-DD');
            let message = "Your challenge is about to start in";
            let notificationData = {
                org_id: userData.org_id,
                user_id: userData.id,
                title: "Upcoming Challenge",
                message: "Your challenge is about to start in",
                type: 1,
                module_name: 'Challenges',
                submodule_name: '',
                metadata: {
                    challenge_id: challengeData?.challenge_id,
                    schedule_id: challengeData?.schedule_id,
                    notification_date: null
                    url: challengeData?.url,
                },
            }
            notificationData['metadata']['notification_date'] = twoDayBefore;
            notificationData['message'] = message + ' 2 Days';
            await this.notificationsService.save(notificationData);
            notificationData['metadata']['notification_date'] = oneDayBefore;
            notificationData['message'] = message + ' 1 Days';
            await this.notificationsService.save(notificationData);
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return
        }
    }
    */
}
