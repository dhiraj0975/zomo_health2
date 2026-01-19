import { appConstant, CommonArrayService, CommonService, EventSlotsTimingsDto, tableConstant } from '@common-constants';
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
import * as moment from 'moment-timezone';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { AccessGuard, TokenGuard } from '../../../guard';
import {
    PaginateWithCompanyInput,
} from "../../../input";
import { CreateSlotsTimingsInput, DeleteSlotsTimingsInput, UpdateSlotsTimingsInput } from './input';
import { EventSlotsTimingsService } from "./slotstimings.service";
@Controller('events/slots-timings')
@UseGuards(TokenGuard, AccessGuard)
export class EventSlotsTimingsController {
    constructor(
        private readonly eventSlotsTimingsService: EventSlotsTimingsService,
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
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) ? `est.ev_events_id = ${postData?.ev_events_id} AND est.status != 2` : `est.ev_events_id = ${postData?.ev_events_id} AND est.status = 1`;
            if (postData?.ev_slots_id) {
                where += ` AND est.ev_slots_id = ${postData?.ev_slots_id}`
            }
            if (postData?.search_str) {
                where += ` AND (est.slotdate LIKE '%${postData?.search_str}%' OR est.slotstarttime LIKE '%${postData?.search_str}%' OR est.slotinterval LIKE '%${postData?.search_str}%')`;
            }
            let resultedData = await this.eventSlotsTimingsService.paginateList(
                where,
                postData,
            );
            await Promise.all(resultedData['list'].map(async (data: any) => {
                data['total_booked'] = 0;
                if (data.userbookinglists) {                
                    data['total_booked'] = data.userbookinglists.length;
                }
            }));
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(EventSlotsTimingsDto, resultedData['list'], req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSlotsTimingsInput) {
        try {
            if (!postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            await this.eventSlotsTimingsService.save({...postData, created_by: req.tokenUser?.id});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateSlotsTimingsInput) {
        try {
            if (!postData?.id || !postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.eventSlotsTimingsService.findOne({ id: postData?.id, ev_events_id: postData?.ev_events_id});
            await this.eventSlotsTimingsService.update({ id: postData?.id, ev_events_id: postData?.ev_events_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteSlotsTimingsInput) {
        try {
            if (!postData?.id || !postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, ev_events_id: postData?.ev_events_id };
            const recordDetails = await this.eventSlotsTimingsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.eventSlotsTimingsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, ev_events_id: postData?.ev_events_id };
            let recordDetails = await this.eventSlotsTimingsService.findOne(where);
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
                await this.commonArrayService.formatToDto(EventSlotsTimingsDto, recordDetails, req.lang)
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
    @Post('generate-timeslot')
    async genTimeslot(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let result:any;
            if (!postData?.start_time || !postData?.end_time || (!postData?.interval_in_minutes && !postData?.slot_count)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let slotDuration = 0, totalSlotsInDays = 0;
            if(postData?.slot_count){
                let slotCount = postData?.slot_count;
                const startTime = moment(postData?.start_time, 'HH:mm');
                const endTime = moment(postData?.end_time, 'HH:mm');
                if (startTime.isAfter(endTime)) {
                    slotCount = 0;
                }
                const timeDiff = Math.abs(endTime.diff(startTime, 'minutes'));
                if (slotCount > 0) {
                    slotDuration = Math.round(timeDiff / slotCount);
                }                                           
            }else{
                let slotInterval = postData?.interval_in_minutes;
                const startTime = moment(postData?.start_time, 'HH:mm');
                const endTime = moment(postData?.end_time, 'HH:mm');
                if (startTime.isAfter(endTime)) {
                    slotInterval = 0;
                }
                if (slotInterval > 0) {
                    const timeDiff = endTime.diff(startTime, 'minutes');
                    totalSlotsInDays = Math.round(timeDiff / slotInterval);
                }
            }
            result = {interval_count_per_day: totalSlotsInDays,slotDuration: slotDuration};
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.ev_slots_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any = {ev_slots_id: postData?.ev_slots_id, status: '1'};
            let resultedData = await this.eventSlotsTimingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(EventSlotsTimingsDto, resultedData, req.lang)
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
    @Put('update-status')
    async updateStatus(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || (postData?.status == undefined || postData?.status == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            await Promise.all(postData?.id.split(',').map(async(timing_id)=>{
                await this.eventSlotsTimingsService.update({ id: timing_id},{status: postData?.status});
                this.activityLogService.create({ id: timing_id, status:1}, {status: postData?.status}, tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS, req.tokenUser?.id);
            }));
            let text = 'Slot';
            if (postData?.id.split(',').length > 1) {
                text = 'Slots';
            }
            let message = `${text} has been successfully updated`;
            if (Object.keys(postData).length === 2 && postData?.hasOwnProperty('id') && postData?.hasOwnProperty('status')) {
                if (postData?.status === 1) {
                  message = `${text} has been successfully activated`;
                } else if (postData?.status === 2) {
                  message = `${text} has been successfully deleted`;
                } else {
                  message = `${text} has been successfully deactivated`;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation( req.lang, message, `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
