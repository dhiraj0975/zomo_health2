import { CensusFrequencyDto, CommonArrayService, tableConstant } from '@common-constants';
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
import {
    CreateCensusFrequencyInput,
    UpdateCensusFrequencyInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { CensusFrequencyService } from './censusfrequency.service';
@Controller('company/census-frequency')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CensusFrequencyController {
    constructor(
        private readonly censusFrequencyService: CensusFrequencyService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCensusFrequencyInput) {
        try {
            if (!postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData.recurring_pattern_type = 1;
            postData.upload_type = 0;
            await this.censusFrequencyService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCensusFrequencyInput) {
        try {
            if (!postData?.id && !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = postData?.id ? postData?.organization_id ? { id: postData?.id, organization_id: postData?.organization_id, status: Not(2) } : { id: postData?.id, status: Not(2)}: { organization_id: postData?.organization_id, status: Not(2)};
            const recordDetails = await this.censusFrequencyService.findOne(where);
            await this.censusFrequencyService.update(where,{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_C_CENSUS_FREQUENCY, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.censusFrequencyService.findOne({
                id: postData?.id,
                organization_id: postData?.organization_id, 
                status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.censusFrequencyService.update({id: postData?.id, organization_id: postData?.organization_id},{status: 2});
            this.activityLogService.create(recordDetails, {weekly_basis_day: recordDetails}, tableConstant.COMPANIES.TBL_C_CENSUS_FREQUENCY, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = postData?.id ? postData?.organization_id ? { id: postData?.id, organization_id: postData?.organization_id, status: Not(2) } : { id: postData?.id, status: Not(2)}: { organization_id: postData?.organization_id, status: Not(2)};
            let resultedData = await this.censusFrequencyService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CensusFrequencyDto, resultedData, req.lang)
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
            if (!postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = { organization_id: postData?.organization_id, status: Not(2)};
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.censusFrequencyService.listRecord(["id","organization_id","recurring_pattern_type","weekly_basis_day","monthly_basis","monthly_date_basis"],where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CensusFrequencyDto, resultedData, req.lang)
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