import { UrlManageService } from '@/modules/common';
import { appConstant, CommonDateService, CommonFileService, CommonService, eventConstant, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import * as path from 'path';
import { lastValueFrom } from "rxjs";
import { CampaignService } from "src/modules/campaign/campaign/campaign.service";
import { CommunicationTemplateTextsService } from "src/modules/communication/templatetexts/communicationtemplatetexts.service";
import { SettingsService } from "src/modules/company/settings/settings.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { UserService } from "src/modules/user/user/user.service";
import { In } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { EventCategoryService } from "../eventcategory/eventcategory.service";
import { EventDepartmentsService } from "../eventdepartments/eventdepartments.service";
import { EventService } from "../events/events.service";
import { EventGlobalEventsService } from "../globalevents/globalevents.service";
import { EventLocationsService } from "../locations/locations.service";
import { EventSlotsService } from "../slots/slots.service";
import { EventSlotsTimingsService } from "../slotstimings/slotstimings.service";
import { EventUserBookingListsService } from "../userbookinglists/userbookinglists.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Controller('events/event')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserEventController {
    constructor(
        @Inject('TIMEZONE_SERVICE')
        private client: ClientProxy,
        private readonly eventService: EventService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly eventDepartmentService: EventDepartmentsService,
        private readonly eventLocationService: EventLocationsService,
        private readonly eventGlobalService: EventGlobalEventsService,
        private readonly activityLogService: ActivityLogService,
        private readonly eventCategoryService: EventCategoryService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly eventSlotsService: EventSlotsService,
        private readonly eventSlotsTimingsService: EventSlotsTimingsService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly campaignService: CampaignService,
        private readonly companySettingsService: SettingsService,
        private readonly userService: UserService,
        private readonly urlManageService: UrlManageService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly commonService: CommonService,
    ) { }

    async event_registration_process(data: any, timezoneData: any, req: Request) {
        try {
            let user = Object.create(req.tokenUser);
            let result = Object.create(null);
            let companySettings = await this.companySettingsService.findOne({ org_id: user.org_id });
            result['reject'] = 1;
            result['success'] = 1;
            let signup_more_time = '';
            let actualEvData = await this.eventService.findOne(`event.id = ${data['ev_events_id']}`, null,data?.register ? [] : [tableConstant.EVENTS.TBL_EV_SLOTS]);
            if (actualEvData['signup_more_time'] && (actualEvData['signup_more_time'] == 1 || actualEvData['signup_more_time'] == 2)) {
                signup_more_time = data['slot_selected'];
                signup_more_time = `AND eubl.slot_selected = '${signup_more_time}'`;
            }
            let passData;
            let user_timezone= user.timezone;
            let eventTimeZone;
            let user_timezone_object= timezoneData.find(ele => ele.timezone_name == user_timezone);
            let event_timezone_object= timezoneData.find(ele => ele.id == actualEvData?.event_timezone);
            if (actualEvData['event_type'] && actualEvData['event_type'] == 3) {
                passData = `eubl.ev_user_id = ${user.id} AND eubl.ev_events_id = ${actualEvData['id']} AND eubl.status = 1`;
            }
            else {
                passData = `eubl.ev_slots_id = ${data['ev_slots_id']} AND eubl.ev_user_id = ${user.id} AND slotTiming.status = 1 AND eubl.status = 1 ${signup_more_time}`;
            }
            let bookingExit = await this.eventUserBookingListsService.findOne(passData);
            if (!bookingExit) {
                let booking = Object.create(null);
                booking['organization_id'] = data['organization_id'];
                booking['ev_events_id'] = data['ev_events_id'];
                booking['ev_slots_id'] = data['ev_slots_id'];
                booking['ev_user_id'] = user.id;
                booking['ev_extension'] = data['ev_extension'];
                booking['ev_contact'] = data['ev_contact'];
                booking['registration_date'] = data['currentdatetime'];
                booking['slot_selected'] = data['slot_selected'];
                booking['status'] = '1';
                booking['ev_attend_status'] = data['ev_attend_status'] ?? 0;
                booking['activity_id'] = actualEvData['activity_id'];
                booking['lang_id'] = data['lang_id'] ? Number(data['lang_id']) : 0;
                let slotid = data['ev_slots_id'];
                let slotTimeId = data['slot_selected'];
                let limit;
                let slotData;
                let TimeZone;
                let totalAttendeeJoined;
                if (actualEvData['event_type'] && actualEvData['event_type'] == 3) {
                    limit = actualEvData['tot_register'];
                    totalAttendeeJoined = await this.eventUserBookingListsService.listRecord(`eubl.ev_events_id = ${actualEvData['id']} AND eubl.status = 1`);
                    slotData = [];
                    slotData.push({});
                } else {
                    slotData = await this.eventSlotsService.listRecord(`es.id = ${slotid}`, null, ['es', 'userBookingList', 'events', 'slotTimings'], slotTimeId);
                    if (slotData && slotData.length) {
                        await Promise.all(slotData.map(async (ele) => {
                            if (ele && ele.events && ele.events?.event_timezone) {
                                let timezoneDetails = timezoneData.find(element => element.id == ele?.events?.event_timezone);
                                if (timezoneDetails) {
                                    ele['timezone'] = timezoneDetails;
                                }
                                else {
                                    ele['timezone'] = null;
                                }
                            }
                        }));
                    }
                    if (slotData && slotData.length == 0) {
                        result['reject'] = 5;
                        let custom_desc = await this.translatorService.frontendReadTranslation(req.lang, 'Event timeslot not found', `/LC_MESSAGES/Events/Events`, `static`);
                        result['rejectmsg'] = custom_desc;
                        return result;
                    }
                    limit = slotData[0]['attendee_limit'];
                    totalAttendeeJoined = slotData[0]['totalAttendeeJoined'];
                    if (!slotData[0]['attendee_limit']) {
                        totalAttendeeJoined = 0;
                        limit = 1;
                    }
                }
                if (totalAttendeeJoined >= limit) {
                    result['reject'] = 2;
                    let custom_desc = await this.translatorService.frontendReadTranslation(req.lang, 'Please try another time slot as that one is full.', `/LC_MESSAGES/Events/Events`, `static`);
                    result['rejectmsg'] = custom_desc;
                } else {
                    let userBookingList = await this.eventUserBookingListsService.save(booking);
                    if (userBookingList && userBookingList['id']) {
                        let slotTiming = await this.eventSlotsTimingsService.findOne({ id: data['slot_selected'] });
                        if(slotTiming){
                            await this.eventSlotsTimingsService.update({ id: data['slot_selected'] }, { total_booked: slotTiming['total_booked'] + 1 });
                        }
                        if ((actualEvData['event_type'] == undefined || actualEvData['event_type'] == null) || actualEvData?.['event_type'] != 3) {
                            if (companySettings.e_timezone_setting == 1) {
                                if (!slotData[0]['timezone']) {
                                    slotData[0]['timezone'] = {};
                                }
                                if (user_timezone == '') {
                                    slotData[0]['timezone']['timezone_value'] = 'UTC';
                                    TimeZone = 'UTC';
                                } else {
                                    if (user_timezone_object) {
                                        slotData[0]['timezone'] = user_timezone_object;
                                    }
                                    TimeZone = user_timezone;
                                }
                                let userTimeZone = TimeZone;
                                eventTimeZone = (timezoneData.find(ele => ele.id == actualEvData['event_timezone']))?.['timezone_name'];
                                if (!slotData[0]['slotTimings']) {
                                    slotData[0]['slotTimings'] = {};
                                }
                                slotData[0]['slotTimings']['slotdate'] = this.commonDateService.getTodayDate(slotData[0]['slotTimings']['slotdate']).format('YYYY-MM-DD');
                                let startTime = moment.tz(`${slotData[0]['slotTimings']['slotdate']} ${slotData[0]['slotTimings']['slotstarttime']}`, eventTimeZone);
                                startTime = startTime.clone().tz(userTimeZone).format('HH:mm:ss');
                                let endTime = moment.tz(`${slotData[0]['slotTimings']['slotdate']} ${slotData[0]['slotTimings']['slotendtime']}`, eventTimeZone);
                                endTime = endTime.clone().tz(userTimeZone).format('HH:mm:ss');
                                let eventDate = moment.tz(`${slotData[0]['slotTimings']['slotdate']} ${slotData[0]['slotTimings']['slotstarttime']}`, eventTimeZone);
                                eventDate = eventDate.clone().tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                                if (!slotData[0]['ics']) {
                                    slotData[0]['ics'] = Object.create(null);
                                }
                                slotData[0]['ics']['stime'] = startTime;
                                slotData[0]['ics']['etime'] = endTime;
                                slotData[0]['ics']['date'] = await this.commonDateService.DateTimeFormat(eventDate, 'YYYY-MM-DD');
                                slotData[0]['slotTimings']['slotdate'] = await this.commonDateService.DateTimeFormat(eventDate, 'YYYY-MM-DD');
                                slotData[0]['slotTimings']['slotstarttime'] = startTime;
                                slotData[0]['slotTimings']['slotendtime'] = endTime;
                            } else {
                                if (!slotData[0]['ics']) {
                                    slotData[0]['ics'] = Object.create(null);
                                }
                                slotData[0]['ics']['date'] = this.commonDateService.getTodayDate(slotData[0]['slotTimings']['slotdate']).format('YYYY-MM-DD');
                                slotData[0]['ics']['stime'] = this.commonDateService.getTodayDate(`${slotData[0]['slotTimings']['slotdate']} ${slotData[0]['slotTimings']['slotstarttime']}`).format('HH:mm:ss');
                                slotData[0]['ics']['etime'] = this.commonDateService.getTodayDate(`${slotData[0]['slotTimings']['slotdate']} ${slotData[0]['slotTimings']['slotendtime']}`).format('HH:mm:ss');
                            }
                        } else {
                            slotData[0] = actualEvData;
                            if (!slotData[0]['slotTimings']) {
                                slotData[0]['slotTimings'] = {};
                            }
                            slotData[0]['slotTimings']['slotdate'] = this.commonDateService.getTodayDate(data['currentdatetime']).format('YYYY-MM-DD HH:mm:ss');
                            if (!slotData[0]['ics']) {
                                slotData[0]['ics'] = Object.create(null);
                            }
                            if (!slotData[0]['timezone']) {
                                if (timezoneData.some(ele => ele.timezone_name == user_timezone)) {
                                    slotData[0]['timezone'] = timezoneData.find(ele => ele.timezone_name == user_timezone);
                                }
                            }
                            if(!TimeZone){
                                TimeZone = slotData[0]?.['timezone'] ? slotData[0]?.['timezone']?.timezone_name : 'UTC';
                            }
                            let userTimeZone = TimeZone;
                            eventTimeZone = (timezoneData.find(ele => ele.id == actualEvData['event_timezone']))?.['timezone_name'];
                            let eventDate = moment.tz(slotData[0]['slotTimings']['slotstarttime'] ? `${slotData[0]?.['slotTimings']?.['slotdate']} ${slotData[0]['slotTimings']['slotstarttime']}` : `${slotData[0]['slotTimings']['slotdate']}`, eventTimeZone);
                            eventDate = eventDate?.clone()?.tz(userTimeZone)?.format('YYYY-MM-DD HH:mm:ss');
                            if (!slotData[0]['ics']) {
                                slotData[0]['ics'] = Object.create(null);
                            }
                            slotData[0]['slotTimings']['slotdate'] = await this.commonDateService.DateTimeFormat(eventDate, 'YYYY-MM-DD HH:mm:ss');
                        }
                        if (user.email != '') {
                            const templateText = await this.communicationTemplateTextService.findOne({ org_id: In([user.org_id, 0]), type: 8 })
                            let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                            let toEmail = user.email;
                            let emailDetails = Object.create(null);
                            if (user_timezone == '') {
                                eventTimeZone = 'UTC';
                                slotData[0]['timezone']['timezone_value'] = 'UTC';
                            } else {
                                eventTimeZone = user_timezone_object?.timezone_value ?? user_timezone;
                                if (user_timezone_object) {
                                    slotData[0]['timezone'] = user_timezone_object;
                                }
                            }
                            if (slotData[0]?.['events']) {
                                slotData[0] = { ...slotData[0], ...slotData[0]?.['events'] };
                            }
                            let eventname = slotData[0]['event_name'];
                            let subject;
                            let attachments;
                            if (slotData[0]['subject'] && slotData[0]['subject'] != '') {
                                subject = slotData[0]['subject'];
                            } else {
                                subject = `Registration Confirmation: ${eventname}`;
                            }
                            let calendar_link;
                            if ((actualEvData['event_type'] == undefined || actualEvData['event_type'] == null) || actualEvData['event_type'] != 3) {
                                let stime = slotData[0]['ics']['stime'];
                                let etime = slotData[0]['ics']['etime'];
                                let date = slotData[0]['ics']['date'];
                                let event_desc;
                                if (slotData[0]['ics_message'] && slotData[0]['ics_message'] != '') {
                                    event_desc = slotData[0]['ics_message'] ? slotData[0]['ics_message'] : '';
                                } else {
                                    event_desc = slotData[0]['event_description'] ? slotData[0]['event_description'] : '';
                                }
                                const eventLocations = `
                                    ${slotData[0].events.event_location || ''} 
                                    ${slotData[0].events.event_address || ''} 
                                    ${slotData[0].events.event_city || ''}, 
                                    ${slotData[0].events.event_state || ''}
                                `.trim();
                                let eventFileName = `calendar${this.commonDateService.getTodayDate().unix()}.ics`;
                                const fullEventFilePath = path.join(process.cwd(), 'src', 'modules', 'events', 'webroot', eventFileName);
                                const calendarData = `BEGIN:VCALENDAR
                                                        VERSION:2.0
                                                        PRODID:-//hacksw/handcal//NONSGML v1.0//EN
                                                        BEGIN:VEVENT
                                                        UID:example.com
                                                        DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
                                                        DTSTART:${date}T${stime}
                                                        DTEND:${date}T${etime}
                                                        LOCATION:${eventLocations}
                                                        SUMMARY:${eventname}
                                                        DESCRIPTION:${event_desc}
                                                        END:VEVENT
                                                        END:VCALENDAR`;
                                await this.commonFileService.createFile(calendarData, fullEventFilePath)
                                attachments = { path: fullEventFilePath, filename: eventFileName };
                                if(templateNewText.includes('Calendar')){
                                    calendar_link = `event/invitation/${user.org_id}/${eventFileName}`;
                                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: fullEventFilePath,  filename: calendar_link, isRemove: false }));
                                    calendar_link = S3_URL + calendar_link;
                                }
                            }
                            try {
                                emailDetails['type'] = 8;
                                emailDetails['name'] = user.first_name + ' ' + user.last_name;
                                emailDetails['event_name'] = eventname;
                                emailDetails['event_date'] = slotData[0]['ics']['date'];
                                emailDetails['start_time'] = slotData[0]['ics']['stime'];
                                emailDetails['end_time'] = slotData[0]['ics']['etime'];
                                emailDetails['timezone'] = eventTimeZone;
                                emailDetails['prefered_language'] = data['lang_id'] == 1 ? 'Spanish' : 'English';
                                if(calendar_link){
                                    emailDetails['calendar_link'] = calendar_link;
                                }
                                let emailData = {
                                    sender: ``,
                                    receiver: toEmail,
                                    subject: subject,
                                    content: emailDetails,
                                    template: templateNewText,
                                    attachment: [attachments]
                                }
                                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailData));
                                result['reject'] = 0;
                                let custom_desc = await this.translatorService.frontendReadTranslation(req.lang, 'You Have Been Successfully Registered', `/LC_MESSAGES/Events/Events`, `static`);
                                result['successmsg'] = custom_desc;
                            } catch (err) {
                                result['reject'] = 5;
                                let custom_desc = await this.translatorService.frontendReadTranslation(req.lang, 'An Error Occurred. For Sending Email Notification', `/LC_MESSAGES/Events/Events`, `static`);
                                result['rejectmsg'] = custom_desc;
                            }
                        } else {
                            result['reject'] = 5;
                            let custom_desc = await this.translatorService.frontendReadTranslation(req.lang, 'An Error Occurred. For Sending Email Notification', `/LC_MESSAGES/Events/Events`, `static`);
                            result['rejectmsg'] = custom_desc;
                        }
                        let bookedData = userBookingList;
                        if (!actualEvData['event_type'] || actualEvData['event_type'] != 3) {
                            delete bookedData['slot'];
                        }
                        bookedData['slotTimeData'] = slotTiming;
                        if (!bookedData['slot']) {
                            bookedData['slot'] = Object.create(null);
                        }
                        bookedData['slot']['timezone_name'] = event_timezone_object?.['timezone_name'];
                        bookedData['slot']['timezone_value'] = event_timezone_object?.['timezone_value'];
                        if (companySettings.e_timezone_setting == 1) {
                            if (user_timezone == '') {
                                bookedData['slot']['timezone_value'] = 'UTC';
                            } else {
                                if (user_timezone_object) {
                                    bookedData['slot']['timezone_value'] = user_timezone_object['timezone_name'];
                                }
                            }
                        }
                        let conditionsForTot;
                        if (!actualEvData['event_type'] || actualEvData?.['event_type'] != 3) {
                            conditionsForTot = `eubl.ev_slots_id = ${bookedData['ev_slots_id']}`;
                        } else {
                            conditionsForTot = `eubl.ev_events_id = ${bookedData['ev_events_id']}`;
                        }
                        let totalCand = await this.eventUserBookingListsService.listRecord(conditionsForTot, null, ['eubl.id']);
                        result['totalCand'] = totalCand.length;
                        result['bookingConfirm'] = 1;
                        result['bookedData'] = bookedData;
                    } else {
                        result['reject'] = 4;
                        let custom_desc = await this.translatorService.frontendReadTranslation(req.lang, 'Something went wrong please contact admin.', `/LC_MESSAGES/Events/Events`, `static`);
                        result['rejectmsg'] = custom_desc;
                    }
                }
            } else {
                result['reject'] = 3;
                let custom_desc = await this.translatorService.frontendReadTranslation(req.lang, 'You have already registered with this Event please contact admin', `/LC_MESSAGES/Events/Events`, `static`);
                result['rejectmsg'] = custom_desc;
            }
            return result;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    @Post('user-event')
    async userEvent(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user = Object.create(req.tokenUser);
            if (![appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(user?.role_id)) { // extra check to ensure only registered or spouse can access provided access to api role wise
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let health_plan = user?.on_insurance_plan == 'Yes' ? user.insurance_plan_name : '';
            let total_events = 0;
            let totalCand;
            let bookingConfirm;
            let bookedData;
            let eventListAllLoc = {};
            let eventListAllDept = {};
            let eventsIdListUserBookingList = [];
            let Event_type_list = (postData?.hasOwnProperty('category_id')) ? 'category_event' : 'without_category';
            let companySettings = await this.companySettingsService.findOne({ org_id: user.org_id });
            let timezoneData = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, {}));
            let currentDate = moment();
            const userTimezone = user?.timezone || 'UTC';
            let userTimezoneObject;
            let timezoneDetails = await timezoneData.find((e) => e.timezone_name == userTimezone);
            if (timezoneDetails) {
                userTimezoneObject = { id: timezoneDetails.id, timezone_name: timezoneDetails.timezone_name, timezone_value: timezoneDetails.timezone_value };
            }
            if (postData && Object.keys(postData).length && !postData?.hasOwnProperty('category_id') && postData?.ev_events_id) {
                let returnResult = await this.event_registration_process(postData, timezoneData, req);
                if (returnResult['reject'] == 0) {
                    totalCand = returnResult['totalCand'];
                    bookingConfirm = returnResult['bookingConfirm'];
                    bookedData = returnResult['bookedData'];
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: returnResult['successmsg'],
                        message: 'success',
                    });
                } else {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, returnResult['rejectmsg']));
                }
            }
            if (postData['ev_contact']) {
                postData['ev_contact'] = '';
            }
            if (postData['ev_extension']) {
                postData['ev_extension'] = '';
            }
            let usersDataWellness = user.usersdatawellness ?? '';
            if(usersDataWellness){
                usersDataWellness = usersDataWellness.map((user: any) => user.id).join(',');
            }
            let globalEventList = await this.eventGlobalService.listRecord(["ge.id", "ge.event_id", "ge.orderid"], `ge.organization_id = ${user.org_id} and ge.status != 2`,);
            globalEventList = globalEventList.length ? globalEventList?.reduce((accumulator, item) => {
                const key = item.event_id;
                const value = item;
                if (key !== undefined) {
                    accumulator[key] = value;
                }
                return accumulator;
            }, {}) : {};
            let wellnessLotCon = `es.ev_events_id = event.id AND es.status = 1`; 
            let wellnessEventCond = `event.organization_id IN(0,${user.org_id}) `;
            if(Object.keys(globalEventList).length > 0){
                wellnessEventCond = `(${wellnessEventCond} OR event.id IN(${Object.keys(globalEventList).join(',')}))`;
            }
            wellnessEventCond += ' AND event.status = 1 ';
            if (postData?.hasOwnProperty('category_id')) {
                wellnessEventCond += ` AND event.category_id = ${postData?.category_id} `;
            }
            if (postData?.is_filter == 1) {
                let {result, event_condition} = await this.filterEvents(postData?.filter_option, postData?.from_date, postData?.to_date);
                let filter_slot = result?.map((ele) => { return ele.ev_slots_id });
                if (filter_slot && filter_slot?.length > 0) {
                    wellnessLotCon += ` AND es.id IN (${filter_slot.join(',')}) `;
                }
                if(event_condition && event_condition != ''){
                    wellnessEventCond += ` AND(${event_condition}
                    OR event.start_date IS NULL 
                    OR event.end_date IS NULL
                    )`;
                }
            }
            else{
                wellnessEventCond += ` AND(event.end_date >= '${moment(currentDate).format('YYYY-MM-DD')}'
                OR event.start_date IS NULL 
                OR event.end_date IS NULL
                )`;
            }            
            if (usersDataWellness) {
                wellnessEventCond += ` AND event.created_by_user_id NOT IN (${usersDataWellness}) `;
                wellnessLotCon += ` AND es.created_by NOT IN (${usersDataWellness}) `;
            }
            let eventListIDS = {};
            let removeEventList = []; 
            let eventList;
            let eventData = await this.eventService.userEventList1(wellnessEventCond, {id:'ASC'},['es.id', 'es.start_date', 'es.start_time', 'es.end_date', 'es.end_time', 'es.organization_id', 'es.status', 'es.registration_end', 'event'],wellnessLotCon); 
            if(postData?.is_filter && postData?.filter_option == 5){ //ZOMO-4373
                let filterStart = moment(postData?.from_date);
                let filterEnd = moment(postData?.to_date);
                eventData = eventData.filter(item => {
                    if (!item?.['slot'] || item?.['slot'].length === 0) return true;

                    return item?.['slot'].some(slot => {
                        const slotStart = moment(slot.startDate);
                        const slotEnd = moment(slot.endDate);
                        return slotStart.isSameOrBefore(filterEnd) && slotEnd.isSameOrAfter(filterStart);
                    });
                })
            }
            eventData = eventData?.filter(ele => (ele['slot'] && ele?.['slot']?.length > 0) || ele.start_date || ele.end_date || ele.event_type == 3 || ele.event_type == 2);  // filter events update for external event to show without slots
            eventData = eventData?.filter(ele => (ele.organization_id === 0 && globalEventList[ele?.id]) || ele.organization_id != 0);  // filter for global events
            if(!postData?.hasOwnProperty('category_id')) {
                const categoryData = eventData
                .filter(event => event?.category_id);
                let categoryList = categoryData.length > 0 ? await this.eventCategoryService.listRecord(['e_category.id', 'e_category.category_name', 'e_category.c_companies_id', 'e_category.order_no'], `e_category.status = 1 AND e_category.id in(${categoryData.map(event => event.category_id).join(',')})`, { order_no: 'ASC' }) : [];    
                if(categoryList.length){
                    eventData = eventData.filter(event => !categoryList.map(category=> category.id).includes(event?.category_id));
                    total_events += eventData.length;
                }
                let categoryRemoveCount = 0;
                let categoryEventCount = 0;
                for(let ele of categoryList){
                    let categoryList = categoryData?.filter(event => event.category_id == ele.id);
                    categoryEventCount= categoryList.length;
                    categoryList = categoryList
                    ?.filter(item => item.start_date && item.end_date || item.event_type == 3 || ele.event_type == 2 || item?.['slot']?.[0]?.['start_date'] && item?.['slot']?.[0]?.['end_date'] || item['end_date'] && moment(item['end_date']).isAfter(currentDate))?.sort((a, b) => {
                        return moment(a.start_date).unix() - moment(b.start_date).unix(); 
                    });
                    let count = 0;
                    let eventListAllLoc = {};
                    let eventListAllDept = {};
                    if(categoryList.length > 0){
                        let eventIdList = categoryList?.filter(event => (event['all_locations'] !== 'all_loc' || event['all_departments'] !== 'all_dept')).map(event => event.id || event?.category_id);
                        if (eventIdList.length > 0) {
                            let result = await this.fetchEventLocationAndDepartmentMaps(eventIdList,user);
                            if(result){
                                eventListAllLoc = result.eventListAllLoc;
                                eventListAllDept = result.eventListAllDept;
                            }
                        }
                    }
                    const results = await Promise.all(
                    categoryList.map(async category =>
                        await this.shouldRemoveEvent(category, user, health_plan, eventListAllLoc, eventListAllDept, removeEventList)
                    )
                    );
                    count = results.filter(result => result === 0).length;
                    total_events += count;
                    categoryRemoveCount += results.filter(result => result === -1).length;
                    if(ele?.category_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele['id']}`, `/LC_MESSAGES/Events/Category/${ele['c_companies_id']}/${ele['id']}`,`dynamic`);
                        ele.category_name = (customName == '' || customName == `category_name_${ele['id']}`) ? ele['category_name'] : customName;
                    }
                    if(!categoryList[0]?.start_date && categoryList[0]?.['slot']?.length > 0){
                        categoryList[0].start_date = categoryList[0]?.['slot'][0]['start_date'];
                    }
                    if(!categoryList[categoryList.length - 1]?.end_date && categoryList[categoryList.length - 1]?.['slot']?.length > 0){
                        categoryList[categoryList.length - 1]['end_date'] = categoryList[categoryList.length - 1]?.['slot'][0]['end_date']
                    }
                    ele['orderid'] = ele.order_no;
                    ele['start_date'] = categoryList[0]?.start_date || null;
                    ele['end_date'] = categoryList[categoryList.length - 1]?.end_date || null;
                    ele['created'] =  categoryList[0]?.created || null;
                    ele['created_by'] = categoryList[0]?.created_by_user_id || null;
                    ele['created_by_user_id'] = categoryList[0]?.created_by_user_id || null;
                    ele['organization_id'] = categoryList[0]?.organization_id || null;
                    let timezoneDetails = await timezoneData.find((e) => e.id == categoryList[0]?.event_timezone);
                    if (timezoneDetails) {
                        ele['timezone'] = { id: timezoneDetails.id, timezone_name: timezoneDetails.timezone_name, timezone_value: timezoneDetails.timezone_value };
                    }
                    ele['user_timezone'] = userTimezoneObject;
                }
                if(categoryList.length > 0 && (categoryEventCount - categoryRemoveCount) == 0){
                    categoryList = [];
                }
                if(categoryList.length > 0){
                    let count = categoryList.length;
                    categoryList = categoryList.filter(category => !category['end_date'] || category['end_date'] && moment(category['end_date']).isAfter(currentDate));
                    if(categoryList.length < count){
                        total_events -= (count - categoryList.length);
                    }
                }
                eventList = [...categoryList,...eventData];   
                if(total_events == 0 && eventData.length > 0){
                    total_events += eventData.length;
                }
            }
            else {
                eventList = eventData;
                total_events += eventData.length;
            }
            let eventIdList = eventData?.filter(event => (event['all_locations'] !== 'all_loc' || event['all_departments'] !== 'all_dept')).map(event => event.id || event?.category_id);
            if (eventIdList.length > 0) {
                let result = await this.fetchEventLocationAndDepartmentMaps(eventIdList,user);
                if(result){
                    eventListAllLoc = result.eventListAllLoc;
                    eventListAllDept = result.eventListAllDept;
                }
            }
            const eventsIdList = eventList
            ?.filter(event => event?.event_type === 3)
            ?.map(event => event.id) ?? [];
            if (eventsIdList.length > 0) {
                eventsIdListUserBookingList = await this.eventUserBookingListsService.listRecord(`eubl.ev_events_id IN(${eventsIdList.join(',')}) AND eubl.status = 1`, { id: 'ASC' }, ['COUNT(eubl.ev_events_id) AS totalReg', 'eubl.ev_events_id'], null, 'eubl.ev_events_id');
                eventsIdListUserBookingList = eventsIdListUserBookingList?.reduce((acc, category) => {
                    acc[category['eubl_ev_events_id']] = parseInt(category['totalReg']);
                    return acc;
                }, {})
            }
            let lastSlotData = {};
            if (eventList && eventList.length) {
                let joinButtonText = await this.translatorService.frontendReadTranslation(req.lang, 'Join', `/LC_MESSAGES/Events/Events`, `static`);                                                                
                let registrationClosedButtonText = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Closed', `/LC_MESSAGES/Events/Events`, `static`);                                                                
                let registrationFullButtonText = await this.translatorService.frontendReadTranslation(req.lang, 'Registration Full', `/LC_MESSAGES/Events/Events`, `static`);                                                                
                let goingButtonText = await this.translatorService.frontendReadTranslation(req.lang, 'Going', `/LC_MESSAGES/Events/Events`, `static`);  
                for(let ele of eventList) {
                    if (ele && ele && ele?.event_timezone) {
                        let timezoneDetails = await timezoneData.find((e) => e.id == ele?.event_timezone);
                        if (timezoneDetails) {
                            ele['timezone'] = { id: timezoneDetails.id, timezone_name: timezoneDetails.timezone_name, timezone_value: timezoneDetails.timezone_value };
                        }
                        else {
                            ele['timezone'] = null;
                        }
                    }
                    if (user?.timezone) {
                        ele['user_timezone'] = userTimezoneObject;
                    }
                    let eventTimezone = ele.timezone?.timezone_name || "";
                    if (eventTimezone) {
                        switch (eventTimezone.trim()) {
                            case "Pacific Standard Time (PST)":
                                eventTimezone = "America/Los_Angeles";
                                break;
                            case "Mountain Standard Time (MST)":
                                eventTimezone = "America/Denver";
                                break;
                            case "Central Standard Time (CST)":
                                eventTimezone = "America/Chicago";
                                break;
                            case "Eastern Standard Time (EST)":
                                eventTimezone = "America/New_York";
                                break;
                            default:
                                eventTimezone = eventTimezone;
                        }
                    } else {
                        eventTimezone = 'UTC';
                    }
                    if (ele.organization_id != 0 || globalEventList[ele?.id]) {
                        ele['Isglobal'] = 1;
                        let date = moment().format('YYYY-MM-DD');
                        let deptId = parseInt(user.department_id);
                        let campaign = await this.campaignService.findOne(
                            `campaign.organization_id = ${user.org_id} 
                            AND campaign.d_start_date <= '${date} 00:00:00' 
                            AND campaign.d_end_date >= '${date} 23:59:59' 
                            AND campaign.status = 1 
                            AND (
                            campaign.department_ids REGEXP '^${deptId},' OR
                            campaign.department_ids REGEXP ',${deptId}$' OR
                            campaign.department_ids REGEXP ',${deptId},' OR
                            campaign.department_ids = ${deptId} OR
                            campaign.department_ids = '0'
                            )`,
                            { end_date: 'ASC' });
                        // if (campaign && campaign.length > 0 && moment(campaign[0].d_start_date).unix() >= moment(ele.start_date).unix()) {
                        //     ele.start_date = campaign[0].d_start_date;
                        // } //ZOMO-4473,4483
                        if (campaign && moment(campaign.d_start_date).unix() >= moment(ele.start_date).unix()) {
                            ele.start_date = campaign.d_start_date;
                        }
                        total_events += await this.shouldRemoveEvent(ele, user, health_plan, eventListAllLoc, eventListAllDept, removeEventList);
                    }
                    ele.userBookingList = [];
                    if(ele.slot && ele.slot.length > 0){
                        //ZOMO-1478
                        ele.slot = ele?.slot?.sort((a, b) => {
                            return moment(b.start_date + ' ' + b.start_time).unix() - moment(a.start_date + ' ' + a.start_time).unix(); 
                        })
                        //ZOMO-1478
                        if(moment(ele.slot[0]['end_date']).isBefore(currentDate)){
                            if(!ele['end_date'] || ele['end_date'] && moment(ele['end_date']).isBefore(currentDate)){
                                if(!removeEventList.includes(ele.id)){
                                    removeEventList.push(ele.id);
                                    total_events -= 1;
                                }
                            }
                        }
                        let userBookingList = await this.eventUserBookingListsService.listRecord(`eubl.ev_slots_id in(${ele.slot.map(slot=> slot.id).join(',')}) AND eubl.ev_user_id = ${user.id} AND eubl.status = 1`,{ id: 'ASC' },['eubl','slotTiming']);
                        ele.userBookingList = userBookingList;
                    }
                    if(eventsIdList.length > 0 && ele?.event_type === 3 && eventsIdListUserBookingList[ele.id]){
                        let userBookingList = await this.eventUserBookingListsService.listRecord(`eubl.ev_events_id = ${ele.id} AND eubl.ev_user_id = ${user.id} AND eubl.status = 1`,{ id: 'ASC' },['eubl','slotTiming']);
                        ele.userBookingList = userBookingList;
                    }
                    if(ele.event_type === 0 && !ele.start_date) {
                        ele.start_date = ele['slot'][0]?.start_date;
                    }
                    if(ele.event_type === 0 && !ele.end_date) {
                        ele.end_date = ele['slot'][ele['slot'].length -1]?.end_date;
                    }
                    // time conversion start
                    let startDate = ele?.start_date && !ele?.start_date.includes(' ') ? ele?.start_date + ' 00:00:00' : ele?.start_date;
                    let endDate =  ele?.end_date  && !ele?.end_date.includes(' ') ? ele?.end_date + ' 23:59:59' : ele?.end_date;
                    if(ele.slot && ele.slot.length > 0){
                        if(ele.slot.length > 1){
                            ele.slot = ele?.slot?.sort((a, b) => {
                                return moment(a.start_date + ' ' + a.start_time).unix() - moment(b.start_date + ' ' + b.start_time).unix(); 
                            })
                            startDate = ele.slot[0].start_date + ' ' + ele.slot[0].start_time;
                            endDate = ele.slot[ele.slot.length - 1].end_date + ' ' + ele.slot[ele.slot.length - 1].end_time;
                        }
                        else{
                            startDate = ele.slot[0].start_date + ' ' + ele.slot[0].start_time;
                            endDate = ele.slot[0].end_date + ' ' + ele.slot[0].end_time;
                        }

                    }
                    // removed to show end date of slot only
                    // let startDate = ele?.slot?.length > 0 ? ele.slot[0].start_date + ' ' + ele.slot[0].start_time : ele?.start_date && !ele?.start_date.includes(' ') ? ele?.start_date + ' 00:00:00' : ele?.start_date
                    // let endDate = ele?.slot?.length > 0 ? ele.slot[0].end_date + ' ' + ele.slot[0].end_time : ele?.end_date  && !ele?.end_date.includes(' ') ? ele?.end_date + ' 23:59:59' : ele?.end_date
                    // if(ele?.start_date && moment(startDate).isSameOrBefore(ele?.start_date)){
                    //     startDate = ele?.start_date;
                    // }
                    // else if(ele?.start_date && ele?.slot?.length && moment(startDate).isSameOrAfter(ele?.start_date)){
                    //     startDate = ele.slot[0].start_date + ' ' + ele.slot[0].start_time;
                    // }
                    // if(ele?.end_date && moment(endDate).isSameOrBefore(ele?.end_date)){
                    //     endDate = ele?.end_date;
                    // }
                    // else if(ele?.end_date && ele?.slot?.length && moment(endDate).isSameOrAfter(ele?.end_date)){
                    //     endDate = ele.slot[0].end_date + ' ' + ele.slot[0].end_time;
                    // }
                    if(startDate && endDate){
                        let startDateTime = moment.tz(moment(startDate).format('YYYY-MM-DD HH:mm:ss'), 'YYYY-MM-DD HH:mm:ss', eventTimezone);
                        let endDateTime = moment.tz(moment(endDate).format('YYYY-MM-DD HH:mm:ss'), 'YYYY-MM-DD HH:mm:ss', eventTimezone);
                        if (companySettings?.e_timezone_setting === 1) {
                            let UstDt = startDateTime;
                            // for event timezone
                            ele.start_date = UstDt.format('YYYY-MM-DD');
                            // for user timezone
                            UstDt = UstDt.clone().tz(userTimezone);
                            ele.user_start_date = UstDt.format('YYYY-MM-DD');
                            startDate = UstDt.format('YYYY-MM-DD HH:mm:ss');
                            let Usedt = endDateTime;
                            // for event timezone
                            ele.end_date = Usedt.format('YYYY-MM-DD');
                            // for user timezone
                            Usedt = Usedt.clone().tz(userTimezone);
                            ele.user_end_date = Usedt.format('YYYY-MM-DD');
                            endDate = Usedt.format('YYYY-MM-DD HH:mm:ss');
                        }
                    }
                    else{
                        ele.start_date = null;
                        ele.end_date = null;
                        ele.dis_start_date = null;
                        ele.dis_end_date = null;
                        ele.user_start_date = null;
                        ele.user_end_date = null;
                        ele.dis_user_start_date = null;
                        ele.dis_user_end_date = null;
                    }
                    // time conversion end
                    const registrationEndDate = moment(endDate,'YYYY-MM-DD HH:mm:ss').subtract(ele?.registration_end ?? 0, 'days').format('YYYY-MM-DD HH:mm:ss');
                    ele.slot = ele?.slot?.sort((a, b) => {
                        return moment(a.start_date + ' ' + a.start_time).unix() - moment(b.start_date + ' ' + b.start_time).unix(); 
                    })
                    if (lastSlotData[ele?.id]) {
                        if (moment(registrationEndDate).isAfter(lastSlotData[ele?.id])) {
                            lastSlotData[ele?.id] = registrationEndDate;
                        }
                    } else {
                        lastSlotData[ele?.id] = registrationEndDate;
                    }
                    if (lastSlotData[ele.id]) {
                        ele.started_date = lastSlotData[ele.id];
                    }
                    if (ele.signup_more_time === 1) {
                        if(ele.userBookingList.length > 0){
                            for(let bookingData of ele.userBookingList){
                                if (bookingData.ev_attend_status !== 1) {
                                    if (bookingData.slotTiming) {
                                        const slotDateTime = `${bookingData.slotTiming.slotdate} ${bookingData.slotTiming.slotendtime}`;
                                        if (companySettings?.e_timezone_setting === 1) {
                                            const userTimezone = user?.timezone || 'UTC';
                                            let UstDt = eventTimezone != 'UTC' ? moment(slotDateTime).tz(eventTimezone) : moment(slotDateTime);
                                            UstDt = UstDt.clone().tz(userTimezone);
                                            let formattedUstdt = UstDt.format('YYYY-MM-DD HH:mm:ss');
                                            if (moment(formattedUstdt).isSameOrAfter(currentDate)) {
                                                ele.status = 0;
                                            }
                                        }
                                        else {
                                            let bookingDatetime = bookingData.slotTiming.slotdate + " " + bookingData.slotTiming.slotendtime;
                                            if (moment(bookingDatetime).isSameOrAfter(currentDate)) {
                                                ele.status = 0;
                                            }
                                        }
                                    }
                                } 
                            }
                        }
                    }
                    else {
                        if (ele.userBookingList && ele.userBookingList.length > 0) {
                            ele.status = 0;
                        }
                    }
                    let joinStatus;
                    let joinType;
                    let notjoin = true;
                    if (ele.status !== undefined) {
                        notjoin = ele.status;
                    }
                    let monthname = ele.start_date ? moment(ele.start_date).format('MMMM') : null;
                    monthname = ele.start_date ? req.lang == 'eng' ? monthname.slice(0,3) : await this.translatorService.frontendReadTranslation(req.lang, monthname.slice(0,3), `/LC_MESSAGES/Common/Month`, `static`) : null;
                    ele['dis_start_date'] = ele?.start_date ? monthname + ` ${moment(ele.start_date).format('DD, YYYY')}` : null;                                        
                    monthname = ele.end_date ? moment(ele.end_date).format('MMMM') : null;
                    monthname = ele.end_date ? req.lang == 'eng' ? monthname.slice(0,3) : await this.translatorService.frontendReadTranslation(req.lang, monthname.slice(0,3), `/LC_MESSAGES/Common/Month`, `static`) : null;
                    ele['dis_end_date'] = ele?.end_date ? monthname + ` ${moment(ele.end_date).format('DD, YYYY')}` : null; 
                    //user timezone 
                    monthname = ele.user_start_date ? moment(ele.user_start_date).format('MMMM') : null;
                    monthname = ele.user_start_date ? req.lang == 'eng' ? monthname.slice(0,3) : await this.translatorService.frontendReadTranslation(req.lang, monthname.slice(0,3), `/LC_MESSAGES/Common/Month`, `static`) : null;
                    ele['dis_user_start_date'] = ele?.user_start_date ? monthname + ` ${moment(ele.user_start_date).format('DD, YYYY')}` : null;                                        
                    monthname = ele.user_end_date ? moment(ele.user_end_date).format('MMMM') : null;
                    monthname = ele.user_end_date ? req.lang == 'eng' ? monthname.slice(0,3) : await this.translatorService.frontendReadTranslation(req.lang, monthname.slice(0,3), `/LC_MESSAGES/Common/Month`, `static`) : null;
                    ele['dis_user_end_date'] = ele?.user_end_date ? monthname + ` ${moment(ele.user_end_date).format('DD, YYYY')}` : null;  
                    if (ele.userBookingList && ele.userBookingList.length) {
                        for (let userBooking of ele.userBookingList) {
                            if (userBooking.slotTiming) {
                                let registration_event_start_date_slot = JSON.parse(JSON.stringify(userBooking.slotTiming.slotdate + ' ' +userBooking.slotTiming.slotstarttime));
                                let registration_event_end_date_slot = JSON.parse(JSON.stringify(userBooking.slotTiming.slotdate + ' ' +userBooking.slotTiming.slotendtime));
                                let registration_user_start_date_slot = JSON.parse(JSON.stringify(userBooking.slotTiming.slotdate + ' ' +userBooking.slotTiming.slotstarttime));
                                let registration_user_end_date_slot = JSON.parse(JSON.stringify(userBooking.slotTiming.slotdate + ' ' +userBooking.slotTiming.slotendtime));
                                if (companySettings?.e_timezone_setting === 1) {
                                    let UstDt = moment.tz(moment(registration_event_start_date_slot).format('YYYY-MM-DD HH:mm:ss'), eventTimezone);
                                    registration_event_start_date_slot = UstDt;
                                    registration_user_start_date_slot = UstDt.clone().tz(userTimezone);
                                    let Uendt = moment.tz(moment(registration_event_end_date_slot).format('YYYY-MM-DD HH:mm:ss'), eventTimezone);
                                    registration_event_end_date_slot = Uendt;
                                    registration_user_end_date_slot = Uendt.clone().tz(userTimezone);
                                }
                                let monthname = registration_event_start_date_slot ? moment(registration_event_start_date_slot).format('MMMM') : null;
                                monthname = registration_event_start_date_slot ? req.lang == 'eng' ? monthname.slice(0,3) : await this.translatorService.frontendReadTranslation(req.lang, monthname.slice(0,3), `/LC_MESSAGES/Common/Month`, `static`) : null;
                                let periodIndicatorStart = registration_event_start_date_slot ? moment(registration_event_start_date_slot).format('A') : null;
                                periodIndicatorStart = registration_event_start_date_slot ? req.lang == 'eng' ? periodIndicatorStart : await this.translatorService.frontendReadTranslation(req.lang, periodIndicatorStart, `/LC_MESSAGES/Common/Common`, `static`) : null;
                                let periodIndicatorEnd = registration_event_end_date_slot ? moment(registration_event_end_date_slot).format('A') : null;
                                periodIndicatorEnd = registration_event_end_date_slot ? req.lang == 'eng' ? periodIndicatorEnd : await this.translatorService.frontendReadTranslation(req.lang, periodIndicatorEnd, `/LC_MESSAGES/Common/Common`, `static`) : null;
                                let date = registration_event_start_date_slot.format('DD');
                                let year = registration_event_start_date_slot.format('YYYY');
                                userBooking['registration_date_slot'] = `${date} ${monthname} ${year} - ${moment(registration_event_start_date_slot).format('hh:mm')} ${periodIndicatorStart} to ${moment(registration_event_end_date_slot).format('hh:mm')} ${periodIndicatorEnd}`

                                monthname = registration_user_start_date_slot ? moment(registration_user_start_date_slot).format('MMMM') : null;
                                monthname = registration_user_start_date_slot ? req.lang == 'eng' ? monthname.slice(0,3) : await this.translatorService.frontendReadTranslation(req.lang, monthname.slice(0,3), `/LC_MESSAGES/Common/Month`, `static`) : null;
                                periodIndicatorStart = registration_user_start_date_slot ? moment(registration_user_start_date_slot).format('A') : null;
                                periodIndicatorStart = registration_user_start_date_slot ?  req.lang == 'eng' ? periodIndicatorStart : await this.translatorService.frontendReadTranslation(req.lang, periodIndicatorStart, `/LC_MESSAGES/Common/Common`, `static`) : null;
                                periodIndicatorEnd = registration_user_end_date_slot ? moment(registration_user_end_date_slot).format('A') : null;
                                periodIndicatorEnd = registration_user_end_date_slot ? req.lang == 'eng' ? periodIndicatorEnd : await this.translatorService.frontendReadTranslation(req.lang, periodIndicatorEnd, `/LC_MESSAGES/Common/Common`, `static`) : null;
                                date = registration_user_start_date_slot.format('DD');
                                year = registration_user_start_date_slot.format('YYYY');
                                userBooking['registration_date_user_slot'] = `${date} ${monthname} ${year} - ${moment(registration_user_start_date_slot).format('hh:mm')} ${periodIndicatorStart} to ${moment(registration_user_end_date_slot).format('hh:mm')} ${periodIndicatorEnd}`
                            }                                
                            if (ele.event_type == 3) {
                                let registration_date_slot = moment(userBooking.registration_date);
                                let registration_date_user_slot = moment(userBooking.registration_date);
                                if (companySettings?.e_timezone_setting === 1) {
                                    let UstDt = moment.tz(moment(registration_date_slot).format('YYYY-MM-DD HH:mm:ss'), 'UTC');
                                    registration_date_slot = moment.tz(moment(registration_date_slot).format('YYYY-MM-DD HH:mm:ss'), eventTimezone);
                                    registration_date_user_slot = UstDt.clone().tz(userTimezone);
                                } 
                                let monthname = registration_date_slot ? moment(registration_date_slot).format('MMMM') : null;
                                monthname = registration_date_slot ? req.lang == 'eng' ? monthname.slice(0,3) : await this.translatorService.frontendReadTranslation(req.lang, monthname.slice(0,3), `/LC_MESSAGES/Common/Month`, `static`) : null;
                                let periodIndicator = registration_date_slot ? moment(registration_date_slot).format('A') : null;
                                periodIndicator = registration_date_slot ? req.lang == 'eng' ? periodIndicator : await this.translatorService.frontendReadTranslation(req.lang, periodIndicator, `/LC_MESSAGES/Common/Common`, `static`) : null;
                                let date = registration_date_slot.format('DD');
                                let year = registration_date_slot.format('YYYY');
                                userBooking['registration_date_slot'] = `${date} ${monthname} ${year} - ${registration_date_slot.format('hh:mm')} ${periodIndicator}`;
                                
                                monthname = registration_date_user_slot ? moment(registration_date_user_slot).format('MMMM') : null;
                                monthname = registration_date_user_slot ? req.lang == 'eng' ? monthname.slice(0,3) : await this.translatorService.frontendReadTranslation(req.lang, monthname.slice(0,3), `/LC_MESSAGES/Common/Month`, `static`) : null;
                                periodIndicator = registration_date_user_slot ? moment(registration_date_user_slot).format('A') : null;
                                periodIndicator = registration_date_user_slot ? req.lang == 'eng' ? periodIndicator : await this.translatorService.frontendReadTranslation(req.lang, periodIndicator, `/LC_MESSAGES/Common/Common`, `static`) : null;
                                date = registration_date_user_slot.format('DD');
                                year = registration_date_user_slot.format('YYYY');
                                userBooking['registration_date_user_slot'] = `${date} ${monthname} ${year} - ${registration_date_user_slot.format('hh:mm')} ${periodIndicator}`;
                            }                                
                            userBooking['lang_id'] = userBooking?.['lang_id'] == 1 ? 'Spanish' : 'English';
                        }
                    }    
                                                                                  
                    if (ele.event_type === 0 || ele.event_type === 2 || ele.event_type === 3) {
                        // changes added for issue ZOMO-205
                        let eventStartedDate = ele.started_date ? moment(ele.started_date,'YYYY-MM-DD HH:mm:ss') : '';
                        let currentDate = moment();      
                        currentDate = currentDate.clone().tz(eventTimezone)  
                        // removed for slow listing
                        // console.log(ele.id,'currentDate', currentDate.format('YYYY-MM-DD HH:mm:ss'), 'eventStartedDate', eventStartedDate.format('YYYY-MM-DD HH:mm:ss'));                   
                        // if (eventStartedDate && currentDate > eventStartedDate) {
                        if (eventStartedDate && currentDate.isAfter(eventStartedDate)) {
                            joinStatus = registrationClosedButtonText;
                            joinType = 3;
                        } else {
                            if (notjoin) {
                                if (ele.event_type === 2) {
                                    let externalLink = ele.external_link;
                                    if (externalLink === "https://sso.preventioncloud.com/ehealth" || externalLink === "https://sso.preventioncloud.com/ehealth/view") {
                                        joinStatus = joinButtonText;
                                        joinType = 1;
                                    } else {
                                        joinStatus = joinButtonText;
                                        joinType = 1;
                                    }
                                }
                                else if (ele.event_type === 3) {
                                    let totalRegistrations = ele.tot_register;
                                    let currentRegistrationCount = eventsIdListUserBookingList[ele.id] || 0;
                                    if (totalRegistrations === '' || totalRegistrations === 0 || currentRegistrationCount >= totalRegistrations) {
                                        joinStatus = registrationFullButtonText;
                                        joinType = 4;
                                    } else {
                                        joinStatus = joinButtonText;
                                        joinType = 1;
                                    }
                                } else {
                                    if (!ele.hasOwnProperty('started')) {
                                        let featchmonthfromid =  await this.featchMonthFromId(req, { id: ele.id, multipleSet: ele.signup_more_time, internal_call: 1 });
                                        if (featchmonthfromid && featchmonthfromid.length > 0) {
                                            joinStatus = joinButtonText;
                                            joinType = 1;
                                        } else {
                                            joinStatus = registrationClosedButtonText;
                                            joinType = 3;
                                        }
                                    }
                                }
                            } else {
                                joinStatus = goingButtonText;
                                joinType = 2;
                            }
                        }
                    }
                    ele['joinStatus'] = joinStatus;
                    ele['joinType'] = joinType;
                };
            }
            if(removeEventList && removeEventList.length > 0){
                eventList = eventList.filter(event => !removeEventList.includes(event.id));
                if(eventList.length == 0){
                    total_events = 0;
                }
            }
            if (eventList && eventList.length) {
                await Promise.all(eventList.map(async (ele) => {
                    if(ele.event_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.event_name = (customName == '' || customName == `event_name_${ele['id']}`) ? ele['event_name'] : customName;
                    }
                    if(ele.event_description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_description_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.event_description = (customName == '' || customName == `event_description_${ele['id']}`) ? ele['event_description'] : customName;
                    }
                    if(ele.event_address){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_address_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.event_address = (customName == '' || customName == `event_address_${ele['id']}`) ? ele['event_address'] : customName;
                    }
                    if(ele.event_city){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_city_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.event_city = (customName == '' || customName == `event_city_${ele['id']}`) ? ele['event_city'] : customName;
                    }
                    if(ele.event_state){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_state_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.event_state = (customName == '' || customName == `event_state_${ele['id']}`) ? ele['event_state'] : customName;
                    }
                    if(ele.user_id){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`selectedName_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.user_id = (customName == '' || customName == `selectedName_${ele['id']}`) ? ele['user_id'] : customName;
                    }
                    if(ele.event_location){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_location_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.event_location = (customName == '' || customName == `event_location_${ele['id']}`) ? ele['event_location'] : customName;
                    }
                    if(ele?.timezone && ele?.timezone?.timezone_value){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, ele?.timezone?.timezone_value, `/LC_MESSAGES/Common/Timezone`);
                        ele.timezone.timezone_value = (customName == '' || customName == ele?.timezone?.timezone_value) ? ele?.timezone?.timezone_value : customName;
                    }
                    if(ele?.user_timezone && ele?.user_timezone?.timezone_value){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, ele?.user_timezone?.timezone_value, `/LC_MESSAGES/Common/Timezone`);
                        ele.user_timezone.timezone_value = (customName == '' || customName == ele?.user_timezone?.timezone_value) ? ele?.user_timezone?.timezone_value : customName;
                    }
                }));
            }
            if([appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(user?.role_id)){
                const deviceDetails = this.commonService.getClientIPAndDeviceDetails(req);
                if(['Android','IOS','iOS','ios','Mac'].includes(deviceDetails?.os_name) && deviceDetails?.client_type != 'browser'){
                    let filters = postData?.filters || {};
                    const filterStart = postData?.from_date ? moment(postData.from_date) : null;
                    const filterEnd = postData?.to_date ? moment(postData.to_date) : null;
                    eventList = eventList.filter(item => {
                        if (filters?.status) {
                            filters.status = Number(filters?.status);
                            if (Array.isArray(filters?.status)) {
                                if (item?.joinType && !filters?.status.includes(item?.joinType)) return false;
                            } else {
                                if (item?.joinType && item?.joinType !== filters.status) return false;
                            }
                        }
                        
                        if (filterStart || filterEnd) {
                            const itemStart = moment(item?.start_date);
                            const itemEnd = moment(item?.end_date);
                            
                            if (filterStart && itemEnd.isBefore(filterStart, "day")) return false;
                            if (filterEnd && itemStart.isAfter(filterEnd, "day")) return false;
                        }
                        return true;
                    });
                    total_events = eventList.length;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { EventsidListUserbookinglist: eventsIdListUserBookingList, finalEventList: eventList?.sort((a, b) =>  a.orderid - b.orderid), total_events },
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
    @Post('register-user-event')
    async regestreUserEvent(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user = Object.create(req.tokenUser);
            let totalCand;
            let bookingConfirm;
            let bookedData;
            let timezoneData = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, {}));
            if (postData && Object.keys(postData).length && !postData?.hasOwnProperty('category_id')) {
                postData['register'] = true;
                let returnResult = await this.event_registration_process(postData, timezoneData, req);
                if (returnResult['reject'] == 0) {
                    totalCand = returnResult['totalCand'];
                    bookingConfirm = returnResult['bookingConfirm'];
                    bookedData = returnResult['bookedData'];
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: returnResult['successmsg'],
                        message: 'success',
                    });
                } else {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, returnResult['rejectmsg']));
                }
            }
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
    @Post('cancel-registration')
    async cancelRegistration(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.bookingId) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let bookingExit = await this.eventUserBookingListsService.findOne(`eubl.id = ${postData?.bookingId} AND eubl.ev_user_id = ${req.tokenUser?.id} AND eubl.status = 1`);
            if (bookingExit) {
                await this.eventUserBookingListsService.update({ id: postData?.bookingId }, { status: 0 });
                let slotTiming = await this.eventSlotsTimingsService.findOne({ id: bookingExit['slot_selected'] });
                if (slotTiming && bookingExit['slot_selected'] != '-1') {
                    await this.eventSlotsTimingsService.update({ id: slotTiming['id'] }, { total_booked: slotTiming['total_booked'] - 1 });
                }
            }
            else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "User Booking Not Found"));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: 'Registration Cancelled Successfully',
                message: await this.translatorService.frontendReadTranslation( req.lang, 'Registration Cancelled Successfully', `/LC_MESSAGES/Events/Events`, `static`)+`.`,
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
    async filterEvents(filter_type = null, from_date = '', to_date = '') {
        try{
            let result = null;
            if (filter_type == null) {
                return {result: [], event_condition: ''};
            }
            let condition;
            let event_condition;
            if (filter_type == 1) {
                condition = 'DATE_FORMAT(est.slotdate,"%Y-%m-%d") BETWEEN DATE_ADD(CURDATE(), INTERVAL - WEEKDAY(CURDATE()) DAY) AND DATE(NOW() + INTERVAL (6 - WEEKDAY(NOW())) DAY) AND est.status = 1';
                event_condition = `(
                    event.start_date <= DATE_ADD(CURDATE(), INTERVAL (6 - WEEKDAY(CURDATE())) DAY)
                    AND event.end_date >= DATE_ADD(CURDATE(), INTERVAL -WEEKDAY(CURDATE()) DAY)
                )`;
            } // This Week
            if (filter_type == 2) {
                condition = 'DATE_FORMAT(est.slotdate,"%Y-%m-%d") BETWEEN (NOW() + INTERVAL 7 - WEEKDAY(NOW()) DAY) AND (NOW() + INTERVAL 6 - WEEKDAY(NOW()) + 7 DAY) AND est.status = 1';
                event_condition = `(
                    event.start_date <= DATE_ADD(CURDATE(), INTERVAL (13 - WEEKDAY(CURDATE())) DAY)
                    AND event.end_date >= DATE_ADD(CURDATE(), INTERVAL (7 - WEEKDAY(CURDATE())) DAY)
                )`;
            } // Next Week
            if (filter_type == 3) {
                condition = 'DATE_FORMAT(est.slotdate,"%Y-%m-%d") BETWEEN DATE_FORMAT(CURDATE(), "%Y-%m-01") AND LAST_DAY(CURDATE()) AND est.status = 1';
                event_condition = `(
                    event.start_date <= LAST_DAY(CURDATE())
                    AND event.end_date >= DATE_FORMAT(CURDATE(), "%Y-%m-01")
                )`;
            } // This Month
            if (filter_type == 4) {
                condition = 'DATE_FORMAT(est.slotdate,"%Y-%m-%d") BETWEEN ADDDATE(LAST_DAY(CURDATE()), 1) AND LAST_DAY(DATE_ADD(CURDATE(), INTERVAL 1 MONTH)) AND est.status = 1';
                event_condition = `(
                    event.start_date <= LAST_DAY(DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
                    AND event.end_date >= DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), "%Y-%m-01")
                )`;
            } // Next Month
            if (filter_type == 5) {
                if (from_date && from_date != '' && to_date && to_date != '') {
                    from_date = this.commonDateService.getTodayDate(from_date).format('YYYY-MM-DD');
                    to_date = this.commonDateService.getTodayDate(to_date).format('YYYY-MM-DD');
                    condition = `DATE_FORMAT(est.slotdate,"%Y-%m-%d") BETWEEN "${from_date}" AND "${to_date}"  AND est.status = 1`;
                    event_condition = `event.start_date <= "${to_date}"  AND event.end_date >= "${from_date}"`;
                }
            } // Date Range
            if (condition) {
                result = await this.eventSlotsTimingsService.find(condition, ['est.ev_slots_id']);
            }
            return {result, event_condition};
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    @Post('fetch-month')
    async featchmonthfromid(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && (postData?.multipleSet == undefined || postData?.multipleSet == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let allslots = await this.featchMonthFromId(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: allslots,
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
    async featchMonthFromId(req: Request, postData: any) {
        try{
            let user = Object.create(req.tokenUser);
            let month = await this.categoriesCommon(postData?.id, postData?.multipleSet, 'months', null, null, req);
            let allslots = [];
            if (user?.company?.id == 1131 && postData?.id == 186) {
                month = month.filter(sub => sub.months <= 11);
            }
            if (user?.company?.id == 804 && postData?.id == 186) {
                month = month.filter(sub => sub.months <= 8);
                for (let mValue of month) {
                    const slotdate = this.commonDateService.getTodayDate(mValue.est_slotdate);
                    let monthname = slotdate.format('MMMM');
                    monthname = await this.translatorService.frontendReadTranslation(req.lang, monthname, `/LC_MESSAGES/Common/Month`, `static`);
                    allslots.push({
                        ev_slots_id: mValue.est_ev_slots_id,
                        event_id: mValue.est_ev_events_id,
                        month_id: mValue.months,
                        month: monthname
                    });
                };
            }
            else {
                for (let mValue of month) {
                    const slotdate = this.commonDateService.getTodayDate(mValue.est_slotdate);
                    let monthname = slotdate.format('MMMM');
                    monthname = await this.translatorService.frontendReadTranslation(req.lang, monthname, `/LC_MESSAGES/Common/Month`, `static`);
                    allslots.push({
                        ev_slots_id: mValue.est_ev_slots_id,
                        event_id: mValue.est_ev_events_id,
                        month_id: mValue.months,
                        month: monthname
                    });
                };
            }
            if (postData?.internal_call == 1) {
                return allslots;
            }
            return allslots;
        }
        catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async categoriesCommon(eventId = null, evMultiple = null, type = null, monthSetting = null, daySetting = null, req: Request) {
        try {
            let user = Object.create(req.tokenUser);
            let role_id = user.role_id;
            let monthConditions = `est.status = 1 AND slot.status = 1 AND est.ev_events_id = ${eventId} AND est.slotdate >= NOW() - INTERVAL 2 DAY AND DATE_FORMAT(CONCAT(est.slotdate, " ", est.slotstarttime) - INTERVAL slot.registration_end DAY, "%Y-%m-%d %H:%i:%s") > NOW() `;
            let where = `eubl.ev_events_id = ${eventId} AND eubl.status = 1`;
            const userBookingList = await this.eventUserBookingListsService.listRecord((role_id == 1 || role_id == 11) ? where : where + ` AND eubl.ev_user_id = ${user.id}`, null, ['eubl.slot_selected']);
            if (userBookingList.length > 0) {
                monthConditions += ` AND est.id NOT In(${userBookingList.map(booking => booking.slot_selected).join(',')})`;
            }
            monthConditions += ` AND(slot.attendee_limit_type = 1 OR slot.attendee_limit > est.total_booked)`
            const usersDataWellness = (role_id == 1 || role_id == 11) ? [] : await this.userService.usersDataWellness(user);
            if (usersDataWellness && usersDataWellness.length > 0) {
                monthConditions += ` AND(slot.created_by NOT IN(${usersDataWellness.map(user => user.id).join(',')}))`
            }
            let monthFields;
            let monthGroup;
            if (type === 'months') {
                monthFields = eventConstant.FIELD.MONTH;
                monthGroup = 'months';
            } else if (type === 'date') {
                monthConditions += ` AND MONTH(est.slotdate) = ${monthSetting}`;
                monthFields = eventConstant.FIELD.DATE;
                monthGroup = 'est.slotdate';
            } else if (type === 'dateday') {
                monthConditions += ` AND MONTH(est.slotdate) = ${monthSetting}`;
                monthConditions += ` AND DATE_FORMAT(est.slotdate,"%Y-%m-%d") = '${daySetting}'`;
                monthFields = eventConstant.FIELD.DATEDAY;
                monthGroup = 'est.id';
            }
            const results = await this.eventSlotsTimingsService.categoryListRecord(monthConditions, { slotdate: 'ASC' }, monthFields, monthGroup);
            return results;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    @Post('get-slot-from-month')
    async getSlotsFromMonth(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.month && (postData?.multipleSet == undefined || postData?.multipleSet == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser);
            let usersDataWellness = user.usersdatawellness;
            let event_id = postData?.id;
            let month = postData['month'];
            let multipleSet = postData['multipleSet'];
            let months = await this.categoriesCommon(event_id, multipleSet, 'date', month, null, req);
            let result = [];
            if (user.company.id == 804 && postData?.id == 186 && month == '08') {
                months = months.filter(sub => {
                    let slotDate = this.commonDateService.getTodayDate(sub.Slottiming.slotdate);
                    let day = slotDate.date();
                    return day <= 8;
                });
            }
            if (months && months.length) {
                for (let mValue of months) {
                    const slotDate = this.commonDateService.getTodayDate(mValue.est_slotdate);
                    let day = slotDate.date();
                    let month = slotDate.format('MM');
                    let year = slotDate.format('YYYY');
                    let monthname = slotDate.format('MMMM');
                    monthname = await this.translatorService.frontendReadTranslation(req.lang, monthname, `/LC_MESSAGES/Common/Month`, `static`);
                    result.push({
                        multipleSet,
                        Slottiming_id: mValue.est_ev_slots_id,
                        event_id: mValue.est_ev_events_id,
                        slotid: mValue.est_ev_slots_id,
                        Dayid: slotDate.format('YYYY-MM-DD'),
                        month_id: month,
                        month: monthname,
                        date: `${day} ${monthname.substring(0, 3)} ${year}`
                    });
                };
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

    @Post('get-slot-from-month-day')
    async getSlotsFromMonthOfDay(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.get_slot_listing && !postData?.month && !postData?.dayid && !postData?.timezone_name && (postData?.multipleSet == undefined || postData?.multipleSet == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let result = [];
            let temp = [];
            if (postData?.get_slot_listing && postData?.get_slot_listing == true) {
                let user = Object.create(req.tokenUser);
                let usersDataWellness = user.usersdatawellness;
                let event_id = postData?.id;
                let month = postData['month'];
                let dayid = postData['dayid'];
                let multipleSet = postData['multipleSet'];
                let timezone_name = postData['timezone_name'];
                let slots = await this.categoriesCommon(event_id, multipleSet, 'dateday', month, dayid, req);
                for (let Value of slots) {
                    const userTimezone = user.timezone;
                    const companyTimezoneSetting = user.company.setting.e_timezone_setting;
                    if (companyTimezoneSetting === 1) {
                        let datetime = `${this.commonDateService.getTodayDate(Value.est_slotdate).format('YYYY-MM-DD')} ${Value.est_slotstarttime}`;
                        let EvntTZ = userTimezone ? userTimezone : 'UTC';
                        const eventTimezone = timezone_name;
                        let stdt = moment.tz(datetime, eventTimezone);
                        stdt = stdt.clone().tz(EvntTZ);
                        Value.est_slotdate = stdt.format('YYYY-MM-DD');
                        Value.est_slotstarttime = stdt.format('HH:mm:ss');
                        datetime = `${Value.est_slotdate} ${Value.est_slotendtime}`;
                        stdt = moment.tz(datetime, eventTimezone);
                        stdt = stdt.clone().tz(EvntTZ);
                        Value.est_slotendtime = stdt.format('HH:mm:ss');
                    }
                    Value.combinedate = `${this.commonDateService.getTodayDate(Value.est_slotdate).format('YYYY-MM-DD')} ${Value.est_slotstarttime}`;
                    let deadline = Value.slot_registration_end || 0;
                    let allslots = Value;
                    let checkCurrentDate = moment.utc()
                    let checkCurrentDate1 = checkCurrentDate.clone().tz('America/Anchorage');
                    let checkslotdate = moment(`${Value.est_slotdate} ${Value.est_slotendtime}`).format('YYYY-MM-DD HH:mm:ss');
                    let deadlinedate = moment(checkslotdate).subtract(deadline, 'days').format('YYYY-MM-DD HH:mm:ss');
                    let eventtimezone = timezone_name;
                    if (eventtimezone) {
                        switch (eventtimezone.trim()) {
                            case 'Pacific Standard Time (PST)':
                                eventtimezone = 'America/Los_Angeles';
                                break;
                            case 'Mountain Standard Time (MST)':
                                eventtimezone = 'America/Denver';
                                break;
                            case 'Central Standard Time (CST)':
                                eventtimezone = 'America/Chicago';
                                break;
                            case 'Eastern Standard Time (EST)':
                                eventtimezone = 'America/New_York';
                                break;
                            default:
                                eventtimezone = eventtimezone.trim();
                        }
                        checkCurrentDate = checkCurrentDate1.clone().tz(eventtimezone).format('YYYY-MM-DD HH:mm:ss');
                        deadlinedate = moment(deadlinedate).tz(eventtimezone).format('YYYY-MM-DD HH:mm:ss');
                    }
                    if (moment(checkslotdate).isSameOrAfter(moment(checkCurrentDate))) {
                        if (deadline !== 0) {
                            if (moment(checkCurrentDate).isBefore(moment(deadlinedate))) {
                                const slotDate = this.commonDateService.getTodayDate(Value.est_slotdate);
                                const startTime = moment(Value.est_slotstarttime, 'HH:mm:ss').format('hh:mm A');
                                const endTime = moment(Value.est_slotendtime, 'HH:mm:ss').format('hh:mm A');
                                let day = slotDate.date();
                                let month = slotDate.format('MM');
                                let year = slotDate.format('YYYY');
                                let monthname = slotDate.format('MMMM');
                                monthname = await this.translatorService.frontendReadTranslation(req.lang, monthname, `/LC_MESSAGES/Common/Month`, `static`);
                                let to = await this.translatorService.frontendReadTranslation(req.lang, 'to', `/LC_MESSAGES/Common/Common`, `static`);
                                const slotOption = {
                                    est_id: Value.est_id,
                                    multipleSet,
                                    Slottiming_id: Value.est_ev_slots_id,
                                    month_id: month,
                                    slotid: Value.est_ev_slots_id,
                                    event_id: Value.est_ev_events_id,
                                    slotlimit: Value?.Slots?.attendee_limit ?? Value.slot_attendee_limit,
                                    ISslotlimit: Value?.Slots?.attendee_limit_type ?? Value.slot_attendee_limit_type,
                                    month: monthname,
                                    combinedate: Value.combinedate,
                                    date: `${day} ${monthname.substring(0, 3)} ${year} - ${startTime} ${to} ${endTime}`,
                                };
                                if (!allslots.allslotsoptions) {
                                    allslots.allslotsoptions = [];
                                }
                                allslots.allslotsoptions.push(slotOption);
                            }
                        } else {
                            const slotDate = this.commonDateService.getTodayDate(Value.est_slotdate);
                            const startTime = moment(Value.est_slotstarttime, 'HH:mm:ss').format('hh:mm A');
                            const endTime = moment(Value.est_slotendtime, 'HH:mm:ss').format('hh:mm A');
                            let day = slotDate.date();
                            let month = slotDate.format('MM');
                            let year = slotDate.format('YYYY');
                            let monthname = slotDate.format('MMMM');
                            monthname = await this.translatorService.frontendReadTranslation(req.lang, monthname, `/LC_MESSAGES/Common/Month`, `static`);
                            let to = await this.translatorService.frontendReadTranslation(req.lang, 'to', `/LC_MESSAGES/Common/Common`, `static`);
                            const slotOption = {
                                est_id: Value.est_id,
                                multipleSet,
                                Slottiming_id: Value.est_ev_slots_id,
                                month_id: month,
                                slotid: Value.est_ev_slots_id,
                                event_id: Value.slot_ev_events_id,
                                slotlimit: Value.slot_attendee_limit,
                                ISslotlimit: Value.slot_attendee_limit_type,
                                month: monthname,
                                combinedate: Value.combinedate,
                                date: `${day} ${monthname.substring(0, 3)} ${year} - ${startTime} ${to} ${endTime}`,
                            };
                            if (!allslots.allslotsoptions) {
                                allslots.allslotsoptions = [];
                            }
                            allslots.allslotsoptions.push(slotOption);
                        }
                    }
                    if (allslots.allslotsoptions) {
                        temp.push(allslots);
                    }
                };
                result = temp;
                if (result && result.length > 0) {
                    result.sort((a, b) => {
                        return this.commonDateService.getTodayDate(a.combinedate).valueOf() - this.commonDateService.getTodayDate(b.combinedate).valueOf();
                    });
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

    @Post('get-slot-date-list')
    async getSlotsListReport(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let multipleSet = postData['multipleSet'];
            let months = [];
            for(let id of postData?.id?.split(',')){
                let event_id = id;
                let monthData = await this.featchMonthFromId(req, {id: event_id, multipleSet: postData?.multipleSet});
                for(let month of monthData){   
                    let monthValue = month?.['month_id'];
                    let monthList = await this.categoriesCommon(event_id, multipleSet, 'date', monthValue, null, req);
                    if(monthList){
                        months = months.concat(monthList);
                    }
                }
            }
            let result = [];
            if (months && months.length) {
                for (let mValue of months) {
                    const slotDate = this.commonDateService.getTodayDate(mValue.est_slotdate);
                    let day = slotDate.date();
                    let month = slotDate.format('MM');
                    let year = slotDate.format('YYYY');
                    let monthname = slotDate.format('MMMM');
                    monthname = await this.translatorService.frontendReadTranslation(req.lang, monthname, `/LC_MESSAGES/Common/Month`, `static`);
                    let checkExist = result?.find(r => r.Dayid === slotDate.format('YYYY-MM-DD'));
                    if(!checkExist){
                        result.push({
                            id: slotDate.format('MM-DD-YYYY'),
                            multipleSet,
                            Slottiming_id: mValue.est_ev_slots_id,
                            event_id: mValue.est_ev_events_id,
                            slotid: mValue.est_ev_slots_id,
                            Dayid: slotDate.format('YYYY-MM-DD'),
                            month_id: month,
                            month: monthname,
                            date: `${day} ${monthname.substring(0, 3)} ${year}`
                        });
                    }
                };
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

    async shouldRemoveEvent(ele, user, health_plan, eventListAllLoc, eventListAllDept, removeEventList) {
        let totalEventsDelta = 0;
        const eventHealthPlans = ele.healthplanname ? JSON.parse(ele.healthplanname) : [];
        const lowerCasedHealthPlans = eventHealthPlans.map(plan => plan.toLowerCase());
        if (!ele.healthplanname || lowerCasedHealthPlans.length) {
            if (health_plan && health_plan !== '') {
                if (lowerCasedHealthPlans.length > 0 && !lowerCasedHealthPlans.includes(health_plan.toLowerCase())) {
                    if (!removeEventList.includes(ele.id)) {
                        removeEventList.push(ele.id);
                        totalEventsDelta--;
                    }
                }
            } else {
                if (lowerCasedHealthPlans.length > 0) {
                    if (!removeEventList.includes(ele.id)) {
                        removeEventList.push(ele.id);
                        totalEventsDelta--;
                    }
                }
            }
        }
        if (ele.organization_id !== 0) {
            const eventLocations = eventListAllLoc[ele.id] ? eventListAllLoc[ele.id]?.map(loc => parseInt(loc)) : [];
            const eventDepartments = eventListAllDept[ele.id] ? eventListAllDept[ele.id]?.map(dept => parseInt(dept)) : [];
            const locationCondition = (ele.all_locations === 'all_loc' ||
                eventLocations.includes(parseInt(user.location)));
            const departmentCondition = (ele.all_departments === 'all_dept' ||
                eventDepartments.includes(parseInt(user.department_id)));
            if (!(locationCondition && departmentCondition)) {
                if (!ele.category_name && (eventLocations.length !== 0 || eventDepartments.length !== 0)) {
                    if (!removeEventList.includes(ele.id)) {
                        removeEventList.push(ele.id);
                        totalEventsDelta--;
                    }
                }
            }
        }
        const eligibility = ele.eligibility;
        const shouldKeep =
            eligibility === 0 ||
            (user?.is_camp_eligible === 1 && eligibility === 1) ||
            (user?.is_camp_eligible === 0 && eligibility === 2) ||
            (user?.role_id === 2 && user?.is_camp_eligible === 1 && eligibility === 3) ||
            (user?.role_id === 2 && user?.is_camp_eligible === 0 && eligibility === 4) ||
            (user?.role_id === 16 && user?.is_camp_eligible === 1 && eligibility === 5) ||
            (user?.role_id === 16 && user?.is_camp_eligible === 0 && eligibility === 6);
        if (!ele.category_name && !shouldKeep) {
            if (!removeEventList.includes(ele.id)) {
                removeEventList.push(ele.id);
                totalEventsDelta--;
            }
        }
        return totalEventsDelta; 
    }

    async fetchEventLocationAndDepartmentMaps(eventIdList, user) {
        const result = {
            eventListAllLoc: {},
            eventListAllDept: {}
        };
        const [departmentRecords, locationRecords] = await Promise.all([
            this.eventDepartmentService.list(
                `ev_departments.organization_id = '${user.org_id}' AND ev_departments.ev_events_id IN(${eventIdList.join(',')}) AND ev_departments.status != 2`
            ),
            this.eventLocationService.listRecord(
                `e_location.organization_id = '${user.org_id}' AND e_location.ev_events_id IN(${eventIdList.join(',')}) AND e_location.status != 2`
            )
        ]);
        result.eventListAllLoc = locationRecords.reduce((acc, item) => {
                const key = item.ev_events_id;
                const locId = item.locations_id;
                if (!acc[key]) {
                    acc[key] = [];
                    acc[key].push(locId);
                }
                else{
                    if(!acc[key].includes(locId)){
                        acc[key].push(locId);
                    }   
                }
                return acc;
            }, {});
        result.eventListAllDept = departmentRecords.reduce((acc, item) => {
                const key = item.ev_events_id;
                const deptId = item.departments_id;
                if (!acc[key]) {
                    acc[key] = [];
                    acc[key].push(deptId);
                }
                else{
                    if(!acc[key].includes(deptId)){
                        acc[key].push(deptId);
                    }   
                }
                return acc;
            }, {});

        return result;
    }
}
