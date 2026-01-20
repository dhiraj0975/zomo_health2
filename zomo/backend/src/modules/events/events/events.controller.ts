import { WellnessAssignmentService } from '@/modules/company/wellnessassignment/wellnessAssignment.service';
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, EventCategoryDto, EventDto, EventSlotsDto, EventSlotsTimingsDto, tableConstant, UserBookingListsDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put, Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityService } from "src/modules/activity/activity/activity.service";
import { BrokerService } from "src/modules/broker/broker.service";
import { CoachesService } from "src/modules/coach/coaches/coaches.service";
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { DepartmentService } from "src/modules/company/departments/department.service";
import { LocationService } from "src/modules/company/locations/location.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { PaginateWithCompanyInput } from "../../../input";
import { EventCategoryService } from "../eventcategory/eventcategory.service";
import { EventDepartmentsService } from "../eventdepartments/eventdepartments.service";
import { EventGlobalEventsService } from "../globalevents/globalevents.service";
import { EventLocationsService } from "../locations/locations.service";
import { EventSlotsService } from "../slots/slots.service";
import { EventSlotsTimingsService } from "../slotstimings/slotstimings.service";
import { EventUserBookingListsService } from "../userbookinglists/userbookinglists.service";
import { EventService } from "./events.service";
import { AddEventInput, DeleteEventInput, ListEventInput, PaginateWithEventInput, UpdateEventInput } from './input';
const moment = require('moment-timezone');
@Controller('events/event')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class EventController {
    constructor(
        @Inject('TIMEZONE_SERVICE')
        private client: ClientProxy,
        private readonly eventService: EventService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly companyDepartmentService: DepartmentService,
        private readonly companyLocationService: LocationService,
        private readonly eventDepartmentService: EventDepartmentsService,
        private readonly eventLocationService: EventLocationsService,
        private readonly eventGlobalService: EventGlobalEventsService,
        private readonly activityLogService: ActivityLogService,
        private readonly coachesService: CoachesService,
        private readonly brokerService: BrokerService,
        private readonly eventCategoryService: EventCategoryService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly eventSlotsService: EventSlotsService,
        private readonly eventSlotsTimingsService: EventSlotsTimingsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly activityService: ActivityService,
        private readonly wellnessAssignmentService: WellnessAssignmentService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithEventInput) {
        try {
            let role_id = req.tokenUser?.role_id;
            postData = this.commonService.sanitizePayload(postData);
            let where = (role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == role_id) ? `event.id != 0 AND event.status !=2` : `event.status = 1 AND event.category_id IS NULL`;                      
            if(postData?.status != undefined || postData?.status != null){
                where += ` AND event.status = ${postData?.status}`;
            }
            if (role_id === appConstant.ROLE.GLOBALCOACH) {
                let data: any = await this.coachesService.listRecord(`coach.coach_manager_id = ${req?.tokenUser?.id}`, null, ['coach.org_id']);
                if(data.length){
                    data = data?.map(ele => ele.org_id).join(',');
                    where += ` AND event.organization_id in(${data})`;
                }
            }
            if (postData?.org_id) {
                where += ` AND event.organization_id = ${postData?.org_id}`;
            }
            if (postData?.filter_by?.toLowerCase() == 'global') {
                where += ` AND event.organization_id = 0 `;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += ` AND event.organization_id IN(${resultedData.map(ele => ele.org_id).join(',')})`;
                }
                else{
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {
                            list: [],
                            limit: postData?.limit,
                            page: postData?.page,
                            pages: 0,
                            total: 0
                        },
                        message: 'success',
                    });
                }
            }
            if (postData?.search_str && postData?.filter_by?.toLowerCase() == 'organization') {
                const order_by = postData?.order_by;
                delete postData?.order_by;
                //ZOMO-4225
                let orgWhere = 'company.deleted = 0  AND company.status = 1 ';
                orgWhere +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['company.company_name','company.company_logo']);
                const companyData = await this.companyService.paginateList(orgWhere, {...postData, page: 1,} as PaginateWithCompanyInput);
                if (companyData && companyData.list.length) {
                    where += ` AND event.organization_id = ${companyData.list[0].id} `;
                }
                else{
                    //ZOMO-4225
                    // where += ` AND event.event_name = '${postData?.search_str}' AND event.event_description = '${postData?.search_str}' AND event.organization_id = 199019`;
                    where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['event.event_name','event.event_description']);
                    where += ` AND event.organization_id = 199019`;
                }
                postData.order_by = order_by;
            }
            if (postData?.search_str && postData?.filter_by?.toLowerCase() != 'organization') {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['event.event_name','event.event_description']);
            }
            let resultedData = await this.eventService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(EventDto, resultedData['list'], req.lang)
            );
            await Promise.all(resultedData['list'].map(async (ele)=>{
                if (ele?.['companies'] && ele?.['companies']?.length) {
                    ele['companies'] = ele['companies'].filter(company => company.company != null || company.company_name != undefined);
                }
                if(ele.event_name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`,`dynamic`);
                    ele.event_name = (customName == '' || customName == `event_name_${ele['id']}`) ? ele['event_name'] : customName;
                }
                if(ele.event_description){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_description_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`,`dynamic`);
                    ele.event_description = (customName == '' || customName == `event_description_${ele['id']}`) ? ele['event_description'] : customName;
                }
                if(ele.event_address){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_address_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`,`dynamic`);
                    ele.event_address = (customName == '' || customName == `event_address_${ele['id']}`) ? ele['event_address'] : customName;
                }
                if(ele.event_city){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_city_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`,`dynamic`);
                    ele.event_city = (customName == '' || customName == `event_city_${ele['id']}`) ? ele['event_city'] : customName;
                }
                if(ele.event_state){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_state_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`,`dynamic`);
                    ele.event_state = (customName == '' || customName == `event_state_${ele['id']}`) ? ele['event_state'] : customName;
                }
                if(ele.user_id){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`selectedName_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`,`dynamic`);
                    ele.user_id = (customName == '' || customName == `selectedName_${ele['id']}`) ? ele['user_id'] : customName;
                }
                if(ele.event_location){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_location_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`,`dynamic`);
                    ele.event_location = (customName == '' || customName == `event_location_${ele['id']}`) ? ele['event_location'] : customName;
                }
            }));
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
    @Post('global-coach-paginate')
    async globalCoachPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithEventInput) {
        try {
            let role_id = req.tokenUser?.role_id;
            postData = this.commonService.sanitizePayload(postData);
            if (![appConstant.ROLE.GLOBALCOACH].includes(role_id)) { 
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let where = postData?.category_id ? `event.status = 1 AND event.category_id = ${postData?.category_id}` : `event.status = 1 AND event.category_id IS NULL`;                      
            if(postData?.status != undefined || postData?.status != null){
                where += ` AND event.status = ${postData?.status}`;
            }
            let globalEventList = [];
            let eventCategoryList = [];
            let eventList = [];
            let categoryWhere = `e_category.status = 1`;  
            let globalWhere = `ge.status = 1`;  
            let result = [];

            if (postData?.filter_by?.toLowerCase() == 'global') {
                where += ` AND event.organization_id = 0 `;
            }
            let orgData: any = await this.coachesService.listRecord(`coach.coach_manager_id = ${req?.tokenUser?.id}`, null, ['coach.org_id']);
            if(orgData.length){
                orgData = orgData?.map(ele => ele.org_id).join(',');
                postData.org_id = orgData;
            }
            if(postData?.search_str){
                if (postData?.filter_by?.toLowerCase() == 'organization') {
                    const order_by = postData?.order_by;
                    delete postData?.order_by;
                    let orgWhere = 'company.deleted = 0  AND company.status = 1 ';
                    orgWhere +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['company.company_name','company.company_logo']);
                    const companyData = await this.companyService.paginateList(orgWhere, {...postData, page: 1,} as PaginateWithCompanyInput);
                    if (companyData && companyData.list.length) {
                        postData.org_id = companyData.list[0].id;
                    }
                    else{
                        postData.org_id = 1990190;
                    }
                    postData.order_by = order_by;
                }
                else if(postData?.filter_by?.toLowerCase() == 'category'){
                    categoryWhere +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['e_category.category_name']);
                }
                else if (postData?.filter_by?.toLowerCase() == 'global') {
                    globalWhere +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['ev.event_name','ev.event_description']);
                    let data: any = await this.coachesService.listRecord(`coach.coach_manager_id = ${req?.tokenUser?.id}`, null, ['coach.org_id']);
                    if(data.length){
                        data = data?.map(ele => ele.org_id).join(',');
                        postData.org_id = data;
                    }
                }
                
            }
            
            if (postData?.org_id) {
                where += ` AND event.organization_id in(${postData?.org_id})`;
                categoryWhere += ` AND e_category.c_companies_id IN (${postData?.org_id})`;
                globalWhere += ` AND ge.organization_id IN(${postData?.org_id})`;
            }
            if(!postData?.category_id && (!postData?.filter_by || (postData?.filter_by?.toLowerCase() != 'category' && postData?.filter_by?.toLowerCase() == 'global'))){
                let globalEvent = await this.eventGlobalService.listRecord(['ge.event_id'], globalWhere, null,[tableConstant.EVENTS.TBL_EV_EVENTS]);
                globalEventList = globalEvent?.length ? await this.eventService.eventsList(['event'],`event.id IN (${[...new Set(globalEvent?.map(ele => ele.event_id))].join(',')}) AND event.status = 1`, null) : [];
                if(globalEventList && globalEventList.length){
                    globalEventList = <any>(await this.commonArrayService.formatToDto(EventDto, globalEventList, req.lang));
                    globalEventList = globalEventList.map((ele)=>{ele.is_global = 1; return ele});
                }
            }
            if(!postData?.category_id && (!postData?.filter_by || postData?.filter_by?.toLowerCase() == 'category')){
                eventCategoryList = await this.eventCategoryService.listRecord(['e_category','company.id','company.company_name'], categoryWhere, null, [tableConstant.COMPANIES.TBL_COMPANY]);
                if(eventCategoryList && eventCategoryList.length){
                    eventCategoryList = <any>(await this.commonArrayService.formatToDto(EventCategoryDto, eventCategoryList, req.lang));
                    eventCategoryList = eventCategoryList.map((ele)=>{ele.is_category = 1; return ele});
                }
            }
            if(!postData?.filter_by || (postData?.filter_by?.toLowerCase() != 'category' && postData?.filter_by?.toLowerCase() != 'global')){
                eventList = await this.eventService.listRecord(["event", 'company', 'companie', 'global_events', 'slot', 'category'],
                    where
                );
                eventList = <any>(
                    await this.commonArrayService.formatToDto(EventDto, eventList, req.lang)
                );
            }
            
            result = [...eventCategoryList, ...globalEventList, ...eventList];
            const finalPaginateObj = this.commonArrayService.getPaginationVar(postData?.page || 1, postData?.limit || 10);
            let total = result?.length || 0;
            let resultedData = this.commonArrayService.paginationResponseChallengeReport(result, total, finalPaginateObj);
            await Promise.all(resultedData['list'].map(async (item)=>{
                if(!item?.is_category){
                    item['booking_count'] = 0;  
                    let userBooking = await this.eventUserBookingListsService.userBookingListRecordGlobalCoach(`eubl.ev_events_id = ${item.id} AND eubl.status != 2`, null, ['eubl'])
                    if(userBooking.length > 0){  
                        await Promise.all(userBooking.map(async (booking) => {
                        if(booking?.slot_selected !== '-1') {
                            let slotData = await this.eventSlotsTimingsService.findOne({ id: Number(booking.slot_selected), status: 1 });                                               
                            if(!slotData){
                                item['booking_count'] += 1;
                            }
                        }
                        }));  
                        userBooking = userBooking.filter(
                        (item, index, self) =>
                        index === self.findIndex(t => t.ev_user_id === item.ev_user_id)
                        ); 
                        item['user_count'] = userBooking.length;
                    }            
                }
                if (item?.['companies'] && item?.['companies']?.length) {
                    item['companies'] = item['companies'].filter(company => company.company != null || company.company_name != undefined);
                }
                if(item.event_name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${item['id']}`, `/LC_MESSAGES/Events/Events/${item['organization_id'] || 0}/${item['id']}`,`dynamic`);
                    item.event_name = (customName == '' || customName == `event_name_${item['id']}`) ? item['event_name'] : customName;
                }
                if(item.event_description){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_description_${item['id']}`, `/LC_MESSAGES/Events/Events/${item['organization_id'] || 0}/${item['id']}`,`dynamic`);
                    item.event_description = (customName == '' || customName == `event_description_${item['id']}`) ? item['event_description'] : customName;
                }
                if(item.event_address){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_address_${item['id']}`, `/LC_MESSAGES/Events/Events/${item['organization_id'] || 0}/${item['id']}`,`dynamic`);
                    item.event_address = (customName == '' || customName == `event_address_${item['id']}`) ? item['event_address'] : customName;
                }
                if(item.event_city){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_city_${item['id']}`, `/LC_MESSAGES/Events/Events/${item['organization_id'] || 0}/${item['id']}`,`dynamic`);
                    item.event_city = (customName == '' || customName == `event_city_${item['id']}`) ? item['event_city'] : customName;
                }
                if(item.event_state){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_state_${item['id']}`, `/LC_MESSAGES/Events/Events/${item['organization_id'] || 0}/${item['id']}`,`dynamic`);
                    item.event_state = (customName == '' || customName == `event_state_${item['id']}`) ? item['event_state'] : customName;
                }
                if(item.user_id){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`selectedName_${item['id']}`, `/LC_MESSAGES/Events/Events/${item['organization_id'] || 0}/${item['id']}`,`dynamic`);
                    item.user_id = (customName == '' || customName == `selectedName_${item['id']}`) ? item['user_id'] : customName;
                }
                if(item.event_location){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_location_${item['id']}`, `/LC_MESSAGES/Events/Events/${item['organization_id'] || 0}/${item['id']}`,`dynamic`);
                    item.event_location = (customName == '' || customName == `event_location_${item['id']}`) ? item['event_location'] : customName;
                }
            }));
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
    @Post('create')
    async add(@Req() req: Request, @Res() res: Response, @Body() postData: AddEventInput) {
        try {
            postData.created_by_user_id = postData?.created_by_user_id ?? req.tokenUser?.id;
            if (!postData?.created_by_user_id || !postData?.event_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let all_locations = [];
            let all_departments = [];
            let organization_id = postData?.organization_id.split(',');
            let resultData;
            if (!postData?.all_locations?.includes('all_loc')) {
                all_locations = postData?.all_locations.split(',');
                delete postData?.all_locations;
            }
            if (!postData?.all_departments?.includes('all_dept')) {
                all_departments = postData?.all_departments.split(',');
                delete postData?.all_departments;
            }
            if(postData?.healthplanname){
                if(Array.isArray(postData?.healthplanname) && postData?.healthplanname.length > 0){
                    postData.healthplanname = JSON.stringify(postData?.healthplanname);
                }else{
                    postData.healthplanname = '';
                }
            }
            if(!postData?.start_date){
                postData.start_date = null;
            }
            if(!postData?.end_date){
                postData.end_date = null;
            }
            for (let org_id of organization_id) {
                if (organization_id.length > 1) {
                    postData.organization_id = '0';
                } else {
                    postData.organization_id = org_id;
                }
                if (organization_id.length && organization_id[0] == org_id) {
                    let activityData = await this.activityService.save({category_id: 21, activity_name: postData?.event_name, accebility: postData?.organization_id, status: 1});
                    if(activityData){
                        postData.activity_id = activityData['id'];
                    }
                    resultData = await this.eventService.save({ ...postData });
                    let dynamicDatas = Object.create(null);
                    if(postData?.event_name){
                        let tilte = `event_name_${resultData['id']}`
                        dynamicDatas[`${tilte}`]= postData?.event_name;
                    }            
                    if(postData?.event_description){
                        let tilte = `event_description_${resultData['id']}`
                        dynamicDatas[`${tilte}`]= postData?.event_description;
                    }            
                    if(postData?.event_address){
                        let tilte = `event_address_${resultData['id']}`
                        dynamicDatas[`${tilte}`]= postData?.event_address;
                    }            
                    if(postData?.event_city){
                        let tilte = `event_city_${resultData['id']}`
                        dynamicDatas[`${tilte}`]= postData?.event_city;
                    }            
                    if(postData?.event_state){
                        let stateData = await this.companyService.stateList(resultData?.event_state);
                        let state = stateData.find(ele => ele.statecode == resultData?.event_state || ele.state == resultData?.event_state);
                        postData['event_state'] = state?.['state'];
                        let tilte = `event_state_${resultData['id']}`
                        dynamicDatas[`${tilte}`]= postData?.event_state;
                    }            
                    if(postData?.user_id){
                        let tilte = `selectedName_${resultData['id']}`
                        dynamicDatas[`${tilte}`]= postData?.user_id;
                    }            
                    if(postData?.event_location){
                        let tilte = `event_location_${resultData['id']}`
                        dynamicDatas[`${tilte}`]= postData?.event_location;
                    }            
                    await this.translatorService.DynamicEngJsonData('Events',org_id,dynamicDatas,'Edit','Events',resultData['id']);
                    if(postData?.start_date && postData?.end_date){
                        let notificationData = {
                            event_id: resultData?.id, 
                            category_id: resultData?.category_id ?? null, 
                            org_id: resultData?.organization_id, 
                            id: resultData?.id,
                            type: 'update',
                            url: `https://${process.env.DOMAIN}/events${ resultData?.category_id ? `/category?category_id=${resultData?.category_id}&eventId=${resultData?.id}` : `?eventId=${resultData?.id}`}`
                        };
                        if(postData?.start_date){
                            notificationData['start_date'] = postData?.start_date;
                        }
                        if(postData?.end_date){
                            notificationData['end_date'] = postData?.end_date;                    
                        }
                        this.eventService.addNotification(notificationData, req);
                    }
                }
                if (all_locations.length) {
                    const locationData = await this.companyLocationService.filterData(`location.company_id = ${org_id} AND location.id IN(${all_locations})`);
                    for (let location of locationData.map((ele) => ele.id)) {
                        await this.eventLocationService.save({ ev_events_id: resultData?.['id'], organization_id: org_id, locations_id: location, display_timeslot: 0 });
                    }
                }
                if (all_departments.length) {
                    const departmentData = await this.companyDepartmentService.filterData(`department.company_id = ${org_id} AND department.id IN(${all_departments})`);
                    for (let department of departmentData.map((ele) => ele.id)) {
                        await this.eventDepartmentService.save({ ev_events_id: resultData?.['id'], organization_id: org_id, departments_id: department });
                    }
                }
                if (postData?.organization_id == '0') {
                    await this.eventGlobalService.save({ event_id: resultData?.['id'], organization_id: org_id, status: postData?.status ?? 1 });
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Event has been created successfully.'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateEventInput) {
        try {
            const role = req.tokenUser?.role_id;
            postData.created_by_user_id = postData?.created_by_user_id ?? req.tokenUser?.id;
            if ((!postData?.id || !postData?.created_by_user_id) && (role != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != role)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.healthplanname){
                if(Array.isArray(postData?.healthplanname) && postData?.healthplanname.length > 0){
                    postData.healthplanname = JSON.stringify(postData?.healthplanname);
                }else{
                    postData.healthplanname = '';
                }
            }
            let all_locations = [];
            let all_departments = [];
            let organization_id = postData?.organization_id?.split(',') || [];
            if (organization_id.length > 1) {
                postData.organization_id = '0';
            }
            let resultedData = await this.eventService.findOne({ id: postData?.id });
            const recordDetails = JSON.parse(JSON.stringify(resultedData));
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            // delete global event issue
            if (postData?.organization_id && resultedData.organization_id == 0) {
                postData.organization_id = '0';
            }
            if (postData?.all_locations && !postData?.all_locations?.includes('all_loc')) {
                all_locations = postData?.all_locations.split(',');
                if (resultedData.all_locations == 'all_loc') {
                    postData.all_locations = null;
                }
                else {
                    delete postData?.all_locations;
                }
            }
            if (postData?.all_departments && !postData?.all_departments?.includes('all_dept')) {
                all_departments = postData?.all_departments.split(',');
                if (resultedData.all_departments == 'all_dept') {
                    postData.all_departments = null;
                }
                else {
                    delete postData?.all_departments;
                }
            }
            if (!resultedData?.all_locations && postData?.all_locations == 'all_loc') {
                const locationData = await this.eventLocationService.listRecord({ ev_events_id: resultedData['id'], organization_id: resultedData.organization_id, status: Not(2) });
                await this.eventLocationService.update({ ev_events_id: resultedData['id'], organization_id: resultedData.organization_id, status: Not(2) },{ status: 2 });
                locationData.map((ele) => this.activityLogService.create(ele, { organization_id: -1 }, tableConstant.EVENTS.TBL_EV_LOCATIONS, req.tokenUser?.id, 'delete'));
            }
            if (!resultedData?.all_departments && postData?.all_departments == 'all_dept') {
                const departmentData = await this.eventDepartmentService.list({ ev_events_id: resultedData['id'], organization_id: resultedData.organization_id, status: Not(2) });
                await this.eventDepartmentService.update({ ev_events_id: resultedData['id'], organization_id: resultedData.organization_id },{status: 2});
                departmentData.map((ele) => this.activityLogService.create(ele, { organization_id: -1 }, tableConstant.EVENTS.TBL_EV_DEPARTMENTS, req.tokenUser?.id, 'delete'));
            }
            if (organization_id.length > 1 && resultedData.organization_id != 0) {
                await Promise.all(organization_id.map(async (org_id) => { 
                    let check = await this.eventGlobalService.findOne({ event_id: resultedData['id'], organization_id: org_id });
                    if(check){
                        await this.eventGlobalService.update({id: check.id},{ event_id: resultedData['id'], organization_id: org_id , status: 1});
                    }
                    else{
                        await this.eventGlobalService.save({ event_id: resultedData['id'], organization_id: org_id , status: 1});
                    }
                }));
            }
            const orglist = await this.eventGlobalService.listRecord(null, { event_id: resultedData['id'], status: Not(2) });
            const removedOrgs = organization_id.length ? orglist?.map((e) => e.organization_id.toString()).filter(element => !organization_id.includes(element)) : [];
            const addedOrgs = orglist.length ? organization_id.filter(element => !orglist.map((e) => e.organization_id.toString()).includes(element)) : orglist.length == 0 && organization_id.length ? organization_id : [];
            if (removedOrgs.length) {
                for (let org_id of removedOrgs) {
                    if (all_locations.length) {
                        const locationData = await this.companyLocationService.filterData(`location.company_id = ${org_id} AND location.id IN(${all_locations})`);
                        if (locationData.length) {
                            for (let location of locationData.map((ele) => ele.id)) {
                                const locationData = await this.eventLocationService.listRecord({ ev_events_id: resultedData['id'], organization_id: org_id, locations_id: location, status: Not(2) });
                                await this.eventLocationService.update({ ev_events_id: resultedData['id'], organization_id: org_id, locations_id: location, status: Not(2) },{status: 2});
                                locationData.map((ele) => this.activityLogService.create(ele, { organization_id: -1 }, tableConstant.EVENTS.TBL_EV_LOCATIONS, req.tokenUser?.id, 'delete'));
                            }
                        }
                    }
                    if (all_departments.length) {
                        const departmentData = await this.companyDepartmentService.filterData(`department.company_id = ${org_id} AND department.id IN(${all_departments})`);
                        if (departmentData.length) {
                            for (let department of departmentData.map((ele) => ele.id)) {
                                const departmentData = await this.eventDepartmentService.list({ ev_events_id: resultedData['id'], organization_id: org_id, departments_id: department, status: Not(2) });
                                await this.eventDepartmentService.update({ ev_events_id: resultedData['id'], organization_id: org_id, departments_id: department },{status: 2});
                                departmentData.map((ele) => this.activityLogService.create(ele, { organization_id: -1 }, tableConstant.EVENTS.TBL_EV_DEPARTMENTS, req.tokenUser?.id, 'delete'));
                            }
                        }
                    }
                    if (postData?.organization_id == '0') {
                        await this.eventGlobalService.update({ event_id: resultedData['id'], organization_id: org_id },{ status: 2 });
                    }
                }
            }
            if(orglist.length > 0 && removedOrgs.length > 0 && (orglist.length - removedOrgs.length) == 1){
                let org_id = orglist.filter(ele => !removedOrgs.includes(ele.organization_id.toString()))?.[0]?.organization_id
                await this.eventGlobalService.update({ event_id: resultedData['id'], organization_id: org_id },{ status: 2 });
                postData.organization_id = org_id;

            }
            if (addedOrgs.length) {
                for (let org_id of addedOrgs) {
                    if (all_locations.length) {
                        const locationData = await this.companyLocationService.filterData(`location.company_id = ${org_id} AND location.id IN(${all_locations})`);
                        if (locationData.length) {
                            for (let location of locationData.map((ele) => ele.id)) {
                                let locationData = await this.eventLocationService.findOne({ ev_events_id: resultedData['id'], organization_id: org_id, locations_id: location, status: Not(2)});
                                if(!locationData){
                                    await this.eventLocationService.save({ ev_events_id: resultedData['id'], organization_id: org_id, locations_id: location, display_timeslot: 0 });
                                }
                                else{
                                    await this.eventLocationService.update({ ev_events_id: locationData['id'] },{status: 1});
                                }
                            }
                        }
                    }
                    if (all_departments.length) {
                        const departmentData = await this.companyDepartmentService.filterData(`department.company_id = ${org_id} AND department.id IN(${all_departments})`);
                        if (departmentData.length) {
                            for (let department of departmentData.map((ele) => ele.id)) {
                                let departmentData = await this.eventDepartmentService.findOne({ ev_events_id: resultedData['id'], organization_id: org_id, departments_id: department, status: Not(2) });
                                if(!departmentData){
                                    await this.eventDepartmentService.save({ ev_events_id: resultedData['id'], organization_id: org_id, departments_id: department });
                                }
                                else{
                                    await this.eventDepartmentService.update({ ev_events_id: departmentData['id'] },{status: 1});
                                }
                            }
                        }
                    }
                    if (postData?.organization_id == '0') {
                        let check = await this.eventGlobalService.findOne({ event_id: resultedData['id'], organization_id: org_id });
                        if(check){
                            await this.eventGlobalService.update({id: check.id},{ event_id: resultedData['id'], organization_id: org_id , status: 1});
                        }
                        else{
                            await this.eventGlobalService.save({ event_id: resultedData['id'], organization_id: org_id , status: 1});
                        }
                    }
                }
            }
            if (removedOrgs.length == 0 && (addedOrgs.length == 0 || organization_id.includes(recordDetails.organization_id.toString())) && (all_locations.length || resultedData.all_locations == 'all_loc')) {
                let locationData = await this.eventLocationService.listRecord({ ev_events_id: resultedData['id'], organization_id: recordDetails?.company?.id || 0, status: Not(2) });
                locationData = locationData.filter(ele=> !all_locations.includes(ele.locations_id.toString()));
                locationData.map(async(ele) => {
                    await this.eventLocationService.update({ id: ele.id },{status: 2});
                    this.activityLogService.create(ele, { organization_id: -1 }, tableConstant.EVENTS.TBL_EV_LOCATIONS, req.tokenUser?.id, 'delete')
                });
                for (let location of all_locations) {
                    let locationData = await this.eventLocationService.findOne({ ev_events_id: resultedData['id'], organization_id: recordDetails?.company?.id || 0, locations_id:  location, status: Not(2)});
                    if(!locationData){
                        await this.eventLocationService.save({ ev_events_id: resultedData['id'], organization_id: resultedData.organization_id, locations_id: location, display_timeslot: 0 });
                    }
                }
            }
            if (removedOrgs.length == 0 && (addedOrgs.length == 0 || organization_id.includes(recordDetails.organization_id.toString())) && (all_departments.length || resultedData.all_departments == 'all_dept')) {
                let departmentData = await this.eventDepartmentService.list({ ev_events_id: resultedData['id'], organization_id: recordDetails?.company?.id || 0, status: Not(2) });
                departmentData = departmentData.filter(ele=> !all_departments.includes(ele.departments_id.toString()));
                departmentData.map(async(ele) => {
                    await this.eventDepartmentService.update({ id: ele.id },{status: 2});
                    this.activityLogService.create(ele, { organization_id: -1 }, tableConstant.EVENTS.TBL_EV_DEPARTMENTS, req.tokenUser?.id, 'delete')
                });
                for (let department of all_departments) {
                    let departmentData = await this.eventDepartmentService.findOne({ ev_events_id: resultedData['id'], organization_id: recordDetails?.company?.id || 0, departments_id: department, status: Not(2) });
                    if(!departmentData){
                        await this.eventDepartmentService.save({ ev_events_id: resultedData['id'], organization_id: resultedData.organization_id, departments_id: department });
                    }
                }
            }
            if(postData?.start_date == ''){
                postData.start_date = null;
            }
            if(postData?.end_date == ''){
                postData.end_date = null;
            }
            await this.eventService.update({ id: postData?.id }, { ...postData });
            if(recordDetails?.activity_id){
                await this.activityService.update({id: recordDetails.activity_id}, {activity_name: postData?.event_name});
            }
            let dynamicDatas = Object.create(null);
            if(postData?.event_name){
                let tilte = `event_name_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.event_name;
            }            
            if(postData?.event_description){
                let tilte = `event_description_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.event_description;
            }            
            if(postData?.event_address){
                let tilte = `event_address_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.event_address;
            }            
            if(postData?.event_city){
                let tilte = `event_city_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.event_city;
            }            
            if(postData?.event_state){
                let stateData = await this.companyService.stateList(postData?.event_state);
                let state = stateData.find(ele => ele.statecode == postData?.event_state || ele.state == postData?.event_state);
                postData['event_state'] = state?.['state'];
                let tilte = `event_state_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.event_state;
            }            
            if(postData?.user_id){
                let tilte = `selectedName_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.user_id;
            }            
            if(postData?.event_location){
                let tilte = `event_location_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.event_location;
            }            
            await this.translatorService.DynamicEngJsonData('Events',postData?.organization_id || 0,dynamicDatas,'Edit','Events',recordDetails['id']);
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_EVENTS, req.tokenUser?.id);     
            let message ;
            if([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(role)){
                message = (Object.keys(postData).length === 3 && postData?.hasOwnProperty('created_by_user_id') && postData?.hasOwnProperty('id') && postData?.hasOwnProperty('status')) ? (postData?.status == 1) ? 'Event has been successfully activated' : 'Event has been successfully deactivated' : 'Event has been updated successfully';
            }else if([appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCOACH,appConstant.ROLE.BROKER,appConstant.ROLE.BROKERADMIN,appConstant.ROLE.REGIONALADMIN].includes(role)){
                message = (Object.keys(postData).length === 4 && postData?.hasOwnProperty('created_by_user_id') && postData?.hasOwnProperty('organization_id') && postData?.hasOwnProperty('id') && postData?.hasOwnProperty('status')) ? (postData?.status == 1) ? 'Event has been successfully activated' : 'Event has been successfully deactivated' : 'Event has been updated successfully';
            }else{
                message = (Object.keys(postData).length === 2 && postData?.hasOwnProperty('created_by_user_id') && postData?.hasOwnProperty('status')) ? (postData?.status == 1) ? 'Event has been successfully activated' : 'Event has been successfully deactivated' : 'Event has been updated successfully';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message : await this.translatorService.frontendReadTranslation( req.lang, message, `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteEventInput) {
        try {
            postData.created_by_user_id = postData?.created_by_user_id ?? req.tokenUser?.id;
            if (!postData?.id || !postData?.created_by_user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id };
            const recordDetails = await this.eventService.findOne({ ...where });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.eventService.update(where, { status: 2 });
            if(recordDetails?.activity_id){
                await this.activityService.update({id: recordDetails.activity_id}, {status: 2});
            }
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.EVENTS.TBL_EV_EVENTS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation( req.lang, 'Event has been deleted successfully', `/LC_MESSAGES/Events/Events`, `static`)+`.`,
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListEventInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (!postData?.created_by_user_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            // let where: any = req.tokenUser?.role_id == appConstant.ROLE.ADMIN || req.tokenUser?.role_id == appConstant.ROLE.WCH ? 'event.status = 1' : `event.created_by_user_id = ${postData?.created_by_user_id} AND event.status = 1`;
            // ZOMO-3823
            let where: any = req.tokenUser?.role_id == appConstant.ROLE.ADMIN || req.tokenUser?.role_id == appConstant.ROLE.WCH ? 'event.status = 1' : `event.created_by_user_id IN(1,${postData?.created_by_user_id}) AND event.status = 1`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['event.event_name'])
            }
            if (postData?.category_id) {
                where += ` AND event.category_id = ${postData?.category_id}`;
            }
            if (postData?.event_type != undefined || postData?.event_type != null) {
                if(postData?.event_type == 0){
                    where += ` AND event.event_type in(0,1)`;
                }else{
                    where += ` AND event.event_type = ${postData?.event_type}`;
                }
            }
            if (postData?.org_id) {
                where += ` ${where.length ? 'AND' : ''} event.organization_id = ${postData?.org_id}`;
                let globaleventList = await this.eventGlobalService.listRecord(
                    ["ge.id", "ge.event_id", "ge.orderid", "ge.status"],
                    `ge.organization_id In(${postData?.org_id}) and ge.status != 2 and ev.status != 2 ${postData?.event_type == 0 ? `AND ev.event_type in(0,1)` : postData?.event_type ? `AND ev.event_type = ${postData?.event_type}` : ``}`,
                    null,
                    [tableConstant.EVENTS.TBL_EV_EVENTS]
                );
                if(globaleventList.length){
                    where += ` OR event.id IN(${globaleventList.map((ele) => ele.event_id).toString()})`;
                }

            }
            let joinTable =[];
            // if(postData?.department_id || postData?.location_id){
            //     joinTable.push(tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS);
            //     joinTable.push(tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER);
            // }
            if(postData?.department_id){
                postData.is_all = 0;
                joinTable.push(tableConstant.EVENTS.TBL_EV_DEPARTMENTS);
                where += ` AND(${postData?.is_all ? `(event.all_departments = 'all_dept') OR`: ''} (ev_department.organization_id in(${postData.org_id}) AND ev_department.departments_id IN(${postData?.department_id}) AND ev_department.status != 2))`;
                // where += ` AND(${postData?.is_all ? `(event.all_departments = 'all_dept') OR`: ''} (ev_department.organization_id in(${postData.org_id}) AND ev_department.departments_id IN(${postData?.department_id}) AND ev_department.status != 2) OR user.department_id IN(${postData?.department_id}) OR linkuser.department_id IN(${postData?.department_id}) )`;
            }
            if(postData?.location_id){
                postData.is_all = 0;
                joinTable.push(tableConstant.EVENTS.TBL_EV_LOCATIONS);
                where += ` AND(${postData?.is_all ? `(event.all_locations = 'all_loc') OR`: ''} (ev_location.organization_id in(${postData.org_id}) AND ev_location.locations_id IN(${postData?.location_id}) AND ev_location.status != 2))`;
                // where += ` AND(${postData?.is_all ? `(event.all_locations = 'all_loc') OR`: ''} (ev_location.organization_id in(${postData.org_id}) AND ev_location.locations_id IN(${postData?.location_id}) AND ev_location.status != 2)  OR user.location IN(${postData?.location_id}) OR linkuser.location IN(${postData?.location_id}))`;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.eventService.listRecord(["event.id","event.event_name"], where, { [orderBy]: order },null,joinTable);
            resultedData = [...new Set(resultedData.map(a => JSON.stringify(a)))].map(e => JSON.parse(e));
            resultedData = await this.commonFileService.convertRawDataColumnsToEntityColumns(resultedData,'event_');
            resultedData = <any>(
                await this.commonArrayService.formatToDto(EventDto, resultedData, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.event_name) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `event_name_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`, `dynamic`);
                            ele.event_name = (customName == '' || customName == `event_name_${ele['id']}`) ? ele['event_name'] : customName;
                        }
                        if (ele.event_description) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `event_description_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`, `dynamic`);
                            ele.event_description = (customName == '' || customName == `event_description_${ele['id']}`) ? ele['event_description'] : customName;
                        }
                        if (ele.event_address) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `event_address_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`, `dynamic`);
                            ele.event_address = (customName == '' || customName == `event_address_${ele['id']}`) ? ele['event_address'] : customName;
                        }
                        if (ele.event_city) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `event_city_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`, `dynamic`);
                            ele.event_city = (customName == '' || customName == `event_city_${ele['id']}`) ? ele['event_city'] : customName;
                        }
                        if (ele.event_state) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `event_state_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`, `dynamic`);
                            ele.event_state = (customName == '' || customName == `event_state_${ele['id']}`) ? ele['event_state'] : customName;
                        }
                        if (ele.user_id) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `selectedName_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`, `dynamic`);
                            ele.user_id = (customName == '' || customName == `selectedName_${ele['id']}`) ? ele['user_id'] : customName;
                        }
                        if (ele.event_location) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `event_location_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id'] || 0}/${ele['id']}`, `dynamic`);
                            ele.event_location = (customName == '' || customName == `event_location_${ele['id']}`) ? ele['event_location'] : customName;
                        }
                    }));
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
    @Post('attendee-list')
    async attendeeList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user = Object.create(req.tokenUser);
            let conditions = null;
            let membershipcode;
            if (!postData?.event_id || !postData?.slot_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let fields = ['eubl', 'user.id', 'user.code', 'user.first_name', 'user.last_name', 'user.email'];
            let where = '';
            where = `eubl.ev_events_id =${postData?.event_id} AND eubl.slot_selected =${postData?.slot_id} AND eubl.status = 1`;
            if (user.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == user.role_id) {
            }
            else {
                let organizationId: any = await this.eventService.getOrganizationFromEventID(`event.id =${postData?.event_id}`);
                organizationId = organizationId.organization_id;
                if (organizationId == 0 && user.role_id == appConstant.ROLE.ORGADMIN) {
                    membershipcode = user.membership_code;
                    conditions = `user.id = eubl.ev_user_id AND user.membership_code=${membershipcode}`;
                } else if (organizationId == 0 && user.role_id == appConstant.ROLE.GLOBALCOACH) {
                    let org_id = await this.coachesService.listRecord(`coach.coach_manager_id = ${user.id} AND coach.status = 1`, null, ['coach.org_id'])
                    membershipcode = await this.companyService.listRecord(`company.id IN(${org_id.join(',')})`, null, ['company.code']);
                    conditions = `user.id = eubl.ev_user_id AND user.membership_code IN(${membershipcode.map(ele => `'${ele}'`).join(',')})`;
                } else if (organizationId == 0 && user.role_id == appConstant.ROLE.BROKER) {
                    let org_id = await this.brokerService.listRecord(`broker.user_id = ${user.id} AND broker.is_global =1 AND broker.status =1`, null, ['broker.org_id']);
                    membershipcode = await this.companyService.listRecord(`company.id IN(${org_id.join(',')})`, null, ['company.code']);
                    conditions = `user.id = eubl.ev_user_id AND user.membership_code IN(${membershipcode.map(ele => `'${ele}'`).join(',')})`;
                } else if (organizationId == 0 && user.role_id == appConstant.ROLE.BROKERADMIN) {
                    let org_id = await this.brokerService.listRecord(`broker.broker_admin_id = ${user.id} AND broker.status =1`, null, ['broker.org_id']);
                    membershipcode = await this.companyService.listRecord(`company.id IN(${org_id.join(',')})`, null, ['company.code']);
                    conditions = `user.id = eubl.ev_user_id AND user.membership_code IN(${membershipcode.map(ele => `'${ele}'`).join(',')})`;
                } else if (organizationId == 0 && user.role_id == appConstant.ROLE.REGIONALADMIN) {
                    let org_id = await this.brokerService.listRecord(`broker.user_id = ${user.id} AND broker.is_global =2 AND broker.status =1`, null, ['broker.org_id']);
                    membershipcode = await this.companyService.listRecord(`company.id IN(${org_id.join(',')})`, null, ['company.code']);
                    conditions = `user.id = eubl.ev_user_id AND user.membership_code IN(${membershipcode.map(ele => `'${ele}'`).join(',')})`;
                } else {
                    conditions = 'user.id = eubl.ev_user_id';
                }
                fields.push('slotTiming.created_by')
            }
            let resultedData = await this.eventUserBookingListsService.listRecord(where, null, fields, conditions)
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserBookingListsDto, resultedData, req.lang)
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
    @Post('mark-attendance')
    async markAttendence(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || (postData?.status == undefined || postData?.status == null)
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultedData = await this.eventUserBookingListsService.findOne(`eubl.id = ${postData?.id}`);
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.eventUserBookingListsService.update({ id: resultedData['id'] },
                {
                    attend_by: req.tokenUser?.id,
                    attend_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:ss:mm'),
                    ev_attend_status: postData?.status
                });
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation( req.lang, 'Attendance has been successfully updated', `/LC_MESSAGES/Events/Events`, `static`)+`.`,
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
    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let order = 1;
            for (let element of postData?.order) {
                if (element.type == 'event') {
                    let eventData = await this.eventGlobalService.findOne({ organization_id: req.tokenUser?.org_id, event_id: element.id });
                    if (eventData) {
                        await this.eventGlobalService.update({ id: eventData['id'] }, { orderid: order });
                        await this.eventService.update({ id: element.id }, { orderid: order })
                    }
                    else {
                        await this.eventService.update({ id: element.id }, { orderid: order })
                    }
                }
                if (element.type == 'category') {
                    await this.eventCategoryService.update({ id: element.id }, { order_no: order })
                }
                order++
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ORDER_CHANGE"),
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
    @Post('org-list-paginate')
    async orgListPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const paginatedData = await this.getOrgEventList(req, postData || {}, true);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: paginatedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                { statusCode: 401, success: 0, error: 1, message: error?.message, data: null },
                HttpStatus.BAD_REQUEST
            );
        }
    }
    @Post('org-list')
    async orgList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const resultedData = await this.getOrgEventList(req, postData, false);
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser);
            let role_id = user.role_id;
            if (role_id === appConstant.ROLE.COACH) {
                await this.authorizeOrFail(
                    this.coachesService,
                    `coach.org_id = ${postData?.org_id} AND coach.user_id = ${user.id} AND coach.is_global = 1`,
                    this.translatorService,
                    req,
                );
            } else if (role_id === appConstant.ROLE.BROKERADMIN) {
                await this.authorizeOrFail(
                    this.brokerService,
                    `broker.org_id = ${postData?.org_id} AND broker.broker_admin_id = ${user.id}`,
                    this.translatorService,
                    req,
                );
            } else if (role_id === appConstant.ROLE.BROKER) {
                await this.authorizeOrFail(
                    this.brokerService,
                    `broker.org_id = ${postData?.org_id} AND broker.user_id = ${user.id} AND broker.is_global = 1`,
                    this.translatorService,
                    req
                );
            } else if (role_id === appConstant.ROLE.REGIONALADMIN) {
                await this.authorizeOrFail(
                    this.brokerService,
                    `broker.org_id = ${postData?.org_id} AND broker.user_id = ${user.id} AND broker.is_global = 2`,
                    this.translatorService,
                    req
                );
            }
            let where = { id: postData?.id };
            if (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN) {
                where['status'] = Not(2);
            }
            else if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                where['status'] = 1;
            } 
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let resultedData = await this.eventService.findOne(where, { [orderBy]: order });
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (resultedData.event_timezone) {
                let timezoneDetails: any = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, { id: resultedData.event_timezone }));
                resultedData.event_timezone = timezoneDetails[0]
            }
            if (resultedData?.['companies'] && resultedData?.['companies']?.length) {
                resultedData['companies'] = resultedData['companies'].filter(company => company.company != null);
            }
            resultedData['slot'] = <any>(await this.commonArrayService.formatToDto(EventSlotsDto, resultedData?.['slot'], req.lang));   
            if(resultedData?.['bookings'] && resultedData?.['bookings']?.length){         
                await Promise.all(resultedData?.['bookings']?.map(async (ele) => {                         
                    ele['slotTiming'] = <any>(await this.commonArrayService.formatToDto(EventSlotsTimingsDto, ele['slotTiming'], req.lang));                
                }));
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(EventDto, resultedData, req.lang)
            );
            let stateData = await this.companyService.stateList(resultedData?.event_state);
            if(resultedData?.event_state){
                let state = stateData.find(ele => ele.statecode == resultedData?.event_state || ele.state == resultedData?.event_state);
                resultedData['event_state'] = state?.['state'];
                resultedData['event_statecode'] = state?.['statecode'];
            }
            if(resultedData?.event_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${resultedData['id']}`, `/LC_MESSAGES/Events/Events/${resultedData['organization_id'] || 0}/${resultedData['id']}`,`dynamic`);
                resultedData.event_name = (customName == '' || customName == `event_name_${resultedData['id']}`) ? resultedData['event_name'] : customName;
            }
            if(resultedData?.event_description){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_description_${resultedData['id']}`, `/LC_MESSAGES/Events/Events/${resultedData['organization_id'] || 0}/${resultedData['id']}`,`dynamic`);
                resultedData.event_description = (customName == '' || customName == `event_description_${resultedData['id']}`) ? resultedData['event_description'] : customName;
            }
            if(resultedData?.event_address){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_address_${resultedData['id']}`, `/LC_MESSAGES/Events/Events/${resultedData['organization_id'] || 0}/${resultedData['id']}`,`dynamic`);
                resultedData.event_address = (customName == '' || customName == `event_address_${resultedData['id']}`) ? resultedData['event_address'] : customName;
            }
            if(resultedData?.event_city){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_city_${resultedData['id']}`, `/LC_MESSAGES/Events/Events/${resultedData['organization_id'] || 0}/${resultedData['id']}`,`dynamic`);
                resultedData.event_city = (customName == '' || customName == `event_city_${resultedData['id']}`) ? resultedData['event_city'] : customName;
            }
            if(resultedData?.event_state){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_state_${resultedData['id']}`, `/LC_MESSAGES/Events/Events/${resultedData['organization_id'] || 0}/${resultedData['id']}`,`dynamic`);
                resultedData.event_state = (customName == '' || customName == `event_state_${resultedData['id']}`) ? resultedData['event_state'] : customName;
            }
            if(resultedData?.user_id){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`selectedName_${resultedData['id']}`, `/LC_MESSAGES/Events/Events/${resultedData['organization_id'] || 0}/${resultedData['id']}`,`dynamic`);
                resultedData.user_id = (customName == '' || customName == `selectedName_${resultedData['id']}`) ? resultedData['user_id'] : customName;
            }
            if(resultedData?.event_location){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_location_${resultedData['id']}`, `/LC_MESSAGES/Events/Events/${resultedData['organization_id'] || 0}/${resultedData['id']}`,`dynamic`);
                resultedData.event_location = (customName == '' || customName == `event_location_${resultedData['id']}`) ? resultedData['event_location'] : customName;
            }
            if (!resultedData.all_departments) {
                const all_departments = await this.eventDepartmentService.list(`ev_departments.ev_events_id = ${resultedData['id']} AND  ev_departments.organization_id = ${resultedData.organization_id} AND ev_departments.status !=2 `);
                resultedData['departments'] = all_departments.map((ele) => {
                    if (ele['department']) {
                        return {
                            id: ele['department']['id'],
                            dept_name: ele['department']['dept_name']
                        }
                    }
                })
            }
            if (!resultedData.all_locations) {
                const all_locations = await this.eventLocationService.listRecord(`e_location.ev_events_id = ${resultedData['id']} AND  e_location.organization_id = ${resultedData.organization_id} AND e_location.status !=2`);
                resultedData['locations'] = all_locations.map((ele) => {
                    if (ele['location']) {
                        return {
                            id: ele['location']['id'],
                            location_name: ele['location']['location_name']
                        }
                    }
                })
            }
            if(resultedData?.['bookings']?.length > 0){
                let booking=[];
                // added for issue ZOMO:311
                const grouped = resultedData?.['bookings'].filter(ele => ele.status == 1).reduce((acc, item) => {
                (acc[item.ev_user_id] = acc[item.ev_user_id] || []).push(item);
                return acc;
                }, {});
                if(grouped){
                    for(let ele of Object.keys(grouped)){
                        grouped[ele]
                        booking.push({...grouped[ele][0], count: grouped[ele].length})
                    }
                }
                resultedData['bookings'] = booking;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                { statusCode: 401, success: 0, error: 1, message: error?.message, data: null },
                HttpStatus.BAD_REQUEST
            );
        }
    }

    @Post('get-slot-details')
    async getSlotDetails(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.slotid && !postData?.slottimeid && (postData?.get_slot_detail == undefined || postData?.get_slot_detail == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let result;
            let slotdata = await this.eventSlotsService.listRecord(`es.id = ${postData?.slotid}`, null, ['es', 'userBookingList', 'events'], postData?.slottimeid);
            let limit = slotdata[0]['attendee_limit'];
            if (slotdata[0]['attendee_limit'] && slotdata[0]['totalAttendeejoined'] >= limit) {
                if (postData['get_slot_detail'] && postData['get_slot_detail'] == 'true') {
                    result = false;
                } else {
                    result = false;
                }
            } else {
                if (postData['get_slot_detail'] == 'true') {
                    result = true;
                } else {
                    result = true;
                }
            }
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

    async authorizeOrFail(service, query, translatorService, req): Promise<boolean> {
        try{
            const errorMsg = 'You are not authorized to access that location.';
            const data = await service.listRecord(query);
            if (!data || data.length === 0) {
                throw new Error(await translatorService.frontendReadTranslation(req.lang, errorMsg));
            }
            return true;
        }
        catch(error){
            throw new Error(error);
        }
    }

    private async getOrgEventList(req: Request, postData: any, isPaginated: boolean = false) {
        try{
            let user = Object.create(req.tokenUser);
            let role_id = user.role_id;
            let resultedData;
            let membership_code;
            // let organization_list;

            if (role_id === appConstant.ROLE.WCH) {
                await this.authorizeOrFail(
                    this.wellnessAssignmentService,
                    `wellnessAssignment.org_id = '${postData?.org_id}' AND wellnessAssignment.status = 1 AND wellnessAssignment.user_id = '${user.id}' AND wellnessAssignment.is_global = 1`,
                    this.translatorService,
                    req
                );
            } else if (role_id === appConstant.ROLE.GLOBALCOACH) {
                let data: any = await this.coachesService.listRecord(`coach.coach_manager_id = ${user.id}`, null, ['coach.org_id']);
                data = data?.map(ele => ele.org_id);
                if (data && data.length) {
                    membership_code = data;
                    // organization_list = await this.companyService.listRecord(`company.id In(${data.join(',')})`);
                }
            } else if (role_id === appConstant.ROLE.COACH) {
                await this.authorizeOrFail(
                    this.coachesService,
                    `coach.org_id = ${postData?.org_id} AND coach.user_id = ${user.id} AND coach.is_global = 1`,
                    this.translatorService,
                    req
                );
            } else if (role_id === appConstant.ROLE.BROKERADMIN) {
                await this.authorizeOrFail(
                    this.brokerService,
                    `broker.org_id = ${postData?.org_id} AND broker.broker_admin_id = ${user.id}`,
                    this.translatorService,
                    req
                );
            } else if (role_id === appConstant.ROLE.BROKER) {
                await this.authorizeOrFail(
                    this.brokerService,
                    `broker.org_id = ${postData?.org_id} AND broker.user_id = ${user.id} AND broker.is_global = 1`,
                    this.translatorService,
                    req
                );
            } else if (role_id === appConstant.ROLE.REGIONALADMIN) {
                await this.authorizeOrFail(
                    this.brokerService,
                    `broker.org_id = ${postData?.org_id} AND broker.user_id = ${user.id} AND broker.is_global = 2`,
                    this.translatorService,
                    req
                );
            } else {
                postData.org_id = user.org_id;
            }

            let where = `event.status != 2`;
            if (postData?.category_id) {
                where += ` AND event.organization_id IN(${postData?.org_id},0) AND event.category_id = ${postData?.category_id}`;
            } else {
                if (!postData?.org_id && role_id === appConstant.ROLE.GLOBALCOACH && membership_code) {
                    postData.org_id = membership_code.join(',');
                    where += ` AND event.organization_id IN(${membership_code.join(',')},0) AND category.id IS NULL`;
                } else {
                    where += ` AND event.organization_id IN(${postData?.org_id},0) AND category.id IS NULL`;
                }
            }

            let eventData = await this.eventService.listRecord(
                ["event", 'company', 'companie', 'global_events', 'slot', 'category'],
                where
            );
            eventData = <any>(await this.commonArrayService.formatToDto(EventDto, eventData, req.lang));

            let globaleventList = await this.eventGlobalService.listRecord(
                ["ge.id", "ge.event_id", "ge.orderid", "ge.status"],
                `ge.organization_id In(${postData?.org_id}) and ge.status != 2`
            );
            globaleventList = globaleventList.reduce((acc, item) => {
                acc.set(item.event_id, item);
                return acc;
            }, new Map());

            let counter = 1;
            for (let i = eventData.length - 1; i >= 0; i--) {
                const value = eventData[i];
                if (value.organization_id === 0 && !globaleventList.has(value.id)) {
                    eventData.splice(i, 1);
                } else {
                    if (value.organization_id === 0) {
                        value.orderid = globaleventList.get(value.id).orderid;
                    }
                    value.listorder = value?.orderid || counter++;
                    value.TYPE = 'event';
                }
            }

            resultedData = eventData;
            if (postData?.org_id && role_id !== appConstant.ROLE.GLOBALCOACH) {
                membership_code = [postData?.org_id];
            }

            await Promise.all(resultedData.map(async (ele) => {
                const transFields = ['event_name', 'event_description', 'event_address', 'event_city', 'event_state', 'user_id', 'event_location'];
                for (const field of transFields) {
                    if (ele[field]) {
                        const customName = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            `${field}_${ele.id}`,
                            `/LC_MESSAGES/Events/Events/${ele.organization_id || 0}/${ele.id}`,
                            'dynamic'
                        );
                        ele[field] = (customName === '' || customName === `${field}_${ele.id}`) ? ele[field] : customName;
                    }
                }

                let bookedData = await this.eventUserBookingListsService.listRecord(
                    `eubl.ev_events_id = ${ele.id} and eubl.status = 1`,
                    null,
                    ['eubl', 'user'],
                    `user.id = eubl.ev_user_id AND user.org_id IN(${membership_code.join(',')}) AND user.status !=2`
                );

                let count = 0;
                for (const value of bookedData) {
                    const slotId = value.slot_selected;
                    if(value?.slot_selected !== '-1') {
                        const slotData = await this.eventSlotsTimingsService.findOne({ id: Number(slotId), status: 1 });
                        if (!slotData) {
                            value.created_by = slotData ? slotData.created_by : 1;
                            count++;
                        }
                    }
                }
                ele.booking_count = count;

                if (role_id === appConstant.ROLE.WCH && ele.created_by_user_id === user.id) {
                    ele.edit = true;
                }
            }));

            if (!postData?.category_id) {
                let categories = await this.eventCategoryService.listRecord(null, `e_category.c_companies_id IN (${postData?.org_id}) AND e_category.status = 1`);
                categories = <any>(await this.commonArrayService.formatToDto(EventCategoryDto, categories, req.lang));

                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.category_name) {
                            const customName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                `category_name_${ele.id}`,
                                `/LC_MESSAGES/Events/Category/${ele.c_companies_id}/${ele.id}`,
                                'dynamic'
                            );
                            ele.category_name = (customName === '' || customName === `category_name_${ele.id}`) ? ele.category_name : customName;
                        }
                    }));
                }

                for (const [key, value] of categories.entries()) {
                    value.listorder = value.order_no;
                    value.TYPE = 'category';
                }

                resultedData = [...resultedData, ...categories];
            }
            resultedData.sort((a, b) => a.listorder - b.listorder);
            

            if (isPaginated) {
                const page = Number(postData.page) || 1;
                const limit = Number(postData.limit) || 10;
                const start = (page - 1) * limit;
                const total = resultedData.length;
                const pages = Math.ceil(total / limit);
                const end = start + limit;

                return {
                    total,
                    page,
                    limit,
                    pages,
                    list: resultedData.slice(start, end)
                };
            }

            return resultedData;
        }
        catch(error){
            throw new Error(error);
        }
    }

}
