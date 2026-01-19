import { CommonArrayService, CommonService, ManageDiseaseDto, tableConstant } from '@common-constants';
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
import { CreateManageDiseaseInput, PaginateWithDiseaseManagementInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ManageDiseaseService } from "./managedisease.service";
@Controller('disease-management/manage-disease')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ManageDiseaseController {
    constructor(
        private readonly manageDiseaseService: ManageDiseaseService,
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
            let where = 'managedisease.status !=0 ';
            if(postData?.company_id){
                where += `AND managedisease.company_id = ${postData?.company_id}`;
            }
            if(postData?.disease_id){
                where += `AND managedisease.disease_id = ${postData?.disease_id}`;
            }
            if (postData?.search_str) {
                where += `AND(managedisease.disease_form_ids LIKE '%${postData?.search_str}%' OR managedisease.coverpage_text LIKE '%${postData?.search_str}%' OR managedisease.instructions_text LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.manageDiseaseService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ManageDiseaseDto, resultedData['list'], req.lang)
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
            if(postData?.company_id){
                where['company_id'] = postData?.company_id;
            }
            let biometricDetails = await this.manageDiseaseService.findOne(where);
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
                await this.commonArrayService.formatToDto(ManageDiseaseDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateManageDiseaseInput) {
        try {
            if (
                !postData?.disease_id ||
                !postData?.company_id ||
                !postData?.start_date ||
                !postData?.end_date ||
                !postData?.fax_date ||
                !postData?.disease_form_ids ||
                !postData?.coverpage_text ||
                !postData?.instructions_text
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.manageDiseaseService.save({...postData,
                created_by: req.tokenUser?.id,
                modified_by : req.tokenUser?.id
            });
            for(let user of postData?.disease_id.split(',')){
                postData.disease_form_ids = postData?.disease_form_ids ?? '';
                const recordDetails = await this.manageDiseaseService.findOne({company_id: postData?.company_id, disease_id: user});
                if (!recordDetails) {
                    delete postData?.disease_id;
                    postData.disease_id = user;
                    await this.manageDiseaseService.save(postData);
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.manageDiseaseService.findOne(where);
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
            await this.manageDiseaseService.update(where,{status:2 , deleted: 1});
            this.activityLogService.create(recordDetails, {status:2 , deleted: 1}, tableConstant.DISEASE_MANAGEMENT.TBL_DS_MANAGE_DISEASE, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateManageDiseaseInput) {
        try {
            if (
                !postData?.id && !postData?.company_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.company_id ? { id: postData?.id, company_id: postData?.company_id } : { id: postData?.id}: { company_id: postData?.company_id };
            if(postData?.disease_id){
                for(let disease of postData?.disease_id.split(',')){
                    delete postData?.disease_id;
                    postData.disease_id = disease;
                    postData.disease_form_ids = postData?.disease_form_ids ?? '';
                    const recordDetails = await this.manageDiseaseService.findOne({...where, disease_id: disease});
                    if (!recordDetails) {
                        await this.manageDiseaseService.save({
                            ...postData,
                            created_by: req.tokenUser?.id,
                            modified_by : req.tokenUser?.id
                        });
                    }
                    else{
                        await this.manageDiseaseService.update({id: recordDetails.id}, {...postData, modified_by : req.tokenUser?.id});
                        this.activityLogService.create(recordDetails, {...postData, modified_by : req.tokenUser?.id}, tableConstant.DISEASE_MANAGEMENT.TBL_DS_MANAGE_DISEASE, req.tokenUser?.id);
                    }
                }
            }
            else{
                const recordDetails = await this.manageDiseaseService.findOne(where);
                if (!recordDetails) {
                    await this.manageDiseaseService.save({
                        ...postData,
                        created_by: req.tokenUser?.id,
                        modified_by : req.tokenUser?.id
                    });
                }
                else{
                where["id"]= recordDetails.id;
                await this.manageDiseaseService.update(where, {...postData, modified_by : req.tokenUser?.id});
                this.activityLogService.create(recordDetails, {...postData, modified_by : req.tokenUser?.id}, tableConstant.DISEASE_MANAGEMENT.TBL_DS_MANAGE_DISEASE, req.tokenUser?.id);
                }
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
            const where = { };
            let resultedData = await this.manageDiseaseService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ManageDiseaseDto, resultedData, req.lang)
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