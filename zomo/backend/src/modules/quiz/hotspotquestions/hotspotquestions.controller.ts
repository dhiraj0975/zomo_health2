import { appConstant, CommonArrayService, CommonFileService, QuizHotspotQuestionsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateHotspotQuestionsInput,
    DeleteHotspotQuestionsInput,
    GetOneHotspotQuestionsInput,
    UpdateHotspotQuestionsInput
} from "../../../input";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { QuizHotspotQuestionService } from './hotspotquestions.service';
@Controller('quiz/hotspot-question')
@UseGuards(TokenGuard, RoleGuard)
export class QuizHotspotQuestionController {
    constructor(
        private readonly quizHotspotQuestionService: QuizHotspotQuestionService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            { name: 'image4', maxCount: 1 },
            { name: 'image5', maxCount: 1 },
            { name: 'image6', maxCount: 1 },
            { name: 'image7', maxCount: 1 },
            { name: 'image8', maxCount: 1 },
            { name: 'image9', maxCount: 1 },
        ], {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.QUIZ_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateHotspotQuestionsInput, @UploadedFiles() file: Express.Multer.File) {
        try {
            if (!postData?.question_id) {
                if (file && Object.keys(file).length > 0) {
                    const imageKeys = Object.keys(file);
                    let i = 0;
                    while (i < imageKeys.length) {
                        const key = imageKeys[i];
                        await this.commonFileService.removeFileFromLocal(`${file[key][0].path}`);
                        i++;
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (file && Object.keys(file).length > 0) {
                const imageKeys = Object.keys(file);
                let i = 0;
                const imageData = {};
                while (i < imageKeys.length) {
                    const key = imageKeys[i];
                    imageData[key] = `/quiz/${file[key][0].filename}`;
                    i++;
                }
                postData = {...postData, ...imageData}
            }
            await this.quizHotspotQuestionService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                const imageKeys = Object.keys(file);
                let i = 0;
                while (i < imageKeys.length) {
                    const key = imageKeys[i];
                    await this.commonFileService.removeFileFromLocal(`${file[key][0].path}`);
                    i++;
                }
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
    @Put('update')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            { name: 'image4', maxCount: 1 },
            { name: 'image5', maxCount: 1 },
            { name: 'image6', maxCount: 1 },
            { name: 'image7', maxCount: 1 },
            { name: 'image8', maxCount: 1 },
            { name: 'image9', maxCount: 1 },
        ], {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.QUIZ_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateHotspotQuestionsInput,@UploadedFiles() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.question_id) {
                if (file && Object.keys(file).length > 0) {
                    const imageKeys = Object.keys(file);
                    let i = 0;
                    while (i < imageKeys.length) {
                        const key = imageKeys[i];
                        await this.commonFileService.removeFileFromLocal(`${file[key][0].path}`);
                        i++;
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (file && Object.keys(file).length > 0) {
                const imageKeys = Object.keys(file);
                let i = 0;
                const imageData = {};
                while (i < imageKeys.length) {
                    const key = imageKeys[i];
                    imageData[key] = `/quiz/${file[key][0].filename}`;
                    i++;
                }
                postData = {...postData, ...imageData}
            }
            const recordDetails = await this.quizHotspotQuestionService.findOne({ id: postData?.id,question_id: postData?.question_id });
            await this.quizHotspotQuestionService.update({ id: postData?.id,question_id: postData?.question_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                const imageKeys = Object.keys(file);
                let i = 0;
                while (i < imageKeys.length) {
                    const key = imageKeys[i];
                    await this.commonFileService.removeFileFromLocal(`${file[key][0].path}`);
                    i++;
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteHotspotQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizHotspotQuestionService.findOne({
                id: postData?.id,
                question_id: postData?.question_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.quizHotspotQuestionService.update({id: postData?.id, question_id: postData?.question_id},{status: 2});
            this.activityLogService.create(recordDetails, {correct_block: recordDetails}, tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneHotspotQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizHotspotQuestionService.findOne({id: postData?.id, question_id: postData?.question_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizHotspotQuestionsDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
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