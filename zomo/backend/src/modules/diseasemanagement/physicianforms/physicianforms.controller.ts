import { CommonArrayService, CommonService, DiseasePhysicianFormsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateDiseasePhysicianFormsInput, PaginateWithDiseaseManagementInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { PhysicianFormsService } from "./physicianforms.service";
const moment = require('moment-timezone');
@Controller('disease-management/physician-forms')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class PhysicianFormsController {
    constructor(
        private readonly diseasesPhysicianFormsService: PhysicianFormsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithDiseaseManagementInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = (postData?.type ==  'physician')?'':'physicianforms.status !=0 AND physicianforms.deleted !=1 ';
            if(postData?.type ==  'physician'){
                where += `physicianforms.physician_id = ${req.tokenUser?.id}`
            }
            if(postData?.user_id){
                where += `physicianforms.user_id = ${postData?.user_id} `
            }
            if(postData?.activity_id){
                where += `physicianforms.activity_id = ${postData?.activity_id} `
            }
            if(postData?.physician_id){
                where += `physicianforms.physician_id = ${postData?.physician_id} `
            }
            if (postData?.search_str) {
                if(postData?.type ==  'physician'){
                    if (moment(postData?.search_str, 'll', true).isValid()) {
                        where += `  AND physicianforms.date_completed LIKE '%${moment(postData?.search_str, 'll', true).isValid() ? moment(postData?.search_str, 'll').format('YYYY-MM-DD') : ''}%'`
                    }
                    else {
                        const search = postData?.search_str.toLowerCase();
                        where += ` AND (LOWER(user.first_name) LIKE '%${search}%' OR LOWER(user.last_name) LIKE '%${search}%' OR LOWER(CONCAT(user.first_name, ' ', user.last_name)) LIKE '%${search}%' OR physicianforms.disease_formid LIKE '%${search}%')`
                    }
                }else{
                    where += ` AND(physicianforms.disease_formid LIKE '%${postData?.search_str}%' OR physicianforms.standard_ids LIKE '%${postData?.search_str}%' OR physicianforms.standard_dates LIKE '%${postData?.search_str}%' OR physicianforms.not_recommended LIKE '%${postData?.search_str}%' OR physicianforms.signature LIKE '%${postData?.search_str}%')`;
                }
            }
            let resultedData
            if(postData?.type ==  'physician'){
                resultedData = await this.diseasesPhysicianFormsService.paginateListPhysician(
                    where,
                    postData,
                    [
                        'physicianforms.id','physicianforms.disease_formid',
                        'physicianforms.date_completed',
                        'user.id','user.code','user.first_name','user.last_name',
                        'form.id','form.code','form.disease_id',
                        'disease.id','disease.title'
                    ]
                );
            }else{
                resultedData = await this.diseasesPhysicianFormsService.paginateList(
                    where,
                    postData,
                );
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(DiseasePhysicianFormsDto, resultedData['list'], req.lang)
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let biometricDetails = await this.diseasesPhysicianFormsService.findOne(where);
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
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(DiseasePhysicianFormsDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDiseasePhysicianFormsInput) {
        try {
            if (
                !postData?.user_id ||
                !postData?.activity_id ||
                !postData?.physician_id ||
                !postData?.disease_formid ||
                !postData?.standard_dates ||
                !postData?.not_recommended ||
                !postData?.date_completed ||
                !postData?.signature ||
                !postData?.is_signed ||
                !postData?.standard_ids
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.diseasesPhysicianFormsService.save({...postData,
                created_by: req.tokenUser?.id,
                modified_by : req.tokenUser?.id
            });
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.diseasesPhysicianFormsService.findOne(where);
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
            await this.diseasesPhysicianFormsService.update(where,{status:2, deleted:1});
            this.activityLogService.create(recordDetails, {status:2, deleted:1}, tableConstant.DISEASE_MANAGEMENT.TBL_DS_PHYSICIAN_FORMS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDiseasePhysicianFormsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.diseasesPhysicianFormsService.findOne(where);
            if (!recordDetails) {
                await this.diseasesPhysicianFormsService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                    modified_by : req.tokenUser?.id
                });
            }
            await this.diseasesPhysicianFormsService.update(where, {...postData, modified_by : req.tokenUser?.id });
            this.activityLogService.create(recordDetails, postData, tableConstant.DISEASE_MANAGEMENT.TBL_DS_PHYSICIAN_FORMS, req.tokenUser?.id);
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
            const where = { };
            let resultedData = await this.diseasesPhysicianFormsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(DiseasePhysicianFormsDto, resultedData, req.lang)
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