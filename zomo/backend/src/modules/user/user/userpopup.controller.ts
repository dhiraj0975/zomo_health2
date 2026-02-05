import { appConstant, CommonDateService, CommonFileService, CommonHealthService, CommonService } from '@common-constants';

import { UrlManageService } from '@/modules/common';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { UpdateUserPopupInterface } from 'src/interface';
import { ActivityService } from 'src/modules/activity/activity/activity.service';
import { CreateFormsService } from 'src/modules/activitytracker/createforms/createforms.service';
import { SubmitFormsService as acSubmitFormsService } from 'src/modules/activitytracker/submitforms/submitforms.service';
import { ScheduleChallengeService } from 'src/modules/challenge/schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeJoinUsersService } from 'src/modules/challenge/schedulechallengejoinusers/schedulechallengejoinusers.service';
import { TeamMembersService } from 'src/modules/challenge/teammembers/teammembers.service';
import { WeeksStepsService } from 'src/modules/challenge/weekssteps/weekssteps.service';
import { CommunicationTemplateTextsService } from 'src/modules/communication/templatetexts/communicationtemplatetexts.service';
import { ActivePluginService } from 'src/modules/company/activeplugins/activeplugin.service';
import { PassportUsersService } from 'src/modules/covid/passportUsers/passportUsers.service';
import { SettingsService as covidSettingsService } from 'src/modules/covid/settings/settings.service';
import { EventUserBookingListsService } from 'src/modules/events/userbookinglists/userbookinglists.service';
import { FormInstructionsService } from 'src/modules/healthcheckup/forminstructions/forminstructions.service';
import { QuestionnaireSettingsService } from 'src/modules/healthcheckup/questionnairesettings/questionnairesettings.service';
import { QuestionnaireUsersService } from 'src/modules/healthcheckup/questionnaireusers/questionnaireusers.service';
import { UserFormsService } from 'src/modules/healthcheckup/userforms/userforms.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { CreateFormsService as rbCreateFormsService } from 'src/modules/reimbursement/createforms/createforms.service';
import { SubmitFormsService } from 'src/modules/reimbursement/submitforms/submitforms.service';
import { SpouseAgreementService } from 'src/modules/spouse/spouseAgreement/spouseAgreement.service';
import { SurveyPopupService } from 'src/modules/survey/surveypopup/surveypopup.service';
import { SurveyUserAnswersService } from 'src/modules/survey/surveyuseranswers/surveyuseranswers.service';
import { ActivityFeedService } from 'src/modules/trackers/activityfeeds/activityfeeds.service';
import { In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { fileName, imgFilter } from '../../../utils/image-upload.utils';
import { TranslationService } from '../../translation/translation.service';
import { UserService } from '../user/user.service';
import { UserLoginAgreementService } from '../userloginagreement/userloginagreement.service';
import { UserSettingsService } from '../usersettings/usersettings.service';
const argon2 = require('argon2');
const moment = require('moment-timezone');
const path = require('path');
const S3_URL =  process.env.S3_URL_PROD
@Controller('user')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserPopupController {
    constructor(
        private readonly userService: UserService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userSettingsService: UserSettingsService,
        private readonly questionnaireUsersService: QuestionnaireUsersService,
        private readonly surveyUserAnswersService: SurveyUserAnswersService,
        private readonly submitFormsService: SubmitFormsService,
        private readonly acsubmitFormsService: acSubmitFormsService,
        private readonly userFormsService: UserFormsService,
        private readonly passportUsersService: PassportUsersService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly teamMembersService: TeamMembersService,
        private readonly activityService: ActivityService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly questionnaireSettingsService: QuestionnaireSettingsService,
        private readonly surveyPopupService: SurveyPopupService,
        private readonly covidSettingsService: covidSettingsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly spouseAgreementService: SpouseAgreementService,
        private readonly activePluginService: ActivePluginService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly userLoginAgreementService: UserLoginAgreementService,
        private readonly createFormsService: CreateFormsService,
        private readonly rbcreateFormsService: rbCreateFormsService,
        private readonly formInstructionsService: FormInstructionsService,
        private readonly weeksStepsService: WeeksStepsService,
        private readonly urlManageService: UrlManageService,
    ) { }

    @Post('update-popup')
    @UseInterceptors(
        FileInterceptor('user_sign_image', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.USER_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
        AccessGuard
    )
    async updatePopup(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateUserPopupInterface, @UploadedFile() file: Express.Multer.File,) {
        try {
            const user = req.tokenUser;
            const userId = user?.id;
            const orgId = user?.org_id;
            const popupName = postData?.popup_name;
            const popupStatus = postData?.popup_status ?? 1;
            let message = await this.translatorService.frontendReadTranslation(req.lang, "MSG POPUP SUBMITTED SUCCESSFULLY");
            if(popupName == 'loginaggrement'){
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    postData.user_sign = ' ';
                }
                if (
                    !userId ||
                    !orgId ||
                    !postData?.user_sign || !popupStatus
                ) {
                    if (file && file.fieldname === 'user_sign_image' && file.filename) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let data = {
                    'user_id': userId,
                    'org_id': orgId,
                    'user_sign': postData?.user_sign,
                    'status': popupStatus
                }
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    let filename = `user/loginagreement/${orgId}/signimg_${this.commonService.generateMD5(userId.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                    data['user_sign_image'] = filename;
                }
                await this.userLoginAgreementService.save(data);
            }
            if(popupName == 'agreement'){
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    postData.signed = ' ';
                }
                if (!userId || !orgId || !postData?.signed) {
                    if (file && file.fieldname === 'user_sign_image' && file.filename) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let data={
                    'user_id':userId,
                    'org_id':orgId,
                    'signed':postData?.signed,
                    'status':1
                }
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    let filename = `user/spouseagreement/${orgId}/signimg_${this.commonService.generateMD5(userId.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                    data['user_sign_image'] = filename;
                }
                await this.spouseAgreementService.save(data)
            }
            if(popupName == 'Questionnaireuser'){
                if (!orgId || !userId) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let data = {
                    'user_id':userId,
                    'org_id':orgId,
                    'status':popupStatus,
                    'entry_name':postData?.entry_name || null,
                    'entry_empid':postData?.entry_empid || null,
                    'medical_status_one': postData?.medical_status_one || 0,
                    'medical_status_two': postData?.medical_status_two || 0,
                    'participation_wp':postData?.participation_wp || 0,
                    'participation_wp_data':postData?.participation_wp_data || 0,
                    'wellness_score_one':postData?.wellness_score_one || 0,
                    'wellness_score_two':postData?.wellness_score_two || 0
                }
                await this.questionnaireUsersService.save(data);
                message = await this.translatorService.frontendReadTranslation(req.lang, "SUBMITTED_SUCCESSFULLY");
            }
            if(popupName == 'UserServeyPopupShow'){
                if (!orgId || !postData?.survey_popup_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                let data = {
                    'user_id':userId,
                    'org_id':orgId,
                    'status':popupStatus,
                    'popup_id':postData?.survey_popup_id ,
                    'question_answers':postData?.question_answers || null,
                    'created_by':req.tokenUser?.id,
                    'updated_by':req.tokenUser?.id
                }
                let answerData = await this.surveyUserAnswersService.save(data);
                let recordDetails = await this.userService.findOne(`user.id = ${req.tokenUser?.id}`,['user', 'role.id', 'role.title', 'company.id', 'company.company_name', 'company.code', 'company.company_logo', 'company.status', 'meta','companysetting']);
                let result = Object.create(null)
                if(postData?.popup_name && postData?.popup_name != '' && postData?.popup_name == 'UserServeyPopupShow'){
                    let data =await this.surveyAnswerCheck({...recordDetails, org_id: orgId, answerData},req);
                    result['survey-details']=data
                }
                if(result.length != 0){
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: result,
                        message: 'success',
                    });
                }
            }
            if(popupName == 'editemailspaouse'){
                if (!orgId || !userId) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const where = `user.id = ${req.tokenUser?.id} AND user.role_id : = 16`;
                const recordDetails = await this.userService.findOne(where);
                if(recordDetails){
                    await this.userService.update(where, { 'email' : postData?.email});
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
            }
            if(popupName == 'user_popup_status'){
                if (!orgId || !userId ||!postData?.username || !postData?.new_password) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                if (postData?.username) {
                    const emailUName = await this.userService.findOne(`user.username = ${postData?.username}`);
                    if (emailUName) {
                        throw Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_USERNAME_EXIST',),);
                    }
                }
                const where = `user.id = ${userId}`;
                const recordDetails = await this.userService.findOne(where);
                const isMatch = await argon2.verify(Buffer.from(postData?.new_password, 'base64').toString('ascii'),recordDetails.new_password);
                if(isMatch) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_PASSWORD_EXIST"));
                }
                if(recordDetails){
                    await this.userService.update(where, {'username': postData?.username, 'new_password': Buffer.from(await argon2.hash(postData?.new_password)).toString('base64')});
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
            }
            if(popupName == 'first_login_by'){
                if (!orgId || !userId || !postData?.new_password) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const where = `user.id = ${userId}`;
                const recordDetails = await this.userService.findOne(where);
                const isMatch = await argon2.verify(Buffer.from(postData?.new_password, 'base64').toString('ascii'),recordDetails.new_password);
                if(isMatch) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_PASSWORD_EXIST"));
                }
                if(recordDetails){
                    await this.userService.update(where, {'new_password':Buffer.from(await argon2.hash(postData?.new_password)).toString('base64')});
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
            }
            if(popupName == 'reimbursement_form'){
                if (!orgId || !userId) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const recordDetails = await this.submitFormsService.listRecord(['sf.id','sf.user_id','sf.status'],{ 
                    user_id: userId, 
                    org_id: orgId, 
                    status: In([2, 1]),
                    popup_status: 0
                })
                if(recordDetails){
                    let ids = recordDetails.map((record) => record.id);
                    await this.submitFormsService.update({ id: In(ids)},{popup_status:1});
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
            }
            if(popupName == 'activity_popup'){
                if (!orgId || !userId) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const recordDetails = await this.acsubmitFormsService.listRecord(['sf.id'],`sf.user_id = ${userId} AND sf.org_id = ${orgId} AND sf.status in(2,1) AND sf.popup_status = 0`)
                if(recordDetails){
                    let ids = recordDetails.map((record) => record.id);
                    await this.acsubmitFormsService.update({ id: In(ids)},{popup_status:1});
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
            }
            if(popupName == 'health_popup'){
                if (!orgId || !userId) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const recordDetails = await this.userFormsService.listRecord(['userform.id','userform.user_id','userform.status'],{
                    user_id: userId, 
                    org_id: orgId, 
                    status: In([2, 3]),
                    popup_status: 0
                })
                if(recordDetails){
                    let ids = recordDetails.map((record) => record.id);
                    await this.userFormsService.update({ id: In(ids)},{popup_status:1});
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
            }
            if(popupName == 'information_popup'){
                if (!orgId || !userId) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const where = { user_id: userId };
                const recordDetails = await this.userSettingsService.findOne(where);
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
                if(recordDetails){
                    await this.userSettingsService.update(where, { 'info_popup_status' : 1});
                }
            }
            if(popupName == 'covidPassport'){
                if (!orgId || !userId ) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const where = { org_id: orgId,created_by:userId,approval_status:In([1,2]),status:1};
                const recordDetails = await this.passportUsersService.findOne(where);
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
                if(recordDetails){
                    await this.passportUsersService.update(where, { 'is_show_dashboard' : 1});
                }
            }
            if(popupName == 'loginpointsleaderboardpopup'){
                if (!orgId || !userId || !postData?.pointsleaderboardstatus) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                const where = { user_id: userId };
                const recordDetails = await this.userSettingsService.findOne(where);
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
                if(recordDetails){
                    await this.userSettingsService.update(where, { 'is_pointsleaderboardpopup' : postData?.pointsleaderboardstatus});
                }
            }
            if(popupName == 'event_remider_popup'){
                if (!orgId || !userId || !this.commonService.isValidNumber(postData?.returndatalimit) || !postData?.returndataid) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                let returndatalimit=postData?.returndatalimit
                let returndataid=postData?.returndataid;
                const where = { id: returndataid };
                const recordDetails = await this.eventUserBookingListsService.findOne(where);
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
                if(recordDetails){
                    await this.eventUserBookingListsService.update(where, { 'reminder_limit' : returndatalimit });
                }
            }
            if(popupName == 'challengeRelayRace'){
                if (!orgId || !userId || !postData?.pop_status || !postData?.userFormId) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                }
                let pop_status = postData?.pop_status
                let data = await this.scheduleChallengeService.challengeFindOne(['sc.id','sc.hide_history'],`sc.id = ${postData?.userFormId}`)
                let datas = Object.create(null);
                if(data){
                    let hide_start_baton = data.hide_history;
                    if (typeof postData?.pop_status != 'undefined' && ['join', 'passbaton', 'completeteam', 'accept', 'current', 'next'].includes(postData?.pop_status)){
                        let checkuseralready = await this.scheduleChallengeJoinUsersService.findOne({schedule_id:postData?.userFormId,user_id:req.tokenUser?.id, status: 1});
                        let relay_detail = JSON.parse(checkuseralready.relay_race_detail)
                        let dat = Object.create(null);
                        if (!relay_detail || Object.keys(relay_detail).length == 0) {
                            dat['join']  = (pop_status == 'join') ? 1 : '';
                            dat['passbaton']  = (pop_status == 'passbaton') ? 1 : '';
                            dat['completeteam'] = (pop_status == 'completeteam') ? 1 : '';
                            dat['accept']  = (pop_status == 'accept') ? 1 : '';
                            if (pop_status == 'accept' && hide_start_baton == 1) {
                                dat['accept'] = '';
                            }
                            dat['current']  = (pop_status == 'current') ? 1 : '';
                            dat['next']  = (pop_status == 'next') ? 1 : '';
                            dat['beginning_mail']  = (pop_status == 'beginning_mail') ? 1 : '';
                        } 
                        else {
                            if (pop_status && pop_status.trim() != '') {
                                dat[pop_status]  = 1;
                                if (pop_status == 'accept' && hide_start_baton == 1) {
                                dat[pop_status] = '';
                                }
                                dat = { ...relay_detail, ...dat };// Merges relay_detail and datsession recursively
                            }
                        }
                        if(Object.keys(dat).length>0){
                            datas['relay_race_detail'] = JSON.stringify(dat); 
                            await this.scheduleChallengeJoinUsersService.update({id:checkuseralready['id']},datas)
                        }
                        let emailDetails = Object.create(null);
                        let type
                        let subject
                        let toEmail = user.email;
                        let teamDetails: any = await this.teamMembersService.teamMemberList(`team.schedule_id = ${postData?.userFormId} AND teamMember.org_id = ${user.org_id} AND teamMember.user_id = ${user.id} AND teamMember.status = 1`)
                        teamDetails = teamDetails[0];
                        let team_name = teamDetails?.['team']?.['tname'] ?? '';
                        if(postData?.pop_status == 'completeteam'){
                            type = 35;
                            subject = `And that’s a wrap (${team_name})! `;
                            emailDetails['type'] = type;
                            emailDetails['Company Name'] = user?.company?.company_name;
                            emailDetails['First Name'] = user.full_name;
                            
                        }
                        let templateText = await this.communicationTemplateTextService.findOne({org_id:In([user.org_id,0]),type}) 
                        if(templateText){
                            templateText['new_text'] = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                        }
                        if(Object.keys(emailDetails)?.length){
                            let emaildata = {
                                    sender: ``,
                                    receiver: toEmail,
                                    subject: subject,
                                    content: emailDetails,
                                    template: templateText?.['new_text'] || templateText?.['text']
                                }
                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                        }
                    }
                }
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message,
            });
        } catch (error) {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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

    @Post('get-popup-status-new')
    async getPopupStatusNew(@Req() req: Request, @Res() res: Response, @Body() postData:any ) {
        try {
            const user = Object.create(req.tokenUser);
            let popupKey = '' 
            if(postData?.popup_name && postData?.popup_name != ''){
                popupKey = postData?.popup_name || ''
            }
            const where = { id: user.id };
            this.commonFileService.addMembershipCodeCondition(req, where);
            let recordDetails = await this.userService.findOne(where,['user', 'role.id', 'role.title', 'company.id', 'company.company_name', 'company.code', 'company.company_logo', 'company.status','companysetting', 'meta']);
            let result = Object.create(null)
            let allPopup = appConstant.USER_ALL_POPUP;
            let value = 0;
            if(popupKey != ''){
                value = allPopup[popupKey]+1;
            }
            for (let i = value; i <= Object.keys(allPopup).length; i++) {
                let keyName = Object.keys(allPopup).find(key => allPopup[key] == i)
                if(keyName == 'loginaggrement'){
                    if (user.role_id == 16 || user.role_id == 2) {
                        if(recordDetails['company']['meta'] && recordDetails['company']['meta'].a_popup_status == 1){
                            let userLoginAggrement = await this.userLoginAgreementService.findOneUser({user_id:user.id,org_id:user.org_id,status: Not('2')},['id'])
                            if(!userLoginAggrement && userLoginAggrement== null ){
                                let loginAgreement ={
                                    a_popup_title: recordDetails['company']['meta']?.a_popup_title,
                                    a_popup_text: recordDetails['company']['meta']?.a_popup_text
                                }
                                if(loginAgreement.a_popup_title){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_title_content_${recordDetails['company']['id']}`, `/LC_MESSAGES/Common/Agreement/${user.org_id}`,`dynamic`);
                                    if (!customName.includes('agreement_title_content_')) {
                                        loginAgreement.a_popup_title = customName;
                                    }
                                }
                                if(loginAgreement.a_popup_text){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_text_content_${recordDetails['company']['id']}`, `/LC_MESSAGES/Common/Agreement/${user.org_id}`,`dynamic`);
                                    if (!customName.includes('agreement_text_content_')) {
                                        loginAgreement.a_popup_text = customName;
                                    }
                                }
                                result['popup_name'] = 'loginaggrement'
                                result['details']=loginAgreement
                                break;
                            }
                        }
                    }
                }
                if (user.role_id == 16 || user.role_id == 2) {
                    if(keyName == 'covidPassport'){
                        if(recordDetails['companysetting'] && recordDetails['companysetting'].passport_menu == 1){
                            let pluginName;
                            let activePlugin: any = await this.activePluginService.findOne(
                                { company_id: user.org_id }, 
                                null, 
                                ['company_id', 'plugin_name', 'id'] 
                                );
                                if(activePlugin && activePlugin.plugin_name && activePlugin.plugin_name != null){
                                pluginName = JSON.parse(activePlugin?.plugin_name);
                            }
                            let Covidpassportsetting = await this.passportUsersService.findOne(
                                `passportUsers.org_id = ${user.org_id} AND passportUsers.created_by = ${user.id} AND passportUsers.approval_status IN (1, 2) AND passportUsers.status = 1 AND passportUsers.is_show_dashboard != 1`
                            )
                            if(Covidpassportsetting && Covidpassportsetting!= null  && pluginName.Covid && Covidpassportsetting.is_show_dashboard ==0){
                                let passport_description
                                if (Covidpassportsetting) {
                                    passport_description = Covidpassportsetting['setting']['description'];
                                    if(passport_description){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`settings_description_${user.org_id}`, `/LC_MESSAGES/Trackers/CovidPassport/${user.org_id}`,`dynamic`);
                                        passport_description = (customName == '' || customName == `settings_description_${user.org_id}`) ? passport_description : customName;
                                    }
                                }
                                let approval_status_text = '';
                                let approval_status = Covidpassportsetting?.approval_status ?? '';
                                if(Covidpassportsetting?.approval_status == 2){
                                    approval_status_text = await this.translatorService.frontendReadTranslation(req.lang, "FORM_REJECTED");
                                } else if(Covidpassportsetting?.approval_status == 1){
                                    approval_status_text = await this.translatorService.frontendReadTranslation(req.lang, "FORM_APPROVED");
                                }else{
                                    approval_status_text = await this.translatorService.frontendReadTranslation(req.lang, "FORM_UPDATED");
                                }
                                result['popup_name'] = 'covidPassport'
                                result['details']={
                                    passport_description:passport_description,
                                    user_name:recordDetails.first_name+' '+recordDetails.middle_name+' '+recordDetails.last_name,
                                    user_code:recordDetails.code,
                                    approval_status:approval_status,
                                    approval_status_text:approval_status_text
                                }
                                break;
                            }
                        }
                    }
                    if(keyName == 'covidVaccinePopup' ){  
                        let covidData = await this.covidSettingsService.covidPopupData(
                            user.org_id,
                            user.id,
                            ['Covidsettings.is_eligibility','Covidsettings.department_string','Covidsettings.location_string','Covidsettings.status','Covidsettings.symptom_traker_setting','Covidsettings.selectedweekday','Covidsettings.selected_frequency_time','Covidsettings.selected_frequency','Covidsettings.show_login_time','Coviduseranswers.org_id','Coviduseranswers.user_id','Coviduseranswers.status','Coviduseranswers.created','Coviduseranswers.id']);
                        if (recordDetails['companysetting'].covid_menu == 1) {
                            let getCovidsetting = covidData ;
                            let covid_is_eligibility = getCovidsetting?.is_eligibility || 0;
                            let show_eligibility = 0;
                            if ((user.role_id == 2 || user.role_id == 16) && (covid_is_eligibility == 0 || covid_is_eligibility == recordDetails?.is_camp_eligible)) {
                                show_eligibility = 1;
                            }
                            let to_dept_loc_status = 0;
                            if(getCovidsetting?.department_string== null || getCovidsetting?.location_string == null){
                                to_dept_loc_status = 1;
                            }
                            if (getCovidsetting?.department_string?.includes(recordDetails?.department_id?.toString())) {
                                to_dept_loc_status = 1;
                            }
                            if (getCovidsetting?.location_string?.includes(recordDetails?.location?.toString())) {
                                to_dept_loc_status = 1;
                            }
                            let show_covid_popup = 0;
                            if (getCovidsetting?.status == 1 || getCovidsetting?.symptom_traker_setting == 1) {
                                show_covid_popup = 1;
                            }
                            let covid_show = 0;
                            if (to_dept_loc_status == 1 && show_eligibility == 1 && show_covid_popup == 1) {
                                let userTimeZone = user.timezone || 'UTC';
                                const covidcurrent_date = moment.tz(userTimeZone).format('YYYY-MM-DD');
                                const covidcurrent_datetime = moment.tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                                const covidDate = covidcurrent_date; 
                                let covid_ts = moment(covidDate).valueOf(); 
                                let covid_year = moment(covid_ts).year();
                                let covid_month = moment(covid_ts).month() + 1; 
                                const today = moment.tz(userTimeZone);
                                const dayOfWeek = today.day(); 
                                const getDayOffset = (day) => {
                                    const weekdays = appConstant.WEEKDAYS;
                                    return weekdays[day.toLowerCase()] || 0; 
                                };
                                const selectedWeekDay = getCovidsetting?.selectedweekday || 'monday';
                                const selectedWeekDayOffset = getDayOffset(selectedWeekDay);
                                let daysUntilSelectedWeekday = selectedWeekDayOffset - dayOfWeek;
                                if (daysUntilSelectedWeekday < 0) {
                                    daysUntilSelectedWeekday += 7;
                                }
                                if (daysUntilSelectedWeekday < 0) {
                                    daysUntilSelectedWeekday = 0;
                                }
                                let weekStartDate = today.clone().add(daysUntilSelectedWeekday, 'days').startOf('day');
                                let weekEndDate = weekStartDate.clone().add(6, 'days'); 
                                const formattedWeekStartDate = weekStartDate.format('YYYY-MM-DD');
                                const formattedWeekEndDate = weekEndDate.format('YYYY-MM-DD');
                                let month_start_date = `${covid_year}-${covid_month.toString().padStart(2, 0)}-01`;
                                const lastDayOfCurrentMonth = today.clone().endOf('month').date();
                                let month_end_date = `${covid_year}-${covid_month.toString().padStart(2, 0)}-${lastDayOfCurrentMonth}`;
                                let year_start_date = `${covid_year}-01-01`;
                                let year_end_date = `${covid_year}-12-31`;
                                let frequency_time = getCovidsetting?.selected_frequency_time || '00:00:00';
                                let m_covidshow = 0;
                                let from_date_covid = '';
                                let to_date_covid = '';
                                switch (getCovidsetting?.selected_frequency) {
                                    case 0: 
                                        from_date_covid = `${covidcurrent_date} ${frequency_time}`;
                                        to_date_covid = `${covidcurrent_date} 23:59:59`;
                                        break;
                                    case 1: 
                                        from_date_covid = `${formattedWeekStartDate} ${frequency_time}`;
                                        to_date_covid = `${formattedWeekEndDate} ${frequency_time}`;
                                        break;
                                    case 2: 
                                        from_date_covid = `${month_start_date} 00:00:00`;
                                        to_date_covid = `${month_end_date} 23:59:59`;
                                        break;
                                    case 3: 
                                        from_date_covid = `${year_start_date} 00:00:00`;
                                        to_date_covid = `${year_end_date} 23:59:59`;
                                        break;
                                    case 4: 
                                        from_date_covid = to_date_covid = '1';
                                        m_covidshow = 1;
                                        break;
                                    default:
                                        from_date_covid = to_date_covid = '';
                                        break;
                                }
                                if (from_date_covid && to_date_covid && m_covidshow == 0) {
                                    if (moment(covidcurrent_datetime).isBetween(moment(from_date_covid), moment(to_date_covid), null, '[]')) {
                                        m_covidshow = 1;
                                    }
                                }
                                if (m_covidshow == 1) {
                                    let datecon = getCovidsetting['Coviduseranswers']?.filter(answer => {
                                        const isValidOrg = answer.org_id == user.org_id;
                                        const isValidUser = answer.user_id == user.id;
                                        const isValidStatus = answer.status == 1;
                                        if (getCovidsetting?.selected_frequency != 4) {
                                            const createdDateUTC = moment(answer.created).tz(userTimeZone);
                                            const fromDate = moment(from_date_covid).tz(userTimeZone);
                                            const toDate = moment(to_date_covid).tz(userTimeZone);
                                            return isValidOrg && isValidUser && isValidStatus && (createdDateUTC.isBetween(fromDate, toDate, null, '[]'));
                                        }
                                        return isValidOrg && isValidUser && isValidStatus;
                                    });
                                    if (getCovidsetting?.selected_frequency == 4) {
                                        covid_show = datecon.length < getCovidsetting?.show_login_time ? 1 : 0;
                                    } else {
                                        covid_show = datecon.length ? 0 : 1;
                                    }
                                }
                            }
                            if (covid_show == 1) {
                                if (getCovidsetting?.status == 1 || getCovidsetting?.symptom_traker_setting == 1) {
                                    if(keyName == 'covidVaccinePopup'){
                                        let Covidsettings = await this.covidSettingsService.surveyPopupData(
                                            ['Covidsettings', 'Covidquestions.title', 'CovidAnswer.title', 'Covidquestions.id', 'CovidAnswer.id',
                                            'Covidvaccinationtyp.id', 'Covidvaccinationtyp.title'],
                                            `Covidsettings.org_id = ${user.org_id}`,user.org_id)
                                        if(Covidsettings){
                                            let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}/dynamic.json`);
                                            if(!translationMessage){
                                                translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}/dynamic.json`);
                                            }
                                            if(Covidsettings.title){
                                                Covidsettings.title = translationMessage.find((ele)=> ele.type == `covidsetting_popup_title_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? Covidsettings.title;
                                            }
                                            if(Covidsettings.description){
                                                Covidsettings.description = translationMessage.find((ele)=> ele.type == `covidsetting_popup_description_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? Covidsettings.description;
                                            }
                                            if(Covidsettings.additional_note){
                                                Covidsettings.additional_note = translationMessage.find((ele)=> ele.type == `covidsetting_popup_note_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? Covidsettings.additional_note;
                                            }
                                            if(Covidsettings.no_need_checkup_text){
                                                Covidsettings.no_need_checkup_text = translationMessage.find((ele)=> ele.type == `no_need_checkup_text_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? Covidsettings.no_need_checkup_text;
                                            }
                                            if(Covidsettings.no_need_checkup_desc){
                                                Covidsettings.no_need_checkup_desc = translationMessage.find((ele)=> ele.type == `no_need_checkup_desc_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? Covidsettings.no_need_checkup_desc;
                                            }
                                            if(Covidsettings.need_checkup_text){
                                                Covidsettings.need_checkup_text = translationMessage.find((ele)=> ele.type == `need_checkup_text_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? Covidsettings.need_checkup_text;
                                            }
                                            if(Covidsettings.need_checkup_desc){
                                                Covidsettings.need_checkup_desc = translationMessage.find((ele)=> ele.type == `need_checkup_desc_${ele['org_id']}_${ele['id']}`)?.['translate'] ?? Covidsettings.need_checkup_desc;
                                            }
                                        }
                                        let title, description,covidOtherQuestion, additional_note, need_checkup_text, need_checkup_desc, no_need_checkup_text, no_need_checkup_desc, covid_image, covid_questions, vaccin,covid_vaccin_question,symptom_traker_question;
                                        if (recordDetails['companysetting']?.covid_menu == 1 && Covidsettings) {
                                            covid_vaccin_question =  getCovidsetting?.status == 1 ? 1 : 0
                                            symptom_traker_question = getCovidsetting?.symptom_traker_setting == 1 ? 1 : 0
                                            title = Covidsettings?.['title'];
                                            description = Covidsettings['description'];
                                            additional_note = Covidsettings['additional_note'];
                                            need_checkup_text = Covidsettings['need_checkup_text'];
                                            need_checkup_desc = Covidsettings['need_checkup_desc'];
                                            no_need_checkup_text = Covidsettings['no_need_checkup_text'];
                                            no_need_checkup_desc = Covidsettings['no_need_checkup_desc'];
                                            covid_image = `${S3_URL}${Covidsettings['popup_header_image']}`
                                        }
                                        if(getCovidsetting?.status == 1){
                                            if(Covidsettings['status'] ==1){
                                                covidOtherQuestion= await this.commonHealthService.covidOtherQuestion(Covidsettings);
                                            }
                                        }
                                        if(symptom_traker_question == 1) {
                                            covid_questions = await Promise.all(
                                                Covidsettings['Covidquestions']?.map(async question => {
                                                    // Translate question title
                                                    let questionTitle = question?.title;
                                                    if(questionTitle) {
                                                        let customName = await this.translatorService.frontendReadTranslation(
                                                            req.lang,
                                                            `covidquestion_title_${question?.id}`,
                                                            `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}dynamic`
                                                        );
                                                        if (customName != `covidquestion_title_${question?.id}`) {
                                                            questionTitle = customName;
                                                        }
                                                    }

                                                    // Translate answers
                                                    const translatedAnswers = await Promise.all(
                                                        question.CovidAnswer?.map(async answer => {
                                                            let answerTitle = answer?.title;
                                                            if(answerTitle) {
                                                                let customName = await this.translatorService.frontendReadTranslation(
                                                                    req.lang,
                                                                    `covidanswer_${question?.id}_${answer?.id}`,
                                                                    `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}dynamic`
                                                                );
                                                                if (customName != `covidanswer_${question?.id}_${answer?.id}`) {
                                                                    answerTitle = customName;
                                                                }
                                                            }

                                                            return {
                                                                name: answerTitle,
                                                                value: answer?.id
                                                            };
                                                        }) || []
                                                    );

                                                    return {
                                                        question: questionTitle,
                                                        value: question?.id,
                                                        answers: translatedAnswers.sort((a, b) => a.value - b.value)
                                                    };
                                                }) || []
                                            );

                                            covid_questions = covid_questions.sort((a, b) => a.value - b.value);
                                        }
                                        let data={
                                            covid_vaccin_question,symptom_traker_question,title, description, additional_note, need_checkup_text, need_checkup_desc,
                                            no_need_checkup_text, no_need_checkup_desc, covid_image, vaccin,covidOtherQuestion,covid_questions
                                        }
                                        result['popup_name'] = 'covidVaccinePopup'
                                        result['details']=data
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if(keyName == 'Questionnaireuser'){
                        let Questionnaireuser=0
                        let Questionnairesetting = await this.questionnaireSettingsService.findOne({org_id : user.org_id,status : 1})
                        let questionnaireUserData = await this.questionnaireUsersService.findOneUser({org_id : user.org_id,user_id:user.id,status:1})
                        let showQuestionnairesetting = false;
                        if (Questionnairesetting) {
                            if ((recordDetails.is_camp_eligible == 1 && Questionnairesetting['eligibility'] == 1) || (recordDetails.is_camp_eligible == 0 && Questionnairesetting['eligibility'] == 2)) {
                                showQuestionnairesetting = true;
                            }
                            if ((user.role_id == 2 && recordDetails.is_camp_eligible == 1 && Questionnairesetting['eligibility'] == 3) || (user.role_id == 2 && recordDetails.is_camp_eligible == 0 && Questionnairesetting['eligibility'] == 4)) {
                                showQuestionnairesetting = true;
                            }
                            if ((user.role_id == 16 && recordDetails.is_camp_eligible == 1 && Questionnairesetting['eligibility'] == 5) || (user.role_id == 16 && recordDetails.is_camp_eligible == 0 && Questionnairesetting['eligibility'] == 6)) {
                                showQuestionnairesetting = true;
                            }
                            if (Questionnairesetting['eligibility'] == 0 || showQuestionnairesetting) {
                                Questionnaireuser = (questionnaireUserData != null && typeof (questionnaireUserData) == 'object') ? 0 : 1;
                            }
                        }
                        if(Questionnaireuser==1){
                            let Questionnaire_title;
                            let Questionnaire_text,company_logo;
                            if (Questionnairesetting) {
                                if (Questionnairesetting['eligibility'] == 0 || showQuestionnairesetting) {
                                    company_logo=`${S3_URL}companylogos/${recordDetails?.['company'].id}/${recordDetails?.['company'].company_logo}`;
                                    if(Questionnairesetting?.title){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${Questionnairesetting.org_id}`, `/LC_MESSAGES/Common/QuestionnairePopup/${Questionnairesetting['org_id']}`,`dynamic`);
                                        Questionnairesetting.title = (customName == '' || customName == `title_${Questionnairesetting.org_id}`) ? Questionnairesetting['title'] : customName;
                                    }
                                    if(Questionnairesetting?.header_text){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`header_text_${Questionnairesetting.org_id}`, `/LC_MESSAGES/Common/QuestionnairePopup/${Questionnairesetting['org_id']}`,`dynamic`);
                                        Questionnairesetting.header_text = (customName == '' || customName == `header_text_${Questionnairesetting.org_id}`) ? Questionnairesetting['header_text'] : customName;
                                    }
                                    Questionnaire_title = Questionnairesetting?.title;
                                    Questionnaire_text = Questionnairesetting.header_text;
                                }
                            }
                            let data ={
                                Questionnaire_title: Questionnaire_title,
                                Questionnaire_text: Questionnaire_text,
                            }
                            if(Questionnairesetting?.is_logo){
                                data['company_logo'] = company_logo;
                            }
                            result['popup_name'] = 'Questionnaireuser'
                            result['details']=data
                            break;
                        }
                    }
                    if(keyName == 'information_popup'){
                        let userSetting = await this.userSettingsService.findOne({user_id:user.id})
                        let userTimeZone = 'UTC';
                        if (user.timezone) {
                            userTimeZone = user.timezone
                        }
                        let infocurrent_date = moment().tz(userTimeZone);
                        let infocurrentdate = infocurrent_date.format('YYYY-MM-DD HH:mm:ss');
                        let biweekcurrentdate = infocurrent_date.format('YYYY-MM-DD');
                        let information_popup_logo =0
                        let info_pop_status = 0
                        let info_pop_status_table = 1
                            info_pop_status_table = userSetting.info_popup_status
                        if (info_pop_status_table == 0) {
                            let inpo_pop_data = recordDetails
                            if (inpo_pop_data && inpo_pop_data['companysetting'].enable_popup == 1) {
                                if (inpo_pop_data['companysetting'].enable_logo == 1) {
                                    information_popup_logo = 1
                                }
                                let start_date = moment(inpo_pop_data['companysetting'].start_date).startOf('day'); 
                                let end_date = moment(inpo_pop_data['companysetting'].end_date).endOf('day'); 
                                let currentdate = moment(infocurrent_date).valueOf();
                                if (currentdate >= start_date.valueOf() && currentdate <= end_date.valueOf()){
                                    if (inpo_pop_data['companysetting'].frequency_type == 0) {
                                        let day_array = inpo_pop_data['company']['meta'].selectedweeks ? inpo_pop_data['company']['meta'].selectedweeks.split(',') : [];
                                        let datePeriodData = [];
                                        let tempbioevent = {};
                                        for (let d = moment(start_date); d.isSameOrBefore(end_date); d.add(1, 'days')) {
                                            let dayOfWeek = d.day(); 
                                            if (day_array.includes(dayOfWeek.toString())) {
                                                if (!tempbioevent[dayOfWeek] || tempbioevent[dayOfWeek] == 1) {
                                                    datePeriodData.push(d.format('YYYY-MM-DD')); 
                                                    tempbioevent[dayOfWeek] = 0;
                                                } else {
                                                    tempbioevent[dayOfWeek] = 1;
                                                }
                                            }
                                        }
                                        info_pop_status = datePeriodData.includes(biweekcurrentdate) ? 1 : 0;
                                    } else if (inpo_pop_data['companysetting'].frequency_type == 1) {
                                        let day_array = inpo_pop_data['company']['meta'].selectedweeks ? inpo_pop_data['company']['meta'].selectedweeks.split(',') : [];
                                        let current_day_number = moment(infocurrent_date).isoWeekday(); 
                                        info_pop_status = day_array.includes(current_day_number.toString()) ? 1 : 0;
                                    } else if (inpo_pop_data['companysetting'].frequency_type == 2) {
                                        let month_array = inpo_pop_data['company']['meta'].selectedmonths ? inpo_pop_data['company']['meta'].selectedmonths.split(',') : [];
                                        let current_month_number = moment(infocurrent_date).format('M'); 
                                        info_pop_status = month_array.includes(current_month_number.toString()) ? 1 : 0;
                                    }
                                } else {
                                    info_pop_status = 0;
                                }
                            } else {
                                info_pop_status = 0;
                            }
                        }
                        if(recordDetails['company']?.meta?.title){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `inpo_pop_title_${recordDetails['company']?.meta['org_id']}_${recordDetails['company']?.meta['id']}`, `/LC_MESSAGES/Common/InformationPopup/${req.tokenUser?.org_id}`,`dynamic`);
                            if (customName != `inpo_pop_title_${recordDetails['company']?.meta['org_id']}_${recordDetails['company']?.meta['id']}`) {
                                recordDetails['company'].meta.title = customName;
                            }
                        }
                        if(recordDetails['company']?.meta?.setting_dic){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `inpo_setting_dic_${recordDetails['company']?.meta['org_id']}_${recordDetails['company']?.meta['id']}`, `/LC_MESSAGES/Common/InformationPopup/${req.tokenUser?.org_id}`,`dynamic`);
                            if (customName != `inpo_setting_dic_${recordDetails['company']?.meta['org_id']}_${recordDetails['company']?.meta['id']}`) {
                                recordDetails['company'].meta.setting_dic = customName;
                            }
                        }
                        if(info_pop_status == 1 && information_popup_logo == 0){
                            let informationPopup={
                                title: recordDetails['company']?.meta?.title,
                                text: recordDetails['company']?.meta?.setting_dic,
                            }
                            result['popup_name'] = 'information_popup'
                            result['details']=informationPopup
                            break;
                        }
                        if(info_pop_status == 1 && information_popup_logo == 1){
                            let informationPopup={
                                title: recordDetails['company']?.meta?.title,
                                text: recordDetails['company']?.meta?.setting_dic,
                                logo: `${S3_URL}${recordDetails['companysetting']?.logo_image}`,
                            }
                            result['popup_name'] = 'information_popup'
                            result['details']=informationPopup
                            break;
                        }
                    }
                    if(keyName == 'health_popup' && user.company.setting.health_form_popup == 1){
                        let instr_arr = await this.formInstructionsService.findOne({ company_id: user.org_id, status: Not(5) });
                        let hc_userformData = await this.userFormsService.listRecord(
                            ['userform.id','userform.form_id','userform.popup_status','userform.status','userform.decline_reason','userform.org_id'],
                            {
                                org_id:user.org_id,
                                user_id:user.id,
                                status:In([2,3]),
                                popup_status:0
                            }
                        )
                        let health_popup= 0
                        let hc_submitform_data
                        if (hc_userformData && hc_userformData.length) { // && decline_user_form == 0
                            let hc_userform = hc_userformData?.sort((a, b) => b['id'] - a['id'])[0];
                            hc_submitform_data = hc_userform
                            if (hc_userform && hc_userform.popup_status == 0) {
                                if (hc_userform.status == 2) {
                                    health_popup = 1;
                                }
                                if (hc_userform.status == 3) {
                                    health_popup = 2;
                                }
                            }
                            else {
                                health_popup = 0;
                            }
                        }
                        if(health_popup !=0){
                            let form_id = hc_submitform_data.form_id 
                            let form_list = appConstant.HEALTH_FORM_DEFAULT_DATA;
                            if (instr_arr && instr_arr.program_custom_name) {
                                let org_form_list = JSON.parse(instr_arr.program_custom_name);
                                const updatedFormList = Object.keys(form_list).reduce((acc, key) => {
                                    acc[key] = org_form_list[key] || form_list[key];
                                    return acc;
                                }, {});
                                form_list = { ...form_list, ...updatedFormList };
                            }
                            let form_name = form_list[form_id] || 'Unknown';
                            if (form_id) {
                                const translationKey = `custo_customeLabel_${form_id - 1}_${hc_submitform_data.org_id}`;
                                const translatedFormName = await this.translatorService.frontendReadTranslation(
                                    req.lang,
                                    translationKey,
                                    `/LC_MESSAGES/HealthForms/SubmitForm/${hc_submitform_data.org_id}`,
                                    "dynamic"
                                );
                                if (translatedFormName && translatedFormName !== translationKey) {
                                    form_name = translatedFormName;
                                } else {
                                    form_name = await this.translatorService.frontendReadTranslation(req.lang, form_name,'/LC_MESSAGES/HealthForms/SubmitForm','static');
                                }
                            }
                            let msg ;
                            if(health_popup == 1){
                                msg = `${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} ${form_name} ${await this.translatorService.frontendReadTranslation(req.lang,'submission has been approved', `/LC_MESSAGES/Common/Common`,`static`)}`;
                            }else{
                                msg = `${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} ${form_name} ${await this.translatorService.frontendReadTranslation(req.lang,'submission has been declined', `/LC_MESSAGES/Common/Common`,`static`)}`;
                            }
                            result['popup_name'] = 'health_popup'
                            if(hc_submitform_data && hc_submitform_data.decline_reason){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`decline_reason_${hc_submitform_data.id}`, `/LC_MESSAGES/HealthForms/SubmittedForms/${hc_submitform_data.org_id}/${hc_submitform_data.form_id}/${hc_submitform_data.user_id}`,`dynamic`);
                                if (!customName.includes('decline_reason_')) {
                                    hc_submitform_data.decline_reason = customName;
                                }
                            }
                            result['details'] = {status:health_popup,title:msg,decline_reason:hc_submitform_data?.decline_reason}
                            break;
                        }
                    }
                    if(keyName == 'activity_popup' && user.company.setting.health_form_popup == 1){
                        let ac_userformData = await this.acsubmitFormsService.listRecord(
                            ['sf.id','sf.form_id','sf.decline_reason','sf.popup_status','sf.status'],
                            {
                                org_id:user.org_id,
                                user_id:user.id,
                                status:In([2,1]),
                                popup_status:0
                            }
                        )
                        let activity_popup = 0
                        let ac_submitform_data
                        if ( ac_userformData && ac_userformData.length) {
                            let ac_submitform = ac_userformData?.sort((a, b) => b['id'] - a['id'])[0];
                            ac_submitform_data = ac_submitform
                            if (ac_submitform && ac_submitform.popup_status == 0) {
                                if (ac_submitform.status == 1) {
                                    activity_popup = 1;
                                }
                                if (ac_submitform.status == 2) {
                                    activity_popup = 2;
                                }
                            }
                            else {
                                activity_popup = 0;
                            }
                        }
                        if(activity_popup != 0 ){
                            let ac_userformData = await this.createFormsService.findOne(
                                `cf.id = ${ac_submitform_data.form_id} AND cf.status = 1 AND cf.org_id = ${user.org_id} AND cf.deleted = 0`
                            );
                            if(ac_userformData){
                                if(ac_userformData && ac_userformData?.title){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ac_userformData.id}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${user.org_id}/${ac_userformData.id}`,`dynamic`);
                                    if (!customName.includes('title_')) {
                                        ac_userformData.title = customName;
                                    }
                                }
                                if(ac_userformData && ac_userformData.description){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`description_${ac_userformData.id}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${user.org_id}/${ac_userformData.id}`,`dynamic`);
                                    if (!customName.includes('description_')) {
                                        ac_userformData.description = customName;
                                    }
                                }
                                let msg = 'Unknown';
                                if(ac_userformData && ac_userformData?.title){
                                    if(activity_popup == 1){
                                        msg = `${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} ${ac_userformData?.title} ${await this.translatorService.frontendReadTranslation(req.lang,'submission has been approved', `/LC_MESSAGES/Common/Common`,`static`)}`;
                                    }else{
                                        msg = `${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} ${ac_userformData?.title} ${await this.translatorService.frontendReadTranslation(req.lang,'submission has been declined', `/LC_MESSAGES/Common/Common`,`static`)}`;
                                    }
                                }
                                result['popup_name'] = 'activity_popup'
                                if(ac_submitform_data && ac_submitform_data.decline_reason){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`decline_reason_${ac_submitform_data.id}`, `/LC_MESSAGES/ActivityForms/SubmittedForms/${ac_submitform_data.org_id}/${ac_submitform_data.form_id}/${ac_submitform_data.user_id}`,`dynamic`);
                                    if (!customName.includes('decline_reason_')) {
                                        ac_submitform_data.decline_reason = customName;
                                    }
                                }
                                result['details'] = {activity_popup:activity_popup,title:msg,decline_reason:ac_submitform_data.decline_reason}
                                break;
                            }
                        }
                    }
                    if(keyName == 'reimbursement_form' && user.company.setting.health_form_popup == 1){
                        let re_userformData = await this.submitFormsService.listRecord(
                            ['sf.id','sf.form_id','sf.decline_reason','sf.popup_status','sf.status'],
                            {
                                org_id:user.org_id,
                                user_id:user.id,
                                status:In([2,1]),
                                popup_status:0
                            }
                        )
                        let activity_popup = 0
                        let rc_submitform_data
                        if ( re_userformData && re_userformData.length) {
                            let ac_submitform = re_userformData?.sort((a, b) => b['id'] - a['id'])[0];
                            rc_submitform_data = ac_submitform
                            if (ac_submitform && ac_submitform.popup_status == 0) {
                                if (ac_submitform.status == 1) {
                                    activity_popup = 1;
                                }
                                if (ac_submitform.status == 2) {
                                    activity_popup = 2;
                                }
                            }
                            else {
                                activity_popup = 0;
                            }
                        }
                        if(activity_popup != 0 ){
                            let ac_userformData = await this.rbcreateFormsService.findOne(
                                `cf.id = ${rc_submitform_data.form_id} AND cf.status = 1 AND cf.org_id = ${user.org_id} AND cf.deleted = 0`
                            )
                            if(ac_userformData){
                                if(ac_userformData && ac_userformData?.title){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ac_userformData.id}`, `/LC_MESSAGES/Reimbursements/SubmitForm/${user.org_id}/${ac_userformData.id}`,`dynamic`);
                                    if (!customName.includes('title_')) {
                                        ac_userformData.title = customName;
                                    }
                                }
                                if(ac_userformData && ac_userformData.description){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`description_${ac_userformData.id}`, `/LC_MESSAGES/Reimbursements/SubmitForm/${user.org_id}/${ac_userformData.id}`,`dynamic`);
                                    if (!customName.includes('description_')) {
                                        ac_userformData.description = customName;
                                    }
                                }
                                let msg = 'Unknown';
                                if(activity_popup == 1){
                                    msg = `${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} ${ac_userformData?.title} ${await this.translatorService.frontendReadTranslation(req.lang,'submission has been approved', `/LC_MESSAGES/Common/Common`,`static`)}`;
                                }else{
                                    msg = `${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} ${ac_userformData?.title} ${await this.translatorService.frontendReadTranslation(req.lang,'submission has been declined', `/LC_MESSAGES/Common/Common`,`static`)}`;
                                }
                                result['popup_name'] = 'reimbursement_form'
                                if(rc_submitform_data && rc_submitform_data.decline_reason){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`decline_reason_${rc_submitform_data.id}`, `/LC_MESSAGES/Reimbursements/SubmittedForms/${rc_submitform_data.org_id}/${rc_submitform_data.form_id}/${rc_submitform_data.user_id}`,`dynamic`);
                                    if (!customName.includes('decline_reason_')) {
                                        rc_submitform_data.decline_reason = customName;
                                    }
                                }
                                result['details'] = {activity_popup:activity_popup,title:msg,decline_reason:rc_submitform_data.decline_reason}
                                break;
                            }
                        } 
                    }
                    if(keyName == 'TokenReceivedPopup'){
                        let userSetting = await this.userSettingsService.findOne({user_id:user.id})
                        let TokenReceivedPopup = 0
                        let challengeId:any = '';
                        let receivedData = [];
                        const receivetokens = userSetting?.receivetokens;
                        if(receivetokens != null && receivetokens != undefined && receivetokens != ''){
                            receivedData = JSON.parse(receivetokens);
                            if (Array.isArray(receivedData)) {
                                if (receivedData?.length > 0) {
                                    const firstItem = receivedData.shift();
                                    TokenReceivedPopup = firstItem?.number_of_tokens || 0;
                                    challengeId = firstItem?.challenge_id;
                                }
                            }else{
                                TokenReceivedPopup = receivedData;
                            }
                        }
                        if(receivedData){
                            if(receivedData.length > 0){
                                await this.userSettingsService.update({user_id: user.id},{receivetokens: JSON.stringify(receivedData)});
                            }else{
                                await this.userSettingsService.update({user_id: user.id},{receivetokens: null});
                            }
                        }
                        if(TokenReceivedPopup != 0){
                            result['popup_name'] = 'TokenReceivedPopup';
                            result['challenge_id'] = challengeId;
                            result['userJoinStatus'] = 0;
                            result['nextPopup'] = 0;
                            if(receivedData && receivedData.length > 0){
                                result['nextPopup'] = 1;
                            }
                            if (challengeId) {
                                const challenge = await this.scheduleChallengeService.findOne({ id: challengeId, status: 1 });
                                if (challenge) {
                                    let userJoinData = await this.scheduleChallengeJoinUsersService.checkUserJoinChallenge(`scj.user_id = ${user.id} AND scj.schedule_id = ${challengeId} AND scj.status = 1`);
                                    if(userJoinData){
                                        result['userJoinStatus'] = 1;
                                    }
                                }
                            }
                            result['details'] = {TokenReceived:TokenReceivedPopup,details:`Congrats! You have earned ${TokenReceivedPopup} token${TokenReceivedPopup > 1 ? 's' : ''}`}
                            break;
                        }
                    }
                    if(keyName == 'loginpointsleaderboardpopup'){
                        let loginpointsleaderboardpopup =0
                        let userSetting = await this.userSettingsService.findOne({user_id:user.id})
                        if (recordDetails['companysetting'].pointsleaderboardpopup == 1 && userSetting.is_pointsleaderboardpopup == 0) {
                            loginpointsleaderboardpopup = 1;
                        }
                        if(loginpointsleaderboardpopup != 0){
                            /*let  desc = `Would you like to be included in the company-wide points leaderboard rankings? This means that all participants will be able to see your current points and your position relative to the entire company.`*/
                            let  desc = await this.translatorService.frontendReadTranslation(req.lang,`company-wide points leaderboard rankings`, `/LC_MESSAGES/Common/PointLeaderboardPopup`,`static`)
                            if(user.org_id==841 ||user.org_id==1029 ||user.org_id==1096){
                                desc = `<div style="text-align:left;"><p style="text-align:center;">New for 2024!</p> <p>In addition to the opportunity to earn up to $200 for you and $200 for your enrolled spouse in your Wellness HRA, you will also have the chance to compete with your fellow wellness members for highest points earned for the plan year.&nbsp; The top five individual point earners will receive a $25 Visa Gift card at the end of the 2024 Take a Healthy Step with Ward campaign.</p> <p>In order to participate in this opportunity, you must agree to have your name and total points displayed on the leaderboard.&nbsp; Click &quot;Yes&quot; below to agree or click &quot;No&quot; to opt out.</p></div>`
                            }
                            result['popup_name'] = 'loginpointsleaderboardpopup'
                            result['details'] = {status:loginpointsleaderboardpopup,desc:desc}
                            break;
                        }
                    }
                    if(keyName == 'challengeMoveMore'){
                        let org_id = req.tokenUser?.org_id;
                        let user_id = req.tokenUser?.id;
                        let timezone = req.tokenUser?.timezone;   
                        let where =  `company.id = ${org_id} AND scj.user_id = ${user_id} AND scj.status = 1 AND sc.status = 1 AND ch.bio_challenge_type = 'Move_more'`;
                        let resultedData = await this.scheduleChallengeJoinUsersService.getSingleChallenge(where);
                        let moveMorePopupData = {};
                        if(resultedData){
                            let ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
                            let ucurrentdateonly = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD') + ' 00:00:00';
                            if (timezone?.trim() != "") {
                                ucurrentdate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',timezone);
                                ucurrentdateonly = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD','',timezone) + ' 00:00:00';
                            }
                            const schedule = resultedData;
                            let startdate:any = await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'timestamp');
                            let enddate:any = await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'timestamp');
                            let startdateOrg:any = await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'YYYY-MM-DD');
                            let enddateOrg:any = await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'YYYY-MM-DD');
                            let userJoinDate:any = await this.commonDateService.DateTimeFormat(schedule['added_date'], 'YYYY-MM-DD');
                            let now:any = await this.commonDateService.DateTimeFormat(ucurrentdate, 'timestamp');
                            if (now >= enddate) {
                                now = enddate;
                            }
                            let totaldays = Math.floor((enddate - startdate) / (60 * 60 * 24)) + 1;
                            let uptodays = Math.floor((now - startdate) / (60 * 60 * 24)) + 1;
                            if (uptodays == 0) {
                                uptodays = 1;
                            }
                            let countstepswith = schedule['sc']['countstepswith'];
                            let logType = " AND food.logType in('Tracker','Manual')";
                            if (countstepswith == 'realstep') {
                                logType = " AND food.logType = 'Tracker'";
                            }
                            let whereStep = `schedule_id = ${schedule['sc']['id']} AND DATE_FORMAT(start_date,'%Y-%m-%d') <= '${userJoinDate}' AND DATE_FORMAT(end_date,'%Y-%m-%d') >= '${userJoinDate}' AND status = 1 AND f_suggestion = 0`;
                            let weeksftepstemp =  await this.weeksStepsService.getWeekStartDates(whereStep);
                            let is_set_weekend = schedule['sc']['is_set_weekend'];
                            if(is_set_weekend == 1){
                                logType += " AND WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5";
                                const startDay:any = this.commonDateService.DateTimeFormat(schedule['sc']['start_date']);
                                let dayOfWeek = startDay.day();
                                if (dayOfWeek > 0 && dayOfWeek <= 5) {
                                    schedule['sc']['start_date'] = startDay.format('YYYY-MM-DD');
                                } else {
                                    schedule['sc']['start_date'] = startDay.day(8).format('YYYY-MM-DD'); // 8 will always get us to the next Monday
                                }
                                const endDate:any = this.commonDateService.DateTimeFormat(schedule['sc']['end_date']);
                                dayOfWeek = endDate.day();
                                if (dayOfWeek > 0 && dayOfWeek <= 5) {
                                    schedule['sc']['end_date'] = endDate.format('YYYY-MM-DD');
                                } else {
                                    const daysSinceLastFriday = (dayOfWeek + 2) % 7;
                                    schedule['sc']['end_date'] = endDate.subtract(daysSinceLastFriday, 'days').startOf('day').format('YYYY-MM-DD');
                                }

                                startdate = await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'timestamp');
                                enddate = await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'timestamp');
                                startdateOrg = await this.commonDateService.DateTimeFormat(schedule['sc']['start_date'], 'YYYY-MM-DD');
                                enddateOrg = await this.commonDateService.DateTimeFormat(schedule['sc']['end_date'], 'YYYY-MM-DD');
                            }
                            let allUserStepsData = [];
                            let AllUserStepsdataDatewise = new Map();
                            let currentDateUsers = this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
                            let whereAll = `food.user_id in (${user_id}) AND food.collectionDate BETWEEN '${startdateOrg}' AND '${enddateOrg}' ${logType}`;
                            whereAll += " AND food.collectionDate BETWEEN '" + startdateOrg + "' AND '" + currentDateUsers + "'";
                            if(weeksftepstemp){
                                let userChallengeStartDate = await this.commonDateService.DateTimeFormat(weeksftepstemp['start_date'], 'YYYY-MM-DD');
                                whereAll += ` AND food.collectionDate BETWEEN '${userChallengeStartDate}' AND '${currentDateUsers}'`;
                            }
                            allUserStepsData = await this.activityFeedsService.getUserActivityData(whereAll, ['SUM(food.steps) as steps', 'food.user_id as user_id','food.collectionDate as collectionDate'], 'food.user_id, food.collectionDate');
                            if(allUserStepsData){
                                AllUserStepsdataDatewise = allUserStepsData.reduce((acc, item) => {
                                    const userIds = Number(item.user_id);
                                    const collectionDate = moment(item.collectionDate).format('YYYY-MM-DD');
                                    const steps = parseInt(item.steps, 10);
                                    if (!acc.has(userIds)) {
                                        acc.set(userIds, new Map());
                                    }
                                    acc.get(userIds).set(collectionDate, steps);
                                    return acc;
                                }, new Map());
                            }

                            let weeksfteps =  await this.weeksStepsService.listRecord({schedule_id: schedule['sc']['id'], status: 1, f_suggestion : 0}, { id: 'ASC' }, ['week_no', 'move_more_goal', 'move_more_goal_type']);
                            let numberofsteps = schedule['sc']['numberofsteps'];
                            const weekparkDetailtemp = await this.scheduleChallengeJoinUsersService.getWeekDetail(req, user_id, weeksfteps, AllUserStepsdataDatewise, schedule['sc']['start_date'], schedule['sc']['end_date'], schedule['sc']['tr_goaltype'], schedule['sc']['rank_type'], is_set_weekend, totaldays, numberofsteps, schedule['added_date'], timezone);
                            let weekparkDetail:any = {};
                            if(weekparkDetailtemp?.['weeksarray'] && Object.keys(weekparkDetailtemp?.['weeksarray']).length > 0){
                                weekparkDetail = await this.scheduleChallengeJoinUsersService.getPopupWeekdetail(req, weekparkDetailtemp?.['weeksarray'], weeksfteps, schedule['sc']['rank_type'], schedule['in_week_complete']);
                            }
                            if(weekparkDetail && Object.keys(weekparkDetail).length > 0){
                                const where = { id: schedule['id']};
                                let sdatasave = {
                                    'in_week_complete': weekparkDetail['id']
                                }
                                await this.scheduleChallengeJoinUsersService.update(where, sdatasave);

                                let customname = '';
                                if (schedule['sc']['custom_cname'] != undefined) {
                                    customname = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${schedule['sc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule['sc']['org_id']}/${schedule['sc']['id']}`,`dynamic`);
                                    if (customname == '' || customname == `custom_cname_${schedule['sc']['id']}`) {
                                        customname = schedule['sc']['custom_cname'];
                                    }
                                    customname = customname && customname != '' ? customname : schedule['sc']['custom_cname'];
                                }
                                
                                if (schedule['sc']['custom_cname']?.trim() == "") {
                                    customname = await this.translatorService.frontendReadTranslation(req.lang,`challenge_name_${schedule['ch']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${schedule['ch']['id']}`,`dynamic`);
                                    if (customname == '' || customname == `challenge_name_${schedule['ch']['id']}`) {
                                        customname = schedule['ch']['challenge_name'];
                                    }
                                    customname = customname && customname != '' ? customname : schedule['sc']['custom_cname'];
                                }
                                weekparkDetail['challengeID'] = schedule['sc']['id'];
                                weekparkDetail['challengeType'] = schedule['ch']['bio_challenge_type'];
                                weekparkDetail['challengeName'] = customname;
                                weekparkDetail['headingLine'] = await this.translatorService.frontendReadTranslation(req.lang,`Congratulations`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`)+ '!';
                                let showContentText = await this.translatorService.frontendReadTranslation(req.lang,`You have completed your`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`)+ ' ' + weekparkDetail['goal'] ;

                                let useSign = ' '+await this.translatorService.frontendReadTranslation(req.lang,`Steps/Movement`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                                if (weekparkDetail['type'] == 0) {
                                    useSign = "%";
                                }

                                showContentText = showContentText + '' + useSign + ' ' + await this.translatorService.frontendReadTranslation(req.lang,`average step goal for the week`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`) + '.';
                                weekparkDetail['content'] = showContentText;
                                weekparkDetail['buttonText'] = await this.translatorService.frontendReadTranslation(req.lang,`See Weekly Steps`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                                let iconimage = "";
                                let icon = schedule['ch']['icon'];
                                let path = "";
                                if (schedule['sc']['custom_logo'] != '') {
                                    iconimage = schedule['sc']['custom_logo'];
                                    path = iconimage?.includes('challenge') && !iconimage?.includes(S3_URL)  ? S3_URL + iconimage : iconimage != '' && !iconimage?.includes(S3_URL) ? this.commonService.getIconPath(iconimage,S3_URL): iconimage
                                    if (!iconimage || (iconimage?.trim() != '' && !await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: iconimage})))) {
                                        iconimage = "walk.png";
                                        path = this.commonService.getIconPath(iconimage,S3_URL);
                                    }
                                } else if (icon?.length > 2) {
                                    iconimage = icon;
                                    path = iconimage?.includes('challenge') && !iconimage?.includes(S3_URL) ? S3_URL + iconimage : iconimage != '' && !iconimage?.includes(S3_URL) ? this.commonService.getIconPath(iconimage,S3_URL): iconimage;
                                    if (!iconimage || (iconimage?.trim() != '' && !await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: iconimage})))) {
                                        iconimage = "walk.png";
                                        path = this.commonService.getIconPath(iconimage,S3_URL);
                                    }
                                } else {
                                    if (icon == '') {
                                        icon = 1;
                                    }
                                    path = this.commonService.getIconPath(icon,S3_URL);
                                }
                                weekparkDetail['image'] = path;
                                moveMorePopupData[schedule['sc']['id']] = weekparkDetail;
                            }
                            if(Object.keys(weekparkDetail).length > 0){
                                result['popup_name'] = 'challengeMoveMore'
                                result['details'] = weekparkDetail;
                            }
                        }
                    }
                }
                if(keyName == 'agreement'){
                    if (user.role_id == 16 && recordDetails['companysetting'].agreement_status == 1) {
                        let spouseAgreement = await this.spouseAgreementService.findOne({org_id:user.org_id,user_id:user.id,status: Not('2')})
                        if(!spouseAgreement){
                            if(recordDetails['company'] && recordDetails['company']?.meta && recordDetails['company']?.meta?.agreement_text){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `agreement_text_${user.org_id}`, `/LC_MESSAGES/Common/SpouseAuthorizedPopup/${req.tokenUser?.org_id}`,`dynamic`);
                                if (customName != `agreement_text_${user.org_id}`) {
                                    recordDetails['company'].meta.agreement_text = customName;
                                }
                            }
                            let spaousAgreement={
                                agreement_text: recordDetails['company']?.meta?.agreement_text,
                                a_popup_title: recordDetails['company']?.meta?.a_popup_title,
                                company_logo : `${S3_URL}companylogos/${recordDetails?.['company']?.id}/${recordDetails?.['company']?.company_logo}`
                            }
                            result['popup_name'] = 'agreement'
                            result['details']=spaousAgreement
                            break;
                        }
                    }
                }
                if(keyName == 'event_remider_popup'){
                    let userBookingList = await this.eventUserBookingListsService.eventData(`userBookingList.ev_user_id = ${user.id} AND userBookingList.organization_id = ${user.org_id} AND userBookingList.status = 1`,
                        null,
                        [ 'userBookingList.ev_user_id','userBookingList.slot_selected','userBookingList.organization_id','userBookingList.ev_events_id','userBookingList.status','userBookingList.reminder_limit','ev_event.reminder','ev_event.event_name','userBookingList.id','ev_slotstimings.slotdate'])
                    if (userBookingList && userBookingList.length !=0) {
                        let event_remider_popup =0
                        userBookingList.map((userBookingList) => {
                            if (userBookingList['ev_event'] && userBookingList['ev_slotstimings']) {
                                let totalDays = 0;
                                let startDay = moment().startOf('day');
                                let endDay = moment(userBookingList['ev_slotstimings'].slotdate, 'YYYY-MM-DD');
                                totalDays = endDay.diff(startDay, 'days');
                                if (userBookingList['ev_event'].reminder.includes(totalDays) &&
                                    totalDays != userBookingList.reminder_limit) {
                                    event_remider_popup = 1
                                }
                                else {
                                    let printNG = 1
                                    let printNGE;
                                    const reminderNumberss = userBookingList['ev_event'].reminder && userBookingList['ev_event'].reminder !='' ? JSON.parse(userBookingList['ev_event'].reminder) : [];
                                    const reminderNumbersMappeds = reminderNumberss?.map(Number);
                                    for (const reminderCount of reminderNumbersMappeds) {
                                        if (reminderCount > totalDays) {
                                            printNGE = reminderCount;
                                            break;
                                        }
                                    }
                                    const reminderNumbers = userBookingList['ev_event'].reminder && userBookingList['ev_event'].reminder !='' ? JSON.parse(userBookingList['ev_event'].reminder) : [];
                                    const reminderNumbersMapped = reminderNumbers?.map(Number);
                                    const minReminder = Math.min(...reminderNumbersMapped);
                                    if (printNG !=1 && printNGE != -1 && minReminder != userBookingList.reminder_limit && printNGE != userBookingList.reminder_limit) {
                                        event_remider_popup = 1
                                    };
                                }
                            }
                        })
                        if(event_remider_popup == 1){
                            let TempaddReminder = [];
                            let TempaddReminderstring = '';
                            let returndataid = '';
                            let returndatalimit = '';
                            if (userBookingList) {
                                for (const booking of userBookingList) {
                                    if (booking['ev_event'] && booking['ev_slotstimings']) {
                                        let startDay = moment().startOf('day');
                                        let endDay = moment(booking['ev_slotstimings'].slotdate, 'YYYY-MM-DD');
                                        let totalDays = endDay.diff(startDay, 'days');
                                        let daysLabel = totalDays < 2 ? 'day' : 'days';
                                        if (booking['ev_event'].event_name) {
                                            let customName = await this.translatorService.frontendReadTranslation(
                                                req.lang,
                                                `event_name_${booking['ev_events_id']}`,
                                                `/LC_MESSAGES/Events/Events/${booking['organization_id'] || 0}/${booking['ev_events_id']}`,
                                                `dynamic`
                                            );
                                            booking['ev_event'].event_name =
                                                customName == '' || customName == `event_name_${booking['ev_event']['id']}`
                                                    ? booking['ev_event']['event_name']
                                                    : customName;
                                        }

                                        const eventDName = booking['ev_event'].event_name;

                                        if (
                                            booking?.['ev_event']?.reminder?.includes(totalDays) &&
                                            totalDays != booking.reminder_limit
                                        ) {
                                            TempaddReminder.push({
                                                id: booking?.id,
                                                reminder_limit: totalDays
                                            });

                                            TempaddReminderstring +=
                                                totalDays >= 1
                                                    ? `<p>${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} <b>${eventDName}</b> ${await this.translatorService.frontendReadTranslation(req.lang,'event is scheduling after', `/LC_MESSAGES/Events/Events`,`static`)} ${totalDays} ${await this.translatorService.frontendReadTranslation(req.lang,`${daysLabel}`, `/LC_MESSAGES/Common/Common`,`static`)}</p>`
                                                    : `<p>${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} <b>${eventDName}</b> ${await this.translatorService.frontendReadTranslation(req.lang,'event is scheduled today', `/LC_MESSAGES/Events/Events`,`static`)}</p>`;
                                        } else {
                                            let printNGE = -1;
                                            const reminderNumberss =
                                                booking['ev_event'].reminder && booking['ev_event'].reminder != ''
                                                    ? JSON.parse(booking['ev_event'].reminder)
                                                    : [];
                                            const reminderNumbersMappeds = reminderNumberss?.map(Number);
                                            for (const reminderCount of reminderNumbersMappeds) {
                                                if (reminderCount > totalDays) {
                                                    printNGE = reminderCount;
                                                    break;
                                                }
                                            }

                                            const reminderNumbers =
                                                booking['ev_event'].reminder && booking['ev_event'].reminder != ''
                                                    ? JSON.parse(booking['ev_event'].reminder)
                                                    : [];
                                            const reminderNumbersMapped = reminderNumbers?.map(Number);
                                            const minReminder = Math.min(...reminderNumbersMapped);

                                            if (
                                                printNGE != -1 &&
                                                minReminder != booking.reminder_limit &&
                                                printNGE != booking.reminder_limit
                                            ) {
                                                TempaddReminder.push({
                                                    id: booking?.id,
                                                    reminder_limit: printNGE
                                                });

                                                TempaddReminderstring +=
                                                    totalDays >= 1
                                                        ? `<p>${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} <b>${eventDName}</b> ${await this.translatorService.frontendReadTranslation(req.lang,'event is scheduling after', `/LC_MESSAGES/Events/Events`,`static`)} ${totalDays} ${await this.translatorService.frontendReadTranslation(req.lang,`${daysLabel}`, `/LC_MESSAGES/Common/Common`,`static`)}</p>`
                                                        : `<p>${await this.translatorService.frontendReadTranslation(req.lang,'Your', `/LC_MESSAGES/Common/Common`,`static`)} <b>${eventDName}</b> ${await this.translatorService.frontendReadTranslation(req.lang,'event is scheduled today', `/LC_MESSAGES/Events/Events`,`static`)}</p>`;
                                            }
                                        }
                                    }
                                }
                            }
                            if(TempaddReminder.length>0){
                                returndatalimit=TempaddReminder[0].reminder_limit
                                returndataid=TempaddReminder[0]?.id
                            }
                            let data ={eventReminderArray: TempaddReminder, eventReminderstring: TempaddReminderstring,Support:`<p>${await this.translatorService.frontendReadTranslation(req.lang,'For further assistance please contact us at', `/LC_MESSAGES/Events/Events`,`static`)} <b>support@zomohealth.com</b> </p>` ,returndataid,returndatalimit}
                            result['popup_name'] = 'event_remider_popup'
                            result['details']=data
                            break;
                        }
                    }
                }
                if(keyName ==  'challengeRelayRace'){
                    let {teams, data} = await this.processRelayRaceData(req);
                    if (teams.length > 0) {
                        if(teams && teams.length>0){
                            recordDetails['relayRaceData'] = data; 
                            /* popup new */
                            let congratulationsText = await this.translatorService.frontendReadTranslation(req.lang,`Congratulations`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let yourTeamText = await this.translatorService.frontendReadTranslation(req.lang,`Your team`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let youHaveBatonText = await this.translatorService.frontendReadTranslation(req.lang,`You have the baton. Please click on`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let startYourTurnText = await this.translatorService.frontendReadTranslation(req.lang,`to start your turn`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let readyText = await this.translatorService.frontendReadTranslation(req.lang,'I Am Ready', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let skipText = await this.translatorService.frontendReadTranslation(req.lang,'Skip My Turn', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let clickText = await this.translatorService.frontendReadTranslation(req.lang,'or click', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let clickOnText = await this.translatorService.frontendReadTranslation(req.lang,'Click on', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let notReadyText = await this.translatorService.frontendReadTranslation(req.lang,'If you close this popup challenge will start', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let joinedText = await this.translatorService.frontendReadTranslation(req.lang,'You have joined the', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let teamGoalCompleteText = await this.translatorService.frontendReadTranslation(req.lang,'Your team goal is to complete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            let backToChallengeText = await this.translatorService.frontendReadTranslation(req.lang,'Back To Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            const userID = user.id;
                            const raceData = data[0];
                            const challengeRelayRace = 1;
                            let relay_race_img = `${S3_URL}challenge/img/big/Relay-Race-Challenge.png`;
                            if (raceData && challengeRelayRace == 1) {
                                const teamData = raceData;
                                const teamMembers = raceData?.team_member || [];
                                const filterBy = (condition) => teamMembers.filter(condition);
                                const combineBy = (condition, key = 'user_id') => Object.fromEntries(filterBy(condition).map(member => [member[key], member]));
                                const currentButton = combineBy(m => m.baton_status == 1 && m.status == 1);
                                const current = filterBy(m => m.baton_status == 1 && m.status == 1);
                                const fallbackButton = combineBy(m => m.baton_status == 2 && m.status == 1);
                                const fallbackCurrent = filterBy(m => m.baton_status == 2 && m.status == 1);
                                const batonMap = Object.keys(currentButton).length ? currentButton : fallbackButton;
                                const activeCurrent = current.length > 0 ? current : fallbackCurrent;
                                const currentJoin = combineBy(m => m.baton_status != 3 && m.status == 1 && (!m.duplicate || m.duplicate == 'no'));
                                const completeRaceUser = combineBy(m => m.baton_status == 3 && m.status == 1);
                                const completeRaceUserOnly = filterBy(m => m.baton_status == 3 && m.status == 1 && (!m.duplicate || m.duplicate == 'no'));
                                const originalTeamMembers = filterBy(m => (!m.duplicate || m.duplicate == 'no'));
                                const completeRaceCount = completeRaceUserOnly.length;
                                const teamMemberCount = originalTeamMembers.length;
                                const totalMember = Object.keys(batonMap).length + completeRaceCount;
                                const arrayCompleteRace = filterBy(m => m.baton_status == 3 && m.status == 1);
                                const arrayTeamMember = teamMembers;
                                const scheduleStartDate = moment(teamData.Schedule_Start_date);
                                const scheduleID = teamData.Schedule_id;
                                let teamName = teamData.team_name;
                                let customName = teamData.challenge_name;
                                const goal = (teamData.race_type == 2) ? teamData.goal : teamData.goal * arrayTeamMember.length;
                                const goalType = teamData?.goal_type;
                                const currentUserName = activeCurrent?.[0]?.user?.name || '';
                                const currentDate = moment();
                                const relayRaceDetail = JSON.parse(teamData.relay_race_detail || '{}');
                                let hide_comment = teams[0]?.['schedule']?.['hide_comment'];
                                let hide_history = teams[0]?.['schedule']?.['hide_history'];
                                const messages = [];
                                let title;
                                let subTitle;
                                let titleText;
                                const addMessage = (type, title, titleText, subTitle = null, button1 = null, button2 = null) => {
                                    if(!button1 && !button2){
                                        button1 = backToChallengeText;
                                    }
                                    messages.push({ type, title, subTitle, titleText, button1, button2 });
                                };

                                if ((!currentJoin[userID] || currentJoin[userID]) && !relayRaceDetail.join && batonMap[userID] && batonMap[userID].baton_status == 1) {
                                    let yourTeamMemberText = await this.translatorService.frontendReadTranslation(req.lang,`Your team member`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    let firstMemberBatonText = await this.translatorService.frontendReadTranslation(req.lang,`is the first member to have the baton`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    let titleText = congratulationsText + ' ' + joinedText + ` ${customName} ` + teamGoalCompleteText + ` ${goal} ${goalType}. ${yourTeamMemberText} ${currentUserName} ${firstMemberBatonText} !`
                                    addMessage('join','Congratulations!',titleText,null,null);
                                }
                                if (batonMap[userID] && batonMap[userID].baton_status == 1 && !relayRaceDetail.accept &&currentDate.isSameOrAfter(scheduleStartDate)) {
                                    let button1;
                                    let button2;
                                    if(teamData.race_type == 3 && hide_comment == 0 && hide_history == 0){
                                        title= youHaveBatonText + ` <b>"`+ readyText + `"</b> ` + startYourTurnText;
                                        if(totalMember != teamMemberCount){
                                            subTitle = clickText + ` <b>"`+ skipText +`"</b> ` + notReadyText;
                                        }
                                    }
                                    else if(teamData.race_type == 3 && (hide_comment == 0 && hide_history == 1)){
                                        title = youHaveBatonText
                                        if(totalMember != teamMemberCount){
                                            subTitle = clickOnText + ` <b>"` + skipText+ `"</b> ` + notReadyText;
                                        }
                                        if(teamData.race_type == 3 && hide_comment == 0 && hide_history == 1){
                                            titleText = await this.translatorService.frontendReadTranslation(req.lang,`If you close this popup challenge will start`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }
                                    }
                                    else if(teamData.race_type == 3 && (hide_comment == 1 && hide_history == 0)){
                                        title = youHaveBatonText +` <b> "` + readyText + `" </b> ` + startYourTurnText;
                                    }
                                    addMessage('accept',title,subTitle,titleText,button1,button2);
                                }
                                if (completeRaceUser[userID] && arrayCompleteRace.length != arrayTeamMember.length && !relayRaceDetail.passbaton) {
                                    let translation = await this.translatorService.frontendReadTranslation(req.lang,`The baton has been passed to`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    titleText = translation + ` (${currentUserName})`;
                                    addMessage('passbaton',customName,titleText);
                                }
                                if (completeRaceUser[userID] && arrayCompleteRace.length == arrayTeamMember.length && !relayRaceDetail.completeteam) {
                                    let translation = await this.translatorService.frontendReadTranslation(req.lang,`has completed the entire challenge`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    titleText = congratulationsText + ` ` + yourTeamText + ` ${teamName} ` + translation +  ` ${customName}!`
                                    addMessage(
                                    'completeteam',
                                    'Congratulations!',
                                    titleText
                                    );
                                }
                                if (Object.keys(batonMap).length > 0 && currentJoin[userID] && activeCurrent.length > 0 && (activeCurrent[0].user_order + 1 == currentJoin[userID].user_order) && currentJoin[userID].baton_status == 0 && !relayRaceDetail.next) {
                                    titleText = await this.translatorService.frontendReadTranslation(req.lang,`You are next in line to receive the Baton. Get ready`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    addMessage('next',`${customName}`,titleText);
                                }
                                
                                if(messages.length){
                                    let message = messages[0];
                                    if(messages.length > 1){
                                        result['again_call_popup_name'] = 'challengeRelayRace';
                                    }   
                                    result['popup_name'] = 'challengeRelayRace';
                                    result['again_call_popup_name'] = 'loginpointsleaderboardpopup';
                                    let object = {
                                        Schedule_id:scheduleID,
                                        customname:customName,
                                        user_id:recordDetails?.id ,
                                        user_name:currentUserName,
                                        team_name:teamName,
                                        img:relay_race_img,
                                        userFormId:scheduleID,
                                    };
                                    if(message.type == 'join'){
                                        object['popup_order'] = 1;
                                        object['pop_status'] = 'join';
                                        object['item_desc'] = message.titleText;
                                    }
                                    if(message.type == 'accept'){
                                        object['popup_order'] = 2;
                                        object['pop_status'] = 'accept';
                                        object['item1'] = 'You now have the baton';
                                        object['item_text'] = message.title;
                                        object['item_text_sub'] = message.subTitle;
                                        object['item_text_sub_text'] = message.titleText;
                                        object['btn_text1'] = message.buttons1;
                                        object['btn_text1'] = message.buttons2;
                                        object['status'] = 'popup';
                                    }
                                    if(message.type == 'passbaton'){
                                        object['popup_order'] = 3;
                                        object['pop_status'] = 'passbaton';
                                        object['item_desc'] = message.titleText;
                                    }
                                    if(message.type == 'completeteam'){
                                        object['popup_order'] = 4;
                                        object['pop_status'] = 'completeteam';
                                        object['item_desc'] = message.titleText;
                                    }
                                    if(message.type == 'next'){
                                        object['popup_order'] = 5;
                                        object['pop_status'] = 'next';
                                        object['item_desc'] = message.titleText;
                                    }
                                    result['details'] = object
                                    break;
                                }
                            }
                            /* popup new */
                        }
                    }
                }
                if(keyName == 'UserServeyPopupShow'){
                    let ServeyPopup = await this.surveyPopupService.surveyPopupStatus([
                        'Surveypopup.status','Surveypopup.show_required','Surveypopup.id','Surveypopup.is_eligibility','Surveypopup.department_string','Surveypopup.location_string','Surveypopup.selectedweekday','Surveypopup.selected_frequency_time','Surveypopup.show_login_time','Surveypopup.selected_frequency','Surveypopup.org_id','Surveyanswer.org_id','Surveyanswer.user_id','Surveyanswer.status','Surveyanswer.created','SurveyAnswers.id','Surveyquestions.id','Surveyquestions.ans_option_type','Surveyquestions.title',
                    ],
                        `Surveypopup.org_id = ${user.org_id} AND Surveypopup.status = 1`,
                        user.org_id,
                        user.id
                    )
                    let SurveyRequired = 0
                    let UserServeyPopupShow = 0
                    if (ServeyPopup && ServeyPopup['status'] == 1) {
                        SurveyRequired = ServeyPopup['show_required'];
                        const surveyPopupData = ServeyPopup;
                        const surveyPopupID = surveyPopupData?.id || '';
                        const surveyIsEligibility = surveyPopupData?.is_eligibility || 0;
                        const surveyUserEligibility = recordDetails.is_camp_eligible;
                        let showEligibility = 0;
                        const shouldKeep =
                            surveyIsEligibility == 0 ||
                            (surveyUserEligibility == 1 && surveyIsEligibility == 1) ||
                            (surveyUserEligibility == 0 && surveyIsEligibility == 2) ||
                            (user?.role_id == 2 && surveyUserEligibility == 1 && surveyIsEligibility == 3) ||
                            (user?.role_id == 2 && surveyUserEligibility == 0 && surveyIsEligibility == 4) ||
                            (user?.role_id == 16 && surveyUserEligibility == 1 && surveyIsEligibility == 5) ||
                            (user?.role_id == 16 && surveyUserEligibility == 0 && surveyIsEligibility == 6);
                        if(shouldKeep){
                            showEligibility = 1;
                        }
                        let toDeptLocStatus = 1;
                        if (surveyPopupData?.department_string) {
                            const departmentIds = JSON.parse(surveyPopupData.department_string).map(Number);
                            const isIncluded = Array.isArray(departmentIds) && recordDetails.department_id != null && !departmentIds.includes(recordDetails.department_id);
                            if (isIncluded) {
                                toDeptLocStatus = 0;
                            }
                        }
                        if (surveyPopupData?.location_string) {
                            const locationIds = JSON.parse(surveyPopupData.location_string).map(Number);
                            const isIncluded =
                                Array.isArray(locationIds) &&
                                recordDetails.location != null &&
                                !locationIds.includes(recordDetails.location);
                            if (isIncluded) {
                                toDeptLocStatus = 0;
                            }
                        }
                        let showSurveyPopup = 0;
                        if (surveyPopupData) {
                            if (surveyPopupData.status == 1) {
                                showSurveyPopup = 1;
                            }
                            const surveyQuestions = Array.isArray(surveyPopupData['Surveyquestions']) ? surveyPopupData['Surveyquestions'] : [];
                            const surveyQuestionsAnswer = surveyQuestions.length > 0 ? surveyQuestions.flatMap((question: any) => question['SurveyAnswers'] || []) : [];
                            if (surveyQuestions.length == 0 || surveyQuestionsAnswer.length == 0) {
                                showSurveyPopup = 0;
                            }
                        }
                        if (surveyPopupData && toDeptLocStatus == 1 && showEligibility == 1 && showSurveyPopup == 1) {
                            const surveyQuestions = surveyPopupData['Surveyanswer'];
                            let userTimeZone = user.timezone || 'UTC';
                            const surveyCurrentDate = moment.tz(userTimeZone).format('YYYY-MM-DD');
                            const surveyCurrentDateTime = moment.tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                            const surveyDate = surveyCurrentDate; 
                            const surveyTs = moment(surveyDate).valueOf(); 
                            const surveyYear = moment(surveyTs).year(); 
                            const surveyMonth = moment(surveyTs).month() + 1; 
                            const today = moment.tz(userTimeZone);
                            const dayOfWeek = today.day(); 
                            const getDayOffset = (day) => {
                                const weekdays = appConstant.WEEKDAYS;
                                return weekdays[day.toLowerCase()] || 0; 
                            };
                            const selectedWeekDay = surveyPopupData?.selectedweekday || 'monday';
                            const selectedWeekDayOffset = getDayOffset(selectedWeekDay);
                            let daysUntilSelectedWeekday = selectedWeekDayOffset - dayOfWeek;
                            if (daysUntilSelectedWeekday < 0) {
                                daysUntilSelectedWeekday += 7;
                            }
                            if (daysUntilSelectedWeekday < 0) {
                                daysUntilSelectedWeekday = 0;
                            }
                            let weekStartDate = today.clone().add(daysUntilSelectedWeekday, 'days');
                            let weekEndDate = weekStartDate.clone().add(7 - selectedWeekDayOffset, 'days');
                            const formattedWeekStartDate = weekStartDate.format('YYYY-MM-DD');
                            const formattedWeekEndDate = weekEndDate.format('YYYY-MM-DD');
                            const monthStartDate = moment(surveyTs).startOf('month').format('YYYY-MM-DD');
                            const lastDayOfCurrentMonth = moment(today).endOf('month').date(); // Get the last day of the month
                            const monthEndDate = moment(surveyTs).endOf('month').format('YYYY-MM-DD');
                            const yearStartDate = moment(surveyTs).startOf('year').format('YYYY-MM-DD');
                            const yearEndDate = moment(surveyTs).endOf('year').format('YYYY-MM-DD');
                            const frequencyTime = surveyPopupData?.selected_frequency_time || '00:00:00';
                            let mSurveyShow = 0;
                            let fromDateSurvey = '';
                            let toDateSurvey = '';
                            if (surveyPopupData?.selected_frequency == 0) {
                                fromDateSurvey = `${surveyCurrentDate} ${frequencyTime}`;
                                toDateSurvey = `${surveyCurrentDate} 23:59:59`;
                                if (moment(surveyCurrentDateTime).isBetween(moment(fromDateSurvey), moment(toDateSurvey), null, '[]')) {
                                    mSurveyShow = 1;
                                }
                            } else if (surveyPopupData?.selected_frequency == 1) {
                                fromDateSurvey = `${formattedWeekStartDate} ${frequencyTime}`;
                                toDateSurvey = `${formattedWeekEndDate} ${frequencyTime}`;
                                if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                                    mSurveyShow = 1;
                                }
                            } else if (surveyPopupData?.selected_frequency == 2) {
                                fromDateSurvey = `${monthStartDate} 00:00:00`;
                                toDateSurvey = `${monthEndDate} 23:59:59`;
                                if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                                    mSurveyShow = 1;
                                }
                            } else if (surveyPopupData?.selected_frequency == 3) {
                                fromDateSurvey = `${yearStartDate} 00:00:00`;
                                toDateSurvey = `${yearEndDate} 23:59:59`;
                                if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                                    mSurveyShow = 1;
                                }
                            } else if (surveyPopupData?.selected_frequency == 4) {
                                mSurveyShow = 1;
                                fromDateSurvey = `${await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD')} 00:00:00`;
                                toDateSurvey = `${await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD')} 23:59:59`;
                            } else {
                                fromDateSurvey = '';
                                toDateSurvey = '';
                            }
                            let surveyShow = 0;
                            if (surveyPopupID) {
                                if (mSurveyShow == 1) {
                                    let datecon = surveyQuestions?.filter((answer) => {
                                        const isValidOrg = answer.org_id == user.org_id;
                                        const isValidUser = answer.user_id == user.id;
                                        const isValidStatus = answer.status == 1;
                                        const createdDateUTC = moment(answer.created).tz(userTimeZone); 
                                        const fromDate = moment.tz(fromDateSurvey, userTimeZone); 
                                        const toDate = moment.tz(toDateSurvey, userTimeZone); 
                                        return isValidOrg && isValidUser && isValidStatus && createdDateUTC.isBetween(fromDate, toDate, null, '[]');
                                    });
                                    if (surveyPopupData.selected_frequency == 4) {
                                        surveyShow = datecon.length < surveyPopupData.show_login_time ? 1 : 0;
                                    } else {
                                        surveyShow = datecon.length ? 0 : 1;
                                    }
                                }
                            }
                            if (surveyShow == 1) {
                                UserServeyPopupShow = 1
                            }
                        }
                    }
                    if( UserServeyPopupShow == 1){
                            let ServeyPopup = await this.surveyPopupService.surveyPopupData(
                                ['Surveypopup', 'Surveyquestions.title', 'Surveyquestions.id','Surveyquestions.ans_option_type','SurveyAnswer.title', 'SurveyAnswer.id', 'SurveyAnswer.correct_ans'],
                                `Surveypopup.org_id = ${user.org_id} AND Surveypopup.status = 1`,
                                user.org_id
                            )
                           let title,survey_popup_id, description, additional_note, pass_need_text, pass_need_desc, fail_need_text, fail_need_desc, survey_image, survey_questions;
                           let SurveyRequired=0;
                           if (ServeyPopup && ServeyPopup['status'] == 1) {
                               let customName;
                               if(ServeyPopup.title){
                                   customName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_title_${ServeyPopup['org_id']}_${ServeyPopup['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ServeyPopup.org_id}/${ServeyPopup.id}`,`dynamic`);
                                   if (customName != `survey_popup_title_${ServeyPopup['org_id']}_${ServeyPopup['id']}`) {
                                       ServeyPopup.title = customName;
                                   }
                               }
                               if(ServeyPopup.description){
                                   customName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_description_${ServeyPopup['org_id']}_${ServeyPopup['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ServeyPopup.org_id}/${ServeyPopup.id}`,`dynamic`);
                                   if (customName != `survey_popup_description_${ServeyPopup['org_id']}_${ServeyPopup['id']}`) {
                                       ServeyPopup.description = customName;
                                   }
                               }
                               if(ServeyPopup.additional_note){
                                   customName = await this.translatorService.frontendReadTranslation(req.lang, `survey_popup_note_${ServeyPopup['org_id']}_${ServeyPopup['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ServeyPopup.org_id}/${ServeyPopup.id}`,`dynamic`);
                                   if (customName != `survey_popup_note_${ServeyPopup['org_id']}_${ServeyPopup['id']}`) {
                                       ServeyPopup.additional_note = customName;
                                   }
                               }
                               if(ServeyPopup.pass_need_text){
                                   customName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_text_${ServeyPopup['org_id']}_${ServeyPopup['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ServeyPopup.org_id}/${ServeyPopup.id}`,`dynamic`);
                                   if (customName != `pass_need_text_${ServeyPopup['org_id']}_${ServeyPopup['id']}`) {
                                       ServeyPopup.pass_need_text = customName;
                                   }
                               }
                               if(ServeyPopup.pass_need_desc){
                                   customName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_desc_${ServeyPopup['org_id']}_${ServeyPopup['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ServeyPopup.org_id}/${ServeyPopup.id}`,`dynamic`);
                                   if (customName != `pass_need_desc_${ServeyPopup['org_id']}_${ServeyPopup['id']}`) {
                                       ServeyPopup.pass_need_desc = customName;
                                   }
                               }
                               if(ServeyPopup.fail_need_text){
                                   customName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_text_${ServeyPopup['org_id']}_${ServeyPopup['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ServeyPopup.org_id}/${ServeyPopup.id}`,`dynamic`);
                                   if (customName != `fail_need_text_${ServeyPopup['org_id']}_${ServeyPopup['id']}`) {
                                       ServeyPopup.fail_need_text = customName;
                                   }
                               }
                               if(ServeyPopup.fail_need_desc){
                                   customName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_desc_${ServeyPopup['org_id']}_${ServeyPopup['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ServeyPopup.org_id}/${ServeyPopup.id}`,`dynamic`);
                                   if (customName != `fail_need_desc_${ServeyPopup['org_id']}_${ServeyPopup['id']}`) {
                                       ServeyPopup.fail_need_desc = customName;
                                   }
                               }
                               survey_popup_id=ServeyPopup?.['id']
                               title = ServeyPopup?.['title']
                               description = ServeyPopup['description'];
                               additional_note = ServeyPopup['additional_note'];
                               SurveyRequired = ServeyPopup['show_required'];
                               if (ServeyPopup['pass_need_check'] == 1) {
                                   pass_need_text = ServeyPopup['pass_need_text'];
                                   pass_need_desc = ServeyPopup['pass_need_desc'];
                               }
                               if (ServeyPopup['fail_need_check'] == 1) {
                                   fail_need_text = ServeyPopup['fail_need_text'];
                                   fail_need_desc = ServeyPopup['fail_need_desc'];
                               }


                               const questions = ServeyPopup?.['Surveyquestions'] || [];

                               const qKeys = questions.map(q =>
                                   `question_title_${ServeyPopup.org_id}_${ServeyPopup.id}_${q.id}`
                               );

                               const aKeys = questions.flatMap(q =>
                                   q.SurveyAnswer?.map(a =>
                                       `surveyoptions_${q.id}_${a.id}`
                                   ) || []
                               );

                               const basePath = `/LC_MESSAGES/Common/SurveyPopup/${ServeyPopup.org_id}/${ServeyPopup.id}`;

                               const qTranslations = await Promise.all(
                                   qKeys.map(key =>
                                       this.translatorService.frontendReadTranslation(req.lang, key, basePath, `dynamic`)
                                   )
                               );

                               const aTranslations = await Promise.all(
                                   aKeys.map(key =>
                                       this.translatorService.frontendReadTranslation(req.lang, key, basePath, `dynamic`)
                                   )
                               );

                               let aIndex = 0;

                               survey_questions = questions
                                   .map((question, qIndex) => {
                                       const qt = qTranslations[qIndex];
                                       if (qt !== qKeys[qIndex]) question.title = qt;

                                       const answers = question.SurveyAnswer?.map(answer => {
                                           const at = aTranslations[aIndex];
                                           const keyCheck = aKeys[aIndex];
                                           aIndex++;

                                           return {
                                               name: at !== keyCheck ? at : answer?.title,
                                               value: answer?.id,
                                               correct_ans: answer.correct_ans
                                           };
                                       }).sort((a, b) => a.value - b.value);

                                       return {
                                           question: question?.title,
                                           value: question?.id,
                                           ans_option_type: question.ans_option_type,
                                           answers
                                       };
                                   })
                                   .sort((a, b) => a.value - b.value);



                               survey_image = ServeyPopup['popup_header_image'] 
                                    ? `${process.env.S3_URL_PROD}${ServeyPopup['popup_header_image']}` 
                                    : 'https://zomo-frontend.s3.amazonaws.com/comn/img/chooseDefault.png';
                            }
                           let data = {
                               title,survey_popup_id, description, additional_note,SurveyRequired, pass_need_text, pass_need_desc, fail_need_text, fail_need_desc, survey_image, survey_questions
                           }
                        result['popup_name'] = 'UserServeyPopupShow'
                        result['details'] = data
                        break;
                    }
                }
            }
            if(result && Object.keys(result).length!=0){
                if((result['covid-details'] || result['survey-details']) && !result['popup_name']){
                    result['popup_name'] = 'All Popup Done'
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: Object.keys(result).length ? result : 'All Popup Done',
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
    async surveyAnswerCheck(recordDetails,req){
        try{
            let user = recordDetails;
            let data = Object.create(null)
            let ServeyPopup = await this.surveyPopupService.surveyPopupStatus([
                'Surveypopup.status','Surveypopup.show_required','Surveypopup.id','Surveypopup.email_added','Surveypopup.email_setting','Surveypopup.is_eligibility','Surveypopup.department_string','Surveypopup.location_string','Surveypopup.selectedweekday','Surveypopup.selected_frequency_time','Surveypopup.show_login_time','Surveypopup.selected_frequency','Surveypopup.org_id','Surveypopup.pass_need_check','Surveypopup.pass_need_text','Surveypopup.pass_need_desc','Surveypopup.fail_need_check','Surveypopup.fail_need_text','Surveypopup.fail_need_desc','Surveyanswer.id','Surveyanswer.org_id','Surveyanswer.user_id','Surveyanswer.question_answers','Surveyanswer.status','Surveyanswer.created','SurveyAnswers.id','SurveyAnswers.correct_ans','Surveyquestions.id','Surveyquestions.ans_option_type','Surveyquestions.title',
            ],
                `Surveypopup.org_id = ${user.org_id} AND Surveypopup.status = 1`,
                user.org_id,
                user.id
            )
            if(ServeyPopup && ServeyPopup['Surveyanswer']?.length && user?.answerData){
                let checkData = ServeyPopup['Surveyanswer']?.find(item => item.id == user?.answerData?.id);
                if(!checkData){
                   ServeyPopup['Surveyanswer'] = [user?.answerData,...ServeyPopup['Surveyanswer']]; 
                }
            }
            let SurveyRequired = 0
            let UserServeyPopupShow = 0
            let surveyQueAns = [];
            for (let que of ServeyPopup['Surveyquestions']) {
                const correctAnswers = que.SurveyAnswers?.filter((answer) => answer.correct_ans == 1) || [];
                surveyQueAns.push({ [que.id]: correctAnswers.map((answer) => answer.id) });
            }
            if (ServeyPopup && ServeyPopup['status'] == 1) {
                SurveyRequired = ServeyPopup['show_required'];
                const surveyPopupData = ServeyPopup;
                const surveyPopupID = surveyPopupData?.id || '';
                const surveyIsEligibility = surveyPopupData?.is_eligibility || 0;
                const surveyUserEligibility = recordDetails.is_camp_eligible;
                let showEligibility = 0;
                if ((user.role_id == 2 || user.role_id == 16) && surveyIsEligibility == 0) {
                    showEligibility = 1;
                } else if (user.role_id == 2 && surveyIsEligibility == surveyUserEligibility) {
                    showEligibility = 1;
                } else if (user.role_id == 16 && surveyIsEligibility == surveyUserEligibility) {
                    showEligibility = 1;
                } else {
                    showEligibility = 0;
                }
                let toDeptLocStatus = 1;
                if (surveyPopupData?.department_string) {
                    const departmentIds = JSON.parse(surveyPopupData.department_string).map(Number);
                    const isIncluded = Array.isArray(departmentIds) && recordDetails.department_id != null && !departmentIds.includes(recordDetails.department_id);
                    if (isIncluded) {
                        toDeptLocStatus = 0;
                    }
                }
                if (surveyPopupData?.location_string) {
                    const locationIds = JSON.parse(surveyPopupData.location_string).map(Number);
                    const isIncluded =
                        Array.isArray(locationIds) &&
                        recordDetails.location != null &&
                        !locationIds.includes(recordDetails.location);
                    if (isIncluded) {
                        toDeptLocStatus = 0;
                    }
                }
                let showSurveyPopup = 0;
                if (surveyPopupData) {
                    if (surveyPopupData.status == 1) {
                        showSurveyPopup = 1;
                    }
                        const surveyQuestions = Array.isArray(surveyPopupData['Surveyquestions']) 
                        ? surveyPopupData['Surveyquestions'] 
                        : [];
                        const surveyQuestionsAnswer = surveyQuestions.length > 0
                        ? surveyQuestions.flatMap((question: any) => question['SurveyAnswers'] || [])
                        : [];
                        if (surveyQuestions.length == 0 || surveyQuestionsAnswer.length == 0) {
                            showSurveyPopup = 0;
                        }
                }
                if (surveyPopupData && toDeptLocStatus == 1 && showEligibility == 1 && showSurveyPopup == 1) {
                    const surveyQuestions = surveyPopupData['Surveyanswer'];
                    let userTimeZone = user.timezone || 'UTC';
                    const surveyCurrentDate = moment.tz(userTimeZone).format('YYYY-MM-DD');
                    const surveyCurrentDateTime = moment.tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                    const surveyDate = surveyCurrentDate; 
                    const surveyTs = moment(surveyDate).valueOf(); 
                    const surveyYear = moment(surveyTs).year(); 
                    const surveyMonth = moment(surveyTs).month() + 1; 
                    const today = moment.tz(userTimeZone);
                    const dayOfWeek = today.day(); 
                    const getDayOffset = (day) => {
                        const weekdays = appConstant.WEEKDAYS;
                        return weekdays[day.toLowerCase()] || 0; 
                    };
                    const selectedWeekDay = surveyPopupData?.selectedweekday || 'monday';
                    const selectedWeekDayOffset = getDayOffset(selectedWeekDay);
                    let daysUntilSelectedWeekday = selectedWeekDayOffset - dayOfWeek;
                    if (daysUntilSelectedWeekday < 0) {
                        daysUntilSelectedWeekday += 7;
                    }
                    if (daysUntilSelectedWeekday < 0) {
                        daysUntilSelectedWeekday = 0;
                    }
                    let weekStartDate = today.clone().add(daysUntilSelectedWeekday, 'days');
                    let weekEndDate = weekStartDate.clone().add(7 - selectedWeekDayOffset, 'days');
                    const formattedWeekStartDate = weekStartDate.format('YYYY-MM-DD');
                    const formattedWeekEndDate = weekEndDate.format('YYYY-MM-DD');
                    const monthStartDate = moment(surveyTs).startOf('month').format('YYYY-MM-DD');
                    const lastDayOfCurrentMonth = moment(today).endOf('month').date(); // Get the last day of the month
                    const monthEndDate = moment(surveyTs).endOf('month').format('YYYY-MM-DD');
                    const yearStartDate = moment(surveyTs).startOf('year').format('YYYY-MM-DD');
                    const yearEndDate = moment(surveyTs).endOf('year').format('YYYY-MM-DD');
                    const frequencyTime = surveyPopupData?.selected_frequency_time || '00:00:00';
                    let mSurveyShow = 0;
                    let fromDateSurvey = '';
                    let toDateSurvey = '';
                    if (surveyPopupData?.selected_frequency == 0) {
                        fromDateSurvey = `${surveyCurrentDate} ${frequencyTime}`;
                        toDateSurvey = `${surveyCurrentDate} 23:59:59`;
                        if (moment(surveyCurrentDateTime).isBetween(moment(fromDateSurvey), moment(toDateSurvey), null, '[]')) {
                            mSurveyShow = 1;
                        }
                    } else if (surveyPopupData?.selected_frequency == 1) {
                        fromDateSurvey = `${formattedWeekStartDate} ${frequencyTime}`;
                        toDateSurvey = `${formattedWeekEndDate} ${frequencyTime}`;
                        if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                            mSurveyShow = 1;
                        }
                    } else if (surveyPopupData?.selected_frequency == 2) {
                        fromDateSurvey = `${monthStartDate} 00:00:00`;
                        toDateSurvey = `${monthEndDate} 23:59:59`;
                        if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                            mSurveyShow = 1;
                        }
                    } else if (surveyPopupData?.selected_frequency == 3) {
                        fromDateSurvey = `${yearStartDate} 00:00:00`;
                        toDateSurvey = `${yearEndDate} 23:59:59`;
                        if (moment(surveyCurrentDateTime).isSameOrAfter(moment(fromDateSurvey)) && moment(surveyCurrentDateTime).isSameOrBefore(moment(toDateSurvey))) {
                            mSurveyShow = 1;
                        }
                    } else if (surveyPopupData?.selected_frequency == 4) {
                        mSurveyShow = 1;
                        fromDateSurvey = `${await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD')} 00:00:00`;
                        toDateSurvey = `${await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD')} 23:59:59`;
                    } else {
                        fromDateSurvey = '';
                        toDateSurvey = '';
                    }
                    let surveyShow = 0;
                    let surveyAnswerArray = []
                    if (surveyPopupID) {
                        if (mSurveyShow == 1) {
                            let datecon = surveyQuestions?.filter((answer) => {
                                const isValidOrg = answer.org_id == user.org_id;
                                const isValidUser = answer.user_id == user.id;
                                const isValidStatus = answer.status == 1;
                                const createdDateUTC = moment(answer.created).tz(userTimeZone); 
                                const fromDate = moment.tz(fromDateSurvey, userTimeZone); 
                                const toDate = moment.tz(toDateSurvey, userTimeZone); 
                                return isValidOrg && isValidUser && isValidStatus && createdDateUTC.isBetween(fromDate, toDate, null, '[]');
                            });
                            if (surveyPopupData.selected_frequency == 4) {
                                surveyShow = datecon.length <= surveyPopupData.show_login_time ? 1 : 0;
                                surveyAnswerArray = datecon.length <= surveyPopupData.show_login_time ?  datecon : [];
                            } 
                        }
                    }
                    else{
                        surveyAnswerArray = []
                    }
                    let messages,messagedis ,message
                    let messagestatus = 0
                    if (mSurveyShow == 1 && surveyAnswerArray.length > 0 ) {
                        let userQueAns = surveyPopupData['Surveyanswer'][0]?.question_answers || '';
                        if(userQueAns != ''){
                            let userQueAnsData = userQueAns != '' 
                                ? JSON.parse(userQueAns) 
                                : {};
                            let positiveCount = 0
                            let totalQuestion = surveyQueAns.length
                            for(let covidQue of surveyQueAns){
                                let questionId = Object.keys(covidQue)[0]; 
                                let answerIds = covidQue[questionId]; 
                                if (userQueAnsData[questionId]) {
                                    let userAnswer = userQueAnsData[questionId];
                                    if (Array.isArray(answerIds)) {
                                        if(typeof userAnswer == 'string' && userAnswer?.includes(',')){
                                            userAnswer = userAnswer.split(',');
                                        }
                                        if (Array.isArray(userAnswer)) {
                                            if (answerIds.length == userAnswer.length &&
                                                answerIds.every((correctAns) => userAnswer.includes(String(correctAns)) || userAnswer.includes(Number(correctAns)))) {
                                                positiveCount++;
                                            }
                                        } else {
                                            if (answerIds.length == 1 && answerIds.includes(Number(userAnswer))) {
                                                positiveCount++;
                                            }
                                        }
                                    } else {
                                        if (Array.isArray(userAnswer)) {
                                            if (userAnswer.includes(String(answerIds)) || userAnswer.includes(Number(answerIds))) {
                                                positiveCount++;
                                            }
                                        } else {
                                            if (Number(userAnswer) == answerIds) {
                                                positiveCount++;
                                            }
                                        }
                                    }
                                }
                            }
                            let surveyResult = totalQuestion == positiveCount ? 0 :1
                            if(surveyResult != 2){
                                let fianl_email_message
                                if(surveyResult != 0 && surveyPopupData.email_setting == 1 && surveyPopupData.email_added != ''){
                                    messages = (surveyResult == 0) ? surveyPopupData['pass_need_text'] : surveyPopupData['fail_need_text'];
                                    messagedis = (surveyResult == 0) ? surveyPopupData['pass_need_desc'] : surveyPopupData['fail_need_desc'];
                                    fianl_email_message =  '<b>'+messages+'</b> <br/>'+messagedis;
                                    let templateText = await this.communicationTemplateTextService.findOne({org_id:In([user.org_id,0]),type:41}) 
                                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                    let toEmail = surveyPopupData.email_added;
                                    let emailDetails = Object.create(null);
                                    emailDetails['type'] = 41;
                                    emailDetails['company'] = '';
                                    emailDetails['usercode'] = recordDetails.code;
                                    emailDetails['name'] = recordDetails.full_name;
                                    emailDetails['email'] = recordDetails.email;
                                    emailDetails['dynamicText'] = fianl_email_message;
                                    let emaildata = {
                                        sender: ``,
                                        receiver: toEmail,
                                        subject: 'User Survey Failed Survey.',
                                        content: emailDetails,
                                        template: templateNewText
                                    }
                                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                                }
                                if(surveyResult == 0 && surveyPopupData['pass_need_check'] == 1){
                                    messagestatus = 1;
                                    message = `${await this.translatorService.frontendReadTranslation(req.lang,'Pass Need Text', `/LC_MESSAGES/Common/SurveyPopup`,`static`)}`
                                    if(surveyPopupData['pass_need_text'])
                                    {
                                        if(surveyPopupData.pass_need_text){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_text_${surveyPopupData['org_id']}_${surveyPopupData['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${surveyPopupData.org_id}/${surveyPopupData.id}`,`dynamic`);
                                            if (customName != `pass_need_text_${surveyPopupData['org_id']}_${surveyPopupData['id']}`) {
                                                surveyPopupData.pass_need_text = customName;
                                            }
                                        }
                                        message = surveyPopupData['pass_need_text'];
                                    }
                                    messagedis = ''
                                    if(surveyPopupData['pass_need_desc'] || surveyPopupData['pass_need_desc'] == '')
                                    {
                                        if(surveyPopupData.pass_need_desc){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `pass_need_desc_${surveyPopupData['org_id']}_${surveyPopupData['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${surveyPopupData.org_id}/${surveyPopupData.id}`,`dynamic`);
                                            if (customName != `pass_need_desc_${surveyPopupData['org_id']}_${surveyPopupData['id']}`) {
                                                surveyPopupData.pass_need_desc = customName;
                                            }
                                        }
                                        messagedis = surveyPopupData['pass_need_desc'];
                                    }
                                }else if(surveyResult != 0 && surveyPopupData['fail_need_check'] == 1){;
                                    messagestatus = 2;
                                    message = `${await this.translatorService.frontendReadTranslation(req.lang,'Fail Need Text', `/LC_MESSAGES/Common/SurveyPopup`,`static`)}`
                                    if(surveyPopupData['fail_need_text'])
                                    {
                                        if(surveyPopupData.fail_need_text){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_text_${surveyPopupData['org_id']}_${surveyPopupData['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${surveyPopupData.org_id}/${surveyPopupData.id}`,`dynamic`);
                                            if (customName != `fail_need_text_${surveyPopupData['org_id']}_${surveyPopupData['id']}`) {
                                                surveyPopupData.fail_need_text = customName;
                                            }
                                        }
                                        message = surveyPopupData['fail_need_text'];
                                    }
                                    messagedis =''
                                    if(surveyPopupData['fail_need_desc'] || surveyPopupData['fail_need_desc'] == '')
                                    {
                                        if(surveyPopupData.fail_need_desc){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `fail_need_desc_${surveyPopupData['org_id']}_${surveyPopupData['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${surveyPopupData.org_id}/${surveyPopupData.id}`,`dynamic`);
                                            if (customName != `fail_need_desc_${surveyPopupData['org_id']}_${surveyPopupData['id']}`) {
                                                surveyPopupData.fail_need_desc = customName;
                                            }
                                        }
                                        messagedis = surveyPopupData['fail_need_desc'];
                                    }
                                }else if(surveyResult == 0 && surveyPopupData['pass_need_check'] == 0){
                                    messagestatus = 1;
                                    message = `${await this.translatorService.frontendReadTranslation(req.lang,'Thank You', `/LC_MESSAGES/Common/SurveyPopup`,`static`)}`
                                    messagedis = '';
                                }else if(surveyResult != 0 && surveyPopupData['fail_need_check'] == 0){
                                    messagestatus = 1;
                                    message = `${await this.translatorService.frontendReadTranslation(req.lang,'Thank You', `/LC_MESSAGES/Common/SurveyPopup`,`static`)}`
                                    messagedis = '';
                                }
                            }
                            else{
                                messagestatus = 0;
                                message = `${await this.translatorService.frontendReadTranslation(req.lang,'Somthing went wrong. Try again.', `/LC_MESSAGES/Common/SurveyPopup`,`static`)}`
                                messagedis = '';
                            }
                        }
                        else{
                            messagestatus = 2;
                            message = `${await this.translatorService.frontendReadTranslation(req.lang,'You are already successfully fill your survey records.', `/LC_MESSAGES/Common/SurveyPopup`,`static`)}`
                            messagedis = '';
                        }
                    }
                    else{
                        messagestatus = 0;
                        message = `${await this.translatorService.frontendReadTranslation(req.lang,'Sorry you have not selected any answer', `/LC_MESSAGES/Common/SurveyPopup`,`static`)}`
                        messagedis = '';
                    }
                    data['messagestatus']=messagestatus
                    data['message']=message
                    data['messagedis']=messagedis
                }
            }
            return data
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async processRelayRaceData(req: Request){
        try{
            let user = req.tokenUser;
            let data = [];
            const item = Object.create(null);
            let where = `teamMember.user_id = ${user?.id} AND teamMember.status = 1 AND schedule.status = 1` 
            let allgetteams= await this.teamMembersService.relayRaceChallegeOntimeSession(where,user?.id)
            const teams = allgetteams.filter(team => team['ch'] != null && team['ch']['bio_challenge_type']=='Relay_race');
            for (const schedule of teams) {
                if(schedule['schedule']?.custom_cname){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${schedule['schedule']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule['schedule'].org_id}/${schedule['schedule']['id']}`,`dynamic`);
                    schedule['schedule'].custom_cname = (customName == '' || customName == `custom_cname_${schedule['schedule']['id']}`) ? schedule['schedule']['custom_cname'] : customName;
                }
                if(schedule['schedule']?.custom_desc){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${schedule['schedule']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule['schedule'].org_id}/${schedule['schedule']['id']}`,`dynamic`);
                    schedule['schedule'].custom_desc = (customName == '' || customName == `custom_desc_${schedule['schedule']['id']}`) ? schedule['schedule']['custom_desc'] : customName;
                }
                if(schedule['selfTeam']?.tname){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${schedule['selfTeam']['schedule_id']}_${schedule['selfTeam']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule['schedule'].org_id}/${schedule['selfTeam'].schedule_id}`,`dynamic`);
                    schedule['selfTeam'].tname = (customName == '' || customName == `team_name_${schedule['selfTeam']['schedule_id']}_${schedule['selfTeam']['id']}`) ? schedule['selfTeam']['tname'] : customName;
                }
                item.Schedule_id = schedule['schedule']?.id;
                item.challenge_name = schedule['schedule'].custom_cname;
                item.race_type = schedule['schedule'].race_type;
                if (schedule['schedule'].race_type == 3) {
                    item.goal = schedule['schedule'].time_elapsed;
                    item.goal_type = 'Minutes';
                } else {
                    item.goal = schedule['schedule'].numberofsteps;
                    item.goal_type = 'Steps';
                }
                item.Schedule_Start_date = schedule['schedule'].start_date;
                item.relay_race_detail = schedule?.['scheduleJoin']?.relay_race_detail;
                item.challenge_id = schedule['ch']?.id;
                item.challenge_type = schedule['ch']?.challenge_type;
                item.bio_challenge_type = schedule['ch']?.bio_challenge_type;
                item.team_id = schedule['selfTeam']?.id;
                item.team_name = schedule['selfTeam'].tname;
                item.required_skip_turn = schedule['schedule'].hide_comment;
                item.required_start_turn = schedule['schedule'].hide_history;
                let team_member = await this.teamMembersService.currentJoinTeamMemberData(`teamMember.team_id=${schedule['selfTeam']?.id} AND teamMember.status=1`,schedule['schedule']?.id);
                team_member = team_member.map(member => ({ ...member, duplicate: 'no' }));
                const not_required_skip_turn = schedule['schedule'].hide_comment;
                const not_required_start_turn = schedule['schedule'].hide_history;
                const countstepswith = schedule['schedule'].countstepswith;
                const logType = countstepswith == 'realstep' ? " and logType='Tracker'" : "and logType in('Tracker','Manual')";
                const getactivity = await this.activityService.activityListRecord(
                    {'activity_name':In(['Activity Tracker- Walking','Activity Tracker- Running','Activity Tracker- Cycling','Activity Tracker- Swimming','Activity Tracker','Steps'])},
                    ['id','activity_name']
                );
                let activityIds: {
                    acttrackid: number | null;
                    stepid: number | null;
                    wakingid: number | null;
                    runningid: number | null;
                    cyclingid: number | null;
                    swimmingid: number | null;
                } = {
                    acttrackid: getactivity[0]?.id || null,
                    stepid: getactivity[1]?.id || null,
                    wakingid: getactivity[2]?.id || null,
                    runningid: getactivity[3]?.id || null,
                    cyclingid: getactivity[4]?.id || null,
                    swimmingid: getactivity[5]?.id || null
                };
                // Check for disabled activities
                if (schedule['schedule'].s_activity_tracker == 0) {
                    activityIds.acttrackid = null;
                }
                if (schedule['schedule'].s_steps == 0) {
                    activityIds.stepid = null;
                }
                if (schedule['schedule'].s_walking == 0) {
                    activityIds.wakingid = null;
                }
                if (schedule['schedule'].s_running == 0) {
                    activityIds.runningid = null;
                }
                if (schedule['schedule'].s_cycling == 0) {
                    activityIds.cyclingid = null;
                }
                if (schedule['schedule'].s_swimming == 0) {
                    activityIds.swimmingid = null;
                }
                // Step goal logic
                let step_goal = schedule['ch']?.numberofsteps;
                if (schedule['schedule'].numberofsteps != 0 && schedule['schedule'].numberofsteps != "") {
                    step_goal = schedule['schedule'].numberofsteps;
                }
                const allusersid = team_member?.map(member => member.user.id)?.filter(id => id).join(',');
                let AllStepsdata = Object.create(null);
                if (allusersid.trim()) {
                    const findall = `(${Object.values(activityIds)?.filter(id => id).join(',')})`;
                    const whereClause = `user_id IN (${allusersid}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND collectionDate BETWEEN '${schedule['schedule'].start_date}' AND '${schedule['schedule'].end_date}' ${logType} AND food.status = 1`;
                    let stepsData = await this.activityFeedsService.getUserActivityData(whereClause, ['SUM(food.steps) as steps', 'food.user_id as user_id', 'food.timestamp'], 'food.user_id',  'steps');
                    stepsData.forEach(getsteps => {
                        AllStepsdata[getsteps.user_id] = getsteps.steps;
                    });
                }
                let time_elapsed = schedule['schedule'].time_elapsed || 1;
                let completed_time1 = 0;
                const remain_team_member = schedule['selfTeam'].team_size - team_member.length;
                const check_last_order = await this.teamMembersService.getMaxOrder(`team_id = ${schedule['selfTeam']?.id} AND scheduleJoin.schedule_id = ${schedule['schedule']?.id} AND teamMember.status !=2 `); // Assuming an async function
                if (remain_team_member > 0) {
                    for (let di = 0; di < remain_team_member; di++) {
                        team_member.push({
                            ...team_member[di],
                            duplicate: 'yes',
                            baton_status: 0,
                            baton_start: '0000-00-00 00:00:00',
                            user_order: check_last_order
                        });
                    }
                }
                let updated_teammembers = [];
                let exitkey = 0;
                let bufalgs = 0;
                let setbtnstatus = 0;
                let lastendtime = null; 
                for (let index = 0; index < team_member.length; index++) {
                const tuser = team_member[index];
                const userid = tuser?.user?.id;
                if (schedule['schedule'].race_type == 3) {
                    if (tuser.duplicate == 'no' && 
                        (team_member[exitkey].baton_status == 3 || team_member[exitkey].baton_status == 2) && 
                        team_member[exitkey].baton_start != '0000-00-00 00:00:00'
                    ) {
                        lastendtime = moment(team_member[exitkey].baton_start).add(time_elapsed, 'minutes').format('YYYY-MM-DD HH:mm:ss');
                    } 
                    else {
                        if (tuser.duplicate == 'no' && not_required_start_turn == 1 && not_required_skip_turn == 1 &&
                            (team_member[exitkey].baton_status != 3 || team_member[exitkey].baton_status != 2)) {
                        team_member[exitkey].baton_start = lastendtime;
                        }
                        if (team_member[exitkey].baton_status == 0 && tuser.duplicate == 'yes') {
                        tuser.baton_status = team_member[exitkey].baton_status = 2;
                        tuser.baton_start = team_member[exitkey].baton_start = lastendtime;
                        lastendtime = lastendtime ? moment(lastendtime).add(time_elapsed, 'minutes').format('YYYY-MM-DD HH:mm:ss') : lastendtime;
                        if (team_member[exitkey].baton_status == 2) {
                            const d11 = moment(team_member[exitkey].baton_start).unix();
                            const current_datetime = moment().format('YYYY-MM-DD HH:mm:ss'); 
                            const d22 = moment(current_datetime).unix();
                            const totalSecondsDiff1 = Math.abs(d11 - d22);
                            let totalMinutesDiff1 = totalSecondsDiff1 / 60;
                            let current_time1 = totalMinutesDiff1 > time_elapsed ? time_elapsed : totalMinutesDiff1;
                            completed_time1 += current_time1;
                            if (totalMinutesDiff1 >= time_elapsed) {
                            tuser.baton_status = team_member[exitkey].baton_status = 3;
                            }
                        }
                        }
                    }
                    if (setbtnstatus == 0 && (team_member[exitkey].baton_status == 2 || team_member[exitkey].baton_status == 1)) {
                        setbtnstatus = 1;
                    } 
                    else if (setbtnstatus == 1) {
                        tuser.baton_status = team_member[exitkey].baton_status = 0;
                        tuser.baton_start = team_member[exitkey].baton_start = '0000-00-00 00:00:00';
                    }
                } else {
                    let user_goal = schedule['schedule'].race_type == 2 ? Math.ceil(step_goal / team_member.length) : step_goal;
                    if (setbtnstatus == 0 && team_member[exitkey].baton_status == 3 && AllStepsdata[userid] < user_goal) {
                        team_member[exitkey].baton_status = 2;
                        setbtnstatus = 1;
                    }
                    if (AllStepsdata[userid] > user_goal) {
                        AllStepsdata[userid] -= user_goal;
                    } else {
                        AllStepsdata[userid] = 0;
                    }
                    if (bufalgs == 0 && (team_member[exitkey].baton_status == 2 || team_member[exitkey].baton_status == 1)) {
                        bufalgs = 1;
                    } else if (bufalgs == 1) {
                        team_member[exitkey].baton_status = 0;
                    }
                }
                updated_teammembers.push(tuser);
                exitkey++;
                }
                item.team_member = updated_teammembers;
                item.status = 0;
                data.push(item);
            }
            return {teams, data};
        }
        catch(error){
         throw new Error(error.message); 
        }
    }
}
