import { appConstant, CacheService, CommonArrayService, CommonFileService } from '@common-constants';
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
const S3COMMUNICATION_URL = process.env.AWS_COMMUNICATION_BUCKET_URL;
@Controller('communication/email-assets')
@UseGuards(TokenGuard, RoleGuard)
export class EmailAssetsController {
    constructor(
        private readonly commonFileService: CommonFileService,
        private readonly commonArrayService: CommonArrayService,
        private readonly cacheService: CacheService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: Record<string, any>) {
        try {
            const role_id = req.tokenUser?.role_id;
            const companyId = req.tokenUser?.org_id;
            const searchStr = (postData?.searchstr && postData?.searchstr !== '') ? postData?.searchstr : '';
            const cacheKey = `email-assets-list-${role_id}-${companyId ?? 0}-${searchStr}`;
            const paginateObj = this.commonArrayService.getPaginationVar(postData?.page || 1, postData?.limit || postData?.take);

            let paginationResponse: any;
            let from_cache: boolean;

            const cached = this.cacheService.getCache(cacheKey);
            if (cached && Array.isArray(cached?.list) && typeof cached?.total === 'number') {
                console.log('[EmailAssets paginate] cache HIT', { cacheKey, total: cached.total, listLength: cached.list?.length });
                paginationResponse = this.commonArrayService.paginationResponseChallengeReport(cached.list, cached.total, paginateObj);
                from_cache = true;
            } else {
                console.log('[EmailAssets paginate] cache MISS', { cacheKey });
                let prefixs = [];
                if (Number(role_id) === 11) {
                    prefixs = ['zhOrgImg/11/' + (companyId ?? 0), 'zhGloImg'];
                } else {
                    prefixs = ['zhGloImg'];
                    if (postData?.searchstr && postData?.searchstr !== '') {
                        prefixs = [
                            `zhGloImg/38/0/${postData?.searchstr}`,
                            `zhGloImg/39/0/${postData?.searchstr}`,
                            `zhGloImg/40/0/${postData?.searchstr}`,
                            `zhGloImg/41/0/${postData?.searchstr}`,
                        ];
                    }
                }
                let allDatas: any[] = [];
                for (const prefix of prefixs) {
                    let continuationToken: string = null;
                    do {
                        const data = await lastValueFrom(this.commonMicroservice.send({cmd: 'list_assests'}, {maxKeys: 1000, prefixes: [prefix], continuationToken}), { defaultValue: { datas: [], nextContinuationToken: null } });
                        const batch = (data?.datas || []).filter(item => item?.Key);
                        allDatas = allDatas.concat(batch);
                        continuationToken = data?.nextContinuationToken || null;
                    } while (continuationToken);
                }
                const sortedAssets = allDatas.sort(
                    (a, b) => new Date(b.LastModified || 0).getTime() - new Date(a.LastModified || 0).getTime()
                );
                const formattedAssets = sortedAssets.map(item => ({ ...item, url: `${S3COMMUNICATION_URL}${item.Key}` }));
                const total = formattedAssets.length;

                this.cacheService.setCache(cacheKey, JSON.stringify({ list: formattedAssets, total }), 60000);
                console.log('[EmailAssets paginate] cache SET', { cacheKey, total, listLength: formattedAssets.length });
                paginationResponse = this.commonArrayService.paginationResponseChallengeReport(formattedAssets, total, paginateObj);
                from_cache = false;
            }

            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: { ...paginationResponse, from_cache },
                message: 'Assets successfully uploaded',
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
        FilesInterceptor("files", 10, {
            limits: { fileSize: (appConstant.FILE_SIZE_10MB), files: 10},
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
            let role_id = req.tokenUser?.role_id;
            let folderPrefix = '';
            let orgId = 0;

            if(postData?.org_id && postData?.org_id !== ''){
                orgId = parseInt(postData?.org_id);
                role_id = 11;
            }

            folderPrefix = role_id == 11 ? `zhOrgImg/${role_id}/${orgId}` : `zhGloImg/${role_id}/${orgId}`;

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

            let total: number | null = null;
            const cacheKey = role_id === 11
                ? `email-assets-list-${role_id}-${orgId}-`
                : `email-assets-list-${role_id}-0-`;
            const cached = this.cacheService.getCache(cacheKey);
            if (cached && Array.isArray(cached?.list) && typeof cached?.total === 'number') {
                const baseUrl = (S3COMMUNICATION_URL || '').replace(/\/$/, '');
                const newItems = uploadedFiles.map(Key => ({
                    Key,
                    LastModified: new Date().toISOString(),
                    url: `${baseUrl}/${Key}`,
                })).reverse();
                const list = [...newItems, ...cached.list];
                total = list.length;
                this.cacheService.setCache(cacheKey, JSON.stringify({ list, total }), 60000);
                console.log('[EmailAssets create] cache UPDATED', { cacheKey, total, added: uploadedFiles.length });
            } else {
                console.log('[EmailAssets create] cache NOT UPDATED (no cache)', { cacheKey });
            }

            return res.status(201).json({
                statusCode: 201,
                success: 1,
                error: 0,
                message: 'Assets successfully uploaded',
                data: { list: uploadedFiles, total }
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
            if (!postData?.key) {
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

                const assetsRoleId = parseInt(postData?.key.split('/')[1]);
                let accessStatus = 1;
                if(campRoleIdArr.includes(assetsRoleId)){
                    accessStatus = 0;
                }
                if(accessStatus === 0){
                    try {
                        await lastValueFrom(
                            this.commonMicroservice.send({ cmd: 'remove_file_communication' }, { path: postData?.key })
                        );

                        let total: number | null = null;
                        const companyId = req.tokenUser?.org_id ?? 0;
                        const cacheKey = `email-assets-list-${role_id}-${companyId}-`;
                        const cached = this.cacheService.getCache(cacheKey);
                        if (cached && Array.isArray(cached?.list) && typeof cached?.total === 'number') {
                            const list = (cached.list as any[]).filter(item => item?.Key !== postData?.key);
                            total = list.length;
                            this.cacheService.setCache(cacheKey, JSON.stringify({ list, total }), 60000);
                            console.log('[EmailAssets delete] cache UPDATED', { cacheKey, total, removedKey: postData?.key });
                        } else {
                            console.log('[EmailAssets delete] cache NOT UPDATED (no cache)', { cacheKey });
                        }

                        return res.status(200).json({
                            success: 1,
                            error: 0,
                            message: 'Asset successfully deleted',
                            data: total !== null ? { total } : null,
                        });
                    } catch (error) {
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