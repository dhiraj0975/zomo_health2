import { appConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import * as fs from "fs";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from '../../translation/translation.service';
import {
    GetErrorReportingInput
} from "./input";
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
const argon2 = require('argon2');
const moment = require('moment-timezone');
const path = require('path');
const S3_URL =  process.env.S3_URL_PROD
@Controller('user')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ErrorReportingController {
    constructor(
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) { }

    @Post('get-error-code-list')
    async getErrorCodeList(@Req() req: Request, @Res() res: Response, @Body() postData: GetErrorReportingInput) {
        try {
            if (!postData?.module) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let data = null;
            let language = (req.lang == undefined || req.lang == '') ? 'eng' : req.lang;
            if (postData?.module == 'challenge') {
                if (postData?.type == 'import_users') {
                    let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${language}/LC_MESSAGES/ErrorReporting/challenge_import_users.json`, userBucket: 'private'}));
                    data = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
                }else if (postData?.type == 'credit_upload') {
                    let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${language}/LC_MESSAGES/ErrorReporting/challenge_credit.json`, userBucket: 'private'}));
                    data = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
                }else if (postData?.type == 'miles_upload') {
                    let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${language}/LC_MESSAGES/ErrorReporting/miles_upload.json`, userBucket: 'private'}));
                    data = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
                }
            }else if (postData?.module == 'incentive') {
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${language}/LC_MESSAGES/ErrorReporting/incentive.json`, userBucket: 'private'}));
                data = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            }else if (postData?.module == 'biometrics') {
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${language}/LC_MESSAGES/ErrorReporting/biometrics_health_import.json`, userBucket: 'private'}));
                data = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            }else if (postData?.module == 'common') {
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${language}/LC_MESSAGES/ErrorReporting/common.json`, userBucket: 'private'}));
                data = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            }
            return res.status(HttpStatus.OK).json({
                success: 1,
                error: 0,
                data: data,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Successfully retrieved error reporting.")
            });
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                statusCode: 401,
                success: 0,
                error: 1,
                data: null,
                message: error?.message,
            });
        }
    }
}
