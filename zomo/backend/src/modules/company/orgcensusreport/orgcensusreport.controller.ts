import { appConstant, CommonArrayService, CommonService, OrgCensusReportDto } from '@common-constants';
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
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    PaginateWithCompanyInput,
} from '../../../input';
import { OrgCensusReportService } from './orgcensusreport.service';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
@Controller('company/orgcensusreport')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class OrgCensusReportController {
    constructor(
        private readonly orgCensusReportService: OrgCensusReportService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    /*
     * Function to get paginate list of departments
     * - company_id is mandatory params
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    async paginate(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: PaginateWithCompanyInput,
    ) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (appConstant.ROLE.ADMIN != req.tokenUser?.role_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }else{
                let where = `orgcensusreport.status = 2 AND orgcensusreport.flage = 2`;
                if (postData?.search_str) {
                    where +=  ` AND (DATE_FORMAT(orgcensusreport.report_date, '%Y-%m-%d') = '${postData.search_str}')`;
                }
                const resultedData = await this.orgCensusReportService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(
                        OrgCensusReportDto,
                        resultedData['list'],
                        req.lang
                    )
                );
                await Promise.all(resultedData['list']?.map(async (ele) => {
                    if(ele?.file && ele?.file != ''){
                        let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: `reports/censusreport/${ele.id}/${ele.file}`, userBucket: 'private' }));
                        if(fileData){
                            ele.fileExists = true;
                        }else{
                            ele.fileExists = false;
                        }
                    }
                }));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
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
