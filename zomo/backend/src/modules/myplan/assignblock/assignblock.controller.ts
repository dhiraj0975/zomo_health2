import { CommonArrayService, MyPlanAssignBlockDto, tableConstant } from '@common-constants';
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
    CreateAssignBlockInput,
    DeleteAssignBlockInput,
    GetOneMyPlanInput,
    UpdateAssignBlockInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { MyPlanAssignBlockService } from './assignblock.service';
@Controller('my-plan/assign-block')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanAssignBlockController {
    constructor(
        private readonly myPlanAssignBlockService: MyPlanAssignBlockService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssignBlockInput) {
        try {
            if (!postData?.block_id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.myPlanAssignBlockService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateAssignBlockInput) {
        try {
            if (!postData?.id || !postData?.block_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, block_id: postData?.block_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            const recordDetails = await this.myPlanAssignBlockService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanAssignBlockService.update({ id: postData?.id, block_id: postData?.block_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteAssignBlockInput) {
        try {
            if (!postData?.id || !postData?.block_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, block_id: postData?.block_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            const recordDetails = await this.myPlanAssignBlockService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanAssignBlockService.update({id: postData?.id, block_id: postData?.block_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, req.tokenUser?.id, 'delete');
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
            if (!postData?.id || !postData?.block_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, block_id: postData?.block_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let resultedData = await this.myPlanAssignBlockService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanAssignBlockDto, resultedData, req.lang)
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