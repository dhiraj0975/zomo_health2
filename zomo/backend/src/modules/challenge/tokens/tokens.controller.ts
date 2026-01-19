import { UrlManageService } from '@/modules/common';
import { CommonArrayService, CommonService, tableConstant, TokensDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { CommunicationTemplateTextsService } from "src/modules/communication/templatetexts/communicationtemplatetexts.service";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { UserService } from 'src/modules/user/user/user.service';
import { UserSettingsService } from 'src/modules/user/usersettings/usersettings.service';
import { In } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateTokensInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    UpdateTokensInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { UserChallengeHelperService } from '../userschedulechallenge/userChallengeHelper.service';
import { TokensService } from './tokens.service';
const S3_URL =  process.env.S3_URL_PROD

@Controller('challenge/tokens')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class TokensController {
    constructor(
        private readonly tokensService: TokensService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly userSettingsService: UserSettingsService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly urlManageService: UrlManageService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly commonService: CommonService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateTokensInput) {
        try {
            if (!postData?.org_id || !postData?.to_user_id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user_id = req.tokenUser?.id;
            let auto_email:any = '';
            let returnMessage = '';
            let returnSuccess = 0;
            let returnError = 1;
            let returnData = null;
            let returnStatusCode = 401;
            const getScheduleDetails = await this.scheduleChallengeService.scheduleChallegeData({id: postData?.schedule_id});
            if (getScheduleDetails) {
                let main_goal_token = getScheduleDetails['total_enter_token'];
                let max_num_of_token = getScheduleDetails['max_num_of_token'];
                let challege_id = getScheduleDetails['challenge_id'];
                let is_team = getScheduleDetails['team'];
                auto_email = getScheduleDetails['auto_email'];
                let use_max_token:any = 0;
                if(max_num_of_token == 1){
                    use_max_token = getScheduleDetails['max_num_of_enter_token'];
                }
                let requirement_base_on = getScheduleDetails['requirement_base_on'];
                let check_token_type = 'earn';
                let check_user_id = postData?.to_user_id;
                let check_user_para = 'to_user_id';
                if(requirement_base_on == 0){ /* 0 is Tokens Given & 1 is Tokens Earned */
                    check_token_type = 'given';
                    check_user_id = user_id;
                    check_user_para = 'user_id';
                }
                let getUserTotalToken = await this.tokensService.getMyGivenEarnToken({[check_user_para]: check_user_id, schedule_id: postData?.schedule_id});
                let access_send_token = 0;
                if(max_num_of_token == 1 && getUserTotalToken < use_max_token){
                    access_send_token = 1;
                }else if(max_num_of_token == 0){
                    access_send_token = 1;
                }
                let tokan_data = Object.create(null);
                if(access_send_token == 1){
                    tokan_data['org_id'] = postData?.org_id;
                    tokan_data['user_id'] = req.tokenUser?.id;
                    tokan_data['schedule_id'] = postData?.schedule_id;
                    tokan_data['challege_id'] = challege_id;
                    if(is_team == 1){
                        tokan_data['team_id'] = postData?.team_id;
                    }
                    tokan_data['token_number'] = 1;
                    tokan_data['token_type'] = check_token_type;
                    tokan_data['to_user_id'] = postData?.to_user_id;
                    tokan_data['submission_date'] = postData?.submission_date;
                    tokan_data['comment'] = postData?.comment;
                    tokan_data['status'] = 1;
                    let QueryResult = await this.tokensService.save(tokan_data);
                    if(QueryResult !== null){
                        const getToUserDetails = await this.userService.findUserFullRecord({ id : postData?.to_user_id },['user.id','settings.receivetokens','user.email']);
                        let logout_user_token = [];
                        let toEmail = '';
                        if (getToUserDetails) {
                            if(getToUserDetails?.['settings']?.['receivetokens'] && getToUserDetails['settings']['receivetokens'] != null && getToUserDetails['settings']['receivetokens'] != undefined && getToUserDetails['settings']['receivetokens'] != ''){
                                let receivedData = JSON.parse(getToUserDetails['settings']['receivetokens']);
                                if (Array.isArray(receivedData)) {
                                    logout_user_token = receivedData;
                                }

                                if(logout_user_token.length > 0){
                                    const item = logout_user_token.find(d => d.challenge_id === postData?.schedule_id);
                                    if (item) {
                                        item.number_of_tokens = item.number_of_tokens + 1;
                                    }else{
                                        logout_user_token.push({
                                            challenge_id: postData?.schedule_id,
                                            number_of_tokens: 1
                                        });
                                    }
                                }else{
                                    logout_user_token.push({
                                        challenge_id: postData?.schedule_id,
                                        number_of_tokens: 1
                                    });
                                }
                            }else{
                                logout_user_token.push({
                                    challenge_id: postData?.schedule_id,
                                    number_of_tokens: 1
                                });
                            }
                            toEmail = getToUserDetails['email'];
                        }
                        await this.userSettingsService.update({user_id: postData?.to_user_id},{receivetokens: JSON.stringify(logout_user_token)});
                        
                        const emailRegex = /^[_a-zA-Z0-9-]+(\.[_a-zA-Z0-9-]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\.[a-zA-Z]{2,3})$/;
                        if(auto_email == 1 && toEmail != '' && emailRegex.test(toEmail)){
                            const templateText = await this.communicationTemplateTextService.findOne({org_id: In([postData?.org_id,0]), type: 40});
                            if(templateText){
                                templateText['new_text'] = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                            }
                            let emailText ={
                                dynamictext: 'Congratulations you have earned a token!.',
                                full_name: req?.tokenUser?.full_name,
                                company_name: req?.tokenUser?.company?.company_name,
                                company_logo: req?.tokenUser?.company?.company_logo,
                                type: 40
                            }
                            const emailDetails = {
                                sender: ``,
                                receiver: toEmail,
                                subject: `Token Earned.`,
                                template: templateText?.['new_text'] || templateText?.['text'],
                                content: emailText,
                            };
                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailDetails));
                        }

                        returnMessage =  await this.translatorService.frontendReadTranslation(req.lang,'Thank you! Your token has been sent', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        returnSuccess = 1;
                        returnError = 0;
                        returnData = null;
                        returnStatusCode = 201;
                        if (QueryResult) {
                            this.userChallengeHelperService.addNotification({
                                id: QueryResult?.['id'], 
                                org_id: getScheduleDetails?.['org_id'], 
                                user_id: QueryResult['to_user_id'], 
                                schedule_id: getScheduleDetails?.id, 
                                challenge_id: getScheduleDetails?.challenge_id,
                                custom_cname: getScheduleDetails?.custom_cname, 
                                title: check_token_type == 'earn' ? 'Token Earned' : 'Token Recived',
                                message: check_token_type == 'earn' ? `You have earned a token` : `You have recived a token from ${req?.tokenUser?.full_name}`,
                                logo: getScheduleDetails?.custom_logo && getScheduleDetails?.custom_logo != '' ? S3_URL + getScheduleDetails?.custom_logo : this.commonService.getIconPath(getScheduleDetails['ch']['logo'],S3_URL), 
                                url: `https://${process.env.DOMAIN}/my-challenges/${getScheduleDetails?.id}`,
                                type: 'update',
                                send_type: 1
                            }, req);
                        }     
                    }else{
                        returnMessage =  await this.translatorService.frontendReadTranslation(req.lang,'Somthing Went wrong', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    }
                }else{
                    returnMessage =  await this.translatorService.frontendReadTranslation(req.lang,'Sorry User token Given & Earn Limit is over', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                }
            }else{
                returnMessage =  await this.translatorService.frontendReadTranslation(req.lang,'Somthing Went wrong', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: returnStatusCode,
                success: returnSuccess,
                error: returnError,
                data: returnData,
                message: returnMessage
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateTokensInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.tokensService.findOne({
                id: postData?.id,user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.tokensService.update({ id: postData?.id, user_id: postData?.user_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_TOKENS, req.tokenUser?.id);
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.tokensService.findOne({
                id: postData?.id,user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.tokensService.update({id: postData?.id, user_id: postData?.user_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_TOKENS, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.tokensService.findOne({id: postData?.id, user_id: postData?.user_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(TokensDto, resultedData, req.lang)
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
}