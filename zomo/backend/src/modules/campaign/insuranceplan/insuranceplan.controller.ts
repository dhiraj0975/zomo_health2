import { appConstant, CommonArrayService, CommonService, InsurancePlanDto, tableConstant } from '@common-constants';
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
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Like, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    PaginateWithCompanyInput,
} from "../../../input";
import { CreateInsurancePlanInput, UpdateInsurancePlanInput } from './input';
import { InsurancePlanService } from "./insuranceplan.service";
@Controller('incentive/insurance-plan')
@UseGuards(TokenGuard,RoleGuard, AccessGuard)
export class InsurancePlanController {
    constructor(
        private readonly insurancePlanService: InsurancePlanService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly activityLogService: ActivityLogService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
    ) {}
    /*
     * Function to get paginate list of Insurance Plans
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER) ? `insuranceplan.status != 2` : `insuranceplan.status = 1`;
            if(postData?.filter_by?.toLowerCase() == 'organization'){
                const order_by = postData?.order_by;
                const limit = postData?.limit;
                const page = postData?.page;
                postData.page = 1;
                postData.limit = 100;
                delete postData?.order_by;
                const companyData = await this.companyService.paginateList(`company.deleted = 0 AND company.status = 1 AND company.company_name LIKE '%${postData?.search_str}%'`, postData);
                postData.company_id = companyData && companyData.list.length ? companyData.list.map((e)=>e.id).join(',') : ''; 
                postData.order_by = order_by;
                postData.limit = limit;
                postData.page = page;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    postData.company_id = resultedData.map((e)=>e.org_id).join(',');
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
            if (postData?.company_id) {
                where += ` AND insuranceplan.organization_id IN(${postData?.company_id.split(',')})`;
            }
            if (postData?.search_str && postData?.filter_by?.toLowerCase() != 'organization') {
               where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'insuranceplan.plan_name');
            }
            const resultedData = await this.insurancePlanService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(InsurancePlanDto, resultedData['list'], req.lang)
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
    /*
     * Function to get details of Insurance Plan
     * - id and company_id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(2) };
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let ipDetails = await this.insurancePlanService.findOne(where);
            if (!ipDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            ipDetails = <any>(
                await this.commonArrayService.formatToDto(InsurancePlanDto, ipDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: ipDetails,
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
    /*
     * Function to get list of insurance plans
     * - can pass search_str, order_by, order, company_id
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where: any = { status: 1 };
            if (postData?.search_str) {
                where.plan_name = Like('%' + postData?.search_str + '%');
            }
            if (postData?.company_id) {
                where.organization_id = postData?.company_id;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            const result = await this.insurancePlanService.listRecord(where, { [orderBy]: order });
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
    /*
     * Use to create new insurance plan
     * - organization_id, plan_name, status is mandatory params
     */
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateInsurancePlanInput) {
        try {
            if (
                !postData?.organization_id ||
                !postData?.plan_name 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const insPlanCheck = await this.insurancePlanService.findOne({
                plan_name: postData?.plan_name, organization_id: postData?.organization_id, status: Not(2)
            });
            if (insPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INSURANCE_PLAN_NAME_EXIST"));
            }
            await this.insurancePlanService.save(postData);
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
    /*
     * Use to update insurance plan
     * - id and organization_id is mandatory params
     */
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateInsurancePlanInput) {
        try {
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for (const key in postData) {
                if (postData[key] === '') {
                    delete postData[key];
                }
            }
            const where = { id: postData?.id, status: Not(2) };
            const recordDetails = await this.insurancePlanService.findOne(where);
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
            if (postData?.plan_name) {
                const insPlanCheck = await this.insurancePlanService.findOne({
                    id: Not(postData?.id), plan_name: postData?.plan_name, organization_id: postData?.organization_id, status: Not(2)
                });
                if (insPlanCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INSURANCE_PLAN_NAME_EXIST"));
                }
            }
            await this.insurancePlanService.update(
              { id: postData?.id },
              {
                  ...postData,
              },
            );
            this.activityLogService.create(recordDetails, postData, tableConstant.CAMPAIGN.TBL_INSURANCE_PLAN, req.tokenUser?.id);
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
    /*
     * Use to delete an Insurance Plan
     * - id and organization_id is mandatory params
     */
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(2) };
            let ipDetails = await this.insurancePlanService.findOne(where);
            if (!ipDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.insurancePlanService.update(
              { id: postData?.id },
              {
                  status: 2
              },
            );
            this.activityLogService.create(ipDetails, {status: 2}, tableConstant.CAMPAIGN.TBL_INSURANCE_PLAN, req.tokenUser?.id, 'delete');
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
    @Put('copy')
    async copy(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateInsurancePlanInput) {
        try {
            let returnResponce;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const plan = await this.insurancePlanService.findOne({id: postData?.id});
            if (plan) {
                const planData = JSON.parse(JSON.stringify(plan));
                delete plan.id;
                plan['plan_name'] = plan.plan_name + ' copy';
                returnResponce = await this.insurancePlanService.save({...plan});
            this.activityLogService.create(planData, returnResponce, tableConstant.CAMPAIGN.TBL_INSURANCE_PLAN, req.tokenUser?.id, 'copy');
            } else {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_COPY_FIELD')).replace('%s', 'Plan'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {id: returnResponce.id ?? returnResponce.identifiers[0].id},
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
