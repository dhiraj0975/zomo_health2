import { CommonArrayService, CommonService, LanguagesDto, tableConstant } from '@common-constants';
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
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateLanguagesInput, PaginateInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ActivityLogService } from "../activitylog/activitylog.service";
import { LanguagesService } from "./languages.service";
import {In} from "typeorm";
@Controller('languages')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class LanguagesController {
    constructor(
        private readonly languagesService: LanguagesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = 'language.status != 2';
            const languageData = await this.translatorService.getLanguagesData();
            const names = languageData.map(lang => `'${lang.name.replace(/'/g, "''")}'`);
            if (names.length > 0) {
                where += ` AND language.title IN (${names.join(',')})`;
            } else {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {
                        list: [],
                        total: 0,
                    },
                    message: 'No languages matched.',
                });
            }

            if (postData?.search_str) {
                const searchStr = postData.search_str.replace(/'/g, "''"); // Escape single quotes
                where += ` AND (
                language.title LIKE '%${searchStr}%' OR 
                language.native LIKE '%${searchStr}%' OR 
                language.alias LIKE '%${searchStr}%'
            )`;
            }

            const resultedData = await this.languagesService.paginateList(where, postData);

            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(LanguagesDto, resultedData['list'], req.lang)
            );

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });

        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
            const where = { id: postData?.id };
            let biometricDetails = await this.languagesService.findOne(where);
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
                await this.commonArrayService.formatToDto(LanguagesDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateLanguagesInput) {
        try {
            if (
                !postData?.title ||
                !postData?.native ||
                !postData?.alias ||
                !postData?.weight
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
           const countData = await this.languagesService.getCount({});
           postData.weight = countData["weight"] + 1; 
            await this.languagesService.save(postData);
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
            const recordDetails = await this.languagesService.findOne(where);
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
            await this.languagesService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.TBL_LANGUAGES, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateLanguagesInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.languagesService.findOne(where);
            if (!recordDetails) {
                await this.languagesService.save(postData);
            }
            await this.languagesService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_LANGUAGES, req.tokenUser?.id);
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
            // Step 1: Fetch language data from translator service
            const languageData = await this.translatorService.getLanguagesData();

            // Step 2: Extract 'name' values as plain strings
            const validTitles: string[] = languageData.map(lang => lang.name).filter(Boolean);

            // Step 3: Prepare base WHERE condition
            const where: any = {
                status: 1,
            };

            // Step 4: Add title IN condition if any valid titles exist
            if (validTitles.length > 0) {
                where.title = In(validTitles); // Use TypeORM's In() helper
            } else {
                // Return empty array if no valid titles
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: [],
                    message: 'No matching languages found.',
                });
            }

            // Step 5: Fetch filtered records
            const order = postData && postData.order ? postData.order : 'DESC';
            const orderBy = postData && postData.order_by ? postData.order_by : 'id';
            let resultedData = await this.languagesService.listRecord(where, { [orderBy]: order });

            // Step 6: Format result
            resultedData = <any>(
                await this.commonArrayService.formatToDto(LanguagesDto, resultedData, req.lang)
            );

            // Step 7: Return response
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });

        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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

    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let resultedData = await this.languagesService.updateOrder(postData, req);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(LanguagesDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ORDER_CHANGE"),
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