import { CommonArrayService, CommonService, MembershipPlanDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { MembershipPlanInput, PaginateWithCompanyInput } from "../../../input";
import { MembershipPlanService } from "./membershipplan.service";
@Controller('membership-plan')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MembershipPlanController {
    constructor(
        private readonly membershipPlanService: MembershipPlanService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `membership.status = '1'`;
            if (postData?.search_str) {
                where += ` AND (membership.name LIKE '%${postData?.search_str}%' OR membership.description LIKE '%${postData?.search_str}%' OR membership.default_plugins LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.membershipPlanService.paginateList(
                where,
                postData,
            )
            resultedData['list'] = <any>(await this.commonArrayService.formatToDto(MembershipPlanDto,resultedData['list'],req.lang));
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
            let planDetails = await this.membershipPlanService.findOne({
                id: postData?.id,
            });
            if (!planDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            planDetails = <any>(await this.commonArrayService.formatToDto(MembershipPlanDto,planDetails,req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: planDetails,
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let where = `membership.status = '1'`;
            if (postData?.search_str) {
                where += ` AND (membership.name LIKE '%${postData?.search_str}%' OR membership.description LIKE '%${postData?.search_str}%' OR membership.default_plugins LIKE '%${postData?.search_str}%')`;
            }
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.membershipPlanService.listRecord(where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(MembershipPlanDto, result, req.lang)
            );
            await Promise.all(result.map(ele =>{ 
                if(ele['plugins'] && ele['plugins'].length){
                    ele['plugins'] = ele['plugins'].map(element => element.plugin_name);
                }
            })) 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: MembershipPlanInput) {
        try {
            if (
                !postData?.name
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING',),);
            }
            const planCheck = await this.membershipPlanService.findOne({
                name: postData?.name,
                status: Not(2)
            });
            if (planCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang,'Membership plan already exist.',),);
            }
            if(!postData?.created_by){
                postData.created_by = req.tokenUser?.id;
            }
            postData.status = postData?.status ?? 1;
            const saveResult = await this.membershipPlanService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Membership plan has been added successfully.',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: MembershipPlanInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING',),);
            }
            const where = `membership.id = ${postData?.id}`;
            const recordDetails = await this.membershipPlanService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            if (
                postData?.name 
            ) {
                const planCheck = await this.membershipPlanService.findOne({
                    name: postData?.name,
                    status: Not(2)
                });
                if (planCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang,'Membership plan already exist.',),);
                }
            }
            if(!postData?.updated_by){
                postData.updated_by = req.tokenUser?.id;
            }
            await this.membershipPlanService.update(
                { id: postData?.id },
                {
                    ...postData,
                },
            );
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Membership plan has been updated successfully.',
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
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = {
                id: postData?.id
            };
            const recordDetails = await this.membershipPlanService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.membershipPlanService.update(
                { id: postData?.id },
                {
                    status: 2
                },
            );
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Membership plan has been deleted successfully.',
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
