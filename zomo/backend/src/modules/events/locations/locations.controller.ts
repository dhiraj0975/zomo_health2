import { CommonArrayService, CommonService, EventsLocationsDto, tableConstant } from '@common-constants';
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
import { Not } from "typeorm";
import { TokenGuard } from '../../../guard';
import {
    PaginateWithCompanyInput,
} from "../../../input";
import { AddLocationsEventsInput, DeleteLocationsEventsInput, EditLocationsEventsInput, ListLocationsEventsInput } from './input';
import { EventLocationsService } from "./locations.service";
@Controller('events/locations')
@UseGuards(TokenGuard)
export class EventLocationsController {
    constructor(
        private readonly eventLocationsService: EventLocationsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `e_location.ev_events_id = ${postData?.ev_events_id}`;
            if (postData?.search_str) {
                where += ` AND (e_location.organization_id LIKE '%${postData?.search_str}%' OR e_location.locations_id LIKE '%${postData?.search_str}%')`;
            }
            let resultedData = await this.eventLocationsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(EventsLocationsDto, resultedData['list'], req.lang)
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
    async add(@Req() req: Request, @Res() res: Response, @Body() postData: AddLocationsEventsInput) {
        try {
            if (!postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            await this.eventLocationsService.save({...postData});
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
    async edit(@Req() req: Request, @Res() res: Response, @Body() postData: EditLocationsEventsInput) {
        try {
            if (!postData?.id || !postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.eventLocationsService.findOne({ id: postData?.id, ev_events_id: postData?.ev_events_id, status: Not(2)});
            await this.eventLocationsService.update({ id: postData?.id, ev_events_id: postData?.ev_events_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_LOCATIONS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteLocationsEventsInput) {
        try {
            if (!postData?.id || !postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, ev_events_id: postData?.ev_events_id, status: Not(2) };
            const recordDetails = await this.eventLocationsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.eventLocationsService.update({...where},{status: 2});
            this.activityLogService.create(recordDetails, {organization_id: -1}, tableConstant.EVENTS.TBL_EV_LOCATIONS, req.tokenUser?.id, 'delete');
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListLocationsEventsInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `e_location.ev_events_id = ${postData?.ev_events_id} AND e_location.status != 2`;
            if (postData?.search_str) {
                where += `AND (e_location.organization_id Like'%${postData?.search_str}%' OR e_location.locations_id Like '%${postData?.search_str}%')`;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.eventLocationsService.listRecord(where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(EventsLocationsDto, resultedData, req.lang)
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
