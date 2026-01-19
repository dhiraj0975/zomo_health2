import { appConstant, tableConstant } from '@common-constants';
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
import { TranslationService } from 'src/modules/translation/translation.service';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { AgeGroupService } from './agegroup.service';
import { CreateAgeGroupInput } from './input';
@Controller('health-checkup/age-group')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AgeGroupController {
    constructor(
        private readonly AgeGroupService: AgeGroupService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAgeGroupInput) {
        try {
            if (!postData?.group_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {   
                const recordExist = await this.AgeGroupService.findOne({ group_name: postData?.group_name });
                if (recordExist) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_ALREADY_EXISTS"));
                }             
                let ageactivity = await this.AgeGroupService.save({ ...postData });                           
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success'
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAgeGroupInput) {
        try {
            if ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                let condition = `agegroup.status = 1`;                
                let resultedData = await this.AgeGroupService.listRecord(condition, ['agegroup']);
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAgeGroupInput) {
        try {
            if (!postData?.id || !postData?.group_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.AgeGroupService.findOne({ id: postData?.id });
            const recordExist = await this.AgeGroupService.findOne({ id: Not(postData?.id) ,group_name: postData?.group_name });
            if (recordExist) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_ALREADY_EXISTS"));
            }
            await this.AgeGroupService.update({ id: postData?.id }, { ...postData });
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_AGE_GROUP, req.tokenUser?.id);
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAgeGroupInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.AgeGroupService.findOne({id: postData?.id,});            
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