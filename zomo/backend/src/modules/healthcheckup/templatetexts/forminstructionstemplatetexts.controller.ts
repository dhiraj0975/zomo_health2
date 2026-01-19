import { tableConstant } from '@common-constants';
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
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { ForminstructionsTemplateTextsService } from './forminstructionstemplatetexts.service';
import { CreateForminstructionsTemplateTextsInput } from './input';
@Controller('health-checkup/form-instructions-templete-texts')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FormInstructionsTempleteTextsController {
    constructor(
        private readonly ForminstructionsTemplateTextsService: ForminstructionsTemplateTextsService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateForminstructionsTemplateTextsInput) {
        try {
            if (!postData?.org_id || !postData?.main_option || !postData?.type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.ForminstructionsTemplateTextsService.save({ ...postData });
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateForminstructionsTemplateTextsInput) {
        try {
            if (!postData?.id || !postData?.org_id || !postData?.main_option || !postData?.type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.ForminstructionsTemplateTextsService.findOne({ id: postData?.id, org_id: postData?.org_id });
            await this.ForminstructionsTemplateTextsService.update({ id: postData?.id, org_id: postData?.org_id }, { ...postData });
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS_TEMPLATE_TEXTS, req.tokenUser?.id);
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
    
}