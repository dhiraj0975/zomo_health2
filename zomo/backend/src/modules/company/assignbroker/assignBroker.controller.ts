import { AssignBrokerDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { AssignBrokerInput, PaginateAssignBrokerInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AssignBrokerService } from "./assignBroker.service";
@Controller('assign-broker')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssignBrokerController {
    constructor(
        private readonly assignBrokerService: AssignBrokerService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateAssignBrokerInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `assignBroker.company_id = '${postData?.company_id}'`;
            if(postData?.user_id){
                where +=`AND assignBroker.user_id = '${postData?.user_id}`;
            }
            const resultedData = await this.assignBrokerService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssignBrokerDto, resultedData['list'], req.lang)
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
            let assignBrokerDetails = await this.assignBrokerService.findOne(where);
            if (!assignBrokerDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            assignBrokerDetails = <any>(
                await this.commonArrayService.formatToDto(AssignBrokerDto, assignBrokerDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: assignBrokerDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: AssignBrokerInput) {
        try {
            if (
                !postData?.company_id || !postData?.user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(!postData?.user_id){
                postData["user_id"]= [req.tokenUser?.id];
            }
            if(!postData?.user_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const usersIds = Array.isArray(postData?.user_id) ? postData?.user_id : JSON.parse(postData?.user_id);
            for(let user of usersIds){
            const recordDetails = await this.assignBrokerService.findOne({company_id: postData?.company_id, user_id: user, status: Not(2)});
            if (!recordDetails) {
                await this.assignBrokerService.save({company_id: postData?.company_id, user_id: user});
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
            const recordDetails = await this.assignBrokerService.findOne(where);
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
            await this.assignBrokerService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {company:0}, tableConstant.COMPANIES.TBL_ASSIGN_BROKERS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: AssignBrokerInput) {
        try {
            if (
                !postData?.company_id ||
                !postData?.user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const usersIds = Array.isArray(postData?.user_id) ? postData?.user_id : JSON.parse(postData?.user_id);
            const records = await this.assignBrokerService.listRecord({company_id: postData?.company_id, status: Not(2)});
            const idsNotInArray = records.filter(obj => !usersIds.includes(obj.user_id));
            idsNotInArray.map(async(element)=>{
                await this.assignBrokerService.update({id: element.id},{status: 2})
                this.activityLogService.create(element, {company:0}, tableConstant.COMPANIES.TBL_ASSIGN_BROKERS, req.tokenUser?.id, 'delete');
            });
            for(let user of usersIds){
                const where = {company_id: postData?.company_id, user_id: user, status: Not(2)};
                let recordDetails = await this.assignBrokerService.findOne(where);
                if (!recordDetails) {
                    await this.assignBrokerService.save({
                        company_id: postData?.company_id, user_id: user
                    });
                }
                else{
                await this.assignBrokerService.update(where, {id: recordDetails.id, company_id: postData?.company_id, user_id: user});
                this.activityLogService.create(recordDetails, {id: recordDetails.id, company_id: postData?.company_id, user_id: user}, tableConstant.COMPANIES.TBL_ASSIGN_BROKERS, req.tokenUser?.id);
                }
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
            const where = { status: Not(2) };
            if(postData?.company_id){
                where["company_id"] = postData?.company_id;
            }
            let resultedData = await this.assignBrokerService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssignBrokerDto, resultedData, req.lang)
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