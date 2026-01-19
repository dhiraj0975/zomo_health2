import { appConstant, CommonArrayService, CommonService, CompanyLanguageDto, tableConstant } from '@common-constants';
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
import { CreateLanguageInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { CompanyLanguagesService } from "./languages.service";
@Controller('company/languages')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class LanguagesController {
    constructor(
        private readonly languagesService: CompanyLanguagesService,
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
            let where = ' ';
            if(postData?.company_id) {
                where = `language.company_id = '${postData?.company_id}'`;
            }
            const languageData = await this.translatorService.getLanguagesData();
            const validTitles: string[] = languageData.map(lang => lang.name).filter(Boolean);
            if (validTitles.length > 0) {
                where +=  ` AND languages.title in(${validTitles.map(lang => `'${lang}'`).join(',')})`;
            }
            if (postData?.search_str) {
                const condition =  this.commonService.generateDynamicSearchQuery(postData?.search_str,'language.language_id');
                where = postData?.company_id ? 'AND ' + condition : condition;
            }
            where += ` AND (active_plugin.id IS NOT NULL)`;
            const resultedData = await this.languagesService.paginateList(
                where,
                postData,
                req
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanyLanguageDto, resultedData['list'], req.lang)
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
            if (!postData?.id && !postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `language.status != 2`;
            if(postData?.id){
                where +=  ` AND language.id = ${postData?.id}`;
            }
            if(postData?.company_id){
                where +=  ` AND language.company_id = ${postData?.company_id}`;
            }
            const languageData = await this.translatorService.getLanguagesData();
            const validTitles: string[] = languageData.map(lang => lang.name).filter(Boolean);
            if (validTitles.length > 0) {
                where +=  ` AND languages.title in(${validTitles.map(lang => `'${lang}'`).join(',')})`;
            }
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
                await this.commonArrayService.formatToDto(CompanyLanguageDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateLanguageInput) {
        try {
            if (
                !postData?.company_id ||
                !postData?.language_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.language_id && !postData?.language_id.includes('1')){
                postData.language_id = `1,${postData?.language_id}`;
            }
            postData.language_id = postData?.language_id.trim().replace(/\s/g, '');
            if(postData?.language_id){
                postData.language_id = [...new Set(postData.language_id.split(','))].join(',');
            }
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
            const where = {id: postData?.id, status: Not(2)};
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
            await this.languagesService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {language_id: recordDetails}, tableConstant.COMPANIES.TBL_LG_COMPANY_LANGUAGES, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateLanguageInput) {
        try {
            if (
                !postData?.id && !postData?.company_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { status: Not(2)};
            if(postData?.id){
                where['id']= postData?.id;
            }
            if(postData?.company_id){
                where['company_id']= postData?.company_id;
            }
            if(postData?.language_id && !postData?.language_id.includes('1')){
                postData.language_id = `1,${postData?.language_id}`;
            }
            if(postData?.language_id){
                postData.language_id = [...new Set(postData.language_id.split(','))].join(',');
            }
            const recordDetails = await this.languagesService.findOne(where);
            if (!recordDetails) {
                await this.languagesService.save(postData);
            }
            if(postData?.language_id){
                postData.language_id = postData?.language_id.trim().replace(/\s/g, '');
            }
            await this.languagesService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_LG_COMPANY_LANGUAGES, req.tokenUser?.id);
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
            let where = [appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH].includes(req.tokenUser?.role_id) ? `language.id IS NOT NULL AND language.status != 2` : [appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id) ? `language.status = 1` : `language.status != 2`;
            if(postData?.company_id){
                where += ` AND language.company_id = '${postData?.company_id}'`;
            }
            let tableData = [];
            /*if(![appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)){
                tableData.push(tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS);
            }*/
            const languageData = await this.translatorService.getLanguagesData();
            const validTitles: string[] = languageData.map(lang => lang.name).filter(Boolean);
            if (validTitles.length > 0) {
                where +=  ` AND languages.title in(${validTitles.map(lang => `'${lang}'`).join(',')})`;
            }
            let resultedData = await this.languagesService.listRecord(where, null, tableData);
            if(!resultedData || resultedData?.length == 0){
                let recordDetails = await this.languagesService.findOne(`language.company_id = '${postData?.company_id}' AND language.status != 2`);
                if(!recordDetails){
                    await this.languagesService.save({company_id: postData?.company_id, language_id: "1"});
                }
                resultedData = await this.languagesService.listRecord(where, null, tableData);
            }
            if(resultedData && resultedData[0]?.['languages']?.length == 0){
                let data = await this.languagesService.update({id: resultedData[0]['id']},{language_id: "1"});
                resultedData = await this.languagesService.listRecord(where);
            }
            if(resultedData && resultedData.length == 0){
                resultedData = await this.languagesService.listRecord(`language.company_id = '${postData?.company_id}' AND language.status != 2`);
                if(resultedData && resultedData.length && resultedData[0]['languages'] && resultedData[0]['languages'].length){
                    resultedData[0]['languages'] = resultedData[0]['languages'].filter(language => language.id == 1);
                }
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanyLanguageDto, resultedData, req.lang)
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
}