import { PaginateWithCompanyInput } from '@/input';
import { EventSlotsService } from '@/modules/events/slots/slots.service';
import { appConstant, CoachesDto, CommonArrayService, CommonDateService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { ChatService } from "src/modules/chat/chat/chat.service";
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { EventService } from "src/modules/events/events/events.service";
import { EventSlotsTimingsService } from "src/modules/events/slotstimings/slotstimings.service";
import { EventUserBookingListsService } from "src/modules/events/userbookinglists/userbookinglists.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { UserService } from "src/modules/user/user/user.service";
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { PaginateWithCoachesInput } from '../input';
import { CoachesService } from "./coaches.service";
import { CoachHelperService } from './coachhelper.service';
import { CreateCoachesInput } from './input';
const moment = require('moment-timezone');
@Controller('coach/coaches')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CoachesController {
    constructor(
        private readonly coachesService: CoachesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly eventSlotsTimingsService: EventSlotsTimingsService,
        private readonly userService: UserService,
        private readonly eventService: EventService,
        private readonly companyService: CompanyService,
        private readonly chatService: ChatService,
        @Inject('POSTCODES_SERVICE')
        private timeZoneMicroservice: ClientProxy,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly coachHelperService: CoachHelperService,
        private readonly eventSlotsService: EventSlotsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCoachesInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `coach.status != '2' AND coach.coach_manager_id  != '0'`;
            if(postData?.org_id){
                where +=`AND coach.org_id = '${postData?.org_id}' `;
            }
            /*role id 20*/
            if(postData?.user_id || req?.tokenUser?.role_id == appConstant.ROLE.COACH){
                where +=`AND coach.user_id = '${postData?.user_id || req.tokenUser?.id}' `;
            }
            /*role id 19*/
            if(postData?.coach_manager_id || req?.tokenUser?.role_id == appConstant.ROLE.GLOBALCOACH){
                where +=`AND coach.coach_manager_id = '${postData?.coach_manager_id || req.tokenUser?.id}' `;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND coach.org_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
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
            if (postData?.search_str) {
                where += `AND(coach.state LIKE '%${postData?.search_str}%' OR coach.city LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%' OR company.code LIKE '%${postData?.search_str}%' OR company.city LIKE '%${postData?.search_str}%' OR company.state LIKE '%${postData?.search_str}%' OR company.country LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.coachesService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CoachesDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let biometricDetails
            if(postData?.assign_coach){
                let where = `coach.status != 2`;
                const joinTableList = [
                    {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id = coach.user_id` , 'connect' : 'coach', 'type' : 'LEFT' },
                    {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = coach.org_id` , 'connect' : 'coach', 'type' : 'LEFT' },
                    {'alias':'company_type', 'table' : tableConstant.COMPANIES.TBL_COMPANY_TYPE, 'on' : `company_type.id = company.companytype_id` , 'connect' : 'company', 'type' : 'LEFT' },
                    {'alias':'locations', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `coach.org_id = locations.company_id AND coach.location = locations.id` , 'connect' : 'coach', 'type' : 'LEFT' },
                    {'alias':'departments', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `coach.org_id = departments.company_id AND coach.department = departments.id` , 'connect' : 'coach', 'type' : 'LEFT' }
                ];
                let fields = ['coach','company.id','company.company_name','company.code','company.city','company.state','company.country','company.company_name','company.company_logo',
                    'locations.id','locations.location_name','departments.id','departments.dept_name',
                    'user.id','user.code','user.first_name','user.last_name',
                ];
                if (postData?.user_id) {
                    where += ` AND coach.user_id = '${postData?.user_id}' `;
                }
                if (postData?.id) {
                    where += ` AND coach.id = '${postData?.id}' `;
                }
                if (postData?.org_id) {
                    where += ` AND coach.org_id = '${postData?.org_id}' `;
                }
                biometricDetails = await this.coachesService.getAssignOrgList(where,fields,joinTableList);
            }
            else{
                if (!postData?.id && !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
                biometricDetails = await this.coachesService.findOne(where);
                if (!biometricDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: errorMessage,
                    });
                }
            }
            
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(CoachesDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCoachesInput) {
        try {
            if (!postData?.org_id)
            {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const departments = postData?.department?.split(',').map(d => d.trim()).filter(d => d && d != '0') || [];
            const locations = postData?.location?.split(',').map(l => l.trim()).filter(l => l && l != '0') || [];
            const cities = postData?.city?.split(',').map(c => c.trim()).filter(c => c && c != '0') || [];
            const states = postData?.state?.split(',').map(s => s.trim()).filter(s => s && s != '0') || [];
            const tasks = [];
            for (let user of postData?.user_id.split(',')) {
                if (departments.length > 0) {
                    for (let department of departments) {
                        tasks.push({ user, department, location: 0, city: '', state: '' });
                    }
                }
                if (locations.length > 0) {
                    for (let location of locations) {
                        tasks.push({ user, department: 0, location, city: '', state: '' });
                    }
                }
                if (cities.length > 0) {
                    for (let city of cities) {
                        tasks.push({ user, department: 0, location: 0, city, state: '' });
                    }
                }
                if (states.length > 0) {
                    for (let state of states) {
                        tasks.push({ user, department: 0, location: 0, city: '', state });
                    }
                }
                if (departments.length === 0 && locations.length === 0 && cities.length === 0 && states.length === 0) {
                    tasks.push({ user, org_id: postData?.org_id, is_global: 1, department: 0, location: 0, city: '', state: '' });
                }
            }
            for (let { user, department, location, city, state, is_global } of tasks) {
                let where ={
                    org_id: postData?.org_id,
                    user_id: user,
                    department,
                    location,
                    city,
                    state
                };
                if(postData?.coach_manager_id){
                    where['coach_manager_id'] = postData?.coach_manager_id;
                }
                if(is_global){
                    where['is_global'] = is_global;
                }
                const recordDetails = await this.coachesService.findOne(where);
                if (!recordDetails) {
                    const newData = { ...postData, user_id: user, department, location, city, state, is_global };
                    await this.coachesService.save(newData);
                }
                else if(recordDetails.status == 2){
                    await this.coachesService.update({id: recordDetails.id },{status: 1 });
                    this.activityLogService.create(recordDetails, {status: 1}, tableConstant.COACH.TBL_CO_COACHES, req.tokenUser?.id);
                }
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? {id: postData?.id} : {user_id: postData?.user_id, org_id: postData?.org_id};
            const recordDetails = await this.coachesService.listRecord(where,null,['coach']);
            if (recordDetails.length == 0) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            for(let item of recordDetails){
                await this.coachesService.update({id: item?.id},{status:2});
                this.activityLogService.create(item, {status:2}, tableConstant.COACH.TBL_CO_COACHES, req.tokenUser?.id,'delete');
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCoachesInput) {
        try {
            if (
                !postData?.id &&
                !postData?.org_id 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData.coach_manager_id = postData?.coach_manager_id ? postData?.coach_manager_id : 0 ;
            if(postData?.coach_manager_id == 0) {
                postData.is_global = 1;
            }
            else {
                postData.is_global = 0;
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id, is_global: postData?.is_global } : { id: postData?.id, is_global: postData?.is_global}: { org_id: postData?.org_id, is_global: postData?.is_global};
            if(postData?.user_id){
                for(let user of postData?.user_id.split(',')){
                    delete postData?.user_id;
                    postData.user_id = user;
                    const recordDetails = await this.coachesService.findOne({...where, user_id: user});
                    if (!recordDetails) {
                        if(!postData?.city){
                            postData.city = '';
                        }
                        if(!postData?.state){
                            postData.state = '';
                        }
                        await this.coachesService.save({
                            ...postData,
                        });
                    }
                    else{
                        await this.coachesService.update({id: recordDetails.id}, {...postData, status: 1});
                        this.activityLogService.create(recordDetails, postData, tableConstant.COACH.TBL_CO_COACHES, req.tokenUser?.id);
                    }
                }
            }
            else{
                const recordDetails = await this.coachesService.findOne(where);
                if (!recordDetails) {
                    if(!postData?.city){
                        postData.city = '';
                    }
                    if(!postData?.state){
                        postData.state = '';
                    }
                    await this.coachesService.save({
                        ...postData,
                    });
                }
                await this.coachesService.update(where, {...postData, status: 1});
                this.activityLogService.create(recordDetails, postData, tableConstant.COACH.TBL_CO_COACHES, req.tokenUser?.id);
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let resultedData;
            let where = `coach.status != 2`;
            if(postData?.org_id){
                where += ` AND coach.org_id = ${postData?.org_id}`;
            }
            if(postData?.assign_coach){
                where += ` AND coach.coach_manager_id IS NULL`;
                const joinTableList = [
                    {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id = coach.user_id` , 'connect' : 'coach', 'type' : 'LEFT' },
                    {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = coach.org_id` , 'connect' : 'coach', 'type' : 'LEFT' },
                    {'alias':'company_type', 'table' : tableConstant.COMPANIES.TBL_COMPANY_TYPE, 'on' : `company_type.id = company.companytype_id` , 'connect' : 'company', 'type' : 'LEFT' },
                    {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `coach.org_id = Location.company_id AND coach.location = Location.id` , 'connect' : 'coach', 'type' : 'LEFT' },
                    {'alias':'Department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `coach.org_id = Department.company_id AND coach.department = Department.id` , 'connect' : 'coach', 'type' : 'LEFT' }
                ];
                let fields = ['coach','company.id','company.company_name','company.code','company.city','company.state','company.country','company.company_name','company.company_logo',
                    'Location.id','Location.location_name','Department.id','Department.dept_name',
                    'user.id','user.code','user.first_name','user.last_name',
                ];
                let result = [];
                if (postData?.user_id) {
                    where += ` AND coach.user_id = '${postData?.user_id}' `;
                }
                if (postData?.filter_by?.toLowerCase() == 'user_name') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.first_name','user.last_name','full_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'location') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['Location.location_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'department') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['Department.dept_name']);
                }
                if (postData?.filter_by?.toLowerCase() == 'state') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['coach.state']);
                }
                if (postData?.filter_by?.toLowerCase() == 'city') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['coach.city']);
                }
                let resultData = await this.coachesService.getAssignOrgList(where,fields,joinTableList);
                if (resultData?.length > 0) {
                    const userMap = new Map();
                    for (let entry of resultData) {
                        const userId = entry.user_id;
                        if (!userMap.has(userId)) {
                            userMap.set(userId, {
                                user_id: userId,
                                // here give id , full name 
                                user: {
                                    id: entry?.['user']?.id,
                                    first_name: entry?.['user']?.first_name,
                                    last_name: entry?.['user']?.last_name,
                                    full_name: entry?.['user']?.first_name + ' ' + entry?.['user']?.last_name,
                                },
                                is_global: 0,
                                is_location: 0,
                                is_department: 0,
                                is_state: 0,
                                is_city: 0,
                                states: new Set(),
                                cities: new Set(),
                                departments: new Set(),
                                locations: new Set(),
                            });
                        }
                        const userEntry = userMap.get(userId);
                        // Flags for types
                        if (entry.is_global === 1) {
                            userEntry.is_global = 1;
                        }
                        if (entry.state) {
                            userEntry.is_state = 1;
                            userEntry.states.add(entry?.state.trim());
                        }
                        if (entry.city) {
                            userEntry.is_city = 1;
                            userEntry.cities.add(entry?.city.trim());
                        }
                        if (entry.department) {
                            userEntry.is_department = 1;
                            userEntry.departments.add(entry?.department);
                        }
                        if (entry.location) {
                            userEntry.is_location = 1;
                            userEntry.locations.add(entry?.location);
                        }
                    }
                    for (let userData of userMap.values()) {
                        result.push({
                            ...userData,
                            states: Array.from(userData.states),
                            cities: Array.from(userData.cities),
                            departments: Array.from(userData.departments),
                            locations: Array.from(userData.locations),
                        });
                    }
                }
                resultedData = result;
            }
            else{
                /*role id 19*/
                if(!postData?.assign_coach && (postData?.coach_manager_id || req?.tokenUser?.role_id == appConstant.ROLE.GLOBALCOACH)){
                    where += ` AND coach.coach_manager_id = ${postData?.coach_manager_id || req.tokenUser?.id}`;
                }
                if (postData?.global_coach == '1') {
                    where += ` AND coach.coach_manager_id != 0`;
                }
                /*role id 20*/
                if(postData?.user_id || req?.tokenUser?.role_id == appConstant.ROLE.COACH){
                    where += ` AND coach.user_id = ${postData?.user_id || req.tokenUser?.id}`;
                }
                if (postData?.coach == '1') {
                    where += ` AND coach.user_id != 0`;
                }
                const order = postData && postData?.order ? postData?.order : 'DESC';
                const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
                resultedData = await this.coachesService.listRecord(where,{ [orderBy]: order });
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(CoachesDto, resultedData, req.lang)
                );
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
    @Post('assign-coach-list')
    async assignCoachList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = `coach.user_id = '${postData?.user_id}'`;
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.coachesService.assignCoachListRecord(['company.id', 'company.code', 'company.company_name', 'company.city', 'company.state', 'company.country', 'location.id', 'location.location_name', 'coach.id', 'coach.city', 'coach.state', 'coach.location', 'coach.department', 'coach.is_global', 'department.id', 'department.dept_name'],where,{ [orderBy]: order },[tableConstant.COMPANIES.TBL_COMPANY,tableConstant.COMPANIES.TBL_LOCATION,tableConstant.COMPANIES.TBL_DEPARTMENT]);
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
    @Post('assign-org-list')
    async assignOrgList(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCoachesInput) {
        try {
            let user = Object.create(req.tokenUser);
            if(!postData?.user_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where;
            if(![appConstant.ROLE.COACH,appConstant.ROLE.GLOBALCOACH].includes(user?.role_id) ){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
            }
            if(user?.role_id == appConstant.ROLE.GLOBALCOACH){
                where = `coach.coach_manager_id = '${postData?.user_id}' AND coach.status = 1 AND company.status = 1`;
            }
            if(user?.role_id == appConstant.ROLE.COACH){
                where = `coach.user_id = '${postData?.user_id}' AND coach.is_global = 1 AND coach.status = 1 AND company.status = 1`;
            }
            const joinTableList = [{'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = coach.org_id` , 'connect' : 'coach', 'type' : 'LEFT' }];
            let getAssignOrgList = await this.coachesService.getAssignOrgList(where,['coach.org_id'],joinTableList);
            let finalOrgList;
            if(getAssignOrgList.length){
                const orgIds = getAssignOrgList.map(item => item.org_id);
                let orgWhere = `company.id in(${orgIds}) AND company.status = 1`;
                if(postData?.search_str){
                    orgWhere += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['company.id', 'company.company_name', 'company.city', 'company.state', 'company.country']);
                }
                finalOrgList = await this.companyService.companypaginateList(orgWhere, postData as PaginateWithCompanyInput,['company.id', 'company.company_name', 'company.code', 'company.city', 'company.state', 'company.country','company_setting.id','company_setting.plan_order']);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: finalOrgList ?? [],
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
    @Post('dashboard')
    async CoachDashboard(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user = Object.create(req.tokenUser);
            let result;
            if(![appConstant.ROLE.COACH,appConstant.ROLE.GLOBALCOACH].includes(user?.role_id) ){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
            }
            if(user.role_id == appConstant.ROLE.COACH){
                result = await this.coachDashboard(postData,req);
            }
            if(user.role_id == appConstant.ROLE.GLOBALCOACH){
                result = await this.globalCoachDashboard(postData, req);
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    async coachDashboard(data: any, req: Request) {
        try {
            let results = Object.create(null);
            let user = Object.create(req.tokenUser);
            let timezone = user.timezone;
            let Area = user['settings']['coach_area'];
            let session = Object.create(null); 
            let currentDate;
            let displayDate;
            let date = [];
            if(data['coachdateof'] && (data['coachdateof'] != '')){
                data['coachdateof']= data['coachdateof'].replaceAll('/','-');
            }
            if (data['coachdateof'] && data['coachdateof'] !== '' && this.commonDateService.getTodayDate(data['coachdateof']).isValid() && this.commonDateService.getTodayDate(data['coachdateof']).isSame(this.commonDateService.getTodayDate(), 'day') === false) {
                currentDate = this.commonDateService.getTodayDate(data['coachdateof']).format('YYYY-MM-DD');
                session['currentcoachdate'] = currentDate;
                displayDate = currentDate;
                date.push(this.commonDateService.getTodayDate(currentDate).format('YYYY-MM-DD'));
            }
            else if (session.currentcoachdate && session.currentcoachdate !== '' && !data['coachdateof'] && this.commonDateService.getTodayDate(session.currentcoachdate).isSame(this.commonDateService.getTodayDate(), 'day') === false) {
                currentDate = session.currentcoachdate;
                displayDate = currentDate;
                date.push(this.commonDateService.getTodayDate(currentDate).format('YYYY-MM-DD'));
            } else {
                session.currentcoachdate = this.commonDateService.getTodayDate().format('YYYY-MM-DD');
                displayDate = session.currentcoachdate;
                currentDate = session.currentcoachdate;
                let ucurrentdate = this.commonDateService.getTodayDate().utc().format('YYYY-MM-DD HH:mm:ss');
                const timezoneMapping = {
                    "Pacific Standard Time (PST)": "America/Los_Angeles",
                    "Mountain Standard Time (MST)": "America/Denver",
                    "Central Standard Time (CST)": "America/Chicago",
                    "Eastern Standard Time (EST)": "America/New_York"
                };
                if (timezoneMapping[timezone]) {
                    ucurrentdate = moment.utc(ucurrentdate).tz(timezoneMapping[timezone]).format('YYYY-MM-DD');
                }
                date[0] = this.commonDateService.getTodayDate(ucurrentdate).format('YYYY-MM-DD');
                date[1] = this.commonDateService.getTodayDate(ucurrentdate).add(1, 'days').format('YYYY-MM-DD');
                currentDate = this.commonDateService.getTodayDate(ucurrentdate).format('YYYY-MM-DD');
            }
            let chat_selection = '';
            if(data['chat_selection']){
                chat_selection = data['chat_selection']; 
            }
            results['chat_selection'] = chat_selection; 
            results['currentDate'] = currentDate; 
            let CommonData = await this.coachesService.listRecord(`coach.user_id = ${user.id} AND coach.status != 2`,null,['company.company_name', 'company.code','coach.org_id','coach.is_global','coach.id']);
            let Company = {};
            let org = {};
            let user_membership;
            let all_org = {};
            let ev_users;
            let showAssessmentSettings;
            CommonData && CommonData.length ?  user_membership = {} : null;
            CommonData.forEach((CommonDatavalue, CommonDatakey) => {
                if (CommonDatavalue.is_global === 1) {
                    Company[CommonDatakey] = CommonDatavalue;
                    org[CommonDatavalue.id] = CommonDatavalue.org_id;
                    user_membership[CommonDatavalue.id] = CommonDatavalue['company'].code;
                }
                all_org[CommonDatavalue.id] = CommonDatavalue.org_id;
            });
            if(user_membership){
                user_membership = Object.values(user_membership).map(val => `'${val}'`).join(',');
            }
            let user_condition = `(user.membership_code in(${user_membership}) AND (user.membership_code != '' OR user.membership_code Is Null))`;
            let user_condition_statecity = `userSetting.user_id = user.id AND(
                coach.is_global = 1 OR
                ((user.location != '' OR user.location Is Null) AND coach.location = user.location) OR
                (user.department_id != 0 AND coach.department = user.department_id) OR
                ((userSetting.state != '' OR userSetting.state Is Null) AND coach.state = userSetting.state) OR
                ((userSetting.city != '' OR userSetting.city Is Null) AND coach.city = userSetting.city)
                )`;
            if(Area==0){
                ev_users = all_org && Object.keys(all_org).length ? await this.coachesService.coachList(
                    `coach.org_id In(${Object.values(all_org).join(',')}) AND coach.status != 2 AND(coach.location !=0 OR coach.department !=0 OR coach.city != '' OR coach.state != '' OR coach.is_global = 1)`,
                    null,
                    [
                        'coach.id','coach.state','coach.city',
                        'user.id','userSetting.state','userSetting.city','user.first_name','user.last_name','user.membership_code','user.username','user.timezone',
                        'bookingUser.id','bookingUserSetting.state','bookingUserSetting.city','bookingUser.first_name','bookingUser.last_name','bookingUser.membership_code','bookingUser.username','bookingUser.timezone',
                        'company.company_name','userBookingList.ev_extension', 'userBookingList.ev_contact','userBookingList.lang_id', 'userBookingList.id', 'userBookingList.ev_attend_status', 'userBookingList.ev_user_id',
                        'slotTiming.slotdate', 'slotTiming.slotstarttime','events.event_name','events.user_email','events.id','events.event_timezone'
                    ],
                    user_condition,
                    user_condition_statecity,
                    date,
                    'slotTiming.slotdate,slotTiming.slotstarttime,user.id'
                ) : [];
            }
            else{
                ev_users = await this.eventService.coachListRecord(`event.user_email = '${user.email}'`,
                    null,
                    [
                    'user.id','user.first_name','user.last_name','user.membership_code','user.username','userSetting.hphone','user.timezone','company.company_name','userBookingList.ev_extension','userBookingList.ev_contact','userBookingList.lang_id','slotTiming.slotdate','slotTiming.slotstarttime','userBookingList.id','userBookingList.ev_attend_status','event.event_name','event.user_email','event.id','event.event_timezone'],
                    date,
                    'slotTiming.slotdate,slotTiming.slotstarttime,user.id'
                );
            }
            if(ev_users && ev_users.length){
                for(let element of ev_users){
                    let timezoneData = await lastValueFrom(this.timeZoneMicroservice.send({cmd: 'find_postcode'}, {id: element.event_timezone}));
                    let anchorageTime = moment.tz(timezoneData?.[0]['timezone_name']);
                    let abbreviation = anchorageTime.format('z');
                    element['timezone_name'] = abbreviation;
                    element['userBookingList']['lang'] = element['userBookingList']['lang_id'] == 1 ? 'Spa' : 'Eng';
                    anchorageTime = moment.tz(element['user']['timezone']);
                    abbreviation = anchorageTime.format('z');
                    element['user']['timezone'] = abbreviation;
                    let userTimeZone = user.timezone || 'UTC';
                    let startDate = moment.tz(`${element['slotTiming']['slotdate']} ${element['slotTiming']['slotstarttime']}`,timezoneData?.[0]['timezone_name'])
                    element['slotTiming']['slotstarttime'] = startDate.clone().tz(userTimeZone).format('hh:mm A');
                    if(element?.user?.first_name && element?.user?.last_name){
                        element['user']['full_name'] = `${element['user'].first_name} ${element['user'].last_name}`;
                    }
                }
                let membership_code = ev_users.map(ele => `'${ele.user?.membership_code}'`).filter(code => code !== undefined && code !== null);
                showAssessmentSettings = await this.companyService.listRecord(
                    `company.code in(${membership_code.join(',')}) AND assessmentSettings.status = 1 AND companySetting.is_emo_health_asssessments = 1`,
                    null,
                    ['company.id','company.code','assessmentSettings.id']
                );
            }
            if(showAssessmentSettings && showAssessmentSettings.assessmentSettings){
                delete showAssessmentSettings.assessmentSettings;
            }
            results['showAssessmentSettings'] = showAssessmentSettings;
            results['ev_users'] = ev_users;
            let user_chat_all: any = await this.chatService.coachListRecord(
                [
                "CONCAT('R', ch_chat.user_id, 'S', ch_chat.sender_id) AS sender_id",
                "COUNT(ch_chat.sender_id) AS count",
                "user.profile_image",
                "user.first_name",
                "user.last_name",
                "ch_chat.read_by",
                "ch_chat.added_date",
                "ch_chat.text",
                "ch_chat.id",
                "ch_chat.user_id",
                "user.id",
                "ch_chat.sender_id"
                ],
                `ch_chat.user_id = ${user.id} AND (ch_chat.user_id <> '') AND ch_chat.is_private=0`,
                {id: 'ASC'},
                'ch_chat.sender_id',
                {user_id: user.id}
            );
            user_chat_all = user_chat_all.reduce((acc, item) => {
                const senderId = item[0].sender_id;
                const count = item[0].count;
                acc[senderId] = count;
                return acc;
            }, {});
            let user_chat = await this.chatService.coachListRecord(
                [
                    `COUNT(IF(ch_chat.read_by NOT REGEXP '^${user.id},' AND ch_chat.read_by NOT REGEXP ',${user.id}$' AND ch_chat.read_by != ${user.id} AND ch_chat.read_by NOT REGEXP ',${user.id},', 1, NULL)) AS Total`,
                    'user.profile_image',
                    'user.first_name',
                    'user.last_name',
                    'ch_chat.read_by',
                    'MAX(ch_chat.added_date) as added_date',
                    'ch_chat.text',
                    'ch_chat.id',
                    'ch_chat.user_id',
                    'user.id'
                ],
                `(ch_chat.user_id = ${user.id} OR ch_chat.sender_id= ${user.id}) AND (ch_chat.user_id <> '') AND ch_chat.is_private=0`,
                {added_date: 'DESC'},
                'ch_chat.sender_id'
            );
            let chatWith = Object.create(null);
            let user_array = Object.create(null);
            for(let userData of user_chat){
                let sender = userData['user']['id'];
                if (sender != user.id) {  
                    let key = `R${user.id}S${sender}`;
                    chatWith[key] = `${userData['user'].first_name} ${userData['user'].last_name}`;
                    user_array[key]['chat'] = ''; 
                    user_array[key]['count'] = userData[0]['Total'];  
                    if(!user_array[key]['info']){
                        user_array[key]['info'] = '';
                    }   
                    user_array[key]['info'] += '<input type="hidden" class="org_id" value="" />';
                    user_array[key]['info'] += '<input type="hidden" class="c_type" value="user" />';
                    user_array[key]['info'] += `<input type="hidden" class="send_to" value="${sender}" />`;
                    user_array[key]['info'] += '<input type="hidden" class="dep_id" value="" />';
                    user_array[key]['info'] += '<input type="hidden" class="loc_id" value="" />';
                    user_array[key]['info'] += '<input type="hidden" class="team_id" value="" />';
                }
            }
            let dataChat = Object.create(null);
            if (user_array) {          
                dataChat['u_chat'] = user_array;
                results['dataChat'] = dataChat;
            }
            results['user_chat_all'] = user_chat_all;
            if(chatWith){
                results['chatWith'] = chatWith;
            }            
            return results;
        } catch(error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async globalCoachDashboard(data = null, req: Request) {
        try {
            let user = Object.create(req.tokenUser);
            let timezone = user.timezone;
            let ucurrentdate = moment.utc().format('YYYY-MM-DD HH:mm:ss');  
            let ucurrentdate1 = moment.utc(ucurrentdate).tz('America/Anchorage');
            if (timezone.trim() !== "") {
            if (timezone.trim() === "Pacific Standard Time (PST)") {
                timezone = "America/Los_Angeles";
            } else if (timezone.trim() === "Mountain Standard Time (MST)") {
                timezone = "America/Denver";
            } else if (timezone.trim() === "Central Standard Time (CST)") {
                timezone = "America/Chicago";
            } else if (timezone.trim() === "Eastern Standard Time (EST)") {
                timezone = "America/New_York";
            }
            ucurrentdate1 = ucurrentdate1.tz(timezone);
            ucurrentdate = ucurrentdate1.format('YYYY-MM-DD');
            }
            const date = {};
            date[0] = ucurrentdate;  
            date[1] = moment(ucurrentdate).add(1, 'day').format('YYYY-MM-DD');
            let company;
            let users;
            let ev_users;
            if(data.user == 1){
                let companyData = await this.coachesService.listRecord(`coach.coach_manager_id = ${user.id} AND coach.status != 2`,null,['coach.id','company.company_name','company.code','company.id'])
                let joinCond =  ` AND user.org_id In(${companyData.map(ele => ele['company'].id).join(',')})`;
                ev_users = await this.eventSlotsTimingsService.coachEventListing(`est.slotdate In('${date[0]}','${date[1]}') AND est.status !=2`,null,
                    ['user', 'userbookinglists.ev_contact', 'est.id','est.slotdate', 'est.slotstarttime', 'userbookinglists.id', 'userbookinglists.ev_attend_status'],
                    null, companyData && companyData.length ? joinCond : null, true, data);
                users = await this.userService.paginateList(`user.role_id = 20 AND user.status !=2`, data,['user.id', 'user.status', 'user.role_id', 'user.first_name', 'user.last_name', 'user.code', 'user.username', 'user.created', 'user.updated',]);
                if(users?.list && users?.list?.length && data?.summary == 1){
                    users.list = await Promise.all(
                        users.list.map(async (item) => {
                            let processData = await this.coachHelperService.globalCoachDataProcessing(
                                { id: item.id, user: 1, status: item.status },
                                req
                            );
                            return { ...item, ...processData };
                        })
                    );
                }
            }
            if(!data.user && data.user == 0){
                company = await this.coachesService.assignCoachListRecord(['coach.id','company.company_name','company.code','company.id'],`coach.coach_manager_id = ${user.id} AND coach.status != 2`,null,[tableConstant.COMPANIES.TBL_COMPANY], true, data as PaginateWithCoachesInput)
                if(company?.list && company?.list?.length && data?.summary == 1){
                    company.list = await Promise.all(
                        company?.list?.map(async (item) => {
                            let processData = await this.coachHelperService.globalCoachDataProcessing(
                                { id: item?.company?.code, company: 1 },
                                req
                            );
                            return { ...item, ...processData };
                        })
                    );
                }
            }
            return {company, users, ev_users};
        } catch(error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    @Post('dashboard-summary')
    async CoachDashboardSammary(@Req() req: Request, @Res() res: Response) {
        try {
            let user = Object.create(req.tokenUser);
            if(![appConstant.ROLE.COACH,appConstant.ROLE.GLOBALCOACH].includes(user?.role_id) ){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
            }
            let result = await this.coachHelperService.dashboardSummary(user,req);
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
    @Post('event-slot')
    async coachEventSlot(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCoachesInput) {
        try {
            let user = Object.create(req.tokenUser);
            if (user.role_id != appConstant.ROLE.COACH) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
            }
            let area = user['settings']['coach_area'];
            let slotsEvents;
            let where =``;
            if (postData?.search_str) {
                if (postData?.search_str.includes('am') || postData?.search_str.includes('pm')) {
                    let splitData = postData?.search_str.split("- ");
                    let startTime =  splitData[0];
                    let endTime =  splitData[1];
                    where += ` ${where.length ? 'AND' : ''} (slot.start_time = '${moment(startTime, "H:mm a").format("HH:mm:ss")}' AND slot.end_time = '${moment(endTime, "H:mm a").format("HH:mm:ss")}')`;
                }
                else if(this.commonDateService.isValidDate(postData?.search_str)){
                    where += ` ${where.length ? 'AND' : ''} (slot.start_date BETWEEN '${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 23:59:59')`;
                }
                else{
                    where += ` ${where.length ? 'AND' : ''} (event.event_name LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%')`;
                }
            }
            let org_list;
            if (user?.role_id === appConstant.ROLE.GLOBALCOACH) {
                org_list = await this.coachesService.listRecord({ coach_manager_id: user?.id, status: Not(2) }, null, ['coach.org_id']);
            }
            if (user?.role_id === appConstant.ROLE.COACH) {
                org_list = await this.coachesService.listRecord({ user_id: user?.id, status: Not(2) }, null, ['coach.org_id']);
            }
            if(org_list.length){
                if(area==0){
                    where += ` ${where.length && where != '' ? 'AND' : ''} company.id in(${org_list?.map(ele => ele.org_id?.toString()).join(',')})`;
                    where = where.length ? where + ` AND coach.user_id = ${user.id} AND coach.is_global = 1` : `coach.user_id = ${user.id} AND coach.is_global = 1`;
                    slotsEvents = await this.coachesService.coachSlots(where, postData);
                }
                else{
                    where = where.length ? where + ` AND (company.id in(${org_list?.map(ele => ele.org_id?.toString()).join(',')}) OR event.user_email = '${user.email}' OR event.created_by_user_id = ${user.id})` : ` (company.id in(${org_list?.map(ele => ele.org_id?.toString()).join(',')}) OR event.user_email = '${user.email}' OR event.created_by_user_id = ${user.id})`;
                    slotsEvents = await this.eventSlotsService.coachSlots(`(${where}) AND slot.status != 2 AND company.status != 2 AND event.status != 2`, postData);
                }
                await Promise.all(slotsEvents['list'].map(async (element) =>{
                    if(element?.slot && element?.slot?.event){
                        element.event_name = element?.slot?.event?.event_name;
                    }
                    if(element.event_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${element['id']}`, `/LC_MESSAGES/Events/Events/${element['org_id']}/${element['id']}`,`dynamic`);
                        element.event_name = (customName == '' || customName == `event_name_${element['id']}`) ? element['event_name'] : customName;
                    } 
                    let totalBooking = (await this.eventUserBookingListsService.listRecord(`eubl.ev_slots_id = ${element['slot']['id']}`))?.length;
                    element['totalBooking'] = totalBooking;
                    element['slot']['start_date'] = this.commonDateService.getTodayDate(element['slot']['start_date']).format("MM/DD/YYYY");
                    element['slot']['start_time'] = this.commonDateService.getTodayDate(element['slot']['start_time'], "HH:mm:ss").format("h:mm a");
                    element['slot']['end_time'] = this.commonDateService.getTodayDate(element['slot']['end_time'], "HH:mm:ss").format("h:mm a");
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: slotsEvents ?? [],
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
    @Post('event-users')
    async eventUsers(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCoachesInput) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = await this.userService.findOne(`user.id = ${postData?.user_id}`);
            if (!user) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            let where = `event.organization_id =${user['company']['id']} AND event.status != 2`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['event.event_name']);
            }
            let events = await this.eventService.listRecordPagination(['event.id','event.created','event.category_id','event.event_name','event.status','event.organization_id','userBookingList.id','userBookingList.ev_attend_status'],where, postData ,user.id);
            await Promise.all(events['list']?.map(async (ele)=>{
                if(ele.event_name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['org_id']}/${ele['id']}`,`dynamic`);
                    ele.event_name = (customName == '' || customName == `event_name_${ele['id']}`) ? ele['event_name'] : customName;
                }
            }));
            let currentDate = this.commonDateService.getTodayDate();
            await Promise.all(events['list']?.map( async (ele)=>{
                let slotstimings = await this.eventSlotsTimingsService.findOne({ev_events_id: ele.id},null,['est.slotdate']);
                if(slotstimings){
                    if (this.commonDateService.getTodayDate(slotstimings.slotdate).isBefore(currentDate)) {
                        ele['event_action'] = "Complete";
                    } else {
                        ele['event_action'] = "Incomplete";
                    }
                }
                else{
                    ele['event_action'] = "Incomplete";
                }
            }));            
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: events,
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
    @Post('assign-list')
    async assignList(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCoachesInput) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `coach.user_id = '${postData?.user_id}' AND coach.status = 1`;
            let searchColumns = [];
            if(postData.tab){
                switch (postData.tab) {
                    case 1:
                        where += ` AND coach.is_global = 1 AND company.status = 1`;
                        searchColumns = ['company.id', 'company.company_name', 'company.code', 'company.state', 'company.city', 'company.country', 'company_type.company_type'];
                    break;
                    case 2:
                        where += ` AND coach.location IS NOT NULL AND location.status = 1`;
                        searchColumns = ['company.id', 'location.id', 'location.location_name'];
                    break;
                    case 3:
                        where += ` AND coach.department IS NOT NULL AND department.status = 1`;
                        searchColumns = ['company.id', 'department.id', 'department.dept_name'];
                    break;
                    case 4:
                        where += ` AND coach.state IS NOT NULL AND coach.state != '' AND company.status = 1`;
                        searchColumns = ['company.id', 'company.state', 'coach.state'];
                    break;
                    case 5:
                        where += ` AND coach.city IS NOT NULL AND coach.city != '' AND company.status = 1`;
                        searchColumns = ['company.id', 'company.city', 'coach.city'];
                    break;
                    default:
                }
            }
            if(postData?.search_str){
                if(postData.tab){
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, searchColumns);
                }
                else{
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['company.id','company.company_name', 'company.code', 'location.id', 'location.location_name', 'department.id', 'department.dept_name', 'company.state', 'company.city', 'company.country', 'company_type.company_type', 'coach.state', 'coach.city']);
                }
            }
            let resultedData = await this.coachesService.assignCoachListRecord(['company.id', 'company.code', 'company.company_name', 'company.city', 'company.state', 'company.country', 'company_type.id', 'company_type.company_type', 'location.id', 'location.location_name', 'coach.id', 'coach.city', 'coach.state', 'coach.location', 'coach.department', 'coach.is_global', 'department.id', 'department.dept_name'],where,null,[tableConstant.COMPANIES.TBL_COMPANY,tableConstant.COMPANIES.TBL_LOCATION,tableConstant.COMPANIES.TBL_DEPARTMENT], true, postData);
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