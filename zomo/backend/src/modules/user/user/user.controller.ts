import { UrlManageService } from '@/modules/common';
import { LanguagesService } from '@/modules/master/languages/languages.service';
import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    Gender,
    imageConstant,
    tableConstant,
    UserDto,
    UserProfileDto,
    UserSettingsDto,
    YesNo
} from '@common-constants';
import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { CoachesService } from 'src/modules/coach/coaches/coaches.service';
import { CommunicationTemplateTextsService } from 'src/modules/communication/templatetexts/communicationtemplatetexts.service';
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { DepartmentService } from 'src/modules/company/departments/department.service';
import { LocationService } from 'src/modules/company/locations/location.service';
import { SettingsService } from 'src/modules/company/settings/settings.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { ThemeSettingsService } from 'src/modules/themes/themesettings/themesettings.service';
import { In, Like, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateResetPasswordInput, PaginateWithUserInput } from '../../../input';
import { fileName, imgFilter } from '../../../utils/image-upload.utils';
import { TranslationService } from '../../translation/translation.service';
import { UserSettingsService } from '../usersettings/usersettings.service';
import { CreateUserInput } from './input';
import { UserService } from './user.service';
const argon2 = require('argon2');
const moment = require('moment-timezone');
const path = require('path');
const S3_URL =  process.env.S3_URL_PROD
const filePath = appConstant.PERMISSIONS_DIR;

@Controller('user')
@UseGuards(TokenGuard, RoleGuard)
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly departmentService: DepartmentService,
        private readonly companySettingsService: SettingsService,
        private readonly activityLogService: ActivityLogService,
        private readonly userSettingsService: UserSettingsService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly coachesService: CoachesService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly locationService: LocationService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly themeSettingsService: ThemeSettingsService,
        private readonly urlManageService: UrlManageService,
        private readonly languagesService: LanguagesService,
        @Inject('TIMEZONE_SERVICE')
            private timezoneMicroservice: ClientProxy,
    ) { }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithUserInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let tableData = [tableConstant.MASTER.TBL_ROLES,tableConstant.COMPANIES.TBL_COMPANY,tableConstant.COMPANIES.TBL_DEPARTMENT,tableConstant.TBL_USERS],
            fields = ['user.id','user.role_id','user.code','user.username','user.email','user.first_name','user.last_name','user.status','user.created','user.updated','company.id','company.company_name','company.code','company.company_logo','department.id','department.dept_name','role.id','role.title'];
            if(postData?.call_type == 'form_send'){
                tableData = [...tableData,tableConstant.COMPANIES.TBL_LOCATION]
                fields = [...fields,'user.on_insurance_plan','user.insurance_plan_name','user.location','Location.id','Location.location_name'];
            }
            let where = req.tokenUser?.role_id == appConstant.ROLE.ADMIN && postData?.role_id ? `user.id != ${req.tokenUser?.id} AND user.status != 2 ` : postData?.status ? 
                `user.role_id != ${appConstant.ROLE.ADMIN} AND user.id != ${req.tokenUser?.id} `
                : `user.role_id != ${appConstant.ROLE.ADMIN} AND user.id != ${req.tokenUser?.id} AND user.status != 2  `;
            if(req.tokenUser?.role_id == appConstant.ROLE.GLOBALCOACH || req.tokenUser?.role_id == appConstant.ROLE.COACH){
                /* Global coach coaches & user condition*/
                if (postData?.role_id) {
                    tableData = [tableConstant.COMPANIES.TBL_COMPANY,tableConstant.TBL_USERS_SETTINGS];
                    fields = ['user.id','user.code','user.dob','user.gender','user.username','user.first_name','user.last_name','user.email','user.status','user.created','user.updated','company.id','company.company_name','settings.id','settings.communication_type','settings.coach_area'];
                    where = `user.role_id != ${appConstant.ROLE.ADMIN} AND user.id != ${req.tokenUser?.id} AND user.status != 2 `;
                } else {
                    tableData = [tableConstant.MASTER.TBL_ROLES,tableConstant.COMPANIES.TBL_COMPANY,tableConstant.COMPANIES.TBL_COMPANY_SETTINGS];
                    fields = ['user.id','user.code','user.dob','user.gender','user.username','user.first_name','user.last_name','user.email','user.status','user.created','user.updated','company_setting.is_emo_health_asssessments','company.id','company.company_name','role.id','role.title'];
                    let coachCondition = req.tokenUser?.role_id == appConstant.ROLE.GLOBALCOACH ? `coach.coach_manager_id = ${req.tokenUser?.id} AND coach.status = 1` : `coach.user_id = '${req.tokenUser?.id}' AND coach.is_global = 1 AND coach.status = 1`;
                    let coach = await this.coachesService.listRecord(coachCondition,null,['coach.org_id'],'coach.org_id');
                    if(coach.length == 0 && !postData.org_id){
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: {
                                list: [],
                                total: 0,
                                pages: postData?.page,
                                limit: postData?.limit,
                                page: 1, 
                            },
                            message: 'success',
                        });
                    }
                    postData.org_id = postData?.org_id ? coach.filter(item => postData?.org_id.includes(item.org_id.toString())).map((ele)=> ele.org_id).join(',') : coach.map((ele)=> ele.org_id).join(',');
                    where = `user.role_id != ${appConstant.ROLE.ADMIN} AND user.id != ${req.tokenUser?.id} AND user.status = 1 AND user.role_id IN(2,16) `;
                }
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    postData.org_id = resultedData.map(ele=>ele.org_id).join(',');
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
            if(postData?.search_str && postData?.search_str != ''){
                if (postData?.filter_by) {
                    if (postData?.filter_by?.toLowerCase() == 'user_id') {
                        where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '','user.code');
                    }
                    if (postData?.filter_by?.toLowerCase() == 'org_name') {
                        const companyData = await this.companyService.listRecord({ company_name: Like(`%${postData?.search_str}%`), deleted: 0, status: 1 },null,['company.id']);
                        postData.org_id = companyData && companyData.length ? companyData.map((e) => e.id).join(',') : '001';
                    }
                    if (postData?.filter_by?.toLowerCase() == 'dept_name') {
                        const departmentData = await this.departmentService.listRecord({ dept_name: Like(`%${postData?.search_str}%`), deleted: 0 },null,['id']);
                        if(departmentData.length == 0 && postData?.call_type == 'form_send'){
                            return res.status(HttpStatus.OK).json({statusCode: 200, success: 1, error: 0, data: [], message: 'success'});
                        }
                        postData.department_id = departmentData && departmentData.length ? departmentData.map((e) => e.id).join(',') : '';
                    }
                    if (postData?.filter_by?.toLowerCase() == 'loc_name') {               
                        const locationData = await this.locationService.listRecord(['id'],{ location_name: Like(`%${postData?.search_str}%`), deleted: 0 },null);
                        if(locationData.length == 0 && postData?.call_type == 'form_send'){
                            return res.status(HttpStatus.OK).json({statusCode: 200, success: 1, error: 0, data: [], message: 'success'});
                        }
                        postData.location_id = locationData && locationData.length ? locationData.map((e) => e.id).join(',') : '';
                    }
                    if (postData?.filter_by?.toLowerCase() == 'on_health_plan') {
                        where += `AND user.on_insurance_plan = '${postData?.search_str}' `;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'org_id') {
                        where += `AND(company.id = '${postData?.search_str}' OR company.code = '${postData?.search_str}') `;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'dept_id') {
                        where += `AND department.code = '${postData?.search_str}' `;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'location_id') {
                        where += `AND location.location_name = '${postData?.search_str}' `;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'username') {
                        where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '',['user.username'] ,false);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'full_name') {
                        where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '',['full_name'] , false);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'email') {
                        where += ` AND  user.email LIKE '%${postData?.search_str}%' `;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'communication_type') {
                        where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '','settings.communication_type' ,false);
                    }
                    if (postData?.filter_by?.toLowerCase() == 'userview') {
                        where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '','settings.coach_area' ,false);
                    }
                } else {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['full_name','user.username']);
                }
            }
            if (postData?.role_id) {
                where += `AND user.role_id IN (${postData?.role_id.split(',')}) `;
            }
            if (postData?.org_id) {
                where += `AND user.org_id IN(${postData?.org_id.split(',')}) `;
            }
            if (postData?.department_id) {
                where += `AND user.department_id IN(${postData?.department_id.split(',')}) `;
            }
            if (postData?.location_id) {
                where += `AND user.location IN(${postData?.location_id.split(',')}) `;
            }
            if (postData?.status != undefined || postData?.status != null) {
                where += `AND user.status = ${postData?.status} `;
            }
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                where += ` AND user.membership_code = '${req.tokenUser?.membership_code}'`;
                let wellnessCondition = `(wellnessAssignment.org_id='${req.tokenUser?.org_id}' AND wellnessAssignment.user_id='${req.tokenUser?.id}') AND wellnessAssignment.status = 1 AND ((wellnessAssignment.location = user.location AND user.location != '') OR (wellnessAssignment.department = user.department_id AND user.department_id != 0) OR (wellnessAssignment.state = userSetting.state AND userSetting.state != '') OR (wellnessAssignment.city = userSetting.city AND userSetting.city != '') OR (wellnessAssignment.is_global=1))`;
                let fields = ['user.id', 'user.status', 'user.role_id', 'user.date_of_hire', 'user.first_name', 'user.last_name', 'user.code', 'user.username',
                    'role.id', 'role.title', 'user.created', 'user.updated',
                    'userSetting.id',
                    'wellnessAssignment.id'];
                let tableData = [tableConstant.TBL_USERS, tableConstant.MASTER.TBL_ROLES, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS];
                let resultedData = await this.userService.paginateList(where,
                    postData,
                    fields,
                    tableData, wellnessCondition);
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(UserDto, resultedData['list'], req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            // for broker admin role.
            if ((appConstant.ROLE.BROKERADMIN == req.tokenUser?.role_id || appConstant.ROLE.BROKER == req.tokenUser?.role_id || appConstant.ROLE.REGIONALADMIN == req.tokenUser?.role_id) && postData?.call_type !== 'form_send') {
                //for client management module location wise user list. for this org_id , location_id are mandetory feild.
                if (postData?.call_type && postData?.call_type == 'locationUser') {
                    if (!postData?.org_id || !postData?.location_id) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                    }
                    let orgId = postData?.org_id;
                    let companies = await this.companyService.findOneV1(
                        `company.id IN (${orgId}) AND company.status = 1`,
                        [tableConstant.COMPANIES.TBL_LOCATION],
                        ['company.id', 'company.code','locations?.id','locations?.location_name']
                    );
                    if (!companies) {
                        throw new Error(
                            await this.translatorService.frontendReadTranslation(
                                req.lang,
                                'ERR_RECORD_NOT_FOUND',
                            ),
                        );
                    }
                    let locationDetails : object = companies?.locations || {};
                    let membershipCode = companies?.code;
                    where = `user.membership_code = '${membershipCode}' AND user.location IN(${postData?.location_id.split(',')}) AND user.status = 1`;
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.username', 'user.code', 'full_name'], false);
                    }
                    let fields = ['user.id', 'user.status', 'user.role_id', 'user.first_name', 'user.last_name', 'user.code', 'user.username',
                        'role.id', 'role.title'];
                    let tableData = [tableConstant.MASTER.TBL_ROLES];
                    let resultedData = await this.userService.paginateList(where,
                        postData,
                        fields,
                        tableData);
                    resultedData['list'] = <any>(
                        await this.commonArrayService.formatToDto(UserDto, resultedData['list'], req.lang)
                    );
                    resultedData['location'] = locationDetails;
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: resultedData,
                        message: 'success',
                    });
                }
                if (postData?.call_type && postData?.call_type == 'regional') {
                    where += ` AND user.role_id = 23`
                }
                if (postData?.call_type && postData?.call_type == 'brokers') {
                    where += ` AND user.role_id = 7`
                }
                where += ` AND user.membership_code = '${req.tokenUser?.membership_code}'`;
                let fields = ['user.id', 'user.status', 'user.role_id', 'user.first_name', 'user.last_name', 'user.code', 'user.username',
                    'role.id', 'role.title'];
                let tableData = [tableConstant.MASTER.TBL_ROLES];
                let resultedData = await this.userService.paginateList(where,
                    postData,
                    fields,
                    tableData);
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(UserDto, resultedData['list'], req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            this.commonFileService.addMembershipCodeCondition(req, where);
            const resultedData = await this.userService.paginateList(
                where,
                postData,
                fields,
                tableData
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserDto, resultedData['list'], req.lang)
            );
            if(req.tokenUser?.role_id == appConstant.ROLE.GLOBALCOACH || req.tokenUser?.role_id == appConstant.ROLE.COACH){
                if(resultedData['list']?.length && resultedData['list']?.find(record => record.company)){
                    resultedData['company'] = (resultedData['list']?.find(record => record.company))['company'];
                    resultedData['company']['company_name'] = resultedData['company']['name'];
                }
                else{
                    resultedData['company'] = postData?.org_id ? await this.companyService.companyFindOne({ id: In(postData?.org_id?.split(',')), status: Not(2) }) : null;
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            this.commonFileService.addMembershipCodeCondition(req, where);
            let recordDetails = await this.userService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if(recordDetails?.['profile_image']){
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: recordDetails?.['profile_image'] }));
                if(!fileData){
                    recordDetails['profile_image'] = '';
                }
            }
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(UserDto, recordDetails, req.lang)
            );
            if(!recordDetails['settings']){
                recordDetails['settings'] = await this.userSettingsService.save({ user_id: recordDetails['id'], wphone: '', cphone: '', hphone: '' });
            }
            if(recordDetails.role_id == appConstant.ROLE.CLIENTENGAGEMENTMANAGER){
                let orgList: any = await this.clientManagerAssignService.listRecord({user_id: recordDetails?.id,status: 1});
                recordDetails['orgList'] = orgList?.map(ele => { return {id: ele['company'].id, company_name: ele['company'].company_name} });
            }
            let stateData = await this.companyService.stateList(recordDetails?.['settings']?.state);
            if(recordDetails?.['settings']?.state){
                let state = stateData.find(ele => ele.statecode == recordDetails['settings']?.state || ele.state == recordDetails['settings']?.state);
                recordDetails['settings'].state = state?.['state'];
                recordDetails['settings']['statecode'] = state?.['statecode'];
            }
            if(recordDetails.timezone){
                let timezoneData = await lastValueFrom(this.timezoneMicroservice.send({ cmd: 'find_postcode' }, {}));
                recordDetails.timezone = await timezoneData.find((e) => e.timezone_name == recordDetails.timezone);
            }
            if(recordDetails?.last_login){
                recordDetails['last_login'] = this.commonDateService.DateTimeFormat(recordDetails.last_login, "ll", "YYYY-MM-DD HH:mm:ss", (recordDetails?.['timezone']?.['timezone_name'] || 'UTC'));
            }
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
    @Post('create')
    @UseInterceptors(
        FileInterceptor('profile_image', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.USER_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
        AccessGuard
    )
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateUserInput,
        @UploadedFile() file: Express.Multer.File,
    ) {
        try {
            let tokenUser = Object.create(req.tokenUser);
            let message = 'The User registered successfully.';
            /* for now not sending emails */
            let stopmailsend = postData?.stopmailsend ?? 0;
            delete postData?.stopmailsend;
            if (postData?.hasOwnProperty('id')) {
                delete postData?.id;
            }
            if (
                !postData?.role_id ||
                !postData?.first_name ||
                !postData?.last_name ||
                !postData?.email
            ) {
                if (
                    file &&
                    file.fieldname === 'profile_image' &&
                    file.filename
                ) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            if(tokenUser.role_id == appConstant.ROLE.GLOBALCOACH && (!postData.username || postData.username == '')){
                postData.username = await this.commonService.createUsername(postData?.first_name,postData?.last_name)
                postData.new_password = await this.commonService.createUsername(postData?.first_name,postData?.last_name)
            }
            postData.email = postData?.email.toLowerCase();
            const emailCheck = await this.userService.findOne({
                email: postData?.email,
                status: Not(2)
            });
            if (emailCheck) {
                if (
                    file &&
                    file.fieldname === 'profile_image' &&
                    file.filename
                ) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_USER_EMAIL_EXIST',
                    ),
                );
            }
            if (postData?.username) {
                postData.username = this.commonService.removeWhiteSpace(postData?.username);
                const emailUName = await this.userService.findOne({
                    username: postData?.username,
                    status: Not(2)
                });
                if (emailUName) {
                    if (
                        file &&
                        file.fieldname === 'profile_image' &&
                        file.filename
                    ) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'ERR_USERNAME_EXIST',
                        ),
                    );
                }
            }
            if (postData?.id) {
                delete postData?.id;
            }
            if (postData?.gender) {
                postData.gender = Gender[postData?.gender.toLowerCase()];
            }
            if (postData?.physiciantype_id) {
                postData.pname = postData?.first_name + ' ' + postData?.last_name;
            }
            if (postData?.on_insurance_plan) {
                postData.on_insurance_plan = YesNo[postData?.on_insurance_plan.toUpperCase()];
            }
            if (postData?.p_email) {
                postData.p_email = postData?.p_email.toLowerCase();
            }
            postData.date_of_hire = (postData.date_of_hire === '' || postData.date_of_hire === 'undefined' || postData.date_of_hire === undefined || postData.date_of_hire === 'null' || postData.date_of_hire === null || (typeof postData.date_of_hire === 'string' && postData.date_of_hire.trim() === '')) ? null : postData.date_of_hire;
            if (postData['securitycode'] && postData['securitycode'] != '') {
                postData['securitycode'] = Buffer.from(postData['securitycode']).toString('base64');
            }
            const companyDetails = await this.companyService.findOne({ id: postData?.org_id, deleted: 0, status: 1 },[tableConstant.COMPANIES.TBL_COMPANY_META],['company','companyMeta']);
            let password = postData?.password || moment(postData?.dob).format('MMDDYYYY');
            let pass_text
            const companyData = await this.companySettingsService.findOne({ org_id: postData?.org_id });
            let comPrefix = companyData?.pre_first_login_by ?? '';
            if((!postData?.autouser || postData?.autouser != 1) && !postData?.password){
                pass_text = this.commonService.admin_mail_data(companyData.first_login_by, comPrefix)
            }
            if((postData.role_id == appConstant.ROLE.BROKER || postData.role_id == appConstant.ROLE.BROKERADMIN || postData.role_id == appConstant.ROLE.REGIONALADMIN) && (!companyDetails || !companyDetails?.code?.includes('BF'))){
                throw Error(await this.translatorService.frontendReadTranslation(req.lang,'The User could not be saved. Please, select broker organization'));  
            }
            if((postData.role_id == appConstant.ROLE.PHYSICIAN) && (!companyDetails || !companyDetails?.code?.includes('HC'))){
                throw Error(await this.translatorService.frontendReadTranslation(req.lang,'The User could not be saved. Please, select helathcare organization'));  
            }
            if(([appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE,appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH].includes(postData.role_id)) && (!companyDetails || !companyDetails?.code?.includes('CI'))){
                throw Error(await this.translatorService.frontendReadTranslation(req.lang,'The User could not be saved. Please, select normal organization'));  
            }
            if ((postData?.autouser && postData?.autouser == 1 && !postData?.username) || (postData?.autouser && postData?.autouser == 1 && !postData?.password)) {
                let username = postData?.first_name + postData?.last_name;
                if (companyData) {
                    if (companyData.first_login_by == 1) {
                        username += postData?.dob?.split('-')[0];
                    }
                    else if (companyData.first_login_by == 2) {
                        username += postData?.date_of_hire?.split('-')[0];
                    }
                    else if (companyData.first_login_by == 3) {
                        username += postData?.employeeid;
                    }
                    else {
                        username += postData?.dob?.split('-')[0];
                    }
                }
                postData.username = postData?.username || username?.toUpperCase();
                postData.password = comPrefix != '' ? comPrefix + password : password;
                password = postData?.password;
            }
            else{
                if((!postData?.username || postData?.username == '') && (!postData?.password || postData?.password == '') && (!postData?.autouser || postData?.autouser == 0)){
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'The User could not be saved. The username has already been taken. If You select Automatic Username Than Change First Name or Last Name.',
                        ),
                    );
                }
                if(!postData?.password && postData?.autouser && postData?.autouser == 0){
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'The User could not be saved. Please, try again.',
                        ),
                    );
                }
            }
            postData.num_login = postData?.num_login ?? 0;
            delete postData?.autouser;
            postData['new_password'] = postData?.password ?? '';
            delete postData?.password;
            //tushar condtion provided
            if(postData.role_id == appConstant.ROLE.GLOBALDATAMANAGER || postData.role_id == appConstant.ROLE.ENGAGEMENTDATAMANAGER){
                postData.org_id = 0;
                postData.membership_code = '';
            }
            if(!postData?.timezone || postData?.timezone == 'undefined'){
                postData.timezone = 'UTC';
            }
            if(!postData?.companytype_id){
                postData.companytype_id = companyDetails?.companytype_id;
            }
            const createdUser = await this.userService.save({
                ...postData,
                password: '',
                created_by: req.tokenUser?.id,
            }, req);
            if(postData.role_id == appConstant.ROLE.CLIENTENGAGEMENTMANAGER){
                for(let org_id of postData?.assign_org?.split(',')){
                    await this.clientManagerAssignService.save({org_id: org_id, user_id: createdUser['id'], status: 1});
                }
            }
            await this.userSettingsService.save({ user_id: createdUser['id'], wphone: '', cphone: '', hphone: '' });
            const updateData = {};
            let prefix = 'CI';
            if(postData.role_id == appConstant.ROLE.PHYSICIAN){
                prefix = 'HC';
            }
            if(postData.role_id == appConstant.ROLE.BROKER || postData.role_id == appConstant.ROLE.BROKERADMIN || postData.role_id == appConstant.ROLE.REGIONALADMIN){
                prefix = 'BF';
            }
            let userCode = this.commonService.generateCode(
                prefix,
                createdUser['id'],
            );
            let codeCheck = await this.userService.findOne({ code: userCode });
            while (codeCheck) {
                userCode = this.commonService.generateCode(
                    prefix,
                    createdUser['id'],
                );
                codeCheck = await this.userService.findOne({ code: userCode });
            }
            updateData["code"] = userCode;
            updateData['profile_image'] = imageConstant.USER;
            if (file && file.fieldname === 'profile_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = this.commonFileService.generateFileName('profileimages', createdUser['id'].toString(), 'proimg_', file.originalname.split('.')[file.originalname.split('.').length - 1]);
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                createdUser['profile_image'] = file.filename;
            }
            let encoded = this.commonService.generateMD5(Date.now() + Math.random().toString());
            await this.userService.update({
                id: createdUser['id']
            },
            {
                code: userCode,
                activation_key:  encoded
            });
            let passwordEncrypt = this.commonService.passwordEncrypt(`${updateData['code']}:::::${createdUser['id']}:::::${postData?.new_password}`);
            await this.commonService.makeCurlRequest('POST',process.env.PASSWORDENCRYPTION, {encrypted_assertion: passwordEncrypt},{'Authorization': `Bearer ${encoded}`,'Content-Type': 'application/x-www-form-urlencoded'});
            /* need to configure email code more here this is sample code to send email.
                need to add functionality for attachment here for sending pdf 
             */
            if((!stopmailsend || stopmailsend == 0) && [appConstant.ROLE.ORGADMIN,appConstant.ROLE.ADMIN,appConstant.ROLE.CLIENTENGAGEMENTMANAGER,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.WCH,appConstant.ROLE.BROKERADMIN,appConstant.ROLE.REGIONALADMIN,appConstant.ROLE.PUBLIC,appConstant.ROLE.MGR,appConstant.ROLE.OPPSADMIN,appConstant.ROLE.OTHER].includes(req.tokenUser?.role_id)){
                if([appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE,appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH,appConstant.ROLE.BROKER,appConstant.ROLE.BROKERADMIN,appConstant.ROLE.REGIONALADMIN,appConstant.ROLE.PUBLIC,appConstant.ROLE.MGR,appConstant.ROLE.OPPSADMIN,appConstant.ROLE.OTHER].includes(postData?.role_id)){
                    let attachemnt = [];
                    companyDetails.companyMeta.emailattachment = companyDetails?.companyMeta?.emailattachment ? JSON.parse(companyDetails.companyMeta.emailattachment) : [];
                    if(companyDetails.companyMeta.emailattachment && companyDetails.companyMeta.emailattachment.length){
                        for(let ele of companyDetails.companyMeta.emailattachment){
                            let file = ele.includes(S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD,process.env.AWS_BUCKET_PRIVATE_PROD)) ? ele.replace((S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD,process.env.AWS_BUCKET_PRIVATE_PROD)),'') : ele;
                            let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: ele,  userBucket: 'private'}));
                            if(fileData){
                                let filename = file.split('/')[file.split('/').length -1]; 
                                const directory = `${appConstant.COMPANY_EMAIL_ATTACHMENT}/${companyDetails.id}`;
                                let filePath = path.join(directory, filename);
                                let filePathh = path.join(`${directory}`);
                                let writeFile = await this.commonFileService.writePDFFile(filePathh,fileData.Body,filename);
                                if (writeFile?.status == 'success') {
                                    attachemnt.push({
                                        filename: filename,
                                        path: path.resolve(filePath)
                                    });
                                }
                            }
                        }
                    }
                    const templateText = await this.communicationTemplateTextService.findOne({org_id: In([postData?.org_id,0]), type: 1})
                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                    let emaildata = {
                        sender: ``,
                        receiver: postData?.email,
                        subject: 'Welcome to ZomoHealth: New Account Created',
                        content: {Username: postData?.username, Password: pass_text || password, 'Company Name': companyDetails.company_name, "First Name": postData?.first_name, type: 1, 'Company Text': companyDetails.companyMeta.custom_text},
                        template: templateNewText,
                        attachment: attachemnt
                    }
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                }
                else{
                    const templateText = await this.communicationTemplateTextService.findOne({org_id: In([postData?.org_id,0]), type: 5})
                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate', 1) || templateText?.['text'];
                    let emailDetails = {
                        Username: postData?.username,
                        Password: pass_text || password,
                        'Company Name': (
                            (
                                companyDetails &&
                                companyDetails?.company_name &&
                                companyDetails?.company_name !== '' &&
                                companyDetails?.company_name !== undefined &&
                                companyDetails?.company_name !== null
                            ) ? 
                            companyDetails?.company_name : 'Zomo health') 
                            || 'Zomo health',
                        "First Name": postData?.first_name,
                        type: 5
                    };
                    let emaildata = {
                        sender: ``,
                        receiver: postData?.email,
                        subject: 'Your Account Created',
                        content: emailDetails,
                        template: templateNewText
                    }
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                }
            }
            if (appConstant.ROLE.BROKERADMIN == req?.tokenUser?.role_id) {
                message = postData?.role_id == appConstant.ROLE.REGIONALADMIN ?
                    'The Regional registered successfully.' : (
                        postData?.role_id == appConstant.ROLE.BROKER ?
                            'The Broker registered successfully.'
                            : 'The Broker Admin registered successfully.'
                    )
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: { user_id: createdUser['id'] },
                message: await this.translatorService.frontendReadTranslation(req.lang, message || 'The User registered successfully.'),
            });
        } catch (error) {
            if (file && file.fieldname === 'profile_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id };
            this.commonFileService.addMembershipCodeCondition(req, where);
            const recordDetails = await this.userService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            } 
            await this.userService.update({ id: postData?.id }, { status: 2, username: recordDetails.username + '__DELETED' + `${moment().unix()}`, email: recordDetails.email + '__DELETED' + `${moment().unix()}`});
            this.activityLogService.create(recordDetails, { status: 2, username: recordDetails.username + '__DELETED' + `${moment().unix()}`, email: recordDetails.email + '__DELETED' + `${moment().unix()}`}, tableConstant.TBL_USERS, req.tokenUser?.id, 'delete');
            const settingDetails = await this.userSettingsService.findOne({ user_id: postData?.id });
            await this.userSettingsService.update({ user_id: postData?.id },{});
            this.activityLogService.create(recordDetails, { jobtitle: settingDetails }, tableConstant.TBL_USERS, req.tokenUser?.id, 'delete');
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
    @UseInterceptors(
        FileInterceptor('profile_image', {
            limits: { fileSize: 5 * 1024 * 1024 },
            storage: diskStorage({
                destination: `${appConstant.USER_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
        AccessGuard
    )
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateUserInput,
        @UploadedFile() file: Express.Multer.File,
    ) {
        try {
            let message = 'The Profile has been updated successfully';
            let stopmailsend = postData?.stopmailsend ?? 0;
            delete postData?.stopmailsend;
            if (!postData?.id) {
                if (
                    file &&
                    file.fieldname === 'profile_image' &&
                    file.filename
                ) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id };
            this.commonFileService.addMembershipCodeCondition(req, where);
            let  recordDetails: any = await this.userService.findOne(where);
            if (!recordDetails) {
                if (
                    file &&
                    file.fieldname === 'profile_image' &&
                    file.filename
                ) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if (Object.keys(postData).length === 2 && postData?.hasOwnProperty('id') && postData?.hasOwnProperty('status') && postData?.status != recordDetails.status) {
                message = postData?.status === 1 ? 'This user is activated successfully' : 'This user is deactivated successfully';
                if (appConstant.ROLE.BROKERADMIN == req.tokenUser?.role_id) {
                    if (recordDetails?.role_id == appConstant.ROLE.REGIONALADMIN) {
                        message = postData?.status === 1 ? 'This Regional Admin is activated successfully' : 'This Regional Admin is deactivated successfully';
                    }
                    else if (recordDetails?.role_id == appConstant.ROLE.BROKER) {
                        message = postData?.status === 1 ? 'This Broker is activated successfully' : 'This Broker is deactivated successfully';
                    } else {
                        message = postData?.status === 1 ? 'This Broker Admin is activated successfully' : 'This Broker Admin is deactivated successfully';
                    }
                }
            }
            if (postData?.email) {
                postData.email = postData?.email.toLowerCase();
                const emailCheck = await this.userService.findOne({
                    id: Not(postData?.id),
                    email: postData?.email,
                    status: Not(2)
                });
                if (emailCheck) {
                    if (
                        file &&
                        file.fieldname === 'profile_image' &&
                        file.filename
                    ) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'ERR_USER_EMAIL_EXIST',
                        ),
                    );
                }
            }
            const companyDetails = await this.companyService.findOne({ id: recordDetails.org_id, deleted: 0, status: 1 },[tableConstant?.COMPANIES?.TBL_COMPANY_SETTINGS],['company','companySetting']);
            if((postData?.password && postData?.password != '') || (postData?.new_password && postData?.new_password != '')){
                message = 'Password Updated Successfully';
                postData.password = postData?.password || postData?.new_password;
                if(recordDetails.new_password){
                    let isMatch = await argon2.verify(Buffer.from(recordDetails.new_password, 'base64').toString('ascii'), postData?.password);
                    if(isMatch) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Make sure your new password is different than your current password','/LC_MESSAGES/Common/LoginPopup','static'));
                    }
                }
                postData.new_password = postData?.password;
                delete postData?.password;
                let encoded = this.commonService.generateMD5(Date.now() + Math.random().toString());
                await this.userService.update(where, {activation_key: encoded});
                let passwordEncrypt = this.commonService.passwordEncrypt(`${recordDetails.code}:::::${recordDetails.id}:::::${postData?.new_password}`);
                await this.commonService.makeCurlRequest('POST',process.env.PASSWORDENCRYPTION, {encrypted_assertion: passwordEncrypt},{'Authorization': `Bearer ${encoded}`,'Content-Type': 'application/x-www-form-urlencoded'});
            }
            if ((postData?.username && (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id)) || (postData?.username && companyDetails && companyDetails?.companySetting?.lock_username == 0)) {
                message = 'Username Updated Successfully';
                if(postData?.username == recordDetails.username){
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'Make sure your new username is different than your current username',
                        ),
                    );
                }
                const emailUName = await this.userService.findOne({
                    id: Not(postData?.id),
                    username: postData?.username,
                    status: Not(2)
                });
                if (emailUName) {
                    if (
                        file &&
                        file.fieldname === 'profile_image' &&
                        file.filename
                    ) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'ERR_USERNAME_EXIST',
                        ),
                    );
                }
                if(postData?.password || postData?.new_password){
                    message = await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'Username and Password Updated Successfully',
                        '/LC_MESSAGES/Common/LoginPopup',
                        'static'
                    );
                }
            }
            else{
                if(postData?.username && companyDetails && companyDetails?.companySetting?.lock_username == 1){
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'You are not allowed to change your username',
                        ),
                    );
                }
            }
            if (postData?.gender) {
                postData.gender = Gender[postData?.gender.toLowerCase()];
            }
            if (postData?.on_insurance_plan) {
                postData.on_insurance_plan =
                YesNo[postData?.on_insurance_plan.toUpperCase()];
            }
            postData.date_of_hire = (postData.date_of_hire === '' || postData.date_of_hire === 'undefined' || postData.date_of_hire === undefined || postData.date_of_hire === 'null' || postData.date_of_hire === null || (typeof postData.date_of_hire === 'string' && postData.date_of_hire.trim() === '')) ? recordDetails?.date_of_hire ?? null : postData.date_of_hire;
            if (file && file.fieldname === 'profile_image' && file.filename) {
                await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: recordDetails.profile_image}));
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = this.commonFileService.generateFileName('profileimages', postData['id'].toString(), 'proimg_', file.originalname.split('.')[file.originalname.split('.').length - 1])
                let filedata = await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['profile_image'] = file.filename;
            }
            if (postData['securitycode'] && postData['securitycode'] != '') {
                postData['securitycode'] = Buffer.from(postData['securitycode']).toString('base64');
            }
            postData.updated_by = req.tokenUser?.id;
            postData.id = Number(postData?.id);
            delete postData?.autouser;
            if(postData?.location == ''){
                delete postData?.location
            }
            await this.userService.update(where, postData);
            if(recordDetails?.role_id == appConstant.ROLE.CLIENTENGAGEMENTMANAGER || postData?.role_id == appConstant.ROLE.CLIENTENGAGEMENTMANAGER){
                const orglist = await this.clientManagerAssignService.listRecord({user_id: postData?.id, status: Not(2)},null,['clientManager.id','company.id']);
                const removedOrgs = postData?.assign_org.length ? orglist?.map((e) => e['company'].id.toString()).filter(element => !postData?.assign_org.includes(element)) : [];
                const addedOrgs = orglist.length ? postData?.assign_org?.split(',')?.filter(element => !orglist.map((e) => e['company'].id.toString()).includes(element)) : orglist.length == 0 && postData?.assign_org.length ? postData?.assign_org : [];
                for(let org_id of addedOrgs){
                    const check = await this.clientManagerAssignService.findOne({org_id: org_id, user_id: postData['id']});
                    if(check){
                        await this.clientManagerAssignService.update({id: check.id}, {status: 1});
                    }
                    else{
                        await this.clientManagerAssignService.save({org_id: org_id, user_id: postData['id'], status: 1});
                    }
                }
                for(let org_id of removedOrgs){
                    await this.clientManagerAssignService.update({org_id: org_id, user_id: postData['id']}, {status: 2});
                }
            }
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_USERS, req.tokenUser?.id);
            if((!stopmailsend || stopmailsend == 0) && req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN){
                const templateText = await this.communicationTemplateTextService.findOne({org_id: In([postData?.org_id,0]), type: 21});
                let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                let emaildata = {
                    sender: ``,
                    receiver: recordDetails.email,
                    subject: `Your account has been updated`,
                    content: {'Company Name': companyDetails.company_name, "First Name": recordDetails.first_name, type: 21},
                    template: templateNewText
                }
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
            }
            if(postData?.['profile_image']){
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: postData?.['profile_image'] }));
                if(!fileData){
                    postData['profile_image'] = '';
                }
                else{
                    postData['profile_image'] = postData['profile_image'].includes('profileimages') ? S3_URL + postData['profile_image'] : '';
                }
            }
            if (postData?.gender) {
                postData.gender = Object.keys(Gender).find(key => Gender[key] === postData?.gender);
            }
            if(postData.timezone){
                let timezoneData = await lastValueFrom(this.timezoneMicroservice.send({ cmd: 'find_postcode' }, {}));
                postData.timezone = await timezoneData.find((e) => e.timezone_name == postData.timezone);
            }
            if(postData.location){
                postData['Location'] = await this.locationService.findOne({ id: postData.location, deleted: 0 },['location.id','location.location_name']) as any;
            }
            if(postData?.popup_status != undefined || postData?.popup_status != null){
                await this.userSettingsService.update({ user_id: postData?.id },{popup_status: postData?.popup_status});
            }
            if(postData.preferred_lang){
                postData['preferred_language'] = await this.languagesService.findOne({ id: postData.preferred_lang });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: postData,
                message: await this.translatorService.frontendReadTranslation(req.lang, message, `/LC_MESSAGES/Dashboard/Profile`,`static`),
            });
        } catch (error) {
            if (file && file.fieldname === 'profile_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by.includes('user') ? postData?.order_by : `user.${postData?.order_by}` : 'user.id';
            let where = `user.status = 1`;
            /* type = 3 for email user listing */
            if (postData?.type == 3) {
                let roleId = req.tokenUser?.role_id;
                let userId = req.tokenUser?.id;
                let memberShipCode = '';
                if (roleId == appConstant.ROLE.GLOBALCOACH) {
                    // remain
                } else if (roleId == appConstant.ROLE.COACH) {
                    // remain
                } else {
                    memberShipCode = req.tokenUser?.membership_code;
                }
                if (postData?.role_id) {
                    where += ` AND user.role_id IN (${postData?.role_id})`;
                } else {
                    where += ` AND user.role_id NOT IN ("2","11","19","20")`;
                }
                where += ` AND user.role_id != ${appConstant.ROLE.ADMIN} AND user.id != ${userId} AND ( user.role_id IN ("20", "19") OR user.membership_code IN ('${memberShipCode}') )`;
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['full_name', 'email', 'username', 'code']);
                }
                let resultedData: any = await this.userService.usersList(
                    where,
                    ['id', 'first_name', 'last_name', 'username', 'CONCAT(first_name, " ", last_name) AS full_name', 'email', 'code'],
                    { [orderBy]: order }
                );
                const resultDataFinal = resultedData.map(user => ({
                    id: user.id,
                    full_name: `${user.full_name} :: ${user.email}`,
                }));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultDataFinal,
                    message: 'success',
                });
            }
            /* org wise user listing only specific field and table */
            if (postData?.type == 2) {
                if (postData?.org_id) {
                    where += ` AND user.org_id = ${postData?.org_id}`;
                }
                if (postData?.search_str) {
                    where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'full_name');
                }
                if (postData?.role_id && postData?.role_id.length > 0) {
                    const roles = Array.isArray(postData?.role_id) ? postData?.role_id : JSON.parse(postData?.role_id);
                    where += ` AND(user.role_id IN(${roles.filter((id) => id !== appConstant.ROLE.ADMIN)}))`;
                }
                let resultedData: any = await this.userService.usersList(where,['id','first_name','last_name','username','CONCAT(first_name, " ", last_name) AS full_name'],{ [orderBy]: order });
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            if (postData?.location_id) {
                where += ` AND user.location IN (${postData?.location_id})`;
            }
            if (postData?.department_id) {
                where += ` AND user.department_id IN (${postData?.department_id})`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'full_name');
            }
            if (postData?.role_id && postData?.role_id.length > 0) {
                const roles = Array.isArray(postData?.role_id)
                    ? postData?.role_id
                    : JSON.parse(postData?.role_id);
                if(roles.includes(appConstant.ROLE.COACH) || roles.includes(appConstant.ROLE.GLOBALCOACH)){
                    let whereInner = `user.role_id IN(${roles.filter((id) => id !== appConstant.ROLE.ADMIN)})`;
                    if(roles.includes(appConstant.ROLE.ORGADMIN)){
                        whereInner = `((user.org_id in(${postData?.org_id}) AND user.role_id = ${appConstant.ROLE.ORGADMIN}) OR (user.role_id IN(${roles.filter((id) => ![appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN].includes(id))})))`;
                    }
                    let data = await this.userService.listRecord(whereInner, { [orderBy]: order },['user.id']);
                    if(data && data.length){
                        where += ` AND(user.id IN(${data.map(ele => ele.id).join(',')}))`;
                    }
                }
                else{
                    where += ` AND(user.role_id IN(${roles.filter((id) => id !== appConstant.ROLE.ADMIN)}))`;
                }
            }
            else{
                where += ` AND(user.role_id NOT IN(${appConstant.ROLE.ADMIN}))`
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND user.org_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
                }
                else{
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: [],
                        message: 'success',
                    });
                }
            }
            if (postData?.org_id && !where.includes('user.id Not IN') && !where.includes(`user.role_id IN(${appConstant.ROLE.CLIENTENGAGEMENTMANAGER}`) && !where.includes(`user.role_id IN(${appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER}`) && (appConstant.ROLE.ADMIN != req.tokenUser?.role_id && ![2, 16].some(role => postData?.role_id.includes(role))) || (postData?.org_id && [appConstant.ROLE.ORGADMIN,appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id))) {
                if(postData?.role_id && postData?.role_id.length > 0 && [appConstant.ROLE.ORGADMIN,appConstant.ROLE.COACH,appConstant.ROLE.GLOBALCOACH].every(role => postData?.role_id?.includes(role))){
                }
                else{
                    where += ` AND user.org_id = ${postData?.org_id}`;
                }
            }           
            if ([appConstant.ROLE.WCH].includes(req.tokenUser?.role_id) && !postData?.role_id) {
                const user = req.tokenUser;
                const userList = await this.userService.usersDataWellness(user, `user.role_id != 1 AND user.id != ${user.id} AND user.membership_code = '${user['membership_code']}' AND user.status =1`);
                if (!userList || userList.length == 0) {
                    where += ` AND user.id = 0`; 
                }else{
                    where += ` AND user.id IN (${userList.map(ele => ele.id).join(',')})`; 
                }
            }
            if(postData?.role_id && postData?.org_id && (postData?.type == 1))
            {
                let user = req.tokenUser;
                let where = {
                    org_id:postData?.org_id,
                    role_id:In(postData?.role_id),
                }
                if(postData?.subtype && postData?.subtype == 'report'){
                    if(postData?.status != undefined && postData?.status != null){
                        where['status'] = postData?.status;
                    }
                }
                else{
                    where['status'] = 1;
                }
                if (user.role_id == appConstant.ROLE.WCH) {
                    const userwellnessList = await this.userService.usersDataWellness(user, `user.role_id != 1 AND user.id != ${user.id} AND user.membership_code = '${user['membership_code']}' ${(postData?.subtype && postData?.subtype == 'report') ? (postData?.status != undefined && postData?.status != null) ? ` AND user.status = ${postData?.status}` : '' : ' AND user.status =1'}`);
                    if (!userwellnessList || userwellnessList.length == 0) {
                        where['id'] = 0;
                    } else {
                        let userWellnessIds = userwellnessList?.map(ele => ele.id);
                        where['id'] = In(userWellnessIds);
                    }
                }
                let resultedData = await this.userService.findAllUserRecord(where,['id','first_name','last_name','code']);
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(UserDto, resultedData, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            if( postData?.role_id && appConstant.ROLE.BROKERADMIN == req.tokenUser?.role_id && postData?.type == 1){
                let where = {
                    role_id:In(postData?.role_id),
                    status:1
                }
                let resultedData = await this.userService.findAllUserRecord(where,['id','first_name','last_name','code']);
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(UserDto, resultedData, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            let resultedData: any = await this.userService.listRecord(where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserDto, resultedData, req.lang)
            );
            if(postData?.location_id && postData?.location){
                let locationData = resultedData[0]?.['location_id'];
                if(resultedData.length == 0){
                    locationData = await this.locationService.findOne({ id: postData?.location_id, deleted: 0 },['location.id','location.location_name']);
                }
                resultedData = {
                    location: locationData,
                    list: resultedData
                };
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

    @UseGuards(AccessGuard)
    @Get('get-profile')
    async getProfile(@Req() req: Request, @Res() res: Response) {
        try {
            const where = { id: req.tokenUser?.id };
            this.commonFileService.addMembershipCodeCondition(req, where);
            let recordDetails: any = await this.userService.getProfile(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if(!recordDetails['settings']){
                recordDetails['settings'] = await this.userSettingsService.save({ user_id: recordDetails['id'], wphone: '', cphone: '', hphone: '' });
            }
            recordDetails['settings'] = <any>(
                await this.commonArrayService.formatToDto(UserSettingsDto, recordDetails['settings'],req.lang)
            );
            if(recordDetails?.['profile_image']){
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: recordDetails?.['profile_image'] }));
                if(!fileData){
                    recordDetails['profile_image'] = '';
                }
            }
            let dob = recordDetails.dob
            let dateOfHire = recordDetails.date_of_hire
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(UserProfileDto, recordDetails,req.lang)
            );
            /* date translation issue fix */
            recordDetails.dob = dob
            recordDetails.date_of_hire = dateOfHire
            let stateData = await this.companyService.stateList(recordDetails['settings']?.state);
            if(recordDetails['settings']?.state){
                let state = stateData.find(ele => ele.statecode == recordDetails['settings']?.state || ele.state == recordDetails['settings']?.state);
                recordDetails['settings'].state = state?.['state'];
                recordDetails['settings']['statecode'] = state?.['statecode'];
            }
            if(recordDetails.timezone){
                let timezoneData = await lastValueFrom(this.timezoneMicroservice.send({ cmd: 'find_postcode' }, {}));
                recordDetails.timezone = await timezoneData.find((e) => e.timezone_name == recordDetails.timezone);
            }
            if(recordDetails?.department && req?.lang != 'eng'){
                let deptName = await this.translatorService.frontendReadTranslation(req.lang,`department_name_${recordDetails?.department?.id}`, `/LC_MESSAGES/OrgAdmin/Department/${recordDetails?.org_id}/${recordDetails?.department?.id}`,`dynamic`);
                recordDetails.department['name'] = (deptName == '' || deptName == `department_name_${recordDetails?.department?.id}`) ? recordDetails?.department?.name : deptName;
            }
            if(recordDetails?.locations && req?.lang != 'eng'){
                if (recordDetails?.locations?.location_name) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${recordDetails?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${recordDetails?.org_id}/${recordDetails?.locations['id']}`, `dynamic`);
                    recordDetails.locations.location_name = (customName == '' || customName == `location_name_${recordDetails?.locations['id']}`) ? recordDetails?.locations['location_name'] : customName;
                }
                if (recordDetails?.locations?.address1) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${recordDetails?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${recordDetails?.org_id}/${recordDetails?.locations['id']}`, `dynamic`);
                    recordDetails.locations.address1 = (customName == '' || customName == `location_address1_${recordDetails?.locations['id']}`) ? recordDetails?.locations['address1'] : customName;
                }
                if (recordDetails?.locations?.address2) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${recordDetails?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${recordDetails?.org_id}/${recordDetails?.locations['id']}`, `dynamic`);
                    recordDetails.locations.address2 = (customName == '' || customName == `location_address2_${recordDetails?.locations['id']}`) ? recordDetails?.locations['address2'] : customName;
                }
                if (recordDetails?.locations?.lname) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${recordDetails?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${recordDetails?.org_id}/${recordDetails?.locations['id']}`, `dynamic`);
                    recordDetails.locations.lname = (customName == '' || customName == `location_lname_${recordDetails?.locations['id']}`) ? recordDetails?.locations['lname'] : customName;
                }
                if (recordDetails?.locations?.city) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${recordDetails?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${recordDetails?.org_id}/${recordDetails?.locations['id']}`, `dynamic`);
                    recordDetails.locations.city = (customName == '' || customName == `location_city_${recordDetails?.locations['id']}`) ? recordDetails?.locations['city'] : customName;
                }
                if (recordDetails?.locations?.state) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${recordDetails?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${recordDetails?.org_id}/${recordDetails?.locations['id']}`, `dynamic`);
                    recordDetails.locations.state = (customName == '' || customName == `location_state_${recordDetails?.locations['id']}`) ? recordDetails?.locations['state'] : customName;
                }
                if (recordDetails?.locations?.country) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${recordDetails?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${recordDetails?.org_id}/${recordDetails?.locations['id']}`, `dynamic`);
                    recordDetails.locations.country = (customName == '' || customName == `location_country_${recordDetails?.locations['id']}`) ? recordDetails?.locations['country'] : customName;
                }
            }
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

    @UseGuards(AccessGuard)
    @Post('reset-password')
    async resetPassword(@Req() req: Request, @Res() res: Response, @Body() postData: CreateResetPasswordInput) {
        try {
            if (req.tokenUser?.role_id != appConstant.ROLE.ORGADMIN && req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id && appConstant.ROLE.WCH != req.tokenUser?.role_id) {
                if (!postData?.new_password && !postData?.old_password) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING',),);
                }
            }
            const where = { id: postData?.user_id ? postData?.user_id : req.tokenUser?.id };
            let recordDetails = await this.userService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if(([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.ORGADMIN,appConstant.ROLE.CLIENTENGAGEMENTMANAGER,appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) && !postData?.new_password && !postData?.old_password){
                let update: any = { password: '', new_password: '', updated_by: req.tokenUser?.id};
                // const companyDetails = await this.companyService.findOne({ id: recordDetails.org_id, deleted: 0, status: 1 });
                if(postData?.email && postData?.email == 1){
                    let passkey= await this.commonService.generatePassKey();
                    let encoded = this.commonService.generateMD5(Date.now() + Math.random().toString());
                    update = { new_password: passkey, activation_key: encoded, updated_by: req.tokenUser?.id};
                    await this.userService.update(where, update);
                    this.activityLogService.create(recordDetails, update, tableConstant.TBL_USERS, req.tokenUser?.id, 'reset-password');
                    let passwordEncrypt = this.commonService.passwordEncrypt(`${recordDetails.code}:::::${recordDetails.id}:::::${passkey}`);
                    await this.commonService.makeCurlRequest('POST',process.env.PASSWORDENCRYPTION, {encrypted_assertion: passwordEncrypt},{'Authorization': `Bearer ${encoded}`,'Content-Type': 'application/x-www-form-urlencoded'});
                    let templateText = await this.communicationTemplateTextService.findOne({org_id:In([recordDetails.org_id,0]),type:19}) 
                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                    let emaildata = {
                        sender: `Zomo Health<noreply@${process.env.DOMAIN}>`,
                        receiver: recordDetails.email,
                        subject: 'Reset Password ',
                        content: { Username: recordDetails.username, Password: passkey, 'Company Name': recordDetails['company'].company_name, "First Name": recordDetails.first_name, type: 19 },
                        template: templateNewText
                    }
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                }
                else {
                    await this.userService.update(where, update);
                    this.activityLogService.create(recordDetails, { new_password: '' }, tableConstant.TBL_USERS, req.tokenUser?.id, 'reset-password');
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, postData?.email ? 'Password has been reset & emailed to User.' : 'Password has been reset successfully')
                });
            }
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id && recordDetails.new_password && recordDetails.new_password != ''){
                const isMatch = await argon2.verify(Buffer.from(recordDetails.new_password, 'base64').toString('ascii'), postData?.old_password || postData?.new_password);
                if (!isMatch) {
                    // throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Password could not be changed. Please enter the correct old password."));
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Passwords do not match. Please, try again."));
                }
            }
            let encoded = this.commonService.generateMD5(Date.now() + Math.random().toString());
            postData['activation_key'] = encoded;
            await this.userService.update(where, { new_password: postData?.new_password, updated_by: req.tokenUser?.id, activation_key:  encoded});
            let passwordEncrypt = this.commonService.passwordEncrypt(`${recordDetails.code}:::::${recordDetails.id}:::::${postData?.new_password}`);
            await this.commonService.makeCurlRequest('POST',process.env.PASSWORDENCRYPTION, {encrypted_assertion: passwordEncrypt},{'Authorization': `Bearer ${encoded}`,'Content-Type': 'application/x-www-form-urlencoded'});
            this.activityLogService.create(recordDetails, { new_password: postData?.new_password }, tableConstant.TBL_USERS, req.tokenUser?.id, 'reset-password');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Password has been changed successfully')
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
    @UseGuards(AccessGuard)
    @Post('reset-username')
    async resetUsername(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserInput) {
        try {
            if (!postData?.id && !postData?.username) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING',),);
            }
            const where = { id: postData?.id ? postData?.id : req.tokenUser?.id };
            let recordDetails = await this.userService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            const companyDetails = await this.companyService.findOne({ id: recordDetails.org_id, deleted: 0, status: 1 },[tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],['company','companySetting']);
            if ((postData?.username && (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id)) || (postData?.username && companyDetails && companyDetails?.companySetting?.lock_username == 0)) {
                const userName = await this.userService.findOne({
                    username: postData?.username,
                });
                if (userName) {
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'The username has already been taken.',
                        ),
                    );
                }
            }
            else{
                if(postData?.username && companyDetails && companyDetails?.companySetting?.lock_username == 1){
                    throw Error(
                        await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'You are not allowed to change your username',
                        ),
                    );
                }
            }
            await this.userService.update(where, { username: postData?.username });
            this.activityLogService.create(recordDetails, { username: postData?.username }, tableConstant.TBL_USERS, req.tokenUser?.id, 'reset-username');
            recordDetails["username"] = postData?.username;
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Username has been changed successfully.', `/LC_MESSAGES/Dashboard/Profile`,`static`)
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
    @UseGuards(AccessGuard)
    @Post('get-health-plan')
    async getHealthPlan(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING',),);
            }
            const where = `user.org_id IN(${postData?.org_id.split(',')}) AND user.insurance_plan_name is not null AND user.insurance_plan_name != ''`;
            let recordDetails = await this.userService.getHealthPlan(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            const uniqueInsurancePlans = new Set();
            const filteredData = recordDetails.filter(item => !uniqueInsurancePlans.has(item.insurance_plan_name) && uniqueInsurancePlans.add(item.insurance_plan_name));
            
            /*console.log('EmailCampaign HealthPlans =>', filteredData.map((e) => e.insurance_plan_name));*/
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails.length ? filteredData.map((e) => e.insurance_plan_name) : [],
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
    @UseGuards(AccessGuard)
    @Post('generate-passkey')
    async geenratepasskey(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN && req.tokenUser?.role_id != appConstant.ROLE.SUPPORT_LEVEL_1 && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING',),);
            }
            const where = { user_id: postData?.id };
            let recordDetails = await this.userSettingsService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            let passkey= await this.commonService.generatePassKey();
            await this.userSettingsService.update({id: recordDetails['id']}, { otp_key: passkey, otp_created: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'), otp_generated_by:  req.tokenUser?.role_id});
            this.activityLogService.create(recordDetails, { otp_key: passkey, otp_created: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'), otp_generated_by:  req.tokenUser?.role_id}, tableConstant.TBL_USERS, req.tokenUser?.id, 'reset-username');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {passkey},
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
    // API for user champion settings
    /**
     * @api {post} /user/user-champion-settings User Champion Settings
     * @apiName userChampionSettings
    **/
   @UseGuards(AccessGuard)
    @Post('user-champion-settings')
    async userChampionSettings(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try{
            let user = await this.userService.findUserFullRecord(`user.id = ${req.tokenUser?.id} AND user.status = 1`,
                [
                    'user.id',
                    'user.org_id',
                    'user.location',
                    'user.department_id',
                    'user.role_id',
                    'user.code',
                    'user.membership_code',
                    'settings.id',
                    'settings.city',
                    'settings.state',
                    'company.id',
                    'company.company_name',
                    'company.company_logo',
                    'company.company_logo_dark',
                ],
                tableConstant.COMPANIES.TBL_COMPANY
            );
            if (!user) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_NO_RECORD_FOUND',
                    ),
                );
            }
            let wellnessAssignData = await this.userService.usersDataWellness(user, '','','userWise');
            if (!wellnessAssignData) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_NO_RECORD_FOUND',
                    ),
                );
            }
            let userData = Object.create(null);
            if (wellnessAssignData && wellnessAssignData?.length > 0) {
                userData['id'] = user.id;
                userData['org_id'] = user.org_id;
                userData['location'] = user.location;
                userData['department_id'] = user.department_id;
                userData['role_id'] = user.role_id;
                userData['code'] = user.code;
                userData['membership_code'] = user.membership_code;
                let wellnessAssignIds = wellnessAssignData[0]?.['wellnessAssignment']?.map((ele: any) => ele.id);
                let theme_setting = await this.themeSettingsService.findOne({ org_id: In([user.org_id,0]), reference_id: In([0, wellnessAssignIds]) });
                userData['theme_setting'] = theme_setting ? theme_setting : null;
                let logoSet = false;
                let darkLogoSet = false;
                for (const ele of wellnessAssignData[0]?.['wellnessAssignment'] || []) {
                    if (!logoSet) {
                        if (ele?.company_logo && ele.company_logo.includes('champimg_')) {
                            userData['company_logo'] = `${S3_URL}companylogos/${ele.org_id}/${ele.company_logo}`;
                            logoSet = true;
                        } else {
                            userData['company_logo'] =
                                `${S3_URL}companylogos/${ele.org_id}/${user?.['company']?.company_logo}` ||
                                user?.['company']?.company_logo;
                        }
                    }
                    if (!darkLogoSet) {
                        if (ele?.company_logo_dark && ele.company_logo_dark.includes('champimgdark_')) {
                            userData['company_logo_dark'] = `${S3_URL}companylogos/${ele.org_id}/${ele.company_logo_dark}`;
                            darkLogoSet = true;
                        } else {
                            if (user?.['company']?.company_logo_dark && user?.['company']?.company_logo_dark != '' && user?.['company']?.company_logo_dark != null && user?.['company']?.company_logo_dark != undefined) {
                                userData['company_logo_dark'] = `${S3_URL}companylogos/${ele.org_id}/${user?.['company']?.company_logo_dark}`;
                            } else {
                                userData['company_logo_dark'] ='';
                            }
                        }
                    }
                    if (logoSet && darkLogoSet) break;
                }
                userData['company_logo_dark'] = (userData['company_logo_dark'] == '' || userData['company_logo_dark'] == null || userData['company_logo_dark'] == undefined) ? userData['company_logo'] : userData['company_logo_dark'];
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: userData,
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
    @UseGuards(AccessGuard)
    @Post('champions-list')
    async championList(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try{
            if(!postData.membership_code){
                throw new Error(
                    await this.translatorService.frontendReadTranslation( 
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',   
                    ),
                );
            }
            postData = this.commonService.sanitizePayload(postData);
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let where = `user.status = 1 AND user.role_id  = 12 AND user.membership_code = '${postData?.membership_code}'`;
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', 'full_name');
            }
            let resultedData: any = await this.userService.usersList(where, ['id', 'first_name', 'last_name', 'username', 'CONCAT(first_name, " ", last_name) AS full_name'], { [orderBy]: order });
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
}
