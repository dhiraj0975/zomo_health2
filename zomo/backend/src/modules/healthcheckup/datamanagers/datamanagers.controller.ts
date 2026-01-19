import { SubmitFormsService } from '@/modules/activitytracker/submitforms/submitforms.service';
import { CompanyService } from '@/modules/company/companies/company.service';
import { appConstant, CommonArrayService, CommonService, DataManagersDto, SubmitFormsDto, tableConstant } from '@common-constants';
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
import * as moment from 'moment-timezone';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateDataManagersInput,
    DeleteHealthCheckupInput,
    GetOneHealthCheckupInput,
    PaginateWithCompanyInput,
    UpdateDataManagersInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { DataManagersService } from './datamanagers.service';
@Controller('health-checkup/data-managers')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class DataManagersController {
    constructor(
        private readonly dataManagersService: DataManagersService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly submitFormsService: SubmitFormsService,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDataManagersInput) {
        try {
            if (!postData?.user_id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for(let user of postData?.user_id.split(',')){
                const recordDetails = await this.dataManagersService.findOne({org_id: postData?.org_id, user_id: user});
                if (!recordDetails) {
                    delete postData?.user_id;
                    postData.user_id = user;
                    postData['status'] = postData['status'] || 1;
                    await this.dataManagersService.save(postData);
                }
            }
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateDataManagersInput) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id };
            const recordDetails = await this.dataManagersService.findOne(where);
            if (!recordDetails) {
                postData['status'] = postData['status'] || 1;
                await this.dataManagersService.save({
                    ...postData,
                });
            }
            if(recordDetails.status == 2){
                postData['status'] = 1;
            }
            await this.dataManagersService.update(where,{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_DATA_MANAGERS, req.tokenUser?.id);
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = { id: postData?.id};
            const recordDetails = await this.dataManagersService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.dataManagersService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_CHECKUP.TBL_HC_DATA_MANAGERS, req.tokenUser?.id, 'delete');
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
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            let resultedData = await this.dataManagersService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(DataManagersDto, resultedData, req.lang)
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {
                status: 1,
            };
            if(postData?.org_id){
                where["org_id"] = postData?.org_id;
            }
            let resultedData = await this.dataManagersService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(DataManagersDto, resultedData, req.lang)
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
    @Post('dashboard')
    async DataManagerDashboard(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            let user = Object.create(req.tokenUser);
            let result;
            if(appConstant.ROLE.GLOBALDATAMANAGER != user?.role_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
            }
            let innerJoin = [{'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = datamanager.org_id`, 'connect' : 'datamanager', 'type' : 'INNER' }];
            let datamanagerList = await this.dataManagersService.listRecord(`datamanager.status !=2`,null,['datamanager', 'company'],innerJoin)
            let companyIdList: number[] = datamanagerList.map((item)=>item?.['company']?.id).filter(Boolean) || null;
            let year = postData?.year || moment().year();
            let where: string = `sf.org_id IN (${companyIdList?.length === 0 ? 'NULL' : companyIdList.join(',')}) AND sf.status = 0 AND sf.deleted = 0 AND YEAR(sf.added_date) = ${year}`;
            const joinTable = [
                {'alias':'activity', 'table' : tableConstant.ACTIVITIES.TBL_ACTIVITIES, 'on' : `sf.activity_id = activity.id`, 'connect' : 'sf', 'type' : 'INNER' },
                {'alias':'createForm', 'table' : tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS, 'on' : `sf.form_id = createForm.id` , 'connect' : 'sf', 'type' : 'INNER' },
                {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `sf.user_id = user.id AND user.status = 1` , 'connect' : 'sf', 'type' : 'INNER' },
            ];
            let resultedData = await this.submitFormsService.listRecordPaginate(
                where,
                postData,
                [
                    'activity.activity_name',
                    'createForm.title',
                    'createForm.status',
                    'user.first_name',
                    'user.last_name',
                    'user.code',
                    'sf',
                    "CONVERT_TZ(`sf`.`activity_date`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END) as activity_date",
                    "CONVERT_TZ(`sf`.`added_date`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END) as added_date",
                ],
                joinTable,
            );
            if (Array.isArray(resultedData['list']) && Array.isArray(datamanagerList)) {
                resultedData['list'] = resultedData['list'].map(item => {
                    const matchingDataManager = datamanagerList.find(dm => dm['company'] && dm['company'].id === item.org_id);
                    return {
                        ...item,
                        company: matchingDataManager ? matchingDataManager['company'] : null
                    };
                });
            } 
            resultedData['list'] = <any>(await this.commonArrayService.formatToDto(SubmitFormsDto, resultedData['list'], req.lang));
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
    async assignOrgList(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            let user = Object.create(req.tokenUser);
            let where;
            if(![appConstant.ROLE.DATAMANAGER,appConstant.ROLE.GLOBALDATAMANAGER].includes(user?.role_id) ){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
            }
            if(user?.role_id == appConstant.ROLE.DATAMANAGER){
                where = `datamanager.status != 2 AND company.status != 2 AND datamanager.user_id = ${user.id}`;
            }
            if(user?.role_id == appConstant.ROLE.GLOBALDATAMANAGER){
                where = `datamanager.status !=2 AND company.status != 2 AND company.companytype_id = 3`
            }
            let datamanagerList = await this.dataManagersService.listRecord(where,null,['datamanager.id','datamanager.org_id', 'company.id'])
            let companyIdList: number[] = datamanagerList.map((item)=>item?.['company']?.id).filter(Boolean) || null;
            let finalOrgList
            if(companyIdList.length){
                let orgWhere = `company.id in(${companyIdList}) AND company.status = 1`;
                if(postData?.search_str){
                    orgWhere += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['company.id', 'company.company_name', 'company.city', 'company.state', 'company.country']);
                }
                finalOrgList = await this.companyService.companypaginateList(orgWhere, postData,['company.id', 'company.company_name', 'company.code', 'company.city', 'company.state', 'company.country', 'company.created','company_setting.id','company_setting.plan_order']);
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
}