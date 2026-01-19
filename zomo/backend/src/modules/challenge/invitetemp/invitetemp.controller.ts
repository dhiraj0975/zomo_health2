import { UserService } from '@/modules/user/user/user.service';
import { CommonArrayService, CommonService, InviteTempDto, tableConstant } from '@common-constants';
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
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateInviteTempInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    UpdateInviteTempInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { UserChallengeHelperService } from '../userschedulechallenge/userChallengeHelper.service';
import { InviteTempService } from './invitetemp.service';
const S3_URL =  process.env.S3_URL_PROD
@Controller('challenge/invite-temp')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class InviteTempController {
    constructor(
        private readonly inviteTempService: InviteTempService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly commonService: CommonService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateInviteTempInput) {
        try {
            if (!postData?.user_id || !postData?.schedule_id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let checkdata = await this.inviteTempService.findOne({status:1, user_id: postData?.user_id, schedule_id: postData?.schedule_id, org_id: postData?.org_id});
            if (checkdata) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "User Already Invited", `/LC_MESSAGES/Challenge/MyChallenges`,`static`));
            }
            postData['status'] = postData?.status ?? 1;
            await this.inviteTempService.save({...postData});
            let user  = await this.userService.findOne({id: postData.user_id});
            let invitor  = await this.userService.findOne({id: req.tokenUser?.id});
            let scheduleInfo = await this.scheduleChallengeService.findOne({id: postData.schedule_id, org_id: postData?.org_id});
            this.userChallengeHelperService.addNotification({
                org_id: scheduleInfo?.org_id, 
                user_id: user.id, 
                custom_cname: scheduleInfo?.custom_cname, 
                schedule_id: scheduleInfo['id'], 
                challenge_id: scheduleInfo['challenge_id'], 
                logo: scheduleInfo['custom_logo'] && scheduleInfo['custom_logo'] != '' ? S3_URL + scheduleInfo['custom_logo'] : this.commonService.getIconPath(scheduleInfo['challenge']['logo'],S3_URL), 
                type: 'inviteMember',
                url: `https://${process.env.DOMAIN}/my-challenges/${scheduleInfo['id']}`,
                title: `You have been Invited to Challenge`,
                message: `${user.first_name + ' ' + user.last_name} you have been Invited to Challenge '${scheduleInfo?.custom_cname}' invited by ${invitor.first_name + ' ' + invitor.last_name}`,
            }, req);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,`User Invited Successfully`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateInviteTempInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.inviteTempService.findOne({
                id: postData?.id,user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.inviteTempService.update({ id: postData?.id, user_id: postData?.user_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_INVITE_TEMP, req.tokenUser?.id);
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
            const recordDetails = await this.inviteTempService.findOne({
                id: postData?.id,user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.inviteTempService.update({id: postData?.id, user_id: postData?.user_id},{status: 2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_INVITE_TEMP, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,`Invitation Cancel`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`),
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
            let resultedData = await this.inviteTempService.findOne({id: postData?.id, user_id: postData?.user_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(InviteTempDto, resultedData, req.lang)
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let where: any = { status: 1, deleted: 0 };            
            let result = await this.inviteTempService.listRecord(where);
            result = <any>(
                await this.commonArrayService.formatToDto(InviteTempDto, result, req.lang)
            );
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
}