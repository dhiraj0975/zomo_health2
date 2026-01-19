import { tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateUsersTempsInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { UsersTempsService } from './userstemps.service';
@Controller('health-checkup/users-temps')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UsersTempsController {
    constructor(
        private readonly UsersTempsService: UsersTempsService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUsersTempsInput) {
        try {
            await this.UsersTempsService.save({ ...postData });
            return res.status(HttpStatus.OK).json({
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
    @Post('Update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUsersTempsInput) {
        try {
            const recordDetails = await this.UsersTempsService.findOne({
                id: postData?.id,
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.UsersTempsService.update({ id: postData?.id }, { ...postData });
            this.activityLogService.create(recordDetails, { postData }, tableConstant.HEALTH_CHECKUP.TBL_HC_USERS_TEMPS, req.tokenUser?.id, 'delete');
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }   
}