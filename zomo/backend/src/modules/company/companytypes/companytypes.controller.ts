import { CommonService, tableConstant } from "@common-constants";
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put, Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Like, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateCompanyTypesInput, PaginateInput, UpdateCompanyTypesInput } from "../../../input";
import { CompanyTypesService } from "./companytypes.service";
@Controller('companytypes')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CompanyTypesController {
    constructor(
        private readonly companyTypesService: CompanyTypesService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly commonService: CommonService,
    ) {}
    /*
     * Function to get paginate list of company types
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    async paginate(@Req() req: Request,@Res() res: Response, @Body() postData: PaginateInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `company_type.status !=2 `;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'company_type.company_type');
            }
            const result = await this.companyTypesService.paginateList(
                where,
                postData,
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
    /*
     * Function to get details of company type
     * - id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const companyTypeDetails = await this.companyTypesService.findOne({
                id: postData?.id,
            });
            if (!companyTypeDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: companyTypeDetails,
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
    /*
     * Function to get list of company types
     * - can pass search_str, order_by, order
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let where = { status: Not(2)};
            if (postData?.search_str) {
                where['company_type'] = Like('%' + postData?.search_str + '%') ;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            const result = await this.companyTypesService.listRecord(where, { [orderBy]: order });
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
    /*
     * Use to create new company type
     * - company_type is mandatory params
     */
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyTypesInput) {
        try {
            if (!postData?.company_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.company_type){
                postData.company_type = postData?.company_type.trim();
            }
            const companyTypeDetails = await this.companyTypesService.findOne([{ company_type: postData?.company_type }]);
            if (companyTypeDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DUPLICATE_ENTRY"));
            }
            await this.companyTypesService.save(postData);
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
    /*
     * Use to update company type
     * - id & company_type are mandatory params
     */
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCompanyTypesInput) {
        try {
            if (!postData?.id || !postData?.company_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const companyTypeDetails = await this.companyTypesService.findOne({
                id: postData?.id,
            });
            if (!companyTypeDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            const companyTypeDuplicate = await this.companyTypesService.findOne({ company_type: postData?.company_type, id: Not(postData?.id) });
            if (companyTypeDuplicate) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DUPLICATE_ENTRY"));
            }
            await this.companyTypesService.update(
                { id: postData?.id },
                {
                    ...postData,
                },
            );
            this.activityLogService.create(companyTypeDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_TYPE, req.tokenUser?.id);
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
