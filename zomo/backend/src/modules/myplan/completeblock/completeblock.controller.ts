import { CommonArrayService, MyPlanCompleteBlockDto, tableConstant } from '@common-constants';
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
import {
    CreateCompleteBlockInput,
    DeleteMyPlanInput,
    GetOneMyPlanInput,
    UpdateCompleteBlockInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { MyPlanCompleteBlockService } from './completeblock.service';
@Controller('my-plan/complete-block')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanCompleteBlockController {
    constructor(
        private readonly myPlanCompleteBlockService: MyPlanCompleteBlockService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompleteBlockInput) {
        try {
            if (!postData?.plan_id || !postData?.activity_id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.myPlanCompleteBlockService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCompleteBlockInput) {
        try {
            if (!postData?.id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanCompleteBlockService.findOne({ id: postData?.id, plan_id: postData?.plan_id });
            await this.myPlanCompleteBlockService.update({ id: postData?.id, plan_id: postData?.plan_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK, req.tokenUser?.id);
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
            if (!postData?.id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanCompleteBlockService.findOne({
                id: postData?.id,
                plan_id: postData?.plan_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanCompleteBlockService.update({id: postData?.id, plan_id: postData?.plan_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK, req.tokenUser?.id, 'delete');
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
            if (!postData?.id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.myPlanCompleteBlockService.findOne({id: postData?.id, plan_id: postData?.plan_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanCompleteBlockDto, resultedData, req.lang)
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