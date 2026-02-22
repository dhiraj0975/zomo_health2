import { CompanyService } from "@/modules/company/companies/company.service";
import { appConstant, CacheService, CommonFileService } from '@common-constants';
import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Query,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { lastValueFrom } from "rxjs";
import { CreateTranslateInput } from 'src/input/translate';
import { fileFilter, fileName, filesFilter } from 'src/utils/image-upload.utils';
import { AccessGuard, RoleGuard, TokenGuard } from "../../guard";
import { ActivityLogService } from "../master/activitylog/activitylog.service";
import { TranslationService } from './translation.service';

const path = require('path');

@Controller('translator')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class TranslationController {
    constructor(
        private readonly translationService: TranslationService,
        private readonly commonFileService: CommonFileService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly cacheService: CacheService,
        private readonly companyService: CompanyService,
    ) {}
    @Get('translate')
    async translateText(
        @Req() req: Request,
        @Res() res: Response,
        @Query('language') language: string,
        @Query('key') key: string,
        @Query('fileName') fileName?: string,
    ) {
        try {
            if (!key) {
                throw new Error(await this.translationService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const resultedData = await this.translationService.frontendReadTranslation(
                language,
                key,
                fileName
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
    @Post('dynamicList')
    async dynamicList(
        @Req() req: Request,
        @Res() res: Response,
        @Body()
        createData: CreateTranslateInput,
    ) {
        try {
            let { menu, sub_menu, type } = createData;
            if (!menu || !sub_menu) {
                return res.status(400).json({
                    statusCode: 400,
                    success: 0,
                    error: 1,
                    message: 'ERR_REQUIRED_PARAM_MISSING',
                    data: null,
                });
            }
            let companyData = [];
            let companyCondition = `company.deleted = 0`;
            let joinTable = [];
            let fields = ['company.id', 'company.company_name'];
            if (menu === 'MyHealth' && sub_menu === 'Assessment' && type !== 'eha') {
                if (type) {
                    if(type === 'hra') {
                        companyData = [
                            { id: '1', company_name: 'Current Health' },
                            { id: '2', company_name: 'Prevention' },
                            { id: '3', company_name: 'Nutrition' },
                            { id: '4', company_name: 'Exercise' },
                            { id: '5', company_name: 'Emotional Health' },
                            { id: 'assessment_text', company_name: 'Assessemnt Text' },
                            { id: 'biometrocs_text', company_name: 'Biometrics Text' }
                        ];
                    }
                }else{
                    companyData = [
                        { id: 'hra', company_name: 'HRA' },
                        { id: 'eha', company_name: 'EHA' }
                    ];
                }
            }else if (menu === 'Common' || sub_menu !== 'Nutrition') {
                switch (sub_menu) {
                    case 'InformationPopup':
                        joinTable.push({
                            type: 'INNER',
                            table: 'c_company_meta',
                            alias: 'CompanyMeta',
                            on: `CompanyMeta.org_id = company.id AND (CompanyMeta.title != '' OR CompanyMeta.setting_dic != '')`,
                            connect: 'company',
                        });
                        break;

                    case 'SurveyPopup':
                        joinTable.push({
                            type: 'INNER',
                            table: 'c_surveypopup',
                            alias: 'Surveypopup',
                            on: 'Surveypopup.org_id = company.id',
                            connect: 'company',
                        });
                        break;

                    case 'CovidPopup':
                        joinTable.push({
                            type: 'INNER',
                            table: 'c_covidsettings',
                            alias: 'Covidsetting',
                            on: 'Covidsetting.org_id = company.id',
                            connect: 'company',
                        });
                        break;

                    case 'QuestionnairePopup':
                        joinTable.push({
                            type: 'INNER',
                            table: 'hc_questionnairesettings',
                            alias: 'Questionnairesetting',
                            on: `Questionnairesetting.org_id = company.id AND (Questionnairesetting.title != '' OR Questionnairesetting.header_text != '')`,
                            connect: 'company',
                        });
                        break;

                    default:
                        break;
                }
                companyData = await this.companyService.getCompanylist(companyCondition, fields, joinTable);
            }
            return res.status(200).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: companyData,
                message: 'success',
            });

        } catch (error) {
            // Log the error
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    @Post('add')
    async addTranslation(
        @Req() req: Request,
        @Res() res: Response,
        @Body()
        createData: CreateTranslateInput,
    ) {
        try {
            let { language, key, value, menu, sub_menu, type } = createData;
            if (!language || !key || !value) {
                throw new Error(await this.translationService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            type = (type?.trim().toLowerCase().includes('static') ? 'static' : 'dynamic');
            let fileName;
            if (menu === 'Api') {
                fileName = `Locale/eng/LC_MESSAGES/${menu}/${type}.json`;
            } else {
                fileName = `Locale/eng/LC_MESSAGES/${menu}/${sub_menu}/${type}.json`;
            }
            let dataFileRead = await this.translationService.readTranslationFile(fileName, type);
            dataFileRead[key] = value;
            await this.translationService.uploadTranslation({
                file: JSON.stringify(dataFileRead),
                type,
                fileName,
            });
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
    async updateTranslation(
        @Req() req: Request,
        @Res() res: Response,
        @Body()
        createData: CreateTranslateInput,
    ) {
        try {
            const { language, key, value, fileName } = createData;
            if (!language || !key || !value) {
                throw new Error(await this.translationService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            this.translationService.updateTranslation(
                language,
                key,
                value,
                fileName,
            );
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
    @Post('create')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.TRANSLATION}`,
                filename: fileName,
            }),
            fileFilter: fileFilter,
        }),
    )
    async createTranslation(@Req() req: Request, @Res() res: Response, @Body() createData: CreateTranslateInput, @UploadedFile() file: Express.Multer.File,) {
        try {
            let { target_lang, fileName, menu, sub_menu, type, org_id, id, sub_id } = createData;
            if (!target_lang) {
                if (
                    file &&
                    file.fieldname === 'file' &&
                    file.filename
                ) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translationService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(!fileName){
                if (!file) {
                    file = req.body.file;
                    createData.file = req.body.file;
                }
                const language = target_lang;
                const languageData = await this.translationService.getLanguagesData();
                const targetLang = this.translationService.getLanguageFallback(language, languageData);
                const lang = languageData.find(ele =>
                    ele.name === language ||
                    ele.key === language ||
                    ele.locale === language
                );
                const langPath = lang ? lang.lang_path : language;
                type = (type?.trim().toLowerCase().includes('static') ? 'static' : 'dynamic');
                const fileName = this.translationService.buildTranslationPath(
                    menu,
                    sub_menu,
                    type,
                    org_id,
                    id,
                    sub_id,
                    req.tokenUser?.role_id
                );
                createData.fileName = 'Locale/'+langPath+fileName;
                createData.type = type;
                await this.translationService.uploadTranslation(createData);
                /*await this.translationService.geTranslationPath(createData);*/
            }else {
                await this.translationService.saveTranslation(
                    fileName,
                    file,
                    target_lang
                );
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            if (
                file &&
                file.fieldname === 'file' &&
                file.filename
            ) {
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

    @Post('auto-translation')
    async autoTranslation(@Req() req: Request, @Res() res: Response, @Body() createData: CreateTranslateInput) {
        try {
            let { target_lang, fileName, menu, sub_menu, type, org_id, id, sub_id } = createData;
            if (!target_lang) {
                throw new Error(await this.translationService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(!fileName){
                let language = target_lang;
                const languageData = await this.translationService.getLanguagesData();
                const targetLang = this.translationService.getLanguageFallback(language, languageData);
                const keyOnly = this.translationService.getLanguageFallback(language, languageData, 'key');
                type = (type?.trim().toLowerCase().includes('static') ? 'static' : 'dynamic');
                const fileName = this.translationService.buildTranslationPath(
                    menu,
                    sub_menu,
                    type,
                    org_id,
                    id,
                    sub_id,
                    req.tokenUser?.role_id
                );
                var sourcePath = 'Locale/eng'+fileName;
                var destinationPath = 'Locale/'+targetLang+fileName;
                let translatedData = await lastValueFrom(this.commonMicroservice.send({cmd: 'lang_demo_full'}, { sourcePath: sourcePath,destinationPath: destinationPath,sourceLang: 'en', targetLang: keyOnly,type:type }));
                if (typeof translatedData === 'string') {
                    if (translatedData.startsWith('ERROR:')) {
                        const errorMessage = translatedData.substring(6); // Remove "ERROR:" prefix
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            statusCode: 400,
                            success: 0,
                            error: 1,
                            data: null,
                            message: errorMessage,
                        });
                    } else {
                        const transformedData = await this.translationService.transformTranslationData(
                            translatedData,
                            sourcePath
                        );
                        this.cacheService.removeCache(destinationPath);
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: transformedData,
                            message: 'Translation successful',
                        });
                    }
                } else {
                    throw new Error('Unexpected response from translation service');
                }
            }else {
                const file = await this.translationService.sideMenu('/eng' + fileName)
                await this.translationService.addTranslationToEnglish(
                    fileName,
                    JSON.stringify(file),
                    'eng'
                );
                await this.translationService.createTranslation(
                    undefined,
                    target_lang,
                    fileName,
                    JSON.stringify(file)
                );
            }
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
    @Post('read')
    async readTranslation(
        @Req() req: Request,
        @Res() res: Response,
        @Body()
        createData: any,
    ) {
        try {
            let { language, menu, sub_menu, type, org_id, id, sub_id,refresh } = createData;
            if (!language) {
                if(!menu || !sub_menu || !type){
                    throw new Error(await this.translationService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            const languageData = await this.translationService.getLanguagesData();
            const targetLang = this.translationService.getLanguageFallback(language, languageData);
            let data: any = [];
            type = (type?.trim().toLowerCase().includes('static') ? 'static' : 'dynamic');
            for(let i = 0; i < menu?.length; i++){
                let subMenuArray = sub_menu?.[menu[i]];
                if (subMenuArray?.length) {
                    for(let j = 0; j < subMenuArray?.length; j++){
                        const fileName = this.translationService.buildTranslationPath(
                            menu[i],
                            subMenuArray[j],
                            type,
                            org_id,
                            id,
                            sub_id,
                            req.tokenUser?.role_id
                        );
                        let langData: any = await this.translationService.readTranslationOptimized(
                            targetLang,
                            fileName,
                            true
                        );

                        if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                            const langDataObj = this.translationService.convertToObject(langData);
                            data = {...data, ...langDataObj};
                        } else {
                            if (menu[i] === 'Api') {
                                langData = this.translationService.filterByPrefix(subMenuArray[j], langData);
                            }
                            data = [...data, ...langData];
                        }
                    }
                } else {
                    const fileName = this.translationService.buildSimpleTranslationPath(menu[i], type);
                    let langData: any = await this.translationService.readTranslationOptimized(
                        targetLang,
                        fileName,
                        true
                    );
                    const langDataObj = this.translationService.convertToObject(langData);
                    data = {...data, ...langDataObj};
                }
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
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
    @Post('side-menu-list')
    async sideMenuList(
        @Req() req: Request,
        @Res() res: Response,
        @Body()
        postData: any,
    ) {
        try {
            const data = await this.translationService.sideMenu();
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
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
    @Post('file-upload')
    @UseInterceptors(FileInterceptor("file", {
        limits: { fileSize: appConstant.FILE_SIZE_2MB },
        storage: diskStorage({
            destination: `${appConstant.UPLOAD_PATH}`,
            filename: fileName
        }),
        fileFilter: filesFilter
    }))
    async fileUpload(@Req() req: Request, @Res() res: Response, @Body() postData: any, @UploadedFile() file: Express.Multer.File) {
        try {
            if (req.tokenUser?.role_id == appConstant.ROLE.ADMIN && postData?.prefix && postData?.userBucket) {
                if (postData?.type == 'templateImage') {
                    const localImageDir = appConstant.TEMPLATE_IMAGE_PATH;
                    const files = fs.readdirSync(localImageDir);
                    for (const file of files) {
                        const localFilePath = path.resolve(localImageDir, file);
                        if (fs.statSync(localFilePath).isFile()) {
                            const formattedName = this.commonFileService.formatFileName(file);
                            const s3Path = `templateimages/common/${formattedName}`;

                            await lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'upload_file' },
                                    {
                                        path: localFilePath,
                                        filename: s3Path,
                                        userBucket: postData?.userBucket,
                                        deleteFile : false
                                    }
                                )
                            );
                            // console.log('upload done file name:- ',formattedName);
                        }
                    }
                }
                if (file && file.fieldname === 'file' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    file.filename = postData?.prefix;
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(file.path), filename: file.filename, userBucket: postData?.userBucket }));
                }
                if (file && file.filename && file.fieldname === 'file') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'submitted successfully.'
            });
        } catch (error) {
            if (file && file.fieldname === 'file' && file.filename) {
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
}
