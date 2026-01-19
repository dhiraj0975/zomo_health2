import { AssignEngagementManagerDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { AssignEngagementManagerInput, PaginateAssignEngagementManagerInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AssignEngagementMangerService } from "./assignEngagementManger.service";
@Controller('assign-engagement-manager')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssignEngagementMangerController {
    constructor(
        private readonly assignEngagementManagerService: AssignEngagementMangerService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateAssignEngagementManagerInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `engManager.company_id = '${postData?.company_id}'`;
            if(postData?.user_id){
                where +=`AND engManager.user_id = '${postData?.user_id}`;
            }
            const resultedData = await this.assignEngagementManagerService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssignEngagementManagerDto, resultedData['list'], req.lang)
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
            if (!postData?.id && !postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.company_id ? { id: postData?.id, company_id: postData?.company_id, status: Not(2) } : { id: postData?.id, status: Not(2)}: { company_id: postData?.company_id, status: Not(2)};
            let biometricDetails = await this.assignEngagementManagerService.findOne(where);
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
                await this.commonArrayService.formatToDto(AssignEngagementManagerDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: AssignEngagementManagerInput) {
        try {
            if (!postData?.user_id || !postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for(let user of postData?.user_id.split(',')){
                const recordDetails = await this.assignEngagementManagerService.findOne({company_id: postData?.company_id, user_id: user});
                if (!recordDetails) {
                    delete postData?.user_id;
                    postData.user_id = user;
                    await this.assignEngagementManagerService.save(postData);
                }
            }
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: AssignEngagementManagerInput) {
        try {
            if (!postData?.id && !postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = postData?.id ? postData?.company_id ? { id: postData?.id, company_id: postData?.company_id, status: Not(2) } : { id: postData?.id, status: Not(2)}: { company_id: postData?.company_id, status: Not(2) };
            const recordDetails = await this.assignEngagementManagerService.findOne({...where});
            if(postData?.user_id){
                for(let user of postData?.user_id.split(',')){
                    delete postData?.user_id;
                    postData.user_id = user;
                    const recordDetails = await this.assignEngagementManagerService.findOne({...where, user_id: user});
                    if (!recordDetails) {
                        await this.assignEngagementManagerService.save({
                            ...postData,
                        });
                    }
                    else{
                        await this.assignEngagementManagerService.update({id: recordDetails.id}, postData);
                        this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_ASSIGN_ENGAGEMENT_MANAGER, req.tokenUser?.id);
                    }
                }
            }
            else{
                const recordDetails = await this.assignEngagementManagerService.findOne(where);
                if (!recordDetails) {
                    await this.assignEngagementManagerService.save({
                        ...postData,
                    });
                }
                else{
                    await this.assignEngagementManagerService.update(where, {...postData});
                    this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_ASSIGN_ENGAGEMENT_MANAGER, req.tokenUser?.id);
                }
            }
            await this.assignEngagementManagerService.update({ id: postData?.id, company_id: postData?.company_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_ASSIGN_ENGAGEMENT_MANAGER, req.tokenUser?.id);
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.assignEngagementManagerService.findOne(where);
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
            await this.assignEngagementManagerService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {company: 0}, tableConstant.COMPANIES.TBL_ASSIGN_ENGAGEMENT_MANAGER, req.tokenUser?.id, 'delete');
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
            const where = { status: Not(2) };
            if(postData?.company_id){
                where["company_id"] = postData?.company_id;
            }
            let resultedData = await this.assignEngagementManagerService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssignEngagementManagerDto, resultedData, req.lang)
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