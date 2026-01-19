import { appConstant, BannedWordDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateBannedWordInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    PaginateWithChallengeInput,
    UpdateBannedWordInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { BannedWordService } from './bannedword.service';
@Controller('chat/banned-word')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class BannedWordController {
    constructor(
        private readonly bannedWordService: BannedWordService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id))  ? `bw.status != 2` : `bw.status = 1`;
            if (postData?.org_id) {
                where += ` AND bw.org_id in(0,${postData?.org_id})`;
            }
            else{
                if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN){
                    where +=  ` AND bw.org_id = 0`
                }
            }
            if (postData?.search_str) {
                where += ` AND bw.showhide = 1`;
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'bw.word');
            }
            const resultedData = await this.bannedWordService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BannedWordDto, resultedData['list'], req.lang)
            );
            resultedData['list'] = await Promise.all(resultedData['list']?.map(ele => {
                if(ele.showhide == 0){
                    ele.word = '---';
                }
                return ele;
            }));
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBannedWordInput) {
        try {
            if (!postData?.org_id && req?.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.bannedWordService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'The Word has been saved')
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateBannedWordInput) {
        try {
            let message = 'The Word has been updated';
            if ((!postData?.id || !postData?.org_id) && req?.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.bannedWordService.findOne({
                id: postData?.id,org_id: postData?.org_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.bannedWordService.update({ id: postData?.id, org_id: postData?.org_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_BANNED_WORD, req.tokenUser?.id);
            if(postData.hasOwnProperty('status')){
                if(postData.status == 1 && recordDetails.status != 1){
                    message = 'The Word has been activated';
                }
                if(postData.status == 0 && recordDetails.status != 0){
                    message = 'The Word has been deactivated';
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,message)
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if ((!postData?.id || !postData?.org_id) && req?.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.bannedWordService.findOne({
                id: postData?.id,org_id: postData?.org_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.bannedWordService.update({id: postData?.id, org_id: postData?.org_id},{status: 2});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_BANNED_WORD, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'The Word has been deleted'),
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            if ((!postData?.id || !postData?.org_id) && req?.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, org_id: postData?.org_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let resultedData = await this.bannedWordService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(BannedWordDto, resultedData, req.lang)
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
    async list(@Req() req: Request,@Res() res: Response, @Body() postData: any){
        try {
            let where = { status: Not(2)};           
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }                                
            let result: any = await this.bannedWordService.listRecord(where);
            result = <any>(
                await this.commonArrayService.formatToDto(BannedWordDto, result, req.lang)
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
}