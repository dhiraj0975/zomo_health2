import { CommonArrayService, CommonService, tableConstant, ThemesDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put, Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Like, Not } from "typeorm";
import { TokenGuard } from '../../../guard';
import {
    CreateCoreThemeInput, PaginateInput, UpdateCoreThemeInput,
} from "../../../input";
import { CoreThemesService } from "./corethemes.service";
@Controller('themes/core-themes')
@UseGuards(TokenGuard)
export class CoreThemesController {
    constructor(
        private readonly coreThemesService: CoreThemesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    /*
     * Function to get paginate list of themes
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `themes.status != 2`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'themes.themename');
            }
            const resultedData = await this.coreThemesService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ThemesDto, resultedData['list'], req.lang)
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
    /*
     * Function to get details of theme
     * - id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(2) };
            let themeDetails = await this.coreThemesService.findOne(where);
            if (!themeDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            themeDetails = <any>(
                await this.commonArrayService.formatToDto(ThemesDto, themeDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: themeDetails,
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
    /*
     * Function to get list of themes
     * - can pass search_str, order_by, order, company_id
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where: any = { status: 1 };
            if (postData?.search_str) {
                where.themename = Like('%' + postData?.search_str + '%');
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.coreThemesService.listRecord(where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(ThemesDto, result, req.lang)
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Use to create new theme
     * - themename, status is mandatory params
     */
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCoreThemeInput) {
        try {
            if (
                !postData?.themename ||
                (postData?.status == undefined || postData?.status == null)
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const coreThemeCheck = await this.coreThemesService.findOne({
                themename: postData?.themename, status: Not(2)
            });
            if (coreThemeCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_THEME_NAME_EXIST"));
            }
            await this.coreThemesService.save(postData);
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
    /*
     * Use to update theme
     * - id is mandatory params
     */
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCoreThemeInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for (const key in postData) {
                if (postData[key] === '') {
                    delete postData[key];
                }
            }
            const where = { id: postData?.id, status: Not(2) };
            const recordDetails = await this.coreThemesService.findOne(where);
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
            if (postData?.themename) {
                const themeCheck = await this.coreThemesService.findOne({
                    id: Not(postData?.id), themename: postData?.themename, status: Not(2)
                });
                if (themeCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_THEME_NAME_EXIST"));
                }
            }
            await this.coreThemesService.update(
              { id: postData?.id },
              {
                  ...postData,
              },
            );
            this.activityLogService.create(recordDetails, postData, tableConstant.THEMES.TBL_THEMES_CORE, req.tokenUser?.id);
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
    /*
     * Use to delete a Theme
     * - id is mandatory params
     */
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(2) };
            let coreThemeDetails = await this.coreThemesService.findOne(where);
            if (!coreThemeDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.coreThemesService.update(
              { id: postData?.id },
              {
                  status: 2
              },
            );
            this.activityLogService.create(coreThemeDetails, {status:2}, tableConstant.THEMES.TBL_THEMES_CORE, req.tokenUser?.id, 'delete');
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
}
