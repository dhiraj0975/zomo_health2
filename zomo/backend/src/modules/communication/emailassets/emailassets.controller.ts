import { appConstant, CacheService, CommonArrayService, CommonDateService, CommonFileService } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { ActivityLogService } from "../../master/activitylog/activitylog.service";
import { EmailAssetsService } from './emailassets.service';

@Controller('communication/email-assets')
@UseGuards(TokenGuard, RoleGuard)
export class EmailAssetsController {
    constructor(
        private readonly commonFileService: CommonFileService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly cacheService: CacheService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
        private readonly emailAssetsService: EmailAssetsService,
    ) {}

    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: Record<string, any>) {
        try {
            const role_id = req.tokenUser?.role_id;
            const companyId = req.tokenUser?.org_id;
            // console.log('[EMAIL_ASSETS PAGINATE]', { role_id, companyId, page: postData?.page, limit: postData?.limit, search_str: postData?.search_str });
            const searchStr = (postData?.search_str && postData?.search_str !== '') ? postData?.search_str : '';
            const rawDateFilter = postData?.date ? String(postData.date).trim() : '';
            const normalizedDateFilter = rawDateFilter
                ? this.commonDateService.DateTimeFormat(rawDateFilter, 'YYYY-MM-DD')
                : '';
            const cacheKey = this.emailAssetsService.getEmailAssetsListCacheKey(Number(role_id), companyId ?? 0, searchStr);
            const paginateObj = this.commonArrayService.getPaginationVar(postData?.page || 1, postData?.limit || postData?.take);
            // console.log('PAGINATE cacheKey:', cacheKey);

            let paginationResponse: any;
            let from_cache: boolean;

            const cached = this.emailAssetsService.getCachedList(Number(role_id), companyId ?? 0, searchStr);
            let baseList: any[] = [];
            if (cached) {
                baseList = cached.list;
                from_cache = true;
                // console.log('from_cache', cached.total);
            } else {
                const { list: formattedAssets, total } = await this.emailAssetsService.fetchAssetsFromS3(Number(role_id), companyId ?? 0, searchStr || undefined);
                this.emailAssetsService.setCachedList(Number(role_id), companyId ?? 0, searchStr, formattedAssets, total);
                baseList = formattedAssets;
                from_cache = false;
                // console.log('[EMAIL_ASSETS PAGINATE] from_cache: false, total:', total);
            }
            const filteredList = normalizedDateFilter
                ? (baseList || []).filter((item) => {
                    const raw = item?.LastModifiedRaw ?? item?.LastModified;
                    const ts = raw ? new Date(raw).getTime() : NaN;
                    return !Number.isNaN(ts) && new Date(raw).toISOString().slice(0, 10) === normalizedDateFilter;
                })
                : (baseList || []);
            paginationResponse = this.commonArrayService.paginationResponseChallengeReport(
                filteredList,
                filteredList.length,
                paginateObj,
            );

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { ...paginationResponse, from_cache },
                message: 'Assets list fetched successfully.',
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
        FilesInterceptor("files", 1, {
            limits: { fileSize: (appConstant.FILE_SIZE_10MB), files: 1},
            storage: diskStorage({
            destination: `${appConstant.COMMUNICATION_ASSETS_TEMP_PATH}`,
            filename: fileName,
            }),
            fileFilter: (req, file, cb) => {
            const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Selected some file in type is invalid, so select a valid type files'), false);
            }
            },
        }),
        AccessGuard
    )
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: Record<string, any>,
        @UploadedFiles() files: Record<string, any>
    ) {
        try {
            const userRoleId = req.tokenUser?.role_id;
            let assetRoleForPath = userRoleId;  
            let folderPrefix = '';
            let orgId = 0;

            if(postData?.org_id && postData?.org_id !== ''){
                orgId = parseInt(postData?.org_id);
                assetRoleForPath = 11;
            }
            
            if (Number(assetRoleForPath) === 11 && (!orgId || orgId === 0)) {
                orgId = req.tokenUser?.org_id ?? 0;
            }

            folderPrefix = assetRoleForPath == 11 ? `zhOrgImg/${assetRoleForPath}/${orgId}` : `zhGloImg/${assetRoleForPath}/${orgId}`;
            // console.log('[EMAIL_ASSETS CREATE]', {
            //     token_role_id: userRoleId,
            //     assetRoleForPath,
            //     orgId,
            //     folderPrefix,
            //     postData_org_id: postData?.org_id
            // });

            if(folderPrefix === ''){
                return res.status(400).json({
                    statusCode: 400,
                    success: 0,
                    error: 1,
                    message: 'Please provide a valid destination path',
                    data: null
                });
            }

            if (!files || files.length === 0) {
                return res.status(400).json({
                    statusCode: 400,
                    success: 0,
                    error: 1,
                    message: 'Please select some files to upload',
                    data: null
                });
            }

            const uploadedFiles: string[] = [];

            for (let i = 0; i < files.length; i++){
                const fileExt = path.extname(files[i].originalname);
                const fileNameF = await this.commonFileService.replaceSpecialCharactersWithUnderscore(files[i].originalname.split('.')[0]);
                files[i].filename = `${folderPrefix}/${fileNameF}${fileExt}`;

                try {
                    await lastValueFrom(this.commonMicroservice.send(
                        { cmd: 'upload_file_communication' },
                        { path: path.resolve(files[i].path), filename: files[i].filename }
                    ));
                    uploadedFiles.push(files[i].filename);
                } catch (error) {
                    let message = 'Something went wrong while uploading';
                    let statusCode = 500;

                    if (error?.message && error.message.includes('AccessDenied')) {
                        message = 'You do not have permission to upload this file';
                        statusCode = 403;
                    } else if (error?.message && error.message.includes('EntityTooLarge')) {
                        message = 'File is too large to upload';
                        statusCode = 413;
                    } else if (error?.message) {
                        message = error.message;
                    }

                    return res.status(statusCode).json({
                        statusCode,
                        success: 0,
                        error: 1,
                        message,
                        data: null
                    });
                }
            }

            const companyId = req.tokenUser?.org_id ?? 0;
           
            this.emailAssetsService.updateCacheOnCreate(Number(userRoleId), companyId, uploadedFiles);
            // console.log('create done:', { uploadedFiles, token_role_id: userRoleId, companyId });

            return res.status(201).json({
                statusCode: 201,
                success: 1,
                error: 0,
                message: 'Assets successfully uploaded',
                data: { list: uploadedFiles },
            });

        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            return res.status(500).json({
                statusCode: 500,
                success: 0,
                error: 1,
                message: error?.message || 'Unexpected error occurred',
                data: null
            });
        }
    }
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: Record<string, any>) {
        try {
            const assetKey = (postData?.key ?? postData?.Key ?? '').trim();
            if (!assetKey) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            try {
                const role_id = Number(req.tokenUser?.role_id);
                let campRoleIdArr = [];
                if (role_id == 1) {
                  
                    campRoleIdArr = [1, 8, 11, 19, 20, 25, 37, 38, 39, 40, 41, 42, 43];
                } else if (role_id == 38 || role_id == 43) {
                    campRoleIdArr = [38, 43, 39, 40, 41, 11];
                } else if (role_id == 39) {
                    campRoleIdArr = [39, 40, 41, 11];
                } else if (role_id == 40 || role_id == 41 || role_id == 11) {
                    campRoleIdArr = [role_id];
                } else {
                    campRoleIdArr = [role_id,40,41,39,11];
                }

                const assetsRoleId = parseInt(assetKey.split('/')[1]);
                let accessStatus = 1;
                if(campRoleIdArr.includes(assetsRoleId)){
                    accessStatus = 0;
                }
                if(accessStatus === 0){
                    try {
                        console.log('[EMAIL_ASSETS DELETE] sending to microservice:', { path: assetKey });
                        await lastValueFrom(
                            this.commonMicroservice.send({ cmd: 'remove_file_communication' }, { path: assetKey })
                        );

                        const companyId = req.tokenUser?.org_id ?? 0;
                        // Update in-memory cache for base list (no search) if present
                        this.emailAssetsService.updateCacheOnDelete(role_id, companyId, assetKey);

                        return res.status(200).json({
                            success: 1,
                            error: 0,
                            message: 'Asset successfully deleted',
                            data:  null,
                        });
                    } catch (error) {
                        // console.log('[EMAIL_ASSETS DELETE] microservice error:', error?.message || error);
                        let message = error?.message || 'Something went wrong';
                        let statusCode = 500;

                        if (error?.name === 'AccessDenied' || (error?.message && error.message.includes('AccessDenied'))) {
                            message = 'You do not have permission to delete this asset';
                            statusCode = 403;
                        }

                        return res.status(statusCode).json({
                            success: 0,
                            error: 1,
                            message: message,
                            data: null,
                        });
                    }

                }else{
                    return res.json({
                        statusCode: 401,
                        success: 0,
                        error: 1,
                        message: 'You do not have permission to delete this asset',
                        data: null,
                    });
                }
            }catch (error){
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
    @Post('getgallery')
    async getgallery(@Req() req: Request, @Res() res: Response, @Body() postData: Record<string, any>) {
        try {
            if(!postData?.ImageType){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const ImageType = postData?.ImageType;
            const role_id = req.tokenUser?.role_id;
            const optionType = postData?.optionType;
            const continuationToken = postData?.continuationToken;
            let companyId = req.tokenUser?.org_id;
            if(companyId){
                companyId = 0;
            }
            let folderPrefix = ['zhGloImg'];
            if(ImageType === 'icon'){
                if(optionType === 'global'){
                    folderPrefix = ['zhAIcon'];
                }else{
                    if(role_id === 11){
                        folderPrefix = ['zhOrgIcon/'+role_id+'/'+companyId];
                    }else{
                        folderPrefix = ['zhOrgIcon/11'];
                    }
                }
            }else if(ImageType === 'video'){
                if(optionType === 'global'){
                    folderPrefix = ['zhGloImg'];
                }else{
                    if(role_id === 11){
                        folderPrefix = ['zhOrgImg/'+role_id+'/'+companyId];
                    }else{
                        folderPrefix = ['zhOrgImg/11'];
                    }
                }
            }else{
                if(optionType === 'global'){
                    folderPrefix = ['zhGloImg'];
                }else{
                    if(role_id === 11){
                        folderPrefix = ['zhOrgImg/'+role_id+'/'+companyId];
                    }else{
                        folderPrefix = ['zhOrgImg/11'];
                    }
                }
            }
            const data = await lastValueFrom(this.commonMicroservice.send({cmd: 'list_assests'}, {maxKeys: 24, prefixes: folderPrefix, continuationToken: continuationToken}));
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: data,
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
    @Post('uploaditem')
    @UseInterceptors(
        FileInterceptor("files",{
            limits: { fileSize: (appConstant.FILE_SIZE_2MB), files: 1 },
            storage: diskStorage({
            destination: `${appConstant.COMMUNICATION_ASSETS_TEMP_PATH}`,
            filename: fileName
            }),
            fileFilter: imgFilter,
        }),
        AccessGuard
    )
    async uploaditem(@Req() req: Request, @Res() res: Response, @Body() postData: Record<string, any>, @UploadedFile() files: Record<string, any>) {
        try {
            if(!postData?.ImageType || !postData?.optionType){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.optionType === 'org' && !postData?.org_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const ImageType = postData?.ImageType;
            const role_id = req.tokenUser?.role_id;
            const optionType = postData?.optionType;
            const setwaterMark = postData?.setwaterMark;
            const waterMarkId = postData?.waterMarkId;
            const selectedImageKey = postData?.selectedImageKey;
            let orgId = (postData?.org_id && postData?.org_id != '') ? parseInt(postData?.org_id) : 0;
            if(orgId === 0 && role_id === 11){
                orgId = req.tokenUser?.org_id;
            }
            let folderPrefix = '';
            if(ImageType == 'video'){
                if(role_id == 11){
                    folderPrefix = 'videoImage/'+role_id+'/'+orgId;
                }else{
                    folderPrefix = 'videoImage/'+role_id+'/0';
                }
            }else if(ImageType == 'icon'){
                if(role_id == 11){
                    folderPrefix = 'zhOrgIcon/'+role_id+'/'+orgId;
                }else{
                    folderPrefix = 'zhAIcon/'+role_id+'/0';
                }
            }
            if(ImageType == 'icon'){
                if (files && files !== null && files !== undefined && files.filename) {
                    const fileExt = path.extname(files.filename);
                    const fileNameF = this.commonFileService.replaceSpecialCharactersWithUnderscore(files.originalname.split('.')[0]);
                    files.filename = `${folderPrefix}/${fileNameF}${fileExt}`;
                    try {
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file_communication'}, {path: path.resolve(files.path),  filename: files.filename}));
                    } catch (error) {
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
                    if (files.path && files.fieldname === 'files' && files.filename) {
                        await this.commonFileService.removeFileFromLocal(files.path);
                    }
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: null,
                        message: 'success',
                    });
                }else{
                    return res.json({
                        statusCode: 401,
                        success: 0,
                        error: 1,
                        message: 'Please select some files to upload',
                        data: null,
                    });
                }
            }else if(ImageType == 'video'){ 
                if(selectedImageKey && selectedImageKey != '' && selectedImageKey !== null && selectedImageKey !== undefined && selectedImageKey !== 'null'){
                    const getFileName = selectedImageKey.split('/')[3];
                    const fileExt = path.extname(getFileName);
                    const imageBuffer = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file_communication'}, {path: selectedImageKey}));
                    const newFIlename = folderPrefix+'/'+ new Date().getTime()+''+fileExt;
                    const watermarkPath = `./public/upload/watermark/design${waterMarkId}.png`;
                    const aaa = await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file_watermark_communication'}, {files: imageBuffer,  filename: newFIlename, mimetype: `image/${fileExt.replace(/\./g, '')}`, watermarkPath}));
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: null,
                        message: 'success',
                    });
                }else{
                    if (files && files !== null && files !== undefined && files.filename) {
                        const fileExt = path.extname(files.filename);
                        const fileNameF = this.commonFileService.replaceSpecialCharactersWithUnderscore(files.originalname.split('.')[0]);
                        files.filename = `${folderPrefix}/${fileNameF}${fileExt}`;
                        try {
                            const watermarkPath = `./public/upload/watermark/design${waterMarkId}.png`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file_watermark_communication'}, {files: files.path,  filename: files.filename, mimetype: files.mimetype, watermarkPath}));
                        } catch (error) {
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
                        if (files.path && files.fieldname === 'files' && files.filename) {
                            await this.commonFileService.removeFileFromLocal(files.path);
                        }
                        return res.status(HttpStatus.CREATED).json({
                            statusCode: 201,
                            success: 1,
                            error: 0,
                            data: null,
                            message: 'success',
                        });
                    }else{
                        return res.json({
                            statusCode: 401,
                            success: 0,
                            error: 1,
                            message: 'Please select some files to upload',
                            data: null,
                        });
                    }
                }
            }
        } catch (error) {
            if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++){
                    if (files[i].path && files[i].fieldname === 'files' && files[i].filename) {
                        await this.commonFileService.removeFileFromLocal(files[i].path);
                    }
                }
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
}