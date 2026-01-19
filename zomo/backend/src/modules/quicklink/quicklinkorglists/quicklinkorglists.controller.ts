import { CommonArrayService, CommonService, QuicklinkOrglistsDto, tableConstant } from '@common-constants';
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
    CreateQuickLinkOrgListsInput,
    DeleteQuickLinkOrgListsInput,
    GetOneQuickLinkOrgListsInput,
    ListQuickLinkOrgListsInput,
    PaginateWithCompanyInput,
    UpdateQuickLinkOrgListsInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuicklinkOrglistsService } from './quicklinkorglists.service';
@Controller('quick-link/quick-link-org-lists')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuickLinkOrgListsController {
    constructor(
        private readonly quicklinkOrglistsService: QuicklinkOrglistsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `lists.c_companies_id = ${postData?.c_companies_id} AND lists.status = '1'`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'lists.quicklink_id');
            }
            let resultedData = await this.quicklinkOrglistsService.paginateList(
                ['lists'],
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuicklinkOrglistsDto, resultedData['list'], req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuickLinkOrgListsInput) {
        try {
            if (!postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            await this.quicklinkOrglistsService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuickLinkOrgListsInput) {
        try {
            if (!postData?.id || !postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quicklinkOrglistsService.findOne({ id: postData?.id,c_companies_id: postData?.c_companies_id });
            await this.quicklinkOrglistsService.update({ id: postData?.id,c_companies_id: postData?.c_companies_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUICK_LINK.TBL_QUICK_LINK_ORGLISTS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuickLinkOrgListsInput) {
        try {
            if (!postData?.id || !postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, c_companies_id: postData?.c_companies_id };
            const recordDetails = await this.quicklinkOrglistsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.quicklinkOrglistsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_ORGLISTS, req.tokenUser?.id, 'delete');
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuickLinkOrgListsInput) {
        try {
            if (!postData?.id || !postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quicklinkOrglistsService.findOne({id: postData?.id, c_companies_id: postData?.c_companies_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuicklinkOrglistsDto, resultedData, req.lang)
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListQuickLinkOrgListsInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            var where: any = [{c_companies_id: postData?.c_companies_id}];
            if (postData?.status) {
                where.push({ status: postData?.status, c_companies_id: postData?.c_companies_id })
            }
            if (postData?.search_str) {
                where.push( { c_companies_id: postData?.c_companies_id, quicklink_id: postData?.search_str })
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.quicklinkOrglistsService.listRecord(["id","c_companies_id","quicklink_id","status","created_by","updated_by","created","update"],where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuicklinkOrglistsDto, resultedData, req.lang)
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