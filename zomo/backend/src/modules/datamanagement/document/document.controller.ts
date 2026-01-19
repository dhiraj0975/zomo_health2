import { appConstant, CommonArrayService, CommonFileService, CommonService, DataManagementDocumentDto, tableConstant } from '@common-constants';
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
    UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { BrokerService } from 'src/modules/broker/broker.service';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { document_Filter, fileName } from "src/utils/image-upload.utils";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { CreateDocumentInput, PaginateWithFileOrganizationInput } from '../input';
import { DocumentService } from "./document.service";
import { GetDocumentInput } from './input';
const path = require('path');
@Controller('data-management/document')
@UseGuards(TokenGuard, RoleGuard)
export class DocumentController {
    constructor(
        private readonly documentService: DocumentService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
        private readonly brokerService: BrokerService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithFileOrganizationInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id) && !postData?.is_global) {
                if (!postData?.organization_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let user = Object.create(req.tokenUser)
            let roleId : number = user.role_id;
            let userId : number = user.id;
            let where: string = (roleId == appConstant.ROLE.ADMIN || roleId == appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER || roleId == appConstant.ROLE.WCH) ? `document.status != 2` : `document.status = 1`;
            // Check for Broker-Admin, Broker, Regional-Admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(roleId) && !postData?.is_global) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.organization_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }  
            if(postData?.organization_id){
                where +=` AND document.organization_id = '${postData?.organization_id}'`;
            }
            if(postData?.is_global){
                where +=` AND document.is_global = '${postData?.is_global}'`;
            }
            if (roleId == appConstant.ROLE.WCH) {
                where += ` AND document.created_by IN (${userId},1)`;
            }
            if (postData?.search_str) {
                if(postData?.search_str == 'Public' || postData?.search_str == 'Login'){
                    if (postData?.search_str == 'Public') {
                        where +=` AND document.is_login != 1`;
                    }
                    if (postData?.search_str == 'Login') {
                        where +=` AND document.is_login = 1`;
                    }
                }
                else{
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['document.title','document.description']); // remove 'document.doc_name' 
                }
            }
            const resultedData = await this.documentService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(DataManagementDocumentDto, resultedData['list'], req.lang)
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetDocumentInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let biometricDetails = await this.documentService.findOne(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(DataManagementDocumentDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
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
        FileInterceptor("doc_name", {
            limits: { fileSize: appConstant.FILE_SIZE_100MB },
            storage: diskStorage({
                destination: `${appConstant.DOCUMENT}`,
                filename: fileName
            }),
            fileFilter: document_Filter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDocumentInput, @UploadedFile() file: Express.Multer.File) {
        try {
            postData.description = postData?.description ?? ' ';
            if(postData?.is_global == 1 ){
                if ((postData?.is_login == undefined || postData?.is_login == null)) {
                    if (file && file.fieldname === 'doc_name' && file.filename) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                postData.organization_id = 0 ;
            } 
            else {
                if (!postData?.organization_id || (postData?.is_global == undefined || postData?.is_global == null) || (postData?.is_login == undefined || postData?.is_login == null)) {
                    if (file && file.fieldname === 'doc_name' && file.filename) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let resultData = await this.documentService.save({...postData,
                created_by: req.tokenUser?.id
            });
            if (file && file.fieldname === 'doc_name' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `docs/${postData?.organization_id ? postData?.organization_id : 0}/${resultData.generatedMaps[0].id}/docs_${this.commonService.generateMD5(resultData.generatedMaps[0].id.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename, userBucket: 'private'}));
                await this.documentService.update({id: resultData.generatedMaps[0].id},{doc_name: file.filename});
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Document Has Been Successfully Uploaded',
            });
        } catch (error) {
            if (file && file.fieldname === 'doc_name' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: GetDocumentInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.documentService.findOne(where);
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
            await this.documentService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.DATA_MANAGEMENT.TBL_DMT_DOCUMENT, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Document Removed successfully',
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
        FileInterceptor("doc_name", {
            limits: { fileSize: appConstant.FILE_SIZE_100MB },
            storage: diskStorage({
                destination: `${appConstant.DOCUMENT}`,
                filename: fileName
            }),
            fileFilter: document_Filter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDocumentInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.id
            ) {
                if (file && file.fieldname === 'doc_name' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.documentService.findOne(where);
            if (file && file.fieldname === 'doc_name' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `docs/${recordDetails.organization_id ? recordDetails.organization_id : postData?.organization_id ? postData?.organization_id : 0}/${postData?.id}/docs_${this.commonService.generateMD5(postData?.id.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename, userBucket: 'private'}));
                postData['doc_name'] = file.filename;
            }
            if (!recordDetails) {
                await this.documentService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            await this.documentService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.DATA_MANAGEMENT.TBL_DMT_DOCUMENT, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Document Has Been Updated Successfully',
            });
        } catch (error) {
            if (file && file.fieldname === 'doc_name' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: GetDocumentInput) {
        try {
            const where = { };
            let resultedData = await this.documentService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(DataManagementDocumentDto, resultedData, req.lang)
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
}