import { appConstant, CommonArrayService, CommonService, QuestionnaireUsersDto, QuestionnaireUsersEntity, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import * as moment from "moment";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateQuestionnaireUsersInput,
    DeleteHealthCheckupInput,
    GetOneHealthCheckupInput,
    PaginateWithHealthCheckupInput,
    UpdateQuestionnaireUsersInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuestionnaireUsersService } from './questionnaireusers.service';
import { ListQuestionnaireUsersInput } from './input/listquestionnaireusers.input';
import { FindOptionsWhereProperty } from 'typeorm';
import { promises } from 'dns';
@Controller('health-checkup/questionnaire-users')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuestionnaireUsersController {
    constructor(
        private readonly questionnaireUsersService: QuestionnaireUsersService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthCheckupInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                let where = `a.status = 1 `;
                if (postData?.org_id) {
                    where += ` AND a.org_id = '${postData?.org_id}' `;
                }
                if (postData?.user_id) {
                    where += ` AND a.user_id = '${postData?.user_id}' `;
                }
                if (postData?.start_date && postData?.end_date) {
                    let start_date = moment(postData?.start_date).format('YYYY-MM-DD');
                    let end_date = moment(postData?.end_date).format('YYYY-MM-DD');
                    where += ` AND a.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59' `;
                }
                where += ` AND (user.id IS NOT NULL)`;
                if (postData?.search_str) {
                    if(postData?.search_str == 'Spouse / Domestic Partner') {
                        postData.search_str = 'Spouse';
                    }
                    where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['full_name','user.code','user.email','settings.wphone','settings.hphone','company.company_name','a.created','role.title']);
                }
                const resultedData = await this.questionnaireUsersService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(QuestionnaireUsersDto, resultedData['list'], req.lang)
                );
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuestionnaireUsersInput) {
        try {
            if (!postData?.org_id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.questionnaireUsersService.save({ ...postData });
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuestionnaireUsersInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.questionnaireUsersService.findOne({ id: postData?.id, org_id: postData?.org_id });
            await this.questionnaireUsersService.update({ id: postData?.id, org_id: postData?.org_id }, { ...postData });
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_QUESTIONNAIRE_USERS, req.tokenUser?.id);
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
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.questionnaireUsersService.findOne({
                id: postData?.id,
                org_id: postData?.org_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.questionnaireUsersService.update({ id: postData?.id, org_id: postData?.org_id },{status: 2});
            this.activityLogService.create(recordDetails, { entry_name: recordDetails }, tableConstant.HEALTH_CHECKUP.TBL_HC_QUESTIONNAIRE_USERS, req.tokenUser?.id, 'delete');
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
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                if (!postData?.id || !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                let resultedData = await this.questionnaireUsersService.findOne({ id: postData?.id, org_id: postData?.org_id });
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(QuestionnaireUsersDto, resultedData, req.lang)
                );
                if (postData?.type == 'report') {
                    if(!resultedData['I am a current San Mateo County or Courts employee?']) {
                        resultedData['I am a current San Mateo County or Courts employee?'] = resultedData?.medical_status_one == 1 ? 'Yes' : 'No';
                    }
                    if(!resultedData['I am enrolled in a San Mateo County medical plan?']) {
                        resultedData['I am enrolled in a San Mateo County medical plan?'] = resultedData?.medical_status_two == 1 ? 'Yes' : 'No';
                    }
                    if(!resultedData[`I am a dependent covered under another San Mateo County or Courts employee's medical plan?`]) {
                        resultedData[`I am a dependent covered under another San Mateo County or Courts employee's medical plan?`] = resultedData?.participation_wp == 1 ? 'Yes' : 'No';
                    }
                    if(!resultedData['No, = Did not complete 3 Different Wellness Elective Activities']) {
                        resultedData['No, = Did not complete 3 Different Wellness Elective Activities'] = resultedData?.participation_wp_data == 1 ? 'Yes' : 'No';
                    }
                    if(!resultedData['1=Waived San Mateo County medical insurance and/or not enrolled in San Mateo County medical plan']) {
                        resultedData['1=Waived San Mateo County medical insurance and/or not enrolled in San Mateo County medical plan'] = resultedData?.wellness_score_one == 1 ? 'Yes' : 'No';
                    }
                    if(!resultedData['0=Did not complete Online Health Assessment']) {
                        resultedData['0=Did not complete Online Health Assessment'] = resultedData?.wellness_score_two == 1 ? 'Yes' : 'No';
                    }
                }
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    // API for List all questionnaire users
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListQuestionnaireUsersInput) {
        try {
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                let where = {};
                if (postData?.id) {
                    where['id'] = postData?.id;
                }
                if (postData?.org_id) {
                    where['org_id'] = postData?.org_id;
                }
                if (postData?.user_id) {
                    where['user_id'] = postData?.user_id;
                }
                let fields: (keyof QuestionnaireUsersEntity)[] =
                    ['id', 'org_id', 'user_id', 'medical_status_one', 'medical_status_two', 'participation_wp', 'participation_wp_data', 'wellness_score_one', 'wellness_score_two'];
                let resultedData = await this.questionnaireUsersService.listRecords(where, { id: 'DESC' }, fields);
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(QuestionnaireUsersDto, resultedData, req.lang)
                );
                if (postData?.type == 'report') {
                    await Promise.all(
                        resultedData?.map(async (ele) => {
                            ele['I am a current San Mateo County or Courts employee?'] = ele?.medical_status_one == 1 ? 'Yes' : 'No';
                            ele['I am enrolled in a San Mateo County medical plan?'] = ele?.medical_status_two == 1 ? 'Yes' : 'No';
                            ele[`I am a dependent covered under another San Mateo County or Courts employee's medical plan?`] = ele?.participation_wp == 1 ? 'Yes' : 'No';
                            ele['No, = Did not complete 3 Different Wellness Elective Activities'] = ele?.participation_wp_data == 1 ? 'Yes' : 'No';
                            ele['1=Waived San Mateo County medical insurance and/or not enrolled in San Mateo County medical plan'] = ele?.wellness_score_one == 1 ? 'Yes' : 'No';
                            ele['0=Did not complete Online Health Assessment'] = ele?.wellness_score_two == 1 ? 'Yes' : 'No';
                        })
                    );
                }
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
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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