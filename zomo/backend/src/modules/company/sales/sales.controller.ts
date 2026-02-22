import { UserService } from '@/modules/user/user/user.service';
import { appConstant, CommonArrayService, CommonFileService, CommonService, CompanySalesDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { document_Filter, fileName, filesFilter } from 'src/utils/image-upload.utils';
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCompanySalesInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { SalesService } from './sales.service';

const path = require('path');
@Controller('company/sales')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class SalesController {
    constructor(
        private readonly companySalesService: SalesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly commonFileService: CommonFileService,
        private readonly userService: UserService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = '';
            if(postData?.company_id) {
                where = `AND companySales.org_id = '${postData?.company_id}'`;
            }
            if (postData?.search_str) {
                const conditionString =`companySales.demo_lead LIKE '%${postData?.search_str}%'`;
                where += " AND (" + conditionString + ")";
            }
            const resultedData = await this.companySalesService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanySalesDto, resultedData['list'], req.lang)
            );
            let brokerList = appConstant.BROKER_LIST;
            let industryList = appConstant.ORG_INDUSTRY_LIST;
            let packageList = appConstant.ORG_PACKAGE_LIST;
            await Promise.all(resultedData['list'].map(async (company: any) => { 
                if(company?.company_contract?.broker){
                    company.company_contract['broker'] = brokerList.find((broker) => broker.name === company?.company_contract?.broker);
                }
                if(company.industry){
                    company.company_contract['industry'] = industryList.find((industry) => industry.name === company?.company_contract?.industry);
                }
                if(company.package){
                    company.company_contract['package'] = packageList.find((element) => element.id === company?.company_contract?.package);
                }
                let userCount: any = await this.userService.countUsers(`user.role_id IN(2,16) AND user.status = 1 AND user.org_id IN (${postData?.org_id})`, ['id'])
                if(userCount != 0){
                    company['user_count'] = userCount;
                }
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id} : { id: postData?.id}: { org_id: postData?.org_id};
            let companyDetails: any = await this.companySalesService.findOne(where);
            if (!companyDetails) {
                await this.companySalesService.save({...postData, created_by: req.tokenUser?.id});
                companyDetails = await this.companySalesService.findOne(where);
            }
            companyDetails = <any>(
                await this.commonArrayService.formatToDto(CompanySalesDto, companyDetails, req.lang)
            );
            if(companyDetails?.company_contract?.broker){
                let brokerList = appConstant.BROKER_LIST;
                companyDetails.company_contract['broker'] = brokerList.find((broker) => broker.name == companyDetails?.company_contract?.broker);
            }
            if(companyDetails?.company_contract?.industry){
                let industryList = appConstant.ORG_INDUSTRY_LIST;
                companyDetails.company_contract['industry'] = industryList.find((industry) => industry.id == companyDetails?.company_contract?.industry) ?? companyDetails?.company_contract?.industry;
            }
            if(companyDetails?.company_contract?.package){
                let packageList = appConstant.ORG_PACKAGE_LIST;
                companyDetails.company_contract['package'] = packageList.find((element) => element.id == companyDetails?.company_contract?.package) ?? companyDetails?.company_contract?.package;
            }
            let userCount: any = await this.userService.countUsers(`user.role_id IN(2,16) AND user.status = 1 AND user.org_id IN (${postData?.org_id})`, ['id'])
            if(userCount != 0){
                companyDetails['user_count'] = userCount;
            }  
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: companyDetails,
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
    @UseInterceptors(
        FileInterceptor("demo_recording", {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.COVID_ASSETS_TEMP_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanySalesInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.org_id
            ) {
                if (file && file.filename && file.fieldname === 'demo_recording') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let savedData = await this.companySalesService.save({...postData, created_by: req.tokenUser?.id});
            if(savedData){
                if (file && file.fieldname === 'attachment' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    let filename = `demofiles/${postData?.org_id}/demofiles_${this.commonService.generateMD5(savedData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                    await this.companySalesService.update({id: savedData['id']},{demo_recording: filename});
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
            if (file && file.filename && file.fieldname === 'demo_recording') {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.companySalesService.findOne(where);
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
            await this.companySalesService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {expense_description_amount: recordDetails}, tableConstant.COMPANIES.TBL_COMPANY_SALES, req.tokenUser?.id, 'delete');
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
    @UseInterceptors(
        FileInterceptor("demo_recording", {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.COVID_ASSETS_TEMP_PATH}`,
                filename: fileName
            }),
            fileFilter: document_Filter
        }),
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanySalesInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.id && !postData?.org_id
            ) {
                if (file && file.filename && file.fieldname === 'demo_recording') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            const recordDetails = await this.companySalesService.findOne(where);
            if (!recordDetails) {
                let savedData = await this.companySalesService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
                postData['id'] = savedData['id'];
            }
            if (file && file.fieldname === 'demo_recording' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `demofiles/${postData?.org_id}/demofiles_${this.commonService.generateMD5(postData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                postData.demo_recording = filename;
            }
            await this.companySalesService.update(where, {...postData, updated_by: req.tokenUser?.id});
            this.activityLogService.create(recordDetails, {...postData, updated_by: req.tokenUser?.id}, tableConstant.COMPANIES.TBL_COMPANY_SALES, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'data updated successfully.'),
            });
        } catch (error) {
            if (file && file.filename && file.fieldname === 'demo_recording') {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
            let resultedData = await this.companySalesService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanySalesDto, resultedData, req.lang)
            );
            let brokerList = appConstant.BROKER_LIST;
            let industryList = appConstant.ORG_INDUSTRY_LIST;
            let packageList = appConstant.ORG_PACKAGE_LIST;
            await Promise.all(resultedData.map(async (company: any) => { 
                if(company?.company_contract?.broker){
                    company.company_contract['broker'] = brokerList.find((broker) => broker.name === company?.company_contract?.broker);
                }
                if(company.industry){
                    company.company_contract['industry'] = industryList.find((industry) => industry.name === company?.company_contract?.industry);
                }
                if(company.package){
                    company.company_contract['package'] = packageList.find((element) => element.id === company?.company_contract?.package);
                }
                let userCount: any = await this.userService.countUsers(`user.role_id IN(2,16) AND user.status = 1 AND user.org_id IN (${postData?.org_id})`, ['id'])
                if(userCount != 0){
                    company['user_count'] = userCount;
                }
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
}