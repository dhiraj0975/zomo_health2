import { CensusCustomFieldsDto, CommonArrayService, CompaniesEntity, tableConstant } from '@common-constants';
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
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateCensusCustomFieldsInput, UpdateCensusCustomFieldsInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { CensusCustomFieldsService } from './censuscustomfields.service';
import { ListCensusCustomFieldsInput } from './input/listcensuscustomfields.input';
import { CompanyService } from '../companies/company.service';
import { MetaService } from '../meta/meta.service';
import { SettingsService } from '../settings/settings.service';
@Controller('company/census-custom-fields')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CensusCustomFieldsController {
    constructor(
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly companySettingsService: SettingsService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCensusCustomFieldsInput) {
        try {
            if (!postData?.organization_id || !postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.title){
                const recordDetails = await this.censusCustomFieldsService.findOne({ organization_id: postData?.organization_id, title: postData?.title });
                if (recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'CENSUS_CUSTOM_FIELD_ALREADY_EXISTS'));
                }
            }
            postData.created_by = req.tokenUser?.id;
            postData.updated_by = req.tokenUser?.id;
            await this.censusCustomFieldsService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'CENSUS_CUSTOM_FIELD_ADDED'),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCensusCustomFieldsInput) {
        try {
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.censusCustomFieldsService.findOne({ id: postData?.id, organization_id: postData?.organization_id });
            if(postData?.title){
                const recordDetails = await this.censusCustomFieldsService.findOne({ organization_id: postData?.organization_id, title: postData?.title , id: Not(postData?.id) });
                if (recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'CENSUS_CUSTOM_FIELD_ALREADY_EXISTS'));
                }
            }
            postData.updated_by = req.tokenUser?.id;
            await this.censusCustomFieldsService.update({ id: postData?.id, organization_id: postData?.organization_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_C_CENSUS_CUSTOM_FIELDS, req.tokenUser?.id);
            let message = 'CENSUS_CUSTOM_FIELD_UPDATED';
            if(postData?.status){
                message = 'CENSUS_CUSTOM_FIELD_STATUS_CHANGE';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, message),
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
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.censusCustomFieldsService.findOne({
                id: postData?.id,
                organization_id: postData?.organization_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.censusCustomFieldsService.update({id: postData?.id, organization_id: postData?.organization_id},{status:2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.COMPANIES.TBL_C_CENSUS_CUSTOM_FIELDS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'CENSUS_CUSTOM_FIELD_DELETED'),
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
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.censusCustomFieldsService.findOne({id: postData?.id, organization_id: postData?.organization_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CensusCustomFieldsDto, resultedData, req.lang)
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListCensusCustomFieldsInput) {
        try {
            if ( !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.type && postData?.type == 'report'){
                let censusStatus = 0;
                let whereCompanySettings = { org_id: postData?.organization_id};
                let companyDetails = await this.companySettingsService.findOne(whereCompanySettings, ["id","org_id","census_status"]);
                if(companyDetails){
                    censusStatus = companyDetails?.census_status;
                }
                if(censusStatus != 1){
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: [],
                        message: 'success',
                    });
                }
            }
            let where: any = { organization_id: postData?.organization_id, status: '1'};
            if(postData?.type && postData?.type == 'report'){
                where['include_in_report'] = 1;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.censusCustomFieldsService.listRecord(["id","organization_id","title"],where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CensusCustomFieldsDto, resultedData, req.lang)
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
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if ( !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.org_id;
            let where = `censusCustomFields.organization_id = ${postData?.organization_id} AND censusCustomFields.status != 2`;     
            if (postData?.search_str) {
                where += ` AND (censusCustomFields.title LIKE '%${postData?.search_str}%')`;
            }       
            let resultedData = await this.censusCustomFieldsService.paginateList(where, postData);
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CensusCustomFieldsDto, resultedData['list'], req.lang)
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
}