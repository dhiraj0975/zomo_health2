import { CommonArrayService, CommonFileService, CommonService, MyPlanAssignRuleDto, tableConstant } from '@common-constants';
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
    CreateAssignRuleInput,
    DeleteAssignRuleInput,
    GetOneMyPlanInput,
    PaginateWithCompanyInput,
    UpdateAssignRuleInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { MyPlanAssignRuleService } from './assignrule.service';
@Controller('my-plan/assign-rule')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanAssignRuleController {
    constructor(
        private readonly myPlanAssignRuleService: MyPlanAssignRuleService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.org_id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `ar.org_id = '${postData?.org_id}' AND ar.plan_id = '${postData?.plan_id}' AND ar.status = '1'`;
            if (postData?.search_str) {
                where += ` AND br.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
            }
            const resultedData = await this.myPlanAssignRuleService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MyPlanAssignRuleDto, resultedData['list'], req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssignRuleInput) {
        try {
            if (!this.commonService.isValidNumber(postData?.rule_id) || !postData?.plan_id || !postData?.org_id || !this.commonService.isValidNumber(postData?.recommended_base) || !this.commonService.isValidNumber(postData?.optional)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            switch (postData?.recommended_base) {
                case 2:
                    if (!postData?.bstart_date || !postData?.bend_date) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                    break;
                case 3:
                    if (!postData?.bstart_date) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                    break;
                case 4:
                    if (!postData?.bend_date) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                    break;
            }
            if (postData?.rule_id == 0) {
                postData.rule_id = postData?.activity_id;
                delete postData?.activity_id;
                delete postData?.model_id;
            }
            await this.myPlanAssignRuleService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateAssignRuleInput) {
        try {
            if (!postData?.id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, plan_id: postData?.plan_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            const recordDetails = await this.myPlanAssignRuleService.findOne(where);
            await this.myPlanAssignRuleService.update({ id: postData?.id, plan_id: postData?.plan_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_RULE, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteAssignRuleInput) {
        try {
            if (!postData?.id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, plan_id: postData?.plan_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            const recordDetails = await this.myPlanAssignRuleService.findOne({
                id: postData?.id,
                plan_id: postData?.plan_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanAssignRuleService.update({id: postData?.id, plan_id: postData?.plan_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_ASSIGN_RULE, req.tokenUser?.id, 'delete');
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
            let where = {id: postData?.id, plan_id: postData?.plan_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let resultedData = await this.myPlanAssignRuleService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanAssignRuleDto, resultedData, req.lang)
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