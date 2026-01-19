import { appConstant, CommonArrayService, CommonService, tableConstant, UserSettingsDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { Request, Response } from "express";
import { CompanyService } from 'src/modules/company/companies/company.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateUserSettingsInput, PaginateInput } from '../../../input';
import { TranslationService } from '../../translation/translation.service';
import { UserSettingsService } from "./usersettings.service";
@Controller('user/settings')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserSettingsController {
    constructor(
        private readonly userSettingsService: UserSettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `userSettings.id != 0 `;
            if(postData?.user_id){
                where += ` AND userSettings.user_id = ${postData?.user_id}`
            }
            if (postData?.search_str) {
                where += ` AND (userSettings.address LIKE '%${postData?.search_str}%' OR userSettings.state LIKE '%${postData?.search_str}%' OR userSettings.city LIKE '%${postData?.search_str}%' OR userSettings.country LIKE '%${postData?.search_str}%' OR userSettings.zip LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.userSettingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserSettingsDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.user_id ? { id: postData?.id, user_id: postData?.user_id } : { id: postData?.id}: { user_id: postData?.user_id};
            // if(postData?.org_id){                // remove because there is no org_id column in table.
            //     where['org_id'] = postData?.org_id;
            // }
            let recordDetails = await this.userSettingsService.findOne(where);
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
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(UserSettingsDto, recordDetails, req.lang)
            );
            let stateData = await this.companyService.stateList(recordDetails?.state);
            if(recordDetails?.state){
                let state = stateData.find(ele => ele.statecode == recordDetails?.state || ele.state == recordDetails?.state);
                recordDetails.state = state?.['state'];
                recordDetails['statecode'] = state?.['statecode'];
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserSettingsInput) {
        try {
            postData['jobtitle'] = postData?.jobtitle ?? ' ';
            const requiredParams = {
                [appConstant.ROLE["COACH"]]: [
                    'user_id',
                    'coach_type'
                ],
                [appConstant.ROLE["GLOBALCOACH"]]: [
                    'user_id',
                ],
                // Add other role_ids and their corresponding required parameters here
            };
            const requiredParamsForRoleId = requiredParams[postData?.role_id] || [];
            const missingParams = requiredParamsForRoleId.filter(param => (postData[param] == undefined || postData[param] == null));
            if (missingParams.length > 0 || (
                postData?.role_id !== appConstant.ROLE["GLOBALCOACH"] &&
                [ 'user_id' ].some(param => !postData[param])
            )) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { user_id: postData?.user_id };
            const recordDetails = await this.userSettingsService.findOne(where);
            if (recordDetails) {
                await this.userSettingsService.update({id: recordDetails['id']}, postData);
            }
            else{
                await this.userSettingsService.save(postData);
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'The Profile has been added successfully', `/LC_MESSAGES/Dashboard/Profile`,`static`),
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
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
            await this.userSettingsService.update({ id: postData?.id },{});
            this.activityLogService.create(recordDetails, {jobtitle: recordDetails }, tableConstant.TBL_USERS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'The Profile has been deleted successfully', `/LC_MESSAGES/Dashboard/Profile`,`static`),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserSettingsInput) {
        try {
            if (
                !postData?.id ||
                !postData?.user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
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
            delete postData?.role_id;
            if (postData?.avatar_gender) {
                postData.avatar_gender = postData?.avatar_gender;
            }
            if (postData?.avatar_icon) {
                postData.avatar_icon = postData?.avatar_icon;
            }
            if (postData?.avatar_skin_tone) {
                postData.avatar_skin_tone = postData?.avatar_skin_tone;
            }
            if (postData?.avatar_hair_color) {
                postData.avatar_hair_color = postData?.avatar_hair_color;
            }
            if (postData?.avatar_tshirt_color) {
                postData.avatar_tshirt_color = postData?.avatar_tshirt_color;
            }
            if (postData?.avatar_accessories_color) {
                postData.avatar_accessories_color = postData?.avatar_accessories_color;
            }
            if (postData?.avatar_background_color) {
                postData.avatar_background_color = postData?.avatar_background_color;
            }
            await this.userSettingsService.update(where,postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_USERS_SETTINGS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: postData,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'The profile has been updated successfully', `/LC_MESSAGES/Dashboard/Profile`,`static`),
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
            const where = {};
            let resultedData = await this.userSettingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserSettingsDto, resultedData, req.lang)
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
    @Post('toggle-favorites')
    async toggleFavorites(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.user_id || !postData?.video_id || ![1, 2].includes(postData?.form_status)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.userSettingsService.findOne({user_id: postData?.user_id});
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
            let formTitle = {1: "videofavoriteslist",2: "fitnessvideofavoriteslist"};
            let videoObject = recordDetails[formTitle[postData?.form_status]] ? JSON.parse(recordDetails[formTitle[postData?.form_status]]) : '';
            let status: number = 1,message = await this.translatorService.frontendReadTranslation(req.lang, "FAVORITES_VIDEO_ADDED");
            if (videoObject && videoObject.hasOwnProperty(postData?.video_id)) {
                delete videoObject[postData?.video_id];
                status = 0;
                message = await this.translatorService.frontendReadTranslation(req.lang, "FAVORITES_VIDEO_REMOVED");
            } else {
                videoObject = {...videoObject, ...{[postData?.video_id]: `${postData?.video_id}`}}
            }
            videoObject = Object.keys(videoObject).length == 0 ? null : JSON.stringify(videoObject);
            await this.userSettingsService.update({ id: recordDetails.id},{[`${formTitle[postData?.form_status]}`]: videoObject});
            this.activityLogService.create(recordDetails, {[`${formTitle[postData?.form_status]}`]: videoObject}, tableConstant.TBL_USERS_SETTINGS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {status: status,message: message},
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
