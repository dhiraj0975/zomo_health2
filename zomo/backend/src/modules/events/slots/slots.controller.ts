import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { CommonArrayService, CommonService, EventSlotsDto, tableConstant } from '@common-constants';
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
    PaginateWithCompanyInput
} from "../../../input";
import { EventService } from '../events/events.service';
import { EventSlotsTimingsService } from '../slotstimings/slotstimings.service';
import { EventUserBookingListsService } from '../userbookinglists/userbookinglists.service';
import { CreateSlotsInput, DeleteSlotsInput, UpdateSlotStatusInput } from './input';
import { EventSlotsService } from "./slots.service";
@Controller('events/slots')
@UseGuards(TokenGuard, AccessGuard)
export class EventSlotsController {
    constructor(
        private readonly eventSlotsService: EventSlotsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly eventSlotsTimingsService: EventSlotsTimingsService,
        private readonly notificationsController: NotificationsController,
        private readonly eventService: EventService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `es.ev_events_id = ${postData?.ev_events_id} AND es.status = '1'`;
            if (postData?.search_str) {
                where += ` AND (es.start_date LIKE '%${postData?.search_str}%' OR es.event_location LIKE '%${postData?.search_str}%' OR es.event_address LIKE '%${postData?.search_str}%' OR es.event_city LIKE '%${postData?.search_str}%')`;
            }
            let resultedData = await this.eventSlotsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(EventSlotsDto, resultedData['list'], req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSlotsInput) {
        try {
            postData['organization_id'] = postData?.organization_id ?? 0;
            if (!postData?.ev_events_id || !postData?.start_date || !postData?.end_date || !postData?.start_time || !postData?.end_time || !postData?.dividing_slot_type || !postData?.attendee_limit_type || !postData?.recurring_pattern_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.start_time){
                postData.start_time = moment(postData?.start_time, 'HH:mm:ss').seconds(0).format('HH:mm:ss');
            }
            if(postData?.end_time){
                postData.end_time = moment(postData?.end_time, 'HH:mm:ss').seconds(0).format('HH:mm:ss');
            }
            const recordDetails = await this.eventSlotsService.findOne({...postData});
            if (recordDetails) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Slot'));
            }
            let slotId :any= '';
            if(!postData?.created_by){
                postData.created_by= req.tokenUser?.id;
            }
            const savedSlot = await this.eventSlotsService.saveSlot(postData);
            const eventData = await this.eventService.eventsFindOne(['id','category_id'],{id: postData?.ev_events_id});
            slotId = savedSlot.id;
            this.eventService.addNotification({...savedSlot, id: slotId, event_id: eventData['id'], category_id: eventData['category_id'] ?? null, type: 'add', url: `https://${process.env.DOMAIN}/events${eventData?.category_id ? `/category?category_id=${eventData['category_id']}&eventId=${postData?.ev_events_id}` : `?eventId=${postData?.ev_events_id}`}` }, req);
            let datePeriodData = await this.eventSlotsService.getDatePeriodData(
                savedSlot.start_date,
                savedSlot.end_date,
                savedSlot.recurring_pattern_type,
                savedSlot.weekly_basis_day,
                savedSlot.weekly_basis_day_bio,
                savedSlot.monthly_basis,
                savedSlot.monthly_date_basis,
                savedSlot.monthly_basis_Type,
                savedSlot.monthly_basis_day,
                savedSlot.year_basis_day,
                savedSlot.year_basis_month,
            );
            postData['slot_id'] = savedSlot.id;
            await this.eventSlotsService.getSlotTimings(postData, datePeriodData, req);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Slot has been successfully created', `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.ev_events_id || !postData?.start_date || !postData?.end_date || !postData?.start_time || !postData?.end_time || !postData?.dividing_slot_type || !postData?.attendee_limit_type || !postData?.recurring_pattern_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, ev_events_id: postData?.ev_events_id };
            const recordDetails = await this.eventSlotsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            let itscopy = postData?.itscopy;
            delete postData?.org_id;
            if(itscopy){
                delete postData?.id;
                delete postData?.itscopy;
            }
            if(postData?.start_time){
                postData.start_time = moment(postData?.start_time, 'HH:mm:ss').seconds(0).format('HH:mm:ss');
            }
            if(postData?.end_time){
                postData.end_time = moment(postData?.end_time, 'HH:mm:ss').seconds(0).format('HH:mm:ss');
            }
            if(!postData?.created_by){
                postData.created_by = req.tokenUser?.id;
            }
            const recordExixt = await this.eventSlotsService.findOne({...postData});
            if (recordExixt) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Slot'));
            }
            const savedSlot = await this.eventSlotsService.saveSlot(postData);
            const eventData = await this.eventService.eventsFindOne(['id','category_id'],{id: postData?.ev_events_id});
            let slotId = savedSlot.id;
            if(postData?.start_date || postData?.end_date){
                let notificationData = {
                    event_id: eventData?.id, 
                    category_id: eventData?.category_id ?? null, 
                    org_id: recordDetails?.organization_id, 
                    id: slotId,
                    type: 'update',
                    url: `https://${process.env.DOMAIN}/events${eventData?.category_id ? `/category?category_id=${eventData?.category_id}&eventId=${recordDetails?.ev_events_id}` : `?eventId=${recordDetails?.ev_events_id}`}`,
                };
                if(postData?.start_date){
                    notificationData['start_date'] = postData?.start_date;
                }
                if(postData?.end_date){
                    notificationData['end_date'] = postData?.end_date;                    
                }
                this.eventService.addNotification(notificationData, req);
            }
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_SLOTS, req.tokenUser?.id);
            if (
                (itscopy) ||
                (postData?.start_date && postData?.start_date !== recordDetails.start_date) ||
                (postData?.start_time && postData?.start_time !== recordDetails.start_time) ||
                (postData?.end_date && postData?.end_date !== recordDetails.end_date) ||
                (postData?.dividing_slot_type && postData?.dividing_slot_type !== recordDetails.dividing_slot_type) ||
                (postData?.weekly_basis_day && postData?.weekly_basis_day !== recordDetails.weekly_basis_day) ||
                (postData?.monthly_basis && postData?.monthly_basis !== recordDetails.monthly_basis) ||
                (postData?.monthly_date_basis && postData?.monthly_date_basis !== recordDetails.monthly_date_basis) ||
                (postData?.monthly_basis_Type && postData?.monthly_basis_Type !== recordDetails.monthly_basis_Type) ||
                (postData?.monthly_basis_day && postData?.monthly_basis_day !== recordDetails.monthly_basis_day) ||
                (postData?.year_basis_day && postData?.year_basis_day !== recordDetails.year_basis_day) ||
                (postData?.year_basis_month && postData?.year_basis_month !== recordDetails.year_basis_month) ||
                (postData?.slot_total && postData?.slot_total !== recordDetails.slot_total) ||
                (postData?.slot_interval && postData?.slot_interval !== recordDetails.slot_interval) ||
                (postData?.recurring_pattern_type && postData?.recurring_pattern_type !== recordDetails.recurring_pattern_type) ||
                (postData?.weekly_basis_day_bio && postData?.weekly_basis_day_bio !== recordDetails.weekly_basis_day_bio)
            ) {
                let datePeriodData = await this.eventSlotsService.getDatePeriodData(
                    savedSlot.start_date,
                    savedSlot.end_date,
                    savedSlot.recurring_pattern_type,
                    savedSlot.weekly_basis_day,
                    savedSlot.weekly_basis_day_bio,
                    savedSlot.monthly_basis,
                    savedSlot.monthly_date_basis,
                    savedSlot.monthly_basis_Type,
                    savedSlot.monthly_basis_day,
                    savedSlot.year_basis_day,
                    savedSlot.year_basis_month,
                );
                postData['slot_id'] = savedSlot.id;
                postData['changedData']= true;
                Object.assign(recordDetails, postData)
                await this.eventSlotsService.getSlotTimings(postData, datePeriodData, req);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, (!itscopy) ? 'Slot has been successfully updated' : 'Slot has been successfully copied', `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteSlotsInput) {
        try {
            if (!postData?.id || !postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, ev_events_id: postData?.ev_events_id };
            const recordDetails = await this.eventSlotsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.eventSlotsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.EVENTS.TBL_EV_SLOTS, req.tokenUser?.id, 'delete');
            const slotTimingData = await this.eventSlotsTimingsService.listRecord(`est.ev_slots_id = ${recordDetails?.id} AND est.ev_events_id = ${recordDetails?.ev_events_id}`,null,['est.id','est.status']);
            await this.eventSlotsTimingsService.update(`ev_slots_id = ${recordDetails?.id} AND ev_events_id = ${recordDetails?.ev_events_id}`,{ status: 2});
            this.notificationsController.removeNotification({org_id: recordDetails?.organization_id, slot_id: recordDetails?.id, event_id: recordDetails?.ev_events_id},req);
            if(slotTimingData.length){
                slotTimingData?.map(item=>this.activityLogService.create(item, {status: 2}, tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS, req.tokenUser?.id, 'delete'));
            }
            // const userbookingData = await this.eventUserBookingListsService.listRecord(`eubl.ev_slots_id = ${recordDetails?.id} AND eubl.ev_events_id = ${recordDetails?.ev_events_id} AND eubl.organization_id = ${recordDetails?.organization_id}`,null,['eubl.id','eubl.status']);
            // await this.eventUserBookingListsService.update(`ev_slots_id = ${recordDetails?.id} AND ev_events_id = ${recordDetails?.ev_events_id} AND organization_id = ${recordDetails?.organization_id}`,{ status: 2});
            // if(userbookingData.length){
            //     userbookingData?.map(item=>this.activityLogService.create(item, {status: 2}, tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS, req.tokenUser?.id, 'delete'));
            // }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Slot has been successfully deleted', `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let recordDetails = await this.eventSlotsService.findOne(where);
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
                await this.commonArrayService.formatToDto(EventSlotsDto, recordDetails, req.lang)
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
    @Post('update-status')
    async updateStatus(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateSlotStatusInput) {
        try {
            if (!postData?.id || !postData?.ev_events_id ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, ev_events_id: postData?.ev_events_id };
            const recordDetails = await this.eventSlotsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.eventSlotsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_SLOTS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Slot has been successfully updated' , `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
