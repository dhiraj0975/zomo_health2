import { CommonArrayService, CommonService, CompanySupportDto, tableConstant, WeekDays } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCompanySupportInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { KeyContactService } from "../keycontacts/keycontact.service";
import { SupportService } from "./support.service";
const moment = require('moment-timezone');
@Controller('company/support')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class SupportController {
    constructor(
        @Inject('TIMEZONE_SERVICE')
        private client: ClientProxy,
        private readonly supportService: SupportService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly keyContactService: KeyContactService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = 'support.status != 0 ';
            if(postData?.company_id) {
                where += ` AND support.org_id = '${postData?.company_id}' `;
            }
            if (postData?.search_str) {
                where += `AND(support.title LIKE '%${postData?.search_str}%' OR support.cname LIKE '%${postData?.search_str}%' OR support.email LIKE '%${postData?.search_str}%' OR support.ph_number LIKE '%${postData?.search_str}%' OR support.operation LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.supportService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanySupportDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `title_${ele['id']}`) ? ele['title'] : customName;
                    }
                    if(ele.cname){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`cname_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.cname = (customName == '' || customName == `cname_${ele['id']}`) ? ele['cname'] : customName;
                    }
                    if(ele.ph_number){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`ph_number_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.ph_number = (customName == '' || customName == `ph_number_${ele['id']}`) ? ele['ph_number'] : customName;
                    }
                    if(ele.operation){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`operation_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.operation = (customName == '' || customName == `operation_${ele['id']}`) ? ele['operation'] : customName;
                    }
                    if(ele.message){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`message_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.message = (customName == '' || customName == `message_${ele['id']}`) ? ele['message'] : customName;
                    }
                }));
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
                  data: [],
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
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let supportData = await this.supportService.findOne(where);
            if (!supportData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            supportData = <any>(
                await this.commonArrayService.formatToDto(CompanySupportDto, supportData, req.lang)
            );
            if(supportData.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${supportData['id']}`, `/LC_MESSAGES/Support/Support/${supportData['org_id']}`,`dynamic`);
                supportData.title = (customName == '' || customName == `title_${supportData['id']}`) ? supportData['title'] : customName;
            }
            if(supportData.cname){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`cname_${supportData['id']}`, `/LC_MESSAGES/Support/Support/${supportData['org_id']}`,`dynamic`);
                supportData.cname = (customName == '' || customName == `cname_${supportData['id']}`) ? supportData['cname'] : customName;
            }
            if(supportData.ph_number){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`ph_number_${supportData['id']}`, `/LC_MESSAGES/Support/Support/${supportData['org_id']}`,`dynamic`);
                supportData.ph_number = (customName == '' || customName == `ph_number_${supportData['id']}`) ? supportData['ph_number'] : customName;
            }
            if(supportData.operation){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`operation_${supportData['id']}`, `/LC_MESSAGES/Support/Support/${supportData['org_id']}`,`dynamic`);
                supportData.operation = (customName == '' || customName == `operation_${supportData['id']}`) ? supportData['operation'] : customName;
            }
            if(supportData.message){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`message_${supportData['id']}`, `/LC_MESSAGES/Support/Support/${supportData['org_id']}`,`dynamic`);
                supportData.message = (customName == '' || customName == `message_${supportData['id']}`) ? supportData['message'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: supportData,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanySupportInput) {
        try {
            if (
                !postData?.org_id 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let timezoneData = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, {}));
            if (!postData?.operation ) {
                const defaultTimezone = 'UTC';
                let timezone = defaultTimezone;
                let timezoneInfoAlias = '';
                if (timezoneData && postData?.timezone) {
                    const timezoneInfo = timezoneData?.find((data) => data.id === postData?.timezone);
                    timezone = timezoneInfo ? timezoneInfo?.name : defaultTimezone;
                    timezoneInfoAlias = timezoneInfo ? timezoneInfo?.alias : '';
                }
                const startTime = moment.tz(postData?.start_time, "hh:mm A", timezone).isValid()
                    ? moment.tz(postData?.start_time, "hh:mm A", timezone).format("hh:mm A")
                    : '';
                const endTime = moment.tz(postData?.end_time, "hh:mm A", timezone).isValid()
                    ? moment.tz(postData?.end_time, "hh:mm A", timezone).format("hh:mm A")
                    : '';
                const startDay = WeekDays[postData?.start_day as number] || '';
                const endDay = WeekDays[postData?.end_day as number] || '';
                if(startDay === '' && endDay=== '' && startTime === '' && endTime==='' && startTime !== null && endTime !== null) {
                    postData.operation =''
                }else{
                    postData.operation = `${startDay?startDay+'-':''}${endDay} ${startTime?startTime+'-':''}${endTime}(${timezoneInfoAlias == ''?'UTC':timezoneInfoAlias})`;
                }
                if(postData?.start_time ===''){
                    postData.start_time = null
                }
                if(postData?.end_time === ''){
                    postData.end_time = null
                }
            }
            let recordDetails = await this.supportService.save(postData);
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `title_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }            
            if(postData?.cname){
                let tilte = `cname_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.cname;
            }            
            if(postData?.ph_number){
                let tilte = `ph_number_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.ph_number;
            }            
            if(postData?.operation){
                let tilte = `operation_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.operation;
            }
            if(postData?.message){
                let tilte = `message_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.message;
            }

            await this.translatorService.DynamicEngJsonData('Support',recordDetails['org_id'],dynamicDatas,'Edit','Support');
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'The Organization Support Contacts has been added successfully.',
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.supportService.findOne(where);
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
            await this.supportService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.COMPANIES.TBL_COMPANY_SUPPORTS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'The Organization Support Contacts has been deleted successfully.',
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
    @Post('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanySupportInput) {
        try {
            if (
                !postData?.id && !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let timezoneData = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, {}));
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            const recordDetails = await this.supportService.findOne(where);
            if (!recordDetails) {
                await this.supportService.save(
                    postData
                );
            }else{
                if (!postData?.operation && (postData?.start_day ||postData?.start_day==0 || postData?.timezone 
                    || postData?.timezone == 0 ||postData?.end_day ||postData?.end_day==0 || postData?.start_time 
                    ||postData?.end_time) ) {
                    const defaultTimezone = 'UTC';
                    let timezone = defaultTimezone;
                    let timezoneInfoAlias = '';
                    if (timezoneData && (postData?.timezone || postData?.timezone == 0)) {
                        const timezoneInfo = timezoneData?.find((data) => data.id === postData?.timezone);
                        timezone = timezoneInfo ? timezoneInfo?.name : defaultTimezone;
                        timezoneInfoAlias = timezoneInfo ? timezoneInfo?.alias : postData?.timezone == 0? 'UTC':'';
                    }else{
                        const timezoneInfo = timezoneData?.find((data) => data.id === recordDetails?.timezone);
                        timezone = timezoneInfo ? timezoneInfo?.name : defaultTimezone;
                        timezoneInfoAlias = timezoneInfo ? timezoneInfo?.alias : '';
                    }
                    const startTime =postData?.start_time ? (moment.tz(postData?.start_time, "hh:mm A", timezone).isValid()
                        ? moment.tz(postData?.start_time, "hh:mm A", timezone).format("hh:mm A")
                        : '')
                        :
                        (
                            moment.tz(recordDetails?.start_time, "hh:mm A", timezone).isValid()
                        ? moment.tz(recordDetails?.start_time, "hh:mm A", timezone).format("hh:mm A")
                        : ''
                        )
                    const endTime = postData?.end_time? (moment.tz(postData?.end_time, "hh:mm A", timezone).isValid()
                        ? moment.tz(postData?.end_time, "hh:mm A", timezone).format("hh:mm A")
                        : '')
                        :(
                            moment.tz(recordDetails?.end_time, "hh:mm A", timezone).isValid()
                        ? moment.tz(recordDetails?.end_time, "hh:mm A", timezone).format("hh:mm A")
                        : ''
                        )
                    const startDay =postData?.start_day?.toString() !== ''? (postData?.start_day?.toString()!=='0'?WeekDays[postData?.start_day as number] :'' ):(WeekDays[recordDetails?.start_day as number] || '');
                    const endDay =postData?.end_day?.toString() !== ''?(postData?.end_day?.toString()!=='0'? WeekDays[postData?.end_day as number] : ''):( WeekDays[recordDetails?.end_day as number] || '');
                    if(startDay === '' && endDay=== '' && startTime === '' && endTime===''){
                        postData.operation =''
                    }else{
                        postData.operation = `${(startDay && startDay !== undefined)?startDay+'-':''}${(endDay && endDay !== undefined)?endDay:''} ${startTime?startTime+'-':''}${endTime}(${timezoneInfoAlias == ''?'UTC':timezoneInfoAlias})`;
                    }
                    if(postData?.start_time ==''){
                        postData.start_time = null
                    }
                    if(postData?.end_time ==''){
                        postData.end_time = null
                    }
                }
            }
            if( postData?.start_time == ''){
                postData.start_time = null
            }
            if( postData?.end_time == ''){
                postData.end_time = null
            }
            if( postData?.start_day?.toString() == '0'){
                postData.start_day = postData?.start_day?.toString() == '0'? null : postData?.start_day
            }
            if( postData?.end_day?.toString() == '0'){
                postData.end_day = postData?.end_day?.toString() == '0'? null : postData?.end_day
            }
            if(postData?.timezone?.toString() == '0'){
                postData.timezone = postData?.timezone?.toString() == '0'? null : postData?.timezone
            }
            await this.supportService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_SUPPORTS, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `title_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }            
            if(postData?.cname){
                let tilte = `cname_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.cname;
            }            
            if(postData?.ph_number){
                let tilte = `ph_number_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.ph_number;
            }            
            if(postData?.operation){
                let tilte = `operation_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.operation;
            }
            if(postData?.message){
                let tilte = `message_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.message;
            }
            await this.translatorService.DynamicEngJsonData('Support',recordDetails['org_id'],dynamicDatas,'Edit','Support');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'The Organization Support Contacts has been updated successfully.',
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
            let resultedData =Object.create(null);
            const where = { status : 1 };
            if(postData?.org_id){
                where["org_id"]= postData?.org_id;
            }
            resultedData = await this.supportService.listRecord(where, { id: 'ASC' });
            let timezoneData = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, {}));
            if (Array.isArray(resultedData)) {
                resultedData = resultedData.map(record => ({
                    ...record,
                    timezoneData,
                }));
            }
            for (let i: number = 0; i < resultedData.length; i++) {
                let operationString = resultedData[i].operation;
                let operationArray: string[] = await this.commonService.splitWeekdaysAndRest(operationString)
                resultedData[i].operation_week_day = operationArray[0]
                resultedData[i].operation_time = operationArray[1]
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanySupportDto, resultedData, req.lang)
            );
            if(!resultedData.length){
                resultedData = await this.keyContactService.listRecord({ company_id: postData?.org_id })
                if(resultedData.length){
                    const createdData = [];
                    for(let element of resultedData){
                            createdData.push({
                                org_id: postData?.org_id,
                                title: element.hr_pri_contact,
                                cname: 'HR Contact',
                                email: element.hr_email,
                                ph_number: element.hr_contact,
                                operation: '',
                                status: 1
                            });
                            createdData.push({
                                org_id: postData?.org_id,
                                title: element.hr_pri_contact,
                                cname: 'Tech Contact',
                                email: element.tech_email,
                                ph_number: element.tech_contact,
                                operation: '',
                                status: 1
                            });
                            createdData.push({
                                org_id: postData?.org_id,
                                title: element.hr_pri_contact,
                                cname: 'Tobacco Contact',
                                email: element.tobacco_email,
                                ph_number: element.tobacco_contact,
                                operation: '',
                                status: 1
                            });
                    }
                    resultedData = createdData;
                }
                else{
                    resultedData = await this.supportService.listRecord({ org_id: 0 });
                    if(resultedData.length){
                        resultedData[0]['email'] = resultedData[0]['email'].replace('@preventioncloud.com','@zomohealth.com')
                    }
                }
            }
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `title_${ele['id']}`) ? ele['title'] : customName;
                    }
                    if(ele.cname){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`cname_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.cname = (customName == '' || customName == `cname_${ele['id']}`) ? ele['cname'] : customName;
                    }
                    if(ele.ph_number){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`ph_number_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.ph_number = (customName == '' || customName == `ph_number_${ele['id']}`) ? ele['ph_number'] : customName;
                    }
                    if(ele.operation){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`operation_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.operation = (customName == '' || customName == `operation_${ele['id']}`) ? ele['operation'] : customName;
                    }
                    if(ele.message){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`message_${ele['id']}`, `/LC_MESSAGES/Support/Support/${ele['org_id']}`,`dynamic`);
                        ele.message = (customName == '' || customName == `message_${ele['id']}`) ? ele['message'] : customName;
                    }
                }));
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}