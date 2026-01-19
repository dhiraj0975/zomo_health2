import { appConstant, CommonArrayService, CommonDateService, CommonService, DownloadFormsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as crypto from 'crypto';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { DepartmentService } from 'src/modules/company/departments/department.service';
import { LocationService } from 'src/modules/company/locations/location.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { UserService } from 'src/modules/user/user/user.service';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateDownloadFormsInput,
    DeleteHealthCheckupInput,
    GetOneHealthCheckupInput,
    PaginateWithCompanyInput,
    UpdateDownloadFormsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FormInstructionsService } from '../forminstructions/forminstructions.service';
import { DownloadFormsService } from './downloadforms.service';
const secretKey = Buffer.from(process.env.SECRET_KEY_PROD.slice(0, 32));
const iv = process.env.SECRET_KEY_PROD;
const path = require('path');
@Controller('health-checkup/download-forms')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class DownloadFormsController {
    constructor(
        private readonly downloadFormsService: DownloadFormsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
        @Inject('CRON_SERVICE') private cronMicroservice: ClientProxy,
        @Inject('COMMON_SERVICE') private commonMicroservice: ClientProxy,
        private readonly formInstructionsService: FormInstructionsService,
    ) { }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDownloadFormsInput) {
        try {
            if (!postData?.org_id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN,appConstant.ROLE.BROKERADMIN,appConstant.ROLE.REGIONALADMIN,appConstant.ROLE.BROKER].includes(req.tokenUser?.role_id)) {
                let forminstructions = await this.formInstructionsService.findOne({ company_id: postData?.org_id, status: Not(5) });
                if (!forminstructions) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORM_INSTRUCTION_NOT_FOUND"));
                } 
                let daterange = '';
                let condition: string = `user.membership_code = '${postData?.membership_code}' AND user.id != ${req.tokenUser?.id} AND user.role_id IN(2,16) AND user.status = 1`;
                let UserCnt = 0;
                if (postData?.displayoption == 0) {
                    const startDate = this.commonDateService.DateTimeFormat(postData?.fstart_date, 'MM-DD-YYYY');
                    const endDate = this.commonDateService.DateTimeFormat(postData?.fend_date, 'MM-DD-YYYY');
                    const currentDate = this.commonDateService.DateTimeFormat('now', 'MM-DD-YYYY');
                    daterange = ` AND DATE_FORMAT(STR_TO_DATE(REPLACE(user.date_of_hire, "/", "-"), "%m-%d-%Y"), "%m-%d-%Y") >= "${startDate}" AND DATE_FORMAT(STR_TO_DATE(REPLACE(user.date_of_hire, "/", "-"), "%m-%d-%Y"), "%m-%d-%Y") <= "${endDate}" AND DATE_FORMAT(STR_TO_DATE(REPLACE(user.date_of_hire, "/", "-"), "%m-%d-%Y"), "%m-%d-%Y") <= "${currentDate}"`;
                    condition += `${daterange}`;
                    const users = await this.userService.countUsers(condition, ['id']);
                    UserCnt = users;
                } else {
                    const users = await this.userService.countUsers(condition, ['id']);
                    UserCnt = users;
                }
                if (UserCnt == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_RECORD_FOUND"));
                } else {
                    delete postData?.displayoption;
                    delete postData?.fstart_date
                    delete postData?.fend_date;
                    delete postData?.UserCnt;
                    postData.condition = daterange;
                    postData.email = postData?.email ?? req.tokenUser?.email;
                    postData.status = 0;
                    postData.which_system = 2;
                }
                if (postData) {
                    let FormdownloadRequest = await this.downloadFormsService.countdownloadforms(postData, ['id']);
                    if (FormdownloadRequest == 0) {
                        postData.request_date = this.commonDateService.getTodayDate().format('YYYY-MM-DD');
                        await this.downloadFormsService.save({ ...postData });
                    } else {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "REQUEST_PENDING"));
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "CREATE_REQUEST_SUCCESS")
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateDownloadFormsInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.downloadFormsService.findOne({ id: postData?.id, user_id: postData?.user_id });
            await this.downloadFormsService.update({ id: postData?.id, user_id: postData?.user_id }, { ...postData });
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_DOWNLOAD_FORMS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteHealthCheckupInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.downloadFormsService.findOne({
                id: postData?.id,
                user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.downloadFormsService.update({ id: postData?.id, user_id: postData?.user_id }, { status: 2 });
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.HEALTH_CHECKUP.TBL_HC_DOWNLOAD_FORMS, req.tokenUser?.id, 'delete');
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneHealthCheckupInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData: any = await this.downloadFormsService.findOne({ id: postData?.id, org_id: postData?.org_id });
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (postData?.download_type == 1) {
                let result = {};
                if (resultedData.file_name) {
                    let file = resultedData.file_name;
                    let fileData = await lastValueFrom(this.commonMicroservice.send({ cmd: 'get_file' }, { path: file, userBucket: 'private' }));
                    if (fileData) {
                        result['file'] = file.split('/')[file.split('/').length - 1];
                        result['extention'] = file.split('.')[file.split('.').length - 1];
                        result['ContentType'] = fileData.ContentType;
                        result['encrypted'] = fileData.Body;
                    } else {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILE_NOT_FOUND'));
                    }
                }
                resultedData = result;
            } else {
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(DownloadFormsDto, resultedData, req.lang)
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                let where = ``;
                if (postData?.org_id) {
                    where += `downloadforms.org_id = '${postData?.org_id}' `;
                }
                const resultedData = await this.downloadFormsService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(DownloadFormsDto, resultedData['list'], req.lang)
                );
                const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, iv);
                resultedData.list.forEach(element => {
                    // remove _new_ after changes are made in old system for zip upload in bucket
                    element['download'] = false;
                    if(element.status !=2 && element['file_name']){
                        element['download'] = true;
                    }
                    if (element['form_type'] == 5) {
                        element['form_type_title'] = `Name Wise - ${element['s_employee'] ?? '' }`;
                    } else if (element['form_type'] == 1) {
                        element['form_type_title'] = `Department wise`;
                    } else if (element['form_type'] == 2) {
                        element['form_type_title'] = `Location wise`;
                    } else if (element['form_type'] == 3) {
                        element['form_type_title'] = `Departments by Locations Wise`;
                    } else {
                        element['form_type_title'] = `General`;
                    }
                    if (element['status'] == 0) {
                        element['status_title'] = `In Progress`;
                    } else {
                        element['status_title'] = `Completed`;
                    }
                });
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    @Post('dept-loc-list')
    async deptLocList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if ([appConstant.ROLE.ORGADMIN,appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                let resultedData = {};
                let where: string = `company_id = ${postData?.org_id} AND deleted = 0`;
                if (postData?.location_id) {
                    where += ` AND user.location = ${postData?.location_id}`;
                }
                let department = await this.departmentService.userWiseDepartmentList(where, ['department.id', 'department.dept_name', 'department.code']);
                resultedData['department'] = department ?? [];
                let location = await this.locationService.userWiseLocationList(where, ['location.id', 'location.location_name', 'location.code']);
                resultedData['location'] = location ?? [];
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    @Post('download-forms-process')
    async downloadFormsProcess(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let downloadFormProcess = await lastValueFrom(this.cronMicroservice.send({ cmd: 'downloadProgramFormCron' }, {}));
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
}