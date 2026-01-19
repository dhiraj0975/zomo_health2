import { appConstant, CommonArrayService, CommonService, tableConstant, UserBookingListsDto } from '@common-constants';
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
import { CompanyService } from "src/modules/company/companies/company.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { AccessGuard, TokenGuard } from '../../../guard';
import {
    PaginateWithCompanyInput,
} from "../../../input";
import { EventSlotsTimingsService } from "../slotstimings/slotstimings.service";
import { CreateUserBookingListsInput, DeleteUserBookingListsInput, UpdateUserBookingListsInput } from './input';
import { EventUserBookingListsService } from "./userbookinglists.service";
@Controller('events/user-booking-lists')
@UseGuards(TokenGuard, AccessGuard)
export class EventUserBookingListsController {
    constructor(
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly slotTimingService: EventSlotsTimingsService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `eubl.ev_events_id = ${postData?.ev_events_id} AND eubl.status = '1'`;
            if (postData?.search_str) {
                where += ` AND (eubl.ev_slots_id LIKE '%${postData?.search_str}%' OR eubl.ev_user_id LIKE '%${postData?.search_str}%')`;
            }
            let resultedData = await this.eventUserBookingListsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserBookingListsDto, resultedData['list'], req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserBookingListsInput) {
        try {
            if (!postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            await this.eventUserBookingListsService.save({...postData});
            const slotData = await this.slotTimingService.findOne({ev_events_id: postData?.ev_events_id, ev_slots_id: postData?.ev_slots_id, status: 1});
            slotData ? await this.slotTimingService.update({id: slotData['id']},{ total_booked: slotData['total_booked'] + 1}) : null;
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateUserBookingListsInput) {
        try {
            if (!postData?.id || !postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.eventUserBookingListsService.findOne({ id: postData?.id, ev_events_id: postData?.ev_events_id});
            await this.eventUserBookingListsService.update({ id: postData?.id, ev_events_id: postData?.ev_events_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteUserBookingListsInput) {
        try {
            if (!postData?.id || !postData?.ev_events_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, ev_events_id: postData?.ev_events_id };
            const recordDetails = await this.eventUserBookingListsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.eventUserBookingListsService.update(where,{status:2});            
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS, req.tokenUser?.id, 'delete');
            const slotData = await this.slotTimingService.findOne({ev_events_id: recordDetails['ev_events_id'], ev_slots_id: recordDetails['ev_slots_id'], status: 1});
            if(slotData){
                await this.slotTimingService.update({id: slotData['id']},{ total_booked: slotData['total_booked'] - 1});
                this.activityLogService.create(slotData, { total_booked: slotData['total_booked'] - 1}, tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS, req.tokenUser?.id);
            }
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
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let recordDetails = await this.eventUserBookingListsService.findOne(where);
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
                await this.commonArrayService.formatToDto(UserBookingListsDto, recordDetails, req.lang)
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
    @Post('unregister-list')
    async unregisterList(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.event_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let con = '';
            if(postData?.org_id){
                postData.org_id = postData?.org_id == 0 ? req.tokenUser?.org_id : postData?.org_id;
                let membership_code = await this.companyService.getCompanyCodeFromId(postData?.org_id);
                con = `user.membership_code = ${membership_code}`;
            }
            let where = `eubl.ev_events_id = ${postData?.event_id}`;
            if(req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN){
                where += ` AND eubl.status != 2`;
            }
            else{
                where += ` AND eubl.status = '1'`;
            }
            if (postData?.search_str) {
                where += ` AND(CONCAT(user.first_name, ' ', user.last_name) LIKE '%${postData?.search_str}%' OR user.email LIKE '%${postData?.search_str}%')`;
            }
            let resultedData = await this.eventUserBookingListsService.unregisterList(
                where,
                postData,
                ''
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserBookingListsDto, resultedData['list'], req.lang)
            );
            let registerlist = [];
            for(let ele of resultedData['list']) {
                let slot_id = ele['slot_selected'];
                let slotdata = await this.slotTimingService.findOne({id: slot_id});
                if (!slotdata || slotdata['status'] != 1) {
                    ele['Slottiming'] = { created_by:1};
                    if (slotdata) {
                        ele['Slottiming'] = {created_by: slotdata['created_by']};
                    }
                    registerlist.push(ele);
                }
            }
            const paginateObj = this.commonArrayService.getPaginationVar(
                postData?.page || 1,
                postData?.limit,
            );
            resultedData = this.commonArrayService.paginationResponse(registerlist.slice(0, paginateObj.take), registerlist.length, paginateObj)
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
