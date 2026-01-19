import { ChallengeExternalLinkUserDto, CommonArrayService, CommonService, SortDirection, tableConstant } from '@common-constants';
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
import { AccessGuard, TokenGuard } from '../../../guard';
import { PaginateWithChallengeInput } from "../../../input";
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { ChallengeExternalLinkService } from "./externallinkuser.service";
import { AddExternalLinkUserInput, EditExternalLinkUserInput } from './input';
@Controller('challenge/schedule-challenge/external-links-user')
@UseGuards(TokenGuard, AccessGuard)
export class ChalengeExternalLinkController {
    constructor(
        private readonly challengeExternalLinkService: ChallengeExternalLinkService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `elu.schedule_id = '${postData?.schedule_id}' AND elu.status = '1'`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'elu.user_id');
            }
            let resultedData = await this.challengeExternalLinkService.paginate(
                {page: postData.page,limit: postData?.limit, order: postData?.order as SortDirection, orderBy: postData?.order_by},
                where,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ChallengeExternalLinkUserDto, resultedData['list'], req.lang)
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
    async add(@Req() req: Request, @Res() res: Response, @Body() postData: AddExternalLinkUserInput) {
        try {
            if (!postData?.schedule_id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const challengeDetails = await this.scheduleChallengeService.challengeFindOne(['sc.id','sc.status'],`sc.id = ${postData?.schedule_id} AND challenge.challenge_type = 'E' AND sc.status != 2`);
            if (!challengeDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.challengeExternalLinkService.create({...postData});
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
    async edit(@Req() req: Request, @Res() res: Response, @Body() postData: EditExternalLinkUserInput) {
        try {
            if (!postData?.id && !postData?.schedule_id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.challengeExternalLinkService.getOne({ id: postData?.id});
            await this.challengeExternalLinkService.updateRecord({ id: postData?.id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER, req.tokenUser?.id);
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: EditExternalLinkUserInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { id: postData?.id};
            if(req.tokenUser?.role_id != 1){
                where['status']  = 1;
            }
            let resultedData = await this.challengeExternalLinkService.getOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ChallengeExternalLinkUserDto, resultedData, req.lang)
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
    @Post('delete')
    async remove(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let recordData = await this.challengeExternalLinkService.getOne(where);
            if (!recordData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.challengeExternalLinkService.updateRecord({ id: postData?.id },{status: 2});
            this.activityLogService.create(recordData, {status:2}, tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER, req.tokenUser?.id, 'delete');
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
