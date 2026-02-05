import { CommonArrayService, CommonService, QuizSectionsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateQuizSectionsInput,
    DeleteQuizSectionsInput,
    GetOneQuizSectionsInput,
    PaginateWithCompanyInput,
    UpdateQuizSectionsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuizSectionService } from './quizsections.service';
@Controller('quiz/section')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuizSectionController {
    constructor(
        private readonly quizSectionService: QuizSectionService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `qs.quiz_id = '${postData?.quiz_id}' AND qs.status != '2'`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'qs.name');
            }
            let resultedData = await this.quizSectionService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuizSectionsDto, resultedData['list'], req.lang)
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuizSectionsInput) {
        try {
            if (!postData?.quiz_id || !postData?.name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let saveData = await this.quizSectionService.save({...postData});
            let dynamicData = Object.create(null);
            if(postData?.name){
                let title = `section_name_${saveData['id']}`
                dynamicData[`${title}`]= postData?.name;
            }
            if(postData?.description){
                let title = `section_description_${saveData['id']}`
                dynamicData[`${title}`]= postData?.description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuizSectionsInput) {
        try {
            if (!postData?.id || !postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let recordDetails = await this.quizSectionService.findOne({ id: postData?.id,quiz_id: postData?.quiz_id });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.quizSectionService.update({ id: postData?.id,quiz_id: postData?.quiz_id },{...postData});
            let dynamicData = Object.create(null);
            if(postData?.name){
                let title = `section_name_${postData['id']}`
                dynamicData[`${title}`]= postData?.name;
            }
            if(postData?.description){
                let title = `section_description_${postData['id']}`
                dynamicData[`${title}`]= postData?.description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
            this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_QUIZ_SECTIONS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuizSectionsInput) {
        try {
            if (!postData?.id || !postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizSectionService.findOne({
                id: postData?.id,
                quiz_id: postData?.quiz_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.quizSectionService.update({ id: postData?.id,quiz_id: postData?.quiz_id },{status: '2'});
            const titleKey = `section_name_${postData['id']}`
            let descriptionKey = `section_description_${postData['id']}`
            const dynamicData = {
                [titleKey]: titleKey,
                [descriptionKey]: descriptionKey
            };
            await this.translatorService.DynamicEngJsonData(
                'Quizzes',
                '0',
                dynamicData,
                'Delete',
                'Quizzes',
                postData?.quiz_id
            );
            this.activityLogService.create(recordDetails, {status: '2'}, tableConstant.QUIZ.TBL_QZ_QUIZ_SECTIONS, req.tokenUser?.id);
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuizSectionsInput) {
        try {
            if (!postData?.id || !postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizSectionService.findOne({id: postData?.id, quiz_id: postData?.quiz_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizSectionsDto, resultedData, req.lang)
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = { quiz_id: postData?.quiz_id };
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.quizSectionService.listRecord(where,{ [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(QuizSectionsDto, result, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
}