import { appConstant, CommonArrayService, CommonService, CovidAnswersDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCovidAnswerInput, PaginateCovidInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuestionsService } from "../questions/questions.service";
import { AnswersService } from "./answers.service";
@Controller('covid/answers')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AnswersController {
    constructor(
        private readonly answersService: AnswersService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly questionsService: QuestionsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateCovidInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id?.toString();
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                let where = `answers.status !=2`;
                if (postData?.q_id) {
                    where += ` AND answers.q_id = '${postData?.q_id}`;
                }
                if (postData?.search_str) {
                    where += ` AND(answers.title LIKE '%${postData?.search_str}%' OR question.title LIKE '%${postData?.search_str}%')`;
                }
                if (postData?.org_id) {
                    where += ` AND question.org_id = '${postData?.org_id}'`;
                }
                const resultedData = await this.answersService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(CovidAnswersDto, resultedData['list'], req.lang)
                );
                if(resultedData['list'] && resultedData['list'].length){
                    await Promise.all(resultedData['list'].map(async (ele)=>{
                        if(ele.title){
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang, `covidanswer_${ele['question']['id']}_${ele['id']}`, `/LC_MESSAGES/Common/CovidPopup/${postData.org_id}`,`dynamic`)
                            if (customeName != `covidanswer_${ele['question']['id']}_${ele['id']}`) {
                                ele.title = customeName;
                            }
                        }
                        if(ele.question?.title){
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang, `covidquestion_title_${ele['question']['id']}`, `/LC_MESSAGES/Common/CovidPopup/${postData.org_id}`,`dynamic`);
                            if (customeName != `covidquestion_title_${ele['question']['id']}`) {
                                ele.question.title = customeName;
                            }
                        }
                    }));
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)){
                const where = { id: postData?.id };
                let answerDetails = await this.answersService.findOne(where);
                if (!answerDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
                }
                answerDetails = <any>(
                    await this.commonArrayService.formatToDto(CovidAnswersDto, answerDetails, req.lang)
                );
                if(answerDetails.title){
                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `covidanswer_${answerDetails['question']['id']}_${answerDetails['id']}`, `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}`,`dynamic`)
                    if (customeName != `covidanswer_${answerDetails['question']['id']}_${answerDetails['id']}`) {
                        answerDetails.title = customeName;
                    }
                    if(answerDetails['question']['title']){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `covidquestion_title_${answerDetails['question']['id']}`, `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}`,`dynamic`);
                        if (customeName != `covidquestion_title_${answerDetails['question']['id']}`) {
                            answerDetails['question']['title'] = customeName;
                        }
                    }
                }

                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: answerDetails,
                    message: 'success',
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidAnswerInput) {
        try {
            if (!postData?.q_id || !postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)){
                let questionData = await this.questionsService.findOne({id: postData?.q_id});
                let answerSaveData = await this.answersService.save(postData);
                if(postData?.title){
                    let tilte = `covidanswer_${questionData['id']}_${answerSaveData['id']}`;
                    let dynamicDatas= { [`${tilte}`]: postData?.title};
                    await this.translatorService.DynamicEngJsonData('Common',questionData.org_id,dynamicDatas,'Edit','CovidPopup') 
                }
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Answer added successfully')
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)){
                const where = { id: postData?.id };
                const recordDetails = await this.answersService.findOne(where);
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
                await this.answersService.update(where, { status: 2 });
                this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.COVID.COVID_ANSWERS, req.tokenUser?.id, 'delete');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Answer deleted successfully'),
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidAnswerInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)){
                const where = { id: postData?.id };
                const recordDetails = await this.answersService.findOne(where);
                if (!recordDetails) {
                    await this.answersService.save({
                        ...postData,
                    });
                }
                await this.answersService.update(where, postData);
                this.activityLogService.create(recordDetails, postData, tableConstant.COVID.COVID_ANSWERS, req.tokenUser?.id);
                if(postData?.title){
                    let tilte = `covidanswer_${recordDetails['question']['id']}_${recordDetails['id']}`;
                    let dynamicDatas= { [`${tilte}`]: postData?.title};
                    await this.translatorService.DynamicEngJsonData('Common',recordDetails['question']['org_id'],dynamicDatas,'Edit','CovidPopup') 
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? 'Answer status updated successfully' : 'Answer updated successfully'),
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {
                status: 1,
            };
            let resultedData: any = await this.answersService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CovidAnswersDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `covidanswer_${ele['question']['id']}_${ele['id']}`, `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}`,`dynamic`)
                        if (customeName != `covidanswer_${ele['question']['id']}_${ele['id']}`) {
                            ele.title = customeName;
                        }
                    }
                }));
            }
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