import { CommonArrayService, CommonFileService, CommonService, tableConstant, UserTabSettingsDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateUserTabSettingsInput, PaginateInput } from '../../../input';
import { TranslationService } from '../../translation/translation.service';
import { UserTabSettingsService } from "./usertabsettings.service";
@Controller('user/tab-settings')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserTabSettingsController {
    constructor(
        private readonly userTabSettingsService: UserTabSettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `userTabSettings.status != 0`;
            if(postData?.user_id){
                where += ` AND userTabSettings.user_id = ${postData?.user_id}`
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'userTabSettings.s_theme');
            }
            const resultedData = await this.userTabSettingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserTabSettingsDto, resultedData['list'], req.lang)
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
            if (!postData?.id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.user_id ? { id: postData?.id, user_id: postData?.user_id } : { id: postData?.id}: { user_id: postData?.user_id};
            this.commonFileService.addMembershipCodeCondition(req, where)
            let recordDetails = await this.userTabSettingsService.findOne(where);
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
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(UserTabSettingsDto, recordDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserTabSettingsInput) {
        try {
            if (
                !postData?.user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let result = await this.userTabSettingsService.save(postData);
            if (result) {
                let result = await this.userTabSettingsService.save(postData);
                let data = 1
                if (result && data == 0) {
                    const { user_id, ...filteredTabsetting } = postData;
                    let resultDetails = {
                        tabsetting: filteredTabsetting,
                    }
                    let fileName = `tab_setting_${postData?.user_id}.json`
                    let bucketFileName = `local/tabsetting/${postData?.user_id}/${fileName}`;
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'), filename: bucketFileName, userBucket: 'public' }));
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
            const where = { id: postData?.id };
            this.commonFileService.addMembershipCodeCondition(req, where)
            const recordDetails = await this.userTabSettingsService.findOne(where);
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
            await this.userTabSettingsService.update(where,{ status: postData?.status });
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_TAB_SETTINGS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserTabSettingsInput) {
        try {
            if (
                !postData?.id &&
                !postData?.user_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.user_id ? { id: postData?.id, user_id: postData?.user_id } : { id: postData?.id}: { user_id: postData?.user_id };
            this.commonFileService.addMembershipCodeCondition(req, where)
            const recordDetails = await this.userTabSettingsService.findOne(where);
            if (!recordDetails) {
                let result = await this.userTabSettingsService.save(postData);
                if (result) {
                    const { user_id, ...filteredTabsetting } = postData;
                    let resultDetails = {
                        tabsetting : filteredTabsetting,
                    }
                    let fileName = `tab_setting_${postData?.user_id}.json`
                    let bucketFileName = `local/tabsetting/${postData?.user_id}/${fileName}`;
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'), filename: bucketFileName, userBucket: 'public' }));
                }
            }
            else {
                let result = await this.userTabSettingsService.update(where, postData);
                this.activityLogService.create(recordDetails, postData, tableConstant.TBL_USERS, req.tokenUser?.id);
                if (result) {
                    const { user_id, ...filteredTabsetting } = postData;
                    let resultDetails = {
                        tabsetting : filteredTabsetting,
                    }
                    let fileName = `tab_setting_${postData?.user_id}.json`
                    let bucketFileName = `local/tabsetting/${postData?.user_id}/${fileName}`;
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'), filename: bucketFileName, userBucket: 'public' }));
                }
            }
            return res. status(HttpStatus.OK).json({
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
            const where = {};
            let resultedData = await this.userTabSettingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserTabSettingsDto, resultedData, req.lang)
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
    @Post('update-tabsetting-modules')
    async updateSidemenuModules(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { };
            let resultedData = await this.userTabSettingsService.listRecord(where);
            for (let item of resultedData) {
                const { id, user_id, created, updated, ...filteredTabsetting } = item;
                let resultDetails = {
                    tabsetting: filteredTabsetting,
                }
                let fileName = `tab_setting_${user_id}.json`
                let bucketFileName = `local/tabsetting/${user_id}/${fileName}`;
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'), filename: bucketFileName, userBucket: 'public' }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: '',
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
