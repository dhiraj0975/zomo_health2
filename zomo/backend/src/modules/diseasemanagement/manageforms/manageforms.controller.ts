import { CommonArrayService, CommonService, DiseaseManageFormsDto, tableConstant } from '@common-constants';
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
import { FormInstructionsService } from "src/modules/healthcheckup/forminstructions/forminstructions.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateDiseaseManageFormsInput, PaginateWithDiseaseManagementInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ManageFormsService } from "./manageforms.service";
@Controller('disease-management/manage-forms')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ManageFormsController {
    constructor(
        private readonly manageFormsService: ManageFormsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly formInstructionsService: FormInstructionsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithDiseaseManagementInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = 'manageforms.status !=0 ';
            if (postData?.company_id) {
                where += `AND manageforms.company_id = ${postData?.company_id}`
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'manageforms.disease_form_ids');
            }
            const resultedData = await this.manageFormsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(DiseaseManageFormsDto, resultedData['list'], req.lang)
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
            if (!postData?.id && !postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.company_id ? { id: postData?.id, company_id: postData?.company_id } : { id: postData?.id } : { company_id: postData?.company_id };
            let biometricDetails = await this.manageFormsService.findOne(where);
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
                await this.commonArrayService.formatToDto(DiseaseManageFormsDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDiseaseManageFormsInput) {
        try {
            if (
                !postData?.company_id ||
                !postData?.disease_form_ids
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.manageFormsService.save(postData);
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
            const where = { id: postData?.id };
            const recordDetails = await this.manageFormsService.findOne(where);
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
            await this.manageFormsService.update(where, { status: 2, deleted: 1 });
            this.activityLogService.create(recordDetails, { status: 2, deleted: 1 }, tableConstant.DISEASE_MANAGEMENT.TBL_DS_MANAGE_FORMS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDiseaseManageFormsInput) {
        try {
            if (
                !postData?.id && !postData?.company_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.company_id ? { id: postData?.id, company_id: postData?.company_id } : { id: postData?.id } : { company_id: postData?.company_id };
            const recordDetails = await this.manageFormsService.findOne(where);
            if (!recordDetails) {
                await this.manageFormsService.save(postData);
            }
            await this.manageFormsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.DISEASE_MANAGEMENT.TBL_DS_MANAGE_FORMS, req.tokenUser?.id);
            let forminstructions = await this.formInstructionsService.findOne({ company_id: postData?.company_id, status: Not(5) });
            let assign_disease_list = forminstructions.assign_disease_ids.split(',');
            let diseaseFormIdsArray = postData?.disease_form_ids.split(',');
            let result1 = diseaseFormIdsArray.filter(x => !assign_disease_list.includes(x));
            let result2 = assign_disease_list.filter(x => !postData?.disease_form_ids.includes(x));            
            if (result1) {
                const existingDiseaseIds = forminstructions.disease_ids.split(',');            
                const updatedDiseaseIds = [...existingDiseaseIds, ...result1];                
                forminstructions.disease_ids = updatedDiseaseIds.join(',');
                await this.formInstructionsService.update({ company_id: postData?.company_id },{ disease_ids: forminstructions.disease_ids });
            }
            if (result2) {
                let existingDiseaseIds = forminstructions.disease_ids.split(',');
                existingDiseaseIds = existingDiseaseIds.filter(id => !result2.includes(id));                
                forminstructions.disease_ids = existingDiseaseIds.join(',');            
                await this.formInstructionsService.update({ company_id: postData?.company_id },{ disease_ids: forminstructions.disease_ids });
            }
            forminstructions.assign_disease_ids = postData?.disease_form_ids;
            await this.formInstructionsService.update({ company_id: postData?.company_id },{ assign_disease_ids: forminstructions.assign_disease_ids });
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
            const where = {};
            let resultedData = await this.manageFormsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(DiseaseManageFormsDto, resultedData, req.lang)
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