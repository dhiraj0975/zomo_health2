import { CommonArrayService, CommonService, GlobalEventsDto, tableConstant } from '@common-constants';
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
import { Like } from "typeorm";
import { AccessGuard, TokenGuard } from '../../../guard';
import { EventGlobalEventsService } from "./globalevents.service";
import { AddGlobalEventsInput, EditGlobalEventsInput, ListGlobalEventsInput } from './input';
@Controller('events/global-events')
@UseGuards(TokenGuard, AccessGuard)
export class EventGlobalEventsController {
    constructor(
        private readonly eventGlobalEventsService: EventGlobalEventsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async add(@Req() req: Request, @Res() res: Response, @Body() postData: AddGlobalEventsInput) {
        try {
            if (!postData?.organization_id || !postData?.event_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.eventGlobalEventsService.findOne({organization_id: postData?.organization_id, event_id: postData?.event_id});
            if (recordDetails) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Global Event'));
            }
            await this.eventGlobalEventsService.save({...postData});
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
    async edit(@Req() req: Request, @Res() res: Response, @Body() postData: EditGlobalEventsInput) {
        try {
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.eventGlobalEventsService.findOne({organization_id: postData?.organization_id, event_id: postData?.event_id});
            if (recordDetails) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Global Event'));
            }
            await this.eventGlobalEventsService.update({ id: postData?.id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_GLOBAL_EVENTS, req.tokenUser?.id);
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, organization_id: postData?.organization_id };
            let recordDetails = await this.eventGlobalEventsService.findOne(where);
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
                await this.commonArrayService.formatToDto(GlobalEventsDto, recordDetails, req.lang)
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListGlobalEventsInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any = {organization_id: postData?.organization_id, status: '1'};
            if (postData?.search_str) {
                where = [
                    { organization_id: postData?.organization_id, status: '1', event_id: Like('%' + postData?.search_str + '%') },
                    { organization_id: postData?.organization_id, status: '1', orderid: Like('%' + postData?.search_str + '%') },
                ];
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.eventGlobalEventsService.listRecord(["ge.id","ge.organization_id","ge.event_id","ge.orderid"],where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(GlobalEventsDto, resultedData, req.lang)
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
    @Post('delete')
    async remove(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let recordData = await this.eventGlobalEventsService.findOne(where);
            if (!recordData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.eventGlobalEventsService.update({ id: postData?.id },{status:2});
            this.activityLogService.create(recordData, {status:2}, tableConstant.EVENTS.TBL_EV_GLOBAL_EVENTS, req.tokenUser?.id, 'delete');
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
    @Post('org-list')
    async orgList(@Req() req: Request, @Res() res: Response, @Body() postData: ListGlobalEventsInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.event_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any = {event_id: postData?.event_id, status: '1'};
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.eventGlobalEventsService.listRecord(["ge.id","ge.organization_id","ge.event_id","ge.orderid",'company.id','company.company_name'],where, { [orderBy]: order },[tableConstant.COMPANIES.TBL_COMPANY]);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(GlobalEventsDto, resultedData, req.lang)
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
}
