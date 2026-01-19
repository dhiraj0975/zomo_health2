import { ActivityLogService } from '@/modules/master/activitylog/activitylog.service';
import { CommonArrayService, CommonService, TagsDto, tableConstant } from '@common-constants';
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
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateTagsInput, PaginateInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ChallengeTagsService } from './tags.service';
@Controller('challenge/tags')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ChallengeTagsController {
    constructor(
        private readonly challengeTagsService: ChallengeTagsService,
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
            let where = 'tags.status != 2';
            if (postData?.search_str) {
                const searchStr = postData.search_str.replace(/'/g, "''"); // Escape single quotes
                where += ` AND tags.title LIKE '%${searchStr}%'`;
            }

            const resultedData = await this.challengeTagsService.paginateList(where, postData);
            resultedData['list'] = <any>(await this.commonArrayService.formatToDto(TagsDto, resultedData['list'], req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Tag Fetched Successfully.'),
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
            let tagsDetails = await this.challengeTagsService.findOne(where);
            if (!tagsDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            tagsDetails = <any>(
                await this.commonArrayService.formatToDto(TagsDto, tagsDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: tagsDetails,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Tag Fetched Successfully.'),
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateTagsInput) {
        try {
            if (
                !postData?.title 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.challengeTagsService.findOne({
                title: postData?.title, status: Not(2)
            });
            if (recordDetails) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'Tag Name Already Exist.')));
            }
            await this.challengeTagsService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Tag Added Successfully.'),
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
            const recordDetails = await this.challengeTagsService.findOne(where);
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
            await this.challengeTagsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_TAGS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Tag Deleted Successfully.'),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateTagsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.challengeTagsService.findOne(where);
            if (!recordDetails) {
                await this.challengeTagsService.save(postData);
            }
            await this.challengeTagsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_TAGS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Tag Updated Successfully.'),
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
            const where: any = {status: 1};
            const order = postData && postData.order ? postData.order : 'DESC';
            const orderBy = postData && postData.order_by ? postData.order_by : 'id';
            let resultedData = await this.challengeTagsService.listRecord(where, { [orderBy]: order });
            resultedData = <any>(await this.commonArrayService.formatToDto(TagsDto, resultedData, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Tag Fetched Successfully.'),
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

}