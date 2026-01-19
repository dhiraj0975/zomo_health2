import { appConstant, ClientManagerAssisgnDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { CreateClientManagerAssignInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ClientManagerAssignService } from "./clientmanagerassign.service";
const moment = require('moment-timezone');
@Controller('company/client-manager-assign')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ClientManagerAssignController {
    constructor(
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `clientManager.status !=0`;
            if(postData?.org_id){
                where +=` AND clientManager.org_id = '${postData?.org_id}' `;
            }
            if(postData?.user_id || req?.tokenUser?.role_id == appConstant.ROLE.CLIENTENGAGEMENTMANAGER){
                where +=` AND clientManager.user_id = '${postData?.user_id || req.tokenUser?.id}' `;
            }
            const resultedData = await this.clientManagerAssignService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ClientManagerAssisgnDto, resultedData['list'], req.lang)
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
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            let biometricDetails = await this.clientManagerAssignService.findOne(where);
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
                await this.commonArrayService.formatToDto(ClientManagerAssisgnDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateClientManagerAssignInput) {
        try {
            if (
                !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for(let user of postData?.user_id.split(',')){
                const recordDetails = await this.clientManagerAssignService.findOne({org_id: postData?.org_id, user_id: user});
                if (!recordDetails) {
                    delete postData?.user_id;
                    postData.user_id = user;
                    await this.clientManagerAssignService.save(postData);
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
            const recordDetails = await this.clientManagerAssignService.findOne(where);
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
            await this.clientManagerAssignService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN, req.tokenUser?.id,'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateClientManagerAssignInput) {
        try {
            if (
                !postData?.id &&
                !postData?.org_id 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id }: { org_id: postData?.org_id};
            if(postData?.user_id || postData?.user_id === ''){
                const orglist = await this.clientManagerAssignService.listRecord(`clientManager.org_id = ${postData?.org_id} AND clientManager.status !=2`);
                const removedUsers = postData?.user_id?.split(',').length ? orglist?.map((e) => e.user_id.toString()).filter(element => !postData?.user_id.includes(element)) : [];
                if(removedUsers?.length){
                    for(let user of removedUsers){
                        await this.clientManagerAssignService.update({user_id: user, org_id: postData?.org_id}, {status: 2});
                    }
                }
                if(postData?.user_id != ''){
                    for(let user of postData?.user_id?.split(',')){
                        delete postData?.user_id;
                        postData.user_id = user;
                        const recordDetails = await this.clientManagerAssignService.findOne({...where, user_id: user});
                        if (!recordDetails) {
                            await this.clientManagerAssignService.save({
                                ...postData,
                            });
                        }
                        else{
                            await this.clientManagerAssignService.update({id: recordDetails.id}, {...postData, status: 1});
                            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN, req.tokenUser?.id);
                        }
                    }
                }
            }
            else{
                const recordDetails = await this.clientManagerAssignService.findOne(where);
                if (!recordDetails) {
                    await this.clientManagerAssignService.save({
                        ...postData,
                    });
                }
                await this.clientManagerAssignService.update(where, {...postData, status: 1});
                this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_C_CLIENT_MANAGER_ASSIGN, req.tokenUser?.id);
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
            const where = {
                status: 1,
            };
            if(postData?.org_id){
                where["org_id"] = postData?.org_id;
            }
            if(postData?.user_id || req?.tokenUser?.role_id == appConstant.ROLE.CLIENTENGAGEMENTMANAGER){
                where["user_id"] = postData?.user_id || req.tokenUser?.id;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.clientManagerAssignService.listRecord(where,{ [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ClientManagerAssisgnDto, resultedData, req.lang)
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
    @Post('assign-client-manager-list')
    async assignManagerList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.user_id ? `clientManager.user_id = '${postData?.user_id}'` : `clientManager.org_id = '${postData?.org_id}'`;
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.clientManagerAssignService.assignCoachListRecord(['company.id', 'company.code', 'company.company_name', 'clientManager.id','user.id','user.code','user.first_name','user.last_name'],where,{ [orderBy]: order });
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