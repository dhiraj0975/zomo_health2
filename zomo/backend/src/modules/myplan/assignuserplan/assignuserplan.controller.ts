import {
    CommonArrayService,
    MyPlanAssignUserPlanDto,
    MyPlanAssignUserPlanEntity,
    tableConstant
} from '@common-constants';
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
    CreateAssignUserPlanInput,
    DeleteMyPlanInput,
    GetOneMyPlanInput,
    UpdateAssignUserPlanInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { MyPlanAssignUserPlanService } from './assignuserplan.service';
import {planToggleInput} from "@/modules/myplan/assignuserplan/inputs";
@Controller('my-plan/assign-user-plan')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanAssignUserPlanController {
    constructor(
        private readonly myPlanAssignUserPlanService: MyPlanAssignUserPlanService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssignUserPlanInput) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.myPlanAssignUserPlanService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateAssignUserPlanInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanAssignUserPlanService.findOne({ id: postData?.id, user_id: postData?.user_id });
            await this.myPlanAssignUserPlanService.update({ id: postData?.id, user_id: postData?.user_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_USER_PLAN, req.tokenUser?.id);
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
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanAssignUserPlanService.findOne({
                id: postData?.id,
                user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanAssignUserPlanService.update({id: postData?.id, user_id: postData?.user_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_ASSIGN_USER_PLAN, req.tokenUser?.id, 'delete');
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
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.myPlanAssignUserPlanService.findOne({id: postData?.id, user_id: postData?.user_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanAssignUserPlanDto, resultedData, req.lang)
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

    @Post('plan-toggle')
    async planToggle(@Req() req: Request, @Res() res: Response, @Body() postData: planToggleInput) {
        try {
            if (!postData?.plan_id || !postData?.user_id || ![0,1].includes(postData?.flag)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let message: string = '';
            let assignUserPlanRecord:MyPlanAssignUserPlanEntity = await this.myPlanAssignUserPlanService.findOne({user_id: postData?.user_id});
                let data = {user_id: postData.user_id};
            if (postData?.flag === 1) {
                if (!assignUserPlanRecord) {
                    data['gc_plan_id'] = JSON.stringify([postData?.plan_id]);
                    await this.myPlanAssignUserPlanService.create(data)
                } else {
                    const oldPlanId = assignUserPlanRecord.gc_plan_id ? JSON.parse(assignUserPlanRecord.gc_plan_id) : [];
                    data['gc_plan_id'] = JSON.stringify([...new Set([...oldPlanId, postData?.plan_id])]);

                    if (assignUserPlanRecord.gc_plan_remove) {
                        const oldIds = JSON.parse(assignUserPlanRecord.gc_plan_remove);
                        const diff = oldIds.filter(x => ![postData?.plan_id].includes(x));
                        data['gc_plan_remove'] = diff.length ? JSON.stringify(diff) : null;
                    }
                    await this.myPlanAssignUserPlanService.update({user_id: postData.user_id},data)
                }
                message = 'Plan assigned successfully!';
            } else {
                if (!assignUserPlanRecord) {
                    data['gc_plan_remove'] = JSON.stringify([postData?.plan_id]);
                    await this.myPlanAssignUserPlanService.create(data)
                } else {
                    const oldPlanId = assignUserPlanRecord.gc_plan_remove ? JSON.parse(assignUserPlanRecord.gc_plan_remove) : [];
                    data['gc_plan_remove'] = JSON.stringify([...new Set([...oldPlanId, postData?.plan_id])]);

                    if (assignUserPlanRecord.gc_plan_id) {
                        const oldIds = JSON.parse(assignUserPlanRecord.gc_plan_id);
                        const diff = oldIds.filter(x => ![postData?.plan_id].includes(x));
                        data['gc_plan_id'] = diff.length ? JSON.stringify(diff) : null;
                    }
                    await this.myPlanAssignUserPlanService.update({user_id: postData.user_id},data)
                }
                message = 'Plan assign remove successfully!';
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: message,
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