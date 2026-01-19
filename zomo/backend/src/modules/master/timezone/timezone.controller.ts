import { CommonArrayService, TimezoneDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { TranslationService } from "src/modules/translation/translation.service";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { ActivityLogService } from "../activitylog/activitylog.service";
@Controller('timezone')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class TimezoneController {
    constructor(
        @Inject('TIMEZONE_SERVICE')
        private client: ClientProxy,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    /*
     * Function to get details of postcode
     * - postcode and country is mandatory params
     */
    @Post('find')
    async find(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let timezoneDetails = await lastValueFrom(this.client.send({cmd: 'find_postcode'}, {}));
            if (timezoneDetails.length === 0) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            timezoneDetails = await this.commonArrayService.formatToDto(TimezoneDto, timezoneDetails, req.lang);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: timezoneDetails,
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
