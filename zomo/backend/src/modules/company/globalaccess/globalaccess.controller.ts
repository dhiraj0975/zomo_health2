import { CommonArrayService, CommonService, GlobalAccessDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { } from '../../../input';
import { UserService } from "../../user/user/user.service";
import { GlobalAccessService } from './globalaccess.service';
@Controller('company/global-access')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class GlobalAccessController {
    constructor(
        private readonly globalAccessService: GlobalAccessService,
        private readonly userService: UserService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.alias) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { alias: postData?.alias };
            let recordDetails = await this.globalAccessService.findOne(where);
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
            const record = JSON.parse(JSON.stringify(recordDetails));
            if (postData?.alias == 'me_fod_access') {
                let detailDescription: any = recordDetails.detail_description;
                let dateInSec = new Date(detailDescription['token_get_at']).getTime() / 1000;
                let tokenExpAt = dateInSec + Number(detailDescription['expires_in']);
                let dateCurrent = new Date().getTime() / 1000;
                if (tokenExpAt < dateCurrent) {
                    let getFodAccessToken = await this.commonService.makeCurlRequest('POST','https://auth.fod247.io/connect/token', `grant_type=client_credentials&scope=fodeapi&client_id=${detailDescription['client_id']}&client_secret=${detailDescription['client_secret']}`,{'Content-Type': 'application/x-www-form-urlencoded'})
                    getFodAccessToken = JSON.parse(getFodAccessToken);
                    if (getFodAccessToken['access_token']) {
                        recordDetails.detail_description['access_token'] = getFodAccessToken['access_token'];
                        recordDetails.detail_description['token_type'] = getFodAccessToken['token_type'];
                        recordDetails.detail_description['expires_in'] = getFodAccessToken['expires_in'];
                        recordDetails.detail_description['token_get_at'] = new Date();
                        await this.globalAccessService.update({ id: recordDetails.id },{...recordDetails});
                        this.activityLogService.create(record, recordDetails, tableConstant.COMPANIES.TBL_GLOBAL_ACCESS, req.tokenUser?.id);
                    }
                }
                let getOoyalaPcode = await this.commonService.makeCurlRequest('GET','https://eapi.fod247.io/v2/user-info', ``,{'Authorization': `Bearer ${recordDetails.detail_description['access_token']}`})
                getOoyalaPcode = JSON.parse(getOoyalaPcode);
                if (getOoyalaPcode['ooyalaPcode']) {
                    recordDetails.detail_description['ooyalaPcode'] = getOoyalaPcode['ooyalaPcode'];
                    recordDetails.detail_description['ooyalaPlayerBrandingId'] = getOoyalaPcode['ooyalaPlayerBrandingId'];
                    await this.globalAccessService.update({ id: recordDetails.id },{...recordDetails});
                    this.activityLogService.create(record, recordDetails, tableConstant.COMPANIES.TBL_GLOBAL_ACCESS, req.tokenUser?.id);
                }
            }
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(GlobalAccessDto, recordDetails, req.lang)
            );
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
    @Post('get-video')
    async getVideo(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.user_id || !postData?.api_key || !postData?.api_secret || !postData?.video_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.user_id, api_key: postData?.api_key, api_secret: postData?.api_secret };
            let checkUser = await this.userService.findUserRecord(where);
            if (!checkUser) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: btoa(`${postData?.video_id}|||||${postData?.user_id}`),
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
