import { CommonArrayService, CommonService, OtherRewardDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put, Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Like, Not } from "typeorm";
import { AccessGuard, TokenGuard } from '../../../guard';
import { PaginateWithCampaignInput } from '../input';
import { CreateOtherRewardInput } from './input';
import { OtherRewardService } from "./otherreward.service";
@Controller('campaign/other-reward')
@UseGuards(TokenGuard, AccessGuard)
export class OtherRewardController {
    constructor(
        private readonly campaignOtherRewardService: OtherRewardService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `otherreward.status != 2 `;
            if (postData?.reward_id) {
                where += `AND otherreward.reward_id = '${postData?.reward_id}'`;
            }
            if (postData?.order_id) {
                where += `AND otherreward.order_id = '${postData?.order_id}'`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['otherreward.cust_name','otherreward.point_user','otherreward.point_spouse','otherreward.amt_user','otherreward.amt_spouse']);
            }
            const resultedData = await this.campaignOtherRewardService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(OtherRewardDto, resultedData['list'], req.lang)
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
            if (!postData?.id && !postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.company_id ? { id: postData?.id, company_id: postData?.company_id } : { id: postData?.id}: { company_id: postData?.company_id};
            let campaignDetails = await this.campaignOtherRewardService.findOne(where);
            if (!campaignDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            campaignDetails = <any>(
                await this.commonArrayService.formatToDto(OtherRewardDto, campaignDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignDetails,
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
    async list(@Req() req: Request,@Res() res: Response, @Body() postData: any){
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where: any = { status: Not(2) };
            if (postData?.search_str) {
                where.campaign_name = Like('%' + postData?.search_str + '%');
            }
            if (postData?.company_id) {
                where.campaign_id = postData?.company_id;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.campaignOtherRewardService.listRecord(where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(OtherRewardDto, result, req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateOtherRewardInput) {
        try {
            if (
                !postData?.reward_id ||
                !postData?.cust_name
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const campaignPlanCheck = await this.campaignOtherRewardService.findOne({
                reward_id: postData?.reward_id,
                cust_name: postData?.cust_name,
                status: Not(2)
            });
            if (campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CASH_REWARD_EXIST"));
            }
            await this.campaignOtherRewardService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateOtherRewardInput) {
        try {
            if (!postData?.id || !postData?.reward_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, reward_id: postData?.reward_id, status: Not(2) };
            const recordDetails = await this.campaignOtherRewardService.findOne(where);
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
            await this.campaignOtherRewardService.update(
                { id: postData?.id },
                {
                    ...postData,
                },
            );
            this.activityLogService.create(recordDetails, postData, tableConstant.CAMPAIGN.TBL_IN_OTHER_REWARD, req.tokenUser?.id);
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.campaign_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, campaign_id: postData?.company_id, status: Not(2) };
            let campaignDetails = await this.campaignOtherRewardService.findOne(where);
            if (!campaignDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.campaignOtherRewardService.update(
                { id: postData?.id },
                {
                    status: 2
                },
            );
            this.activityLogService.create(campaignDetails, postData, tableConstant.CAMPAIGN.TBL_IN_OTHER_REWARD, req.tokenUser?.id, 'delete');
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
}
