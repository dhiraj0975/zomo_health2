import { CommonArrayService, CommonDateService, CommonService, QuicklinkClicksDto, tableConstant } from '@common-constants';
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
import { Like } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateQuickLinkClicksInput,
    DeleteQuickLinkClicksInput,
    GetOneQuickLinkClicksInput,
    ListQuickLinkClicksInput,
    PaginateWithCompanyInput,
    UpdateQuickLinkClicksInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { QuickLinkClicksService } from './quicklinkclicks.service';
@Controller('quick-link/quick-link-clicks')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuickLinkClicksController {
    constructor(
        private readonly quickLinkClicksService: QuickLinkClicksService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.quicklink_id || !postData?.activity_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `clicks.status = '1'`;
            if (postData?.search_str) {
                where += ` AND (clicks.quicklink_id = ${postData?.search_str} OR clicks.user_id = ${postData?.search_str} OR clicks.activity_id = ${postData?.search_str})`;
            }
            let resultedData = await this.quickLinkClicksService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuicklinkClicksDto, resultedData['list'], req.lang)
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuickLinkClicksInput) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.quicklink_id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let checkExist: any = await this.frontService.quickLinkClicksExists({user_id: postData?.user_id,quicklink_id: postData?.quicklink_id,created_date: Like('%' + await this.commonDateService.DateTimeFormat(new Date(), 'YYYY-MM-DD') + '%')});
            if (!checkExist) {
                let quizActivityId: any = await this.frontService.quickLinkOne(['id','activity_id'],{id: postData?.quicklink_id});
                postData.activity_id = quizActivityId?.activity_id;
                await this.quickLinkClicksService.save({...postData});
            }
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuickLinkClicksInput) {
        try {
            if (!postData?.id || !postData?.quicklink_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quickLinkClicksService.findOne({ id: postData?.id,quicklink_id: postData?.quicklink_id });
            await this.quickLinkClicksService.update({ id: postData?.id,quicklink_id: postData?.quicklink_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUICK_LINK.TBL_QUICK_LINK_CLICKS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuickLinkClicksInput) {
        try {
            if (!postData?.id || !postData?.quicklink_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, quicklink_id: postData?.quicklink_id };
            const recordDetails = await this.quickLinkClicksService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.quickLinkClicksService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_CLICKS, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuickLinkClicksInput) {
        try {
            if (!postData?.id || !postData?.quicklink_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quickLinkClicksService.findOne({id: postData?.id, quicklink_id: postData?.quicklink_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuicklinkClicksDto, resultedData, req.lang)
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListQuickLinkClicksInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.quicklink_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            var where: any = [{quicklink_id: postData?.quicklink_id}];
            if (postData?.status) {
                where.push({ status: postData?.status, quicklink_id: postData?.quicklink_id })
            }
            if (postData?.search_str) {
                where.push( { quicklink_id: postData?.quicklink_id, user_id: postData?.search_str, activity_id: postData?.search_str })
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'clicks.id';
            let result = await this.quickLinkClicksService.listRecord(["id","quicklink_id","user_id","activity_id","status"],where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(QuicklinkClicksDto, result, req.lang)
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}