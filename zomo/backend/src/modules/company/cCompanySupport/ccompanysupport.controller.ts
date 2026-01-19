import { CCompanySupportDto, CommonArrayService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreatecCompanySupportInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { CCompanySupportService } from './ccompanysupport.service';
@Controller('company/company-support')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CCompanySupportController {
    constructor(
        private readonly CCompanySupportService: CCompanySupportService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreatecCompanySupportInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.CCompanySupportService.findOne({org_id: postData?.org_id });
            if(recordDetails){
                postData['updated_by'] = req?.tokenUser?.id || 1
                await this.CCompanySupportService.update({ id: recordDetails.id },{...postData});
                this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_C_COMPANY_SUPPORT, req.tokenUser?.id);
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Support Info Updated Successfully'
                });
            }
            if(!recordDetails){
                postData['created_by'] = req?.tokenUser?.id || 1
                await this.CCompanySupportService.save({...postData});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Support Info Created Successfully'
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
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.CCompanySupportService.findOne({org_id: postData?.org_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CCompanySupportDto, resultedData, req.lang)
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
}