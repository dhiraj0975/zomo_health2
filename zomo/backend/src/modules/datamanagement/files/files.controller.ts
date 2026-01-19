import { appConstant, CommonArrayService, CommonFileService, CommonService, DataManagementFilesDto, tableConstant } from '@common-constants';
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
import { fileName, files_Filter } from "src/utils/image-upload.utils";
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { FileOrganizationService } from '../fileorganization/fileorganization.service';
import { CreateFilesInput, DeleteFilesInput, PaginateWithFileOrganizationInput } from '../input';
import { FilesService } from "./files.service";
const path = require('path');
@Controller('data-management/files')
@UseGuards(TokenGuard, RoleGuard)
export class FilesController {
    constructor(
        private readonly filesService: FilesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private brokerService: BrokerService,
        private fileOrganizationService: FileOrganizationService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithFileOrganizationInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = Object.create(req.tokenUser);
            //for broker admin main page document module file list not inside
            if((user.role_id == appConstant.ROLE.BROKERADMIN || user.role_id == appConstant.ROLE.BROKER || user.role_id == appConstant.ROLE.REGIONALADMIN) && postData?.type && postData?.type == 'mainPage' ){
                let resultData:any
                let globalFileCount = await this.filesService.countFile({is_global:1,status:1})
                if (globalFileCount) {
                    let whereBroker = `(broker.broker_admin_id = ${user.id} OR broker.user_id = ${user.id}) AND broker.status = 1`
                    if (postData?.search_str) {
                        whereBroker += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', [ 'company.company_name','company.code','company.id'], false);
                    }
                    resultData = await this.brokerService.paginateListBrokerWithGrp(
                        whereBroker,
                        postData,
                        [
                            'broker.id', 'company.id', 'company.company_name', 'company.state', 'company_type.id', 'company.code',
                            'company_type.company_type', 'company.city', 'company.country',
                        ]
                    );
                } else {
                    let where = `(broker.broker_admin_id = ${user.id} OR broker.user_id = ${user.id} OR files.created_by = ${user.id}) AND files.status !=2`
                    resultData = await this.filesService.brokerPaginateList(
                        where,
                        postData,
                        ['files.id', 'company.id', 'company.company_name']
                    );
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultData,
                    message: 'success',
                });
            }
            let where = 'files.status !=2';
            if(user.role_id == appConstant.ROLE.ORGADMIN){
                where += ` AND(broker.org_id = ${user.org_id} OR files.created_by = ${user.id} OR files.is_global = 1)`
            }
            else{
                if (
                    !postData?.organization_id 
                ) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                where += ` AND(
                (broker.org_id = ${postData?.organization_id} AND broker.broker_admin_id = ${user.id}) OR 
                (broker.org_id = ${postData?.organization_id} AND broker.user_id = ${user.id}) OR 
                (broker.org_id = ${postData?.organization_id} AND files.created_by = ${user.id}) OR 
                (files.is_global = 1))`
            }
            if (postData?.search_str) {
                where += `AND(files.title LIKE '%${postData?.search_str}%' OR files.description LIKE '%${postData?.search_str}%' OR files.file_name LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.filesService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(DataManagementFilesDto, resultedData['list'], req.lang)
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let biometricDetails = await this.filesService.findOne(where);
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
                await this.commonArrayService.formatToDto(DataManagementFilesDto, biometricDetails, req.lang)
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
        FileInterceptor("file_name", {
            limits: { fileSize: appConstant.FILE_SIZE_100MB },
            storage: diskStorage({
                destination: `${appConstant.DOCUMENT}`,
                filename: fileName
            }),
            fileFilter: files_Filter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFilesInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.title 
            ) {
                if (file && file.fieldname === 'file_name' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser);
            let roleId: number = user.role_id;
            let userId: number = user.id;
            let orgIdList: number[] = [];
            if(postData?.organization_id){
                orgIdList = postData?.organization_id?.split(',').map((ele: string) => parseInt(ele));
                delete(postData.organization_id);
            }
            // check for broker admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN].includes(roleId)) {
                let whereBrokerAdmin = {
                    broker_admin_id: userId,
                    status: Not(2)
                }
                let checkBrokerAdmin = await this.brokerService.findOne(whereBrokerAdmin);
                if (!checkBrokerAdmin) {
                    if (file && file.fieldname === 'file_name' && file.filename) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            // check for broker role that org_id exits or not.
            if ([appConstant.ROLE.BROKER].includes(roleId)) {
                let whereBroker = {
                    user_id: userId,
                    is_global: 1,
                    status: Not(2)
                }
                let checkBroker = await this.brokerService.findOne(whereBroker);
                if (!checkBroker) {
                                        if (file && file.fieldname === 'file_name' && file.filename) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            // check for regional admin role that org_id exits or not.
            if ([appConstant.ROLE.REGIONALADMIN].includes(roleId)) {
                let whereRA = {
                    user_id: userId,
                    is_global: 2,
                    status: Not(2)
                }
                let checkRA = await this.brokerService.findOne(whereRA);
                if (!checkRA) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            let brokerDetails;
            if ([appConstant.ROLE.REGIONALADMIN, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER].includes(req.tokenUser?.role_id)) {
                let where: object = { status: Not(2) };
                switch (roleId) {
                    case appConstant.ROLE.BROKERADMIN:
                        where = { ...where, broker_admin_id: userId };
                        break;
                    case appConstant.ROLE.BROKER:
                        where = { ...where, user_id: userId, is_global: 1 };
                        break;
                    case appConstant.ROLE.REGIONALADMIN:
                        where = { ...where, user_id: userId, is_global: 2 };
                        break;
                    default:
                        return;
                }
                brokerDetails = await this.brokerService.brokerOrgList(where, ['org_id']);
            }
            if(appConstant.ROLE.ORGADMIN == req.tokenUser?.role_id){
                postData.is_global = 0;
            }else{
                if (orgIdList.length == 0) {
                    postData.is_global = 1;
                }
                else{
                    if(orgIdList.length == brokerDetails.length && orgIdList.length > 1){
                        postData.is_global = 1;
                    }else{
                        postData.is_global = 0;
                    }
                }
            }
            postData.file_name = postData?.file_name ?? '';
            let resultData = await this.filesService.save({
                ...postData,
                created_by: req.tokenUser?.id,
                modified_by: req.tokenUser?.id
            });
            if (file && file.fieldname === 'file_name' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `docsfiles/${resultData.generatedMaps[0].id}/docsfiles_${this.commonService.generateMD5(resultData.generatedMaps[0].id.toString())}${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(file.path), filename: file.filename, userBucket: 'private' }));
                await this.filesService.update({ id: resultData.generatedMaps[0].id }, { file_name: file.filename });
            }
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                postData.file_name = postData?.file_name ?? '';
                if (orgIdList.length == 0) {
                    if (brokerDetails && brokerDetails.length > 0) {
                        for (const broker of brokerDetails) {
                            let fileOrgData = {
                                file_id: resultData.generatedMaps[0].id,
                                organization_id: broker.org_id,
                                status: 1,
                            };
                            await this.fileOrganizationService.save(fileOrgData);
                        }
                    }
                }
                else {
                    for (const orgId of orgIdList) {
                        let fileOrgData = {
                            file_id: resultData.generatedMaps[0].id,
                            organization_id: orgId,
                            status: 1,
                        };
                        await this.fileOrganizationService.save(fileOrgData);
                    }
                }
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'File Has Been Successfully Uploaded',
            });
        } catch (error) {
            if (file && file.fieldname === 'file_name' && file.filename) {
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteFilesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where: object = {id: postData?.id};
            const recordDetails = await this.filesService.findOne(where);
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
            await this.filesService.update(where,{status:2});
            const recordDetailsFO = await this.fileOrganizationService.findOne({ file_id: postData?.id });
            if (recordDetailsFO) {
                await this.fileOrganizationService.update({ file_id: postData?.id }, { status: 2 });
                this.activityLogService.create(recordDetailsFO, { status: 2 }, tableConstant.DATA_MANAGEMENT.TBL_DMT_FILES_ORGANIZATIONS, req.tokenUser?.id, 'delete');
            }
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.DATA_MANAGEMENT.TBL_DMT_FILES, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'File Removed successfully',
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
        FileInterceptor("file_name", {
            limits: { fileSize: appConstant.FILE_SIZE_100MB },
            storage: diskStorage({
                destination: `${appConstant.DOCUMENT}`,
                filename: fileName
            }),
            fileFilter: files_Filter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFilesInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.id
            ) {
                if (file && file.fieldname === 'file_name' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.filesService.findOne(where);
            if (!recordDetails) {
                await this.filesService.save({
                        ...postData,
                        created_by: req.tokenUser?.id,
                        modified_by : req.tokenUser?.id
                });
            }
            if (file && file.fieldname === 'file_name' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `docsfiles/${recordDetails.id}/docsfiles_${this.commonService.generateMD5(recordDetails.id.toString())}${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename, userBucket: 'private'}));
                postData['file_name'] = file.filename;
            }
            await this.filesService.update(where, {...postData, modified_by : req.tokenUser?.id });
            this.activityLogService.create(recordDetails, postData, tableConstant.DATA_MANAGEMENT.TBL_DMT_FILES, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'File has been updated successfully',
            });
        } catch (error) {
            if (file && file.fieldname === 'file_name' && file.filename) {
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { };
            let resultedData = await this.filesService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(DataManagementFilesDto, resultedData, req.lang)
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