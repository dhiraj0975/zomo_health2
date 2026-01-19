import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, CompanyContractDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from '@nestjs/microservices';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { fileName, imgFilter } from 'src/utils/image-upload.utils';
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCompanyContractInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ContractService } from "./contract.service";
const path = require('path');
@Controller('company/contract')
@UseGuards(TokenGuard, RoleGuard)
export class ContractController {
    constructor(
        private readonly companyContractService: ContractService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly commonFileService: CommonFileService,
        private readonly commonDateService: CommonDateService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = '';
            if(postData?.company_id) {
                where = `AND companyContract.org_id = '${postData?.company_id}'`;
            }
            if (postData?.search_str) {
                const conditionString =`companyContract.billing_email LIKE '%${postData?.search_str}%' OR companyContract.billing_name LIKE '%${postData?.search_str}%' OR companyContract.engagement_manager_name LIKE '%${postData?.search_str}%' OR companyContract.expense_description_amount LIKE '%${postData?.search_str}%' OR companyContract.reminder_contract LIKE '%${postData?.search_str}%' OR companyContract.contract_reminder_email LIKE '%${postData?.search_str}%'`;
                where += " AND (" + conditionString + ")";
            }
            const resultedData = await this.companyContractService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanyContractDto, resultedData['list'], req.lang)
            );
            let brokerList = appConstant.BROKER_LIST;
            let industryList = appConstant.ORG_INDUSTRY_LIST;
            await Promise.all(resultedData['list'].map(async (contract: any) => { 
                if(contract.broker){
                    contract['broker'] = brokerList.find((broker) => broker.name === contract.broker);
                }
                if(contract.industry){
                    contract['industry'] = industryList.find((industry) => industry.name === contract.industry);
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id} : { id: postData?.id}: { org_id: postData?.org_id};
            let contractDetails: any = await this.companyContractService.findOne(where);
            if (!contractDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            contractDetails = <any>(
                await this.commonArrayService.formatToDto(CompanyContractDto, contractDetails, req.lang)
            );
            if(contractDetails.broker){
                let brokerList = appConstant.BROKER_LIST;
                contractDetails['broker'] = brokerList.find((broker) => broker.name === contractDetails.broker);
            }
            if(contractDetails.industry){
                let industryList = appConstant.ORG_INDUSTRY_LIST;
                contractDetails['industry'] = industryList.find((industry) => industry.name === contractDetails.industry);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: contractDetails,
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
        FileFieldsInterceptor(
            [
                { name: 'csa', maxCount: 5 },
                { name: 'baa', maxCount: 1 },
                { name: 'additional_agreement', maxCount: 5 },
            ],
            {
                limits: { fileSize: appConstant.FILE_SIZE_100MB },
                storage: diskStorage({
                    destination: `${appConstant.COMPANY_LOGO_PATH}`,
                    filename: fileName,
                }),
                fileFilter: imgFilter,
            },
        ),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyContractInput, @UploadedFiles() files: {
    csa?: Express.Multer.File[],
    baa?: Express.Multer.File[],
    additional_agreement?: Express.Multer.File[],
    }) {
        try {
            if (
                !postData?.org_id
            ) {
                if (files && files.csa && files.csa?.length) {
                    files.csa.forEach(async(ele) => await this.commonFileService.removeFileFromLocal(ele.path));
                }
                if (files && files.baa && files.baa[0].fieldname === 'baa' && files.baa[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.baa[0].path);
                }
                if (files && files.additional_agreement && files.additional_agreement?.length) {
                    files.additional_agreement.forEach(async(ele) => await this.commonFileService.removeFileFromLocal(ele.path));
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (files && Object.keys(files).length > 0) {
                const csaImageData = [];
                const baaImageData = [];
                const imageData = [];
                if( files && files.csa && files.csa[0].fieldname === 'csa' && files.csa[0].filename) {
                    for (let fileData of files.csa) {
                        if (fileData.fieldname == 'csa') {
                            fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                            fileData.filename = `comcsa/${postData['org_id']}/comcsa_${this.commonService.generateMD5(postData['org_id'].toString())}_${this.commonDateService.DateTimeFormat('now','timestamp')}_${await this.commonService.generatePassKey()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'private'}));
                            csaImageData.push(fileData.filename);
                        }
                    }
                }
                if( files && files.baa && files.baa[0].fieldname === 'baa' && files.baa[0].filename) {
                    for (let fileData of files.baa) {
                        if (fileData.fieldname == 'baa') {
                            fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                            fileData.filename = `combaa/${postData['org_id']}/combaa_${this.commonService.generateMD5(postData['org_id'].toString())}_${this.commonDateService.DateTimeFormat('now','timestamp')}_${await this.commonService.generatePassKey()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'private'}));
                            baaImageData.push(fileData.filename);
                        }
                    }
                }
                if( files && files.additional_agreement && files.additional_agreement[0].fieldname === 'additional_agreement' && files.additional_agreement[0].filename) {
                    for (let fileData of files.additional_agreement) {
                        if (fileData.fieldname == 'additional_agreement') {
                            fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                            fileData.filename = `comagreement/${postData['org_id']}/comagreement_${this.commonService.generateMD5(postData['org_id'].toString())}_${this.commonDateService.DateTimeFormat('now','timestamp')}_${await this.commonService.generatePassKey()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'private'}));
                            imageData.push(fileData.filename);
                        }
                    }
                }
                
                if(csaImageData && csaImageData.length> 0){
                    postData['csa'] = JSON.stringify(csaImageData);
                }
                if(baaImageData && baaImageData.length> 0){
                    postData['baa'] = baaImageData[0];
                }
                if(imageData && imageData.length> 0){
                    postData['additional_agreement'] = JSON.stringify(imageData);
                }
            }
            await this.companyContractService.save({...postData, created_by: req.tokenUser?.id});
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            if (files && files.csa && files.csa?.length) {
                files.csa.forEach(async(ele) => await this.commonFileService.removeFileFromLocal(ele.path));
            }
            if (files && files.baa && files.baa[0].fieldname === 'baa' && files.baa[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.baa[0].path);
            }
            if (files && files.additional_agreement && files.additional_agreement?.length) {
                files.additional_agreement.forEach(async(ele) => await this.commonFileService.removeFileFromLocal(ele.path));
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.companyContractService.findOne(where);
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
            await this.companyContractService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {expense_description_amount: recordDetails}, tableConstant.COMPANIES.TBL_COMPANY_CONTRACT, req.tokenUser?.id, 'delete');
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
        FileFieldsInterceptor(
            [
                { name: 'csa', maxCount: 5 },
                { name: 'baa', maxCount: 1 },
                { name: 'additional_agreement', maxCount: 5 },
                { name: 'branding_guideline_image', maxCount: 1 },
            ],
            {
                limits: { fileSize: appConstant.FILE_SIZE_100MB },
                storage: diskStorage({
                    destination: `${appConstant.COMPANY_LOGO_PATH}`,
                    filename: fileName,
                }),
                fileFilter: imgFilter,
            },
        ),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyContractInput, @UploadedFiles() files: {
    csa?: Express.Multer.File[],
    baa?: Express.Multer.File[],
    additional_agreement?: Express.Multer.File[],
    branding_guideline_image?: Express.Multer.File[],
    }) {
        try {
            if (
                !postData?.id && !postData?.org_id
            ) {
                if (files && files.csa && files.csa?.length) {
                    files.csa.forEach(async(ele) => await this.commonFileService.removeFileFromLocal(ele.path));
                }
                if (files && files.baa && files.baa[0].fieldname === 'baa' && files.baa[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.baa[0].path);
                }
                if (files && files.additional_agreement && files.additional_agreement?.length) {
                    files.additional_agreement.forEach(async(ele) => await this.commonFileService.removeFileFromLocal(ele.path));
                }
                if (files && files.branding_guideline_image && files.branding_guideline_image[0].fieldname === 'branding_guideline_image' && files.branding_guideline_image[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.branding_guideline_image[0].path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            const recordDetails = await this.companyContractService.findOne(where);
            if (!recordDetails) {
                await this.companyContractService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            let csaImageData = [];
            let baaImageData = [];
            let imageData = [];
            let brandingImageData = [];
            if(postData?.additional_agreement){
                imageData = Array.isArray(postData?.additional_agreement) ? postData?.additional_agreement : postData?.additional_agreement?.split(',');
            }
            else if(files && files.additional_agreement && files.additional_agreement[0].fieldname === 'additional_agreement' && recordDetails?.additional_agreement) {
                imageData.push(...JSON.parse(recordDetails?.additional_agreement));
            }
            if(postData?.csa){
                csaImageData = Array.isArray(postData?.csa) ? postData?.csa : postData?.csa?.split(',');
            }
            else if(files && files.csa && files.csa[0].fieldname === 'csa' && recordDetails?.csa) {
                csaImageData.push(...JSON.parse(recordDetails?.csa));
            }
            if(postData?.baa){
                baaImageData = Array.isArray(postData?.baa) ? postData?.baa : postData?.baa?.split(',');
            }
            else if(files && files.baa && files.baa[0].fieldname === 'baa' && recordDetails?.baa) {
                baaImageData.push(...JSON.parse(recordDetails?.baa));
            }
            if(postData?.branding_guideline_image){
                brandingImageData = Array.isArray(postData?.branding_guideline_image) ? postData?.branding_guideline_image : postData?.branding_guideline_image?.split(',');
            }
            else if(files && files.branding_guideline_image && files.branding_guideline_image[0].fieldname === 'branding_guideline_image' && recordDetails?.branding_guideline_image) {
                brandingImageData.push(...JSON.parse(recordDetails?.branding_guideline_image));
            }
            if (files && Object.keys(files).length > 0) {
                if(files && files.csa && files.csa[0].fieldname === 'csa' && files.csa[0].filename) {
                    for (let fileData of files.csa) {
                        if (fileData.fieldname == 'csa') {
                            fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                            fileData.filename = `comcsa/${postData['org_id']}/comcsa_${this.commonService.generateMD5(postData['org_id'].toString())}_${this.commonDateService.DateTimeFormat('now','timestamp')}_${await this.commonService.generatePassKey()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'private'}));
                            csaImageData.push(fileData.filename);
                        }
                    }
                }
                if(files && files.baa && files.baa[0].fieldname === 'baa' && files.baa[0].filename) {
                    for (let fileData of files.baa) {
                        if (fileData.fieldname == 'baa') {
                            fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                            fileData.filename = `combaa/${postData['org_id']}/combaa_${this.commonService.generateMD5(postData['org_id'].toString())}_${this.commonDateService.DateTimeFormat('now','timestamp')}_${await this.commonService.generatePassKey()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'private'}));
                            baaImageData.push(fileData.filename);
                        }
                    }
                }
                if(files && files.branding_guideline_image && files.branding_guideline_image[0].fieldname === 'branding_guideline_image' && files.branding_guideline_image[0].filename) {
                    for (let fileData of files.branding_guideline_image) {
                        if (fileData.fieldname == 'branding_guideline_image') {
                            fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                            fileData.filename = `combimg/${postData['org_id']}/combimg_${this.commonService.generateMD5(postData['org_id'].toString())}_${this.commonDateService.DateTimeFormat('now','timestamp')}_${await this.commonService.generatePassKey()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'public'}));
                            brandingImageData.push(fileData.filename);
                        }
                    }
                }
                if(files && files.additional_agreement && files.additional_agreement[0].fieldname === 'additional_agreement' && files.additional_agreement[0].filename) {
                    for (let fileData of files.additional_agreement) {
                        if (fileData.fieldname == 'additional_agreement') {
                            fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                            fileData.filename = `comagreement/${postData['org_id']}/comagreement_${this.commonService.generateMD5(postData['org_id'].toString())}_${this.commonDateService.DateTimeFormat('now','timestamp')}_${await this.commonService.generatePassKey()}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(fileData.path),  filename: fileData.filename, userBucket: 'private'}));
                            imageData.push(fileData.filename);
                        }
                    }
                } 
            }
            if(csaImageData && csaImageData.length> 0){
                if(csaImageData.length> 5){
                    csaImageData = csaImageData.slice(-5);
                }
                postData['csa'] = JSON.stringify(csaImageData);
            }
            if(baaImageData && baaImageData.length> 0){
                if(baaImageData.length> 1){
                    baaImageData = baaImageData.slice(-1);
                }
                postData['baa'] = baaImageData[0];
            }
            if(brandingImageData && brandingImageData.length> 0){
                if(brandingImageData.length> 1){
                    brandingImageData = brandingImageData.slice(-1);
                }
                postData['branding_guideline_image'] = brandingImageData[0];
            }
            if(imageData && imageData.length> 0){
                if(imageData.length> 5){
                    imageData = imageData.slice(-5);
                }
                postData['additional_agreement'] = JSON.stringify(imageData);
            }
            await this.companyContractService.update(where, {...postData, updated_by: req.tokenUser?.id});
            this.activityLogService.create(recordDetails, {...postData, updated_by: req.tokenUser?.id}, tableConstant.COMPANIES.TBL_COMPANY_CONTRACT, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            if (files && files.csa && files.csa?.length) {
                files.csa.forEach(async(ele) => await this.commonFileService.removeFileFromLocal(ele.path));
            }
            if (files && files.baa && files.baa[0].fieldname === 'baa' && files.baa[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.baa[0].path);
            }
            if (files && files.additional_agreement && files.additional_agreement?.length) {
                files.additional_agreement.forEach(async(ele) => await this.commonFileService.removeFileFromLocal(ele.path));
            }
            if (files && files.branding_guideline_image && files.branding_guideline_image[0].fieldname === 'branding_guideline_image' && files.branding_guideline_image[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.branding_guideline_image[0].path);
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {};
            let resultedData = await this.companyContractService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanyContractDto, resultedData, req.lang)
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