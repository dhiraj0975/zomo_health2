import { appConstant, CommonArrayService, CommonDateService, SquareUsersDto, tableConstant } from '@common-constants';
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
    CreateSquareUsersInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    UpdateSquareUsersInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { SquareUsersService } from './squareusers.service';
const S3_URL =  process.env.S3_URL_PROD
@Controller('challenge/square-users')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class SquareUsersController {
    constructor(
        private readonly squareUsersService: SquareUsersService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSquareUsersInput) {
        try {
            if (!postData?.schedule_id || !postData?.user_id || !postData?.card_id || !postData?.square_id || !postData?.verified_userid || !postData?.verified_status) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.squareUsersService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateSquareUsersInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.squareUsersService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.squareUsersService.update({ id: postData?.id, schedule_id: postData?.schedule_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_SQUARE_USERS, req.tokenUser?.id);
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
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.squareUsersService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.squareUsersService.update({id: postData?.id, schedule_id: postData?.schedule_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_SQUARE_USERS, req.tokenUser?.id,'delete');
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
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.squareUsersService.findOne({id: postData?.id, schedule_id: postData?.schedule_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SquareUsersDto, resultedData, req.lang)
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
    /* we can add other notification here or we can move this api in user module*/
    @Post('square-verification-notification')
    async sqaureNotification(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            let user = Object.create(req.tokenUser);
            if (![appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(user.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_UNAUTHORIZATION_LOCATION'));
            }
            let resultedData = await this.squareUsersService.GetVerificationRequest(`squareuser.verified_userid = ${user.id} AND sc.status = 1 AND sc.bingo_self = 0 AND sc.end_date >= '${this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')}' AND square.status = 1`);
            if(resultedData && resultedData.length){
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(SquareUsersDto, resultedData, req.lang)
                );
                for(let ele of resultedData){
                    if(ele && ele?.['user']?.['profile_image'] !==''){
                        ele['user']['profile_image'] =  !ele?.['user']?.['profile_image'].includes(S3_URL) ? S3_URL + ele?.['user']?.['profile_image'] : ele?.['user']?.['profile_image'];
                    }
                    else{
                        ele['user']['profile_image'] =  S3_URL + "comn/img/avatar_0001.png";
                    }
                    if (ele?.['square']?.name) {
                        let Squares_name = await this.translatorService.frontendReadTranslation(req.lang, `square_name_${ele['schedule_id']}_${ele['square_id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele?.['square']?.['org_id']}/${ele['schedule_id']}`, `dynamic`);
                        if (Squares_name == `square_name_${ele['schedule_id']}_${ele['square_id']}`) {
                            Squares_name = ele['square']['name'];
                        }
                        ele['square']['name'] = Squares_name || ele['square']['name'];
                    }
                    if(ele?.['square']?.description){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`square_description_${ele['square'].schedule_id}_${ele['square']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele?.['square']?.org_id}/${ele?.['square']?.schedule_id}`,`dynamic`);
                        ele['square'].description = (customeName == '' || customeName == `square_description_${ele['square'].schedule_id}_${ele['square']['id']}`) ? ele['square']['description'] : customeName;
                    }
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
}