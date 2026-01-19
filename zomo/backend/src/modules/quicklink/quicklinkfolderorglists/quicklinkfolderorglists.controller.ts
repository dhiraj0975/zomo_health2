import { CommonArrayService, CommonService, QuicklinkFolderorgListsDto, tableConstant } from '@common-constants';
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
    CreateQuickLinkFolderOrgListsInput,
    DeleteQuickLinkFolderOrgListsInput,
    GetOneQuickLinkFolderOrgListsInput,
    ListQuickLinkFolderOrgListsInput,
    PaginateWithCompanyInput,
    UpdateQuickLinkFolderOrgListsInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuickLinkFolderOrgListsService } from './quicklinkfolderorglists.service';
@Controller('quick-link/quick-link-folder-org-lists')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuickLinkFolderOrgListsController {
    constructor(
        private readonly quickLinkFolderOrgListsService: QuickLinkFolderOrgListsService,
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
            let where = `fol.c_companies_id = ${postData?.c_companies_id} AND fol.status = '1'`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'fol.folder_id');
            }
            let resultedData = await this.quickLinkFolderOrgListsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuicklinkFolderorgListsDto, resultedData['list'], req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuickLinkFolderOrgListsInput) {
        try {
            if (!postData?.c_companies_id || !postData?.folder_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            await this.quickLinkFolderOrgListsService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuickLinkFolderOrgListsInput) {
        try {
            if (!postData?.id || !postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quickLinkFolderOrgListsService.findOne({ id: postData?.id,c_companies_id: postData?.c_companies_id });
            await this.quickLinkFolderOrgListsService.update({ id: postData?.id,c_companies_id: postData?.c_companies_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS_ORGLISTS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuickLinkFolderOrgListsInput) {
        try {
            if (!postData?.id || !postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, c_companies_id: postData?.c_companies_id };
            const recordDetails = await this.quickLinkFolderOrgListsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.quickLinkFolderOrgListsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS_ORGLISTS, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuickLinkFolderOrgListsInput) {
        try {
            if (!postData?.id || !postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quickLinkFolderOrgListsService.findOne({id: postData?.id, c_companies_id: postData?.c_companies_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuicklinkFolderorgListsDto, resultedData, req.lang)
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListQuickLinkFolderOrgListsInput) {
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
                where.push( { c_companies_id: postData?.c_companies_id, folder_id: postData?.search_str })
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.quickLinkFolderOrgListsService.listRecord(["id","c_companies_id","folder_id","status","created_by","updated_by"],where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(QuicklinkFolderorgListsDto, result, req.lang)
            );
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
}