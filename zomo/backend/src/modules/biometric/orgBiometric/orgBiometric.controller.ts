import { CommonArrayService, CommonService, OrgBiometricDto, tableConstant, } from '@common-constants';
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
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateOrgBiometricInput } from '../../../input';
import { TranslationService } from '../../translation/translation.service';
import { OrgBiometricService } from "./orgBiometric.service";
@Controller('org-biometric')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class OrgBiometricController {
    constructor(
        private readonly orgBiometricService: OrgBiometricService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let where = `status !='0'`;
            postData = this.commonService.sanitizePayload(postData)
            if (postData?.search_str) {
                where += `AND(orgBiometric.company_id LIKE '${postData?.search_str}' ESCAPE '!' OR orgBiometric.biometric = '${postData?.search_str}')`;
            }
            const resultedData = await this.orgBiometricService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(
                    OrgBiometricDto,
                    resultedData['list'],
                    req.lang
                )
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_REQUIRED_PARAM_MISSING",
                    ),
                );
            }
            const where = { id: postData?.id };
            if(postData?.company_id){
                where['company_id'] = postData?.company_id;
            }
            let biometricDetails =
                await this.orgBiometricService.findOne(where);
            if (!biometricDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_RECORD_NOT_FOUND",
                    ),
                );
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(
                    OrgBiometricDto,
                    biometricDetails,
                    req.lang
                )
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
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateOrgBiometricInput,
    ) {
        try {
            if (
                !postData?.company_id ||
                !postData?.biometric ||
                !postData?.test1_start_date ||
                !postData?.test1_end_date ||
                !postData?.test2_start_date ||
                !postData?.test2_end_date
            ) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_REQUIRED_PARAM_MISSING",
                    ),
                );
            }
            await this.orgBiometricService.save({
                ...postData,
                created_by: req.tokenUser?.id,
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
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_REQUIRED_PARAM_MISSING",
                    ),
                );
            }
            const where = { id: postData?.id };
            const recordDetails = await this.orgBiometricService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_RECORD_NOT_FOUND",
                    ),
                );
            }
            await this.orgBiometricService.update(where, {status: 2});            
            this.activityLogService.create(recordDetails, postData, tableConstant.BIOMETRIC.BIR_ORG_BIOMETRIC, req.tokenUser?.id, 'delete');
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
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateOrgBiometricInput,
    ) {
        try {
            if (
                !postData?.id ||
                !postData?.company_id ||
                !postData?.biometric ||
                !postData?.test1_start_date ||
                !postData?.test1_end_date ||
                !postData?.test2_start_date ||
                !postData?.test2_end_date
            ) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        "ERR_REQUIRED_PARAM_MISSING",
                    ),
                );
            }
            const where = { id: postData?.id };
            const recordDetails = await this.orgBiometricService.findOne(where);
            if (!recordDetails) {
                await this.orgBiometricService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                });
            }
            postData["updated_by"]= req.tokenUser?.id;
            await this.orgBiometricService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.BIOMETRIC.BIR_ORG_BIOMETRIC, req.tokenUser?.id);
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
            const where = {
                status: 1,
            };
            let resultedData = await this.orgBiometricService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(OrgBiometricDto, resultedData, req.lang)
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
