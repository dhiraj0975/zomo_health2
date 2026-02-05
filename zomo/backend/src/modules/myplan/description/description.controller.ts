import { appConstant, CommonArrayService, CommonFileService, CommonService, MyPlanDescriptionDto, tableConstant } from '@common-constants';
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
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateDescriptionInput,
    DeleteMyPlanInput,
    GetOneMyPlanInput, PaginateWithCompanyInput,
    UpdateDescriptionInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { MyPlanDescriptionService } from './description.service';
@Controller('my-plan/description')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanDescriptionController {
    constructor(
        private readonly myPlanDescriptionService: MyPlanDescriptionService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `md.status != '2' AND company.status != '2'`;
            let tableData = [tableConstant.COMPANIES.TBL_COMPANY,tableConstant.TBL_USERS];
            let field = ['company.company_name','company.id','md.id','md.organization_id','md.module_id','md.status','md.description','users.id','users.username','users.first_name','users.last_name'];
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                where += ` AND md.created_by = ${req.tokenUser?.id}`;
                tableData = [tableConstant.COMPANIES.TBL_COMPANY,tableConstant.COACH.TBL_CO_COACHES];
                field = ['company.company_name','company.id','md.id','md.organization_id','md.module_id','md.status','md.description'];
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND md.organization_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
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
                where += ` AND (company.company_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
            }
            const resultedData = await this.myPlanDescriptionService.paginateList(
                field,
                where,
                postData,
                tableData
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MyPlanDescriptionDto, resultedData['list'], req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDescriptionInput) {
        try {
            postData.created_by = req.tokenUser?.id;
            if (!postData?.organization_id || !postData?.created_by || !this.commonService.isValidNumber(postData?.module_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.myPlanDescriptionService.findOne({ module_id: postData?.module_id, organization_id: postData?.organization_id, status: Not(2)});
            if (recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DESCRIPTION_ALREADY_EXIST"));
            }
            await this.myPlanDescriptionService.save({...postData});
            let dynamicData= { [`description_${postData['module_id']}`]: postData?.description };
            await this.translatorService.DynamicEngJsonData('MyPlan',postData?.organization_id,dynamicData,'Add','PlanDescription')
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateDescriptionInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanDescriptionService.findOne({ id: postData?.id});
            await this.myPlanDescriptionService.update({ id: postData?.id},{...postData});
            let dynamicData= { [`description_${recordDetails['module_id']}`]: recordDetails?.description };
            await this.translatorService.DynamicEngJsonData('MyPlan',recordDetails?.organization_id,dynamicData,'Edit','PlanDescription')
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_DESCRIPTION, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteMyPlanInput) {
        try {
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanDescriptionService.findOne({
                id: postData?.id,
                organization_id: postData?.organization_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanDescriptionService.update({id: postData?.id, organization_id: postData?.organization_id},{status:2});
            if (recordDetails) {
                const titleKey = `description_${recordDetails.module_id}`;
                const dynamicData = {
                    [titleKey]: titleKey,
                };
                await this.translatorService.DynamicEngJsonData(
                    'MyPlan',
                    recordDetails.organization_id,
                    dynamicData,
                    'Delete',
                    'PlanDescription'
                );
            }
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_DESCRIPTION, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneMyPlanInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id};
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let resultedData: any = await this.myPlanDescriptionService.findOne(where,{ id: 'DESC' },[tableConstant.COMPANIES.TBL_COMPANY]);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanDescriptionDto, resultedData, req.lang)
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
}