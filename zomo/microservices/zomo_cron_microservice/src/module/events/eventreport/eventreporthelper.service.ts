import {
    appConstant,
    CommonDateService,
    CommonFileService,
    CommonService,
    Gender,
    reportFieldsConstant,
    tableConstant,
} from '@common-constants';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CompanyService } from 'src/module';
import { EventReportInput } from '../../../../../../backend/src/modules/report/input/eventreport.input';
import { EventExternalLinkService } from '../externallinkuser/externallinkuser.service';
import { EventGlobalEventsService } from '../globalevents/globalevents.service';
import { EventUserBookingListsService } from '../userbookinglists/userbookinglists.service';
import { RequestEventReportsService } from './eventreports.service';
const path = require('path');
const argon2 = require('argon2');
const _ = require('lodash');

export class EventReportHelper {
    constructor(
        @Inject('TIMEZONE_SERVICE')
        private timezoneMicroservice: ClientProxy,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly eventGlobalService: EventGlobalEventsService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly commonService: CommonService,
        private readonly eventExternalLinkService: EventExternalLinkService,
        private readonly requestEventReportsService: RequestEventReportsService,
        private readonly companyService: CompanyService,
    ) {}

    async eventReportGenerate(postData: EventReportInput, user: any) {
        try {
            let autoRequestId: number = 0;
            let auto_request = user?.auto_request ? user?.auto_request : 0;
            if (auto_request == 1) {
                autoRequestId = postData?.auto_request_id;
            }
            let reportRequestData
            if (auto_request) {
                reportRequestData = await this.requestEventReportsService.findOne(`eventreport.status = 0 AND company.status = 1 AND company.deleted = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND eventreport.id = ' + autoRequestId : ''}`,{ request_date: 'ASC' },['eventreport','company']);
                if (reportRequestData) {
                    postData.file_type = 'excel';
                    postData.department_id = reportRequestData?.department_id;
                    postData.location_id = reportRequestData?.location;
                    postData.org_id = reportRequestData?.org_id?.toString();
                    let otherOptions = reportRequestData?.otheroptions?.includes("{}") ? {}  : JSON.parse(reportRequestData?.otheroptions);
                    if(otherOptions.hasOwnProperty('event_type')){
                        postData.event_type = otherOptions?.event_type;
                    }
                    /*TODO: add date filter here */
                }
            }

            let fileType = postData?.file_type && postData?.file_type != '' ? postData?.file_type : 'csv';
            let headerData: any = reportFieldsConstant.ReportEventAdminFields;
            if(reportRequestData?.report_fields){
                const obj2 = JSON.parse(reportRequestData.report_fields);
                const result = Object.keys(obj2).reduce((acc, key) => {
                acc[key] = key in headerData ? headerData[key] : obj2[key];
                return acc;
                }, {});
                headerData = result;
            }
            const directory = `public/eventreport/${postData?.org_id}`;
            let fileName;
            if (appConstant.ROLE.ADMIN === user?.role_id) {
                fileName = `Event-Report-${await this.commonDateService.DateTimeFormat('now', 'MM-DD-YYYY')}`;
            } else {
                fileName = `Event_Report_${postData?.org_id}_${await this.commonDateService.DateTimeFormat('now', 'MM_DD_YYYY')}_${await this.commonDateService.DateTimeFormat('now', 'timestamp')}`;
                if (appConstant.ROLE.ORGADMIN === user?.role_id) {
                    headerData = reportFieldsConstant.ReportEventOrgAdminFields;
                }
                if (appConstant.ROLE.COACH === user?.role_id) {
                    headerData = reportFieldsConstant.ReportEventCoachFields;
                }
                if (appConstant.ROLE.GLOBALCOACH === user?.role_id) {
                    headerData = reportFieldsConstant.ReportEventGlobalCoachFields;
                }
                if (appConstant.ROLE.WCH === user?.role_id) {
                    headerData = reportFieldsConstant.ReportEventChampionFields;
                }
                if (appConstant.ROLE.BROKER === user?.role_id) {
                    headerData = reportFieldsConstant.ReportEventBrokerFields;
                }
                if (appConstant.ROLE.BROKERADMIN === user?.role_id) {
                    headerData = reportFieldsConstant.ReportEventBrokerAdminFields;
                }
                if (appConstant.ROLE.REGIONALADMIN === user?.role_id) {
                    headerData = reportFieldsConstant.ReportEventRegionalAdminFields;
                }
            }
            if (auto_request == 1) {
                fileName = `Event_Report__${autoRequestId}_${await this.commonDateService.DateTimeFormat('now', 'MM-DD-YYYY')}`;
            }
            let jsonFile = `${fileName}.json`;
            let eventData = await this.userEvent(postData);
            if (auto_request ||(postData?.result_type == 2 && eventData.length)) {
                let excelData: any;
                let reportId = reportRequestData?.id;
                let skip_csv = await this.mapSheetData(eventData, headerData);
                if (fileType == 'excel') {
                    let result = Object.fromEntries(Object.values(headerData).map(value => [value, value]));
                    skip_csv = [result,...skip_csv];
                }
                let writeFile = await this.commonFileService.writeFile(path.join(`${directory}/`),`${JSON.stringify(skip_csv)}`,jsonFile,);
                if (writeFile?.status != 'success') {
                    throw new Error(`File does not exist`);
                }
                const file_full_path = path.resolve(
                    `${path.join(`${directory}/`)}${jsonFile}`,
                );
                if (fileType == 'csv') {
                    fileName = file_full_path.replace('.json', '.csv');
                    excelData = await this.commonFileService.createJsonToFile(1,file_full_path,'pythonjsontocsv.py',);
                }
                if (fileType == 'excel') {
                    fileName = file_full_path.replace('.json', '.xlsx');
                    excelData = await this.commonFileService.createJsonToFile(2,file_full_path,'pythonjsontoxlsx.py',);
                }
                if (postData?.result_type == 2 && eventData.length) {
                    await this.commonFileService.removeFileFromLocal(`${path.join(`${directory}/`)}${jsonFile}`);
                    eventData = await this.commonFileService.FileToBase64(fileName);
                    eventData = {
                        file_name: jsonFile.replace('.json', ''),
                        file_data: this.commonService.passwordEncrypt(eventData),
                        extension: fileType == 'csv' ? 'csv' : 'xlsx',
                    };
                    await this.commonFileService.removeFileFromLocal(`${path.join(`${directory}/`)}${jsonFile}`.replace('.json',fileType == 'csv' ? '.csv' : '.xlsx'));
                } else {
                    let zipPassword = await this.companyService.getCompanyZipPassword(postData?.org_id);
                    if (excelData?.status == 'success') {
                        if (await this.commonFileService.fileExist(fileName)) {
                            let result: any = await this.commonFileService.createPasswordProtectedZip(fileName,zipPassword.toString(),'create_zip.py',);
                            if (result?.status == 'success') {
                                fileName = fileName.replace(fileType == 'csv' ? '.csv' : '.xlsx', '.zip');
                                let zipPath = `automatic_report/events_reports/${reportId}/Events_report.zip`;
                                let zipPathDir = fileName;
                                if (await this.commonFileService.fileExist(zipPathDir)) {
                                    try {
                                        let uploadResult = await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },
                                                {
                                                    path: path.resolve(`${zipPathDir}`),
                                                    filename: `${zipPath}`,
                                                    userBucket: 'private',
                                                },
                                            ),
                                        );
                                        await this.commonFileService.removeFileFromLocal(zipPathDir);
                                        if (!uploadResult) {
                                            throw new Error(`Report Not Uploaded to Bucket`);
                                        }
                                    } catch (err) {
                                        await this.commonFileService.removeFileFromLocal(zipPathDir);
                                        throw new Error(`Report Not Uploaded to Bucket`);
                                    }
                                } else {
                                    throw new Error(`File does not exist`);
                                }
                                let resultData = Object.create(null);
                                resultData['id'] = reportId;
                                resultData['file_name'] = zipPath;
                                resultData['auto_report_zip_password'] = Buffer.from(await argon2.hash(zipPassword)).toString('base64');
                                resultData['error_message'] = '';
                                resultData['status'] = 1;
                                resultData['updated_date'] =this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss',);
                                await this.requestEventReportsService.update({ id: reportId },resultData);
                                await this.commonFileService.removeFileFromLocal(`${path.join(`${directory}/`)}${jsonFile}`);
                                await this.commonFileService.removeFileFromLocal(`${path.join(`${directory}/`)}${jsonFile}`.replace('.json',fileType == 'csv' ? '.csv' : '.xlsx'));
                            } else {
                                throw new Error(`Report Not created`);
                            }
                        } else {
                            throw new Error(`File does not exist`);
                        }
                    }
                }
            } else {
                if (eventData?.list?.length) {
                    await Promise.all(
                        eventData?.list.map((item) => {
                            if (item?.registration_date) {
                                item['registration_date'] = this.commonDateService.DateTimeFormat(item?.registration_date, item?.event?.event_type == 3 ? 'MM-DD-YYYY hh:mm A' : 'MM-DD-YYYY');
                            }
                            if (item?.slotstimings) {
                                if(item?.slotstimings?.slotdate){
                                    item['registration_date'] = this.commonDateService.DateTimeFormat(item?.slotstimings?.slotdate, item?.event?.event_type == 3 ? 'MM-DD-YYYY hh:mm A' : 'MM-DD-YYYY');
                                }
                                if (item?.slotstimings?.slotstarttime) {
                                    item.slotstimings.slotstarttime = this.commonDateService.DateTimeFormat(`${item?.slotstimings?.slotdate} ${item?.slotstimings?.slotstarttime}`, 'hh:mm A',);
                                }
                                if ( item?.slotstimings?.slotendtime) {
                                    item.slotstimings.slotendtime = this.commonDateService.DateTimeFormat(`${item?.slotstimings?.slotdate} ${item?.slotstimings?.slotendtime}`, 'hh:mm A', );
                                }
                            }
                        }),
                    );
                }
            }
            return eventData;
        } catch (error) {
            console.log("error",error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }

    async userEvent(postData: EventReportInput) {
        try {
            let timezoneData = await lastValueFrom(this.timezoneMicroservice.send({ cmd: 'find_postcode' },{}));
            let eventcond = `event.status = 1 AND user.status = 1`;
            let globalEventWhere = `ge.organization_id = ${postData.org_id} and ge.status != 2`;
            if (postData?.event_id) {
                globalEventWhere += ` AND ge.event_id in(${postData.event_id})`;
            }
            if (postData?.event_id) {
                eventcond += postData?.event_type == 2 ? ` AND event.id in(${postData.event_id})` : ` AND userBooking.ev_events_id in(${postData.event_id})`;
            }
            if (
                postData?.event_type != undefined ||
                postData?.event_type != null
            ) {
                if (postData?.event_type == 0) {
                    //ZOMO-3823
                    eventcond += ` AND event.event_type in(0,1) AND userBooking.status != 2`;
                    globalEventWhere += ` AND ev.event_type in(0,1)`;
                } else {
                    if (postData?.event_type == 2) {
                        eventcond += ` AND externallink.status = 1 AND event.event_type = ${postData.event_type}`;
                    } else {
                        eventcond += ` AND event.event_type = ${postData.event_type} AND userBooking.status != 2`;
                    }
                    globalEventWhere += ` AND ev.event_type = ${postData.event_type}`;
                }
            }
            let globaleventList = [];
            if(postData?.org_id && !postData?.event_id){
                globaleventList = await this.eventGlobalService.listRecord(['ge.id', 'ge.event_id', 'ge.orderid'], globalEventWhere,null,[tableConstant.EVENTS.TBL_EV_EVENTS]);
                globaleventList = globaleventList?.map((item) => item.event_id);
            }
            if (postData?.org_id && postData?.org_id?.includes(',')) {
                eventcond += ` AND userBooking.organization_id in(${postData.org_id})`;
            } else {
                eventcond += postData?.event_type == 2 ? ` AND event.organization_id = ${postData.org_id}` : ` AND userBooking.organization_id = ${postData.org_id}`;
            }

            let joinTable = [tableConstant.COMPANIES.TBL_COMPANY];
            if (postData?.department_id) {
                joinTable.push(tableConstant.EVENTS.TBL_EV_DEPARTMENTS);
                //ZOMO-3823
                eventcond += ` AND(ev_department.organization_id in(${postData.org_id}) AND ev_department.departments_id IN(${postData?.department_id}) AND ev_department.status != 2)`;
                // eventcond += ` AND((ev_department.organization_id in(${postData.org_id}) AND ev_department.departments_id IN(${postData?.department_id}) AND ev_department.status != 2) OR user.department_id IN(${postData?.department_id}))`;
            }
            if (postData?.location_id) {
                joinTable.push(tableConstant.EVENTS.TBL_EV_LOCATIONS);
                //ZOMO-3823
                eventcond += ` AND(ev_location.organization_id in(${postData.org_id}) AND ev_location.locations_id IN(${postData?.location_id}) AND ev_location.status != 2)`;
                // eventcond += ` AND((ev_location.organization_id in(${postData.org_id}) AND ev_location.locations_id IN(${postData?.location_id}) AND ev_location.status != 2) OR user.location IN(${postData?.location_id}))`;
            }
            if (postData.search_str) {
                let eventTimezoneInfo = timezoneData?.find((data) => data.timezone_name === postData?.search_str);
                if(eventTimezoneInfo){
                   eventcond += ` AND(user.timezone = '${postData?.search_str}' OR event.event_timezone = ${eventTimezoneInfo?.id})`;
                }
                else if(postData?.event_type != 2 && ['Yes','No']?.includes(postData.search_str)){
                    eventcond += ` AND(userBooking.ev_attend_status = ${postData?.search_str == 'Yes' ? 1 : 0})`;
                }
                else{
                    let searchField = ['full_name', 'user.username', 'user.email', 'event.event_name'];
                    if(postData?.event_type != 2){
                        searchField = [...searchField,'userBooking.ev_extension','userBooking.ev_contact'];
                    }
                    eventcond += this.commonService.generateDynamicSearchQuery(postData?.search_str,searchField);
                }
            }
            if (globaleventList.length > 0) {
                if (postData.org_id) {
                    eventcond = `${eventcond} OR(event.id IN(${globaleventList.join(',')}) AND event.organization_id in(${postData?.org_id}))`;
                } else {
                    eventcond = `${eventcond} OR(event.id IN(${globaleventList.join(',')}))`;
                }
            }
            let eventData;
            if (postData?.event_type == 2) {
                joinTable = [...joinTable,tableConstant.TBL_USERS_SETTINGS,tableConstant.COMPANIES.TBL_LOCATION,tableConstant.COMPANIES.TBL_DEPARTMENT];
                eventData = await this.eventExternalLinkService.listRecords(
                    [
                        'externallink',
                        'event.id',
                        'event.event_name',
                        'event.event_timezone',
                        'event.event_type',
                        'company.id',
                        'company.company_name',
                        'user.id',
                        'user.code',
                        'user.role_id',
                        'user.first_name',
                        'user.middle_name',
                        'user.last_name',
                        'user.gender',
                        'user.username',
                        'user.email',
                        'user.relationship_id',
                        'user.dob',
                        'user.timezone',
                        'user.employeeid',
                        'user.date_of_hire',
                        'user.on_insurance_plan',
                        'user.insurance_plan_name',
                        'usersetting.id',
                        'usersetting.jobtitle',
                        'department.dept_name',
                        'Location',
                    ],
                    eventcond,
                    postData,
                    joinTable,
                );
            } else {
                joinTable = [...joinTable,tableConstant.EVENTS.TBL_EV_SLOTS,tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS];
                eventData =
                    await this.eventUserBookingListsService.reportEventsList(
                        [
                            'userBooking',
                            'event.id',
                            'event.event_name',
                            'event.event_timezone',
                            'event.event_type',
                            'slot.start_date',
                            'slot.start_time',
                            'slot.end_date',
                            'slot.end_time',
                            'slot.status',
                            'slot.registration_end',
                            'slotstimings.id',
                            'slotstimings.slotdate',
                            'slotstimings.slotstarttime',
                            'slotstimings.slotendtime',
                            'company.id',
                            'company.company_name',
                            'user.id',
                            'user.code',
                            'user.role_id',
                            'user.first_name',
                            'user.middle_name',
                            'user.last_name',
                            'user.gender',
                            'user.username',
                            'user.email',
                            'user.relationship_id',
                            'user.dob',
                            'user.timezone',
                            'user.employeeid',
                            'user.date_of_hire',
                            'user.on_insurance_plan',
                            'user.insurance_plan_name',
                            'usersetting.id',
                            'usersetting.jobtitle',
                            'department.dept_name',
                            'Location',
                        ],
                        eventcond,
                        postData,
                        joinTable,
                    );
            }
            if (eventData && (eventData?.length || eventData?.list?.length)) {
                let eventList = eventData?.list || eventData;
                await Promise.all(
                    eventList.map(async (item) => {
                        item.user['full_name'] = item?.user?.first_name + ' ' + item?.user?.last_name;
                        let userTimezoneInfo = timezoneData?.find((data) =>  data.timezone_name === item?.user?.timezone);
                        item.user['timezone_details'] = userTimezoneInfo;
                        item.user['user_timezone'] = userTimezoneInfo?.timezone_name ?? 'UTC';
                        let eventTimezoneInfo = timezoneData?.find((data) => data.id === item?.event?.event_timezone);
                        item.event['timezone_details'] = eventTimezoneInfo;
                        item.event['event_timezone_id'] = item?.event?.event_timezone;
                        item.event['event_timezone'] = eventTimezoneInfo?.timezone_name ?? 'UTC';
                        if (item.event['event_type'] == 2) {
                            item['click_date'] = item?.updated ? await this.commonDateService.DateTimeFormat(item?.updated,'MM-DD-YYYY',) : null;
                            item['click_time'] = item?.updated ? await this.commonDateService.DateTimeFormat(item?.updated,'hh:mm A',) : null;
                        }
                    }),
                );
                if (eventData?.length) {
                    eventData = eventList;
                } else {
                    eventData.list = eventList;
                }
            }
            return eventData;
        } catch (error) {
            throw new Error(error);
        }
    }

    async mapSheetData(sheetData: any, header) {
        try {
            let result = [];
            for (let item of sheetData) {
                let userRole = null;
                let userTimezoneInfo = item?.user?.user_timezone;
                let eventTimezoneInfo = item?.event?.event_timezone;
                let registrationDate = item?.slotstimings ? this.commonDateService.DateTimeFormat(item?.slotstimings?.slotdate, 'MM-DD-YYYY') : this.commonDateService.DateTimeFormat(item?.registration_date, 'MM-DD-YYYY hh:mm');
                let registrationStartTime = item?.slotstimings ? this.commonDateService.DateTimeFormat( `${item?.slotstimings?.slotdate} ${item?.slotstimings?.slotstarttime}`, 'hh:mm A') : this.commonDateService.DateTimeFormat(item?.registration_date, 'hh:mm A');
                let registrationEndTime = item?.slotstimings ? this.commonDateService.DateTimeFormat(`${item?.slotstimings?.slotdate} ${item?.slotstimings?.slotendtime}`, 'hh:mm A') : this.commonDateService.DateTimeFormat(item?.registration_date, 'hh:mm A');
                if (item?.user?.role_id) {
                    if (item?.user?.role_id == appConstant.ROLE.REGISTERED) {
                        userRole = 'Employee';
                    }
                    if (item?.user?.role_id == appConstant.ROLE.SPOUSE) {
                        userRole = 'Spouse';
                    }
                }
                let newItem: any = {
                    'USER CODE': item?.user?.code ?? null,
                    ORGANIZATION: item?.company?.company_name ?? null,
                    DEPARTMENT: item?.user?.department?.dept_name ?? null,
                    'RELATIONSHIP ID': item?.user?.relationship_id ?? null,
                    USERNAME: item?.user?.username ?? null,
                    'FIRST NAME': item?.user?.first_name ?? null,
                    'MIDDLE NAME': item?.user?.middle_name ?? null,
                    'LAST NAME': item?.user?.last_name ?? null,
                    'JOB TITLE': item?.user?.usersetting?.jobtitle ?? null,
                    'EMPLOYEE ID': item?.user?.employeeid ?? null,
                    GENDER: item?.user?.gender ? _.capitalize(Object.keys(Gender).find((key) => Gender[key] === item?.user?.gender)): null,
                    'BIRTH DATE': item?.user?.dob ? await this.commonDateService.DateTimeFormat(item?.user?.dob,'MM-DD-YYYY',): null,
                    'DATE OF HIRE': item?.user?.date_of_hire ? await this.commonDateService.DateTimeFormat(item?.user?.date_of_hire,'MM-DD-YYYY',): null,
                    'ON HEALTH PLAN': item?.user?.on_insurance_plan ?? null,
                    'HEALTH PLAN NAME': item?.user?.insurance_plan_name ?? null,
                    EMAIL: item?.user?.email ?? null,
                    LOCATION: item?.user?.Location?.lname ?? null,
                    'USER TYPE': userRole,
                    'Ext.': item?.ev_extension ?? null,
                    'Event Phone Number': item?.ev_contact ?? null,
                    'Event Title': item?.event?.event_name ?? null,
                    'Date Registered': registrationDate ?? null,
                    'Time Registered- Start': registrationStartTime ?? null,
                    'Time Registered- End': registrationEndTime ?? null,
                    'Event Time Zone': eventTimezoneInfo ?? null,
                    'User Time Zone': userTimezoneInfo ?? null,
                    ATTENDED: item?.ev_attend_status == 1 ? 'Yes' : 'No',
                    Cancelled: item?.status == 0 ? 'Yes' : 'No',
                    'Preferred Language': item?.lang_id == 0 ? 'English' : 'Spanish',
                };
                if (item?.event?.event_type == 2) {
                    let allowedKeys = [
                        'USER CODE',
                        'DEPARTMENT',
                        'RELATIONSHIP ID',
                        'USERNAME',
                        'FIRST NAME',
                        'MIDDLE NAME',
                        'LAST NAME',
                        'JOB TITLE',
                        'EMPLOYEE ID',
                        'GENDER',
                        'BIRTH DATE',
                        'DATE OF HIRE',
                        'ON HEALTH PLAN',
                        'HEALTH PLAN NAME',
                        'EMAIL',
                        'LOCATION',
                        'USER TYPE',
                        'Event Title',
                        'Click Date',
                        'Click Time',
                        'Event Time Zone',
                        'User Time Zone',
                    ];
                    newItem['Click Date'] = item?.updated ? await this.commonDateService.DateTimeFormat(item?.updated, 'MM-DD-YYYY') : null;
                    newItem['Click Time'] = item?.updated ? await this.commonDateService.DateTimeFormat(item?.updated, 'hh:mm A',) : null;
                    newItem = Object.fromEntries(Object.entries(newItem).filter(([key]) =>allowedKeys.includes(key),),);
                }
                if (item?.event?.event_type == 3) {
                    let allowedKeys = [
                        'USER CODE',
                        'DEPARTMENT',
                        'RELATIONSHIP ID',
                        'USERNAME',
                        'FIRST NAME',
                        'MIDDLE NAME',
                        'LAST NAME',
                        'JOB TITLE',
                        'EMPLOYEE ID',
                        'GENDER',
                        'BIRTH DATE',
                        'DATE OF HIRE',
                        'ON HEALTH PLAN',
                        'HEALTH PLAN NAME',
                        'EMAIL',
                        'LOCATION',
                        'USER TYPE',
                        'Ext.',
                        'Event Phone Number',
                        'Event Title',
                        'Date Registered',
                        'Event Time Zone',
                        'User Time Zone',
                        'Cancelled',
                        'Preferred Language',
                    ];
                    newItem = Object.fromEntries(Object.entries(newItem).filter(([key]) =>allowedKeys.includes(key)));
                }
                if (item?.event?.event_type == 0 || item?.event?.event_type == 1) {
                    const allowedKeys = Object.values(header);
                    newItem = Object.fromEntries(Object.entries(newItem).filter(([key]) =>allowedKeys.includes(key)));
                }
                result.push(newItem);
            }
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }
}
