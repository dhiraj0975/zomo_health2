import { UrlManageService } from '@/modules/common';
import { appConstant, CommonArrayService, CommonFileService, CommonService, CovidUserAnswersDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { CommunicationTemplateTextsService } from 'src/modules/communication/templatetexts/communicationtemplatetexts.service';
import { SettingsService as covidSettingsService } from 'src/modules/covid/settings/settings.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { UserService } from 'src/modules/user/user/user.service';
import { fileName, imgFilter } from "src/utils/image-upload.utils";
import { In } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateCovidUserAnswersInput,
    PaginateCovidInput,
} from '../../../input';
import { TranslationService } from '../../translation/translation.service';
import { AnswersService } from '../answers/answers.service';
import { UserAnswersService } from './userAnswers.service';
const moment = require('moment-timezone');
const path = require('path');
@Controller('covid/user-answers')
@UseGuards(TokenGuard, RoleGuard)
export class UserAnswersController {
    constructor(
        private readonly useranswersService: UserAnswersService,
        private readonly answersService: AnswersService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly userService: UserService,
        private readonly covidSettingsService: covidSettingsService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly urlManageService: UrlManageService,
    ) { }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: PaginateCovidInput,
    ) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id.toString();
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                let where = `userAnswers.status = 1`;
                if (postData?.org_id) {
                    where += ` AND userAnswers.org_id = ${postData?.org_id}`;
                }
                if (postData?.user_id) {
                    where += ` AND userAnswers.user_id = ${postData?.user_id}`;
                }
                if (postData?.search_str) {
                    where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'userAnswers.are_you_vaccinated');
                }
                if(postData?.from_date && postData?.to_date){
                    let userTimeZone = req.tokenUser?.timezone ?? 'UTC';
                    where += ` AND DATE_FORMAT(CONVERT_TZ(userAnswers.created,'UTC','${userTimeZone}'),'%Y-%m-%d %H:%i:%s') BETWEEN '${moment(postData?.from_date).format('YYYY-MM-DD')} 00:00:00' AND '${moment(postData?.to_date).format('YYYY-MM-DD')} 23:59:59'`;                    
                    postData['order_by'] ='userAnswers.created';
                    postData['order'] ='ASC';
                }    
                const resultedData = await this.useranswersService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(
                        CovidUserAnswersDto,
                        resultedData['list'],
                        req.lang
                    )
                );
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)){
                const where = { id: postData?.id };
                if(postData?.org_id){
                    where['org_id'] = postData?.org_id;
                }
                let useranswerDetails = await this.useranswersService.findOne(where);
                if (!useranswerDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
                useranswerDetails = <any>(
                    await this.commonArrayService.formatToDto(
                        CovidUserAnswersDto,
                        useranswerDetails,
                        req.lang
                    )
                );               
                if(useranswerDetails['question_answers']){
                    try{
                        let question_answers = JSON.parse(useranswerDetails['question_answers']);
                        let questionDetails = await this.getQuestionDetails(question_answers);
                        if (questionDetails && questionDetails.length) {
                            await Promise.all(questionDetails.map(async (ele) => {
                                const orgId = ele['org_id'] || useranswerDetails['org_id'];
                                if (ele['title'] && ele['question']) {
                                    const answerKey = `covidanswer_${ele['question']['id']}_${ele['id']}`;
                                    const translatedAnswer = await this.translatorService.frontendReadTranslation(
                                        req.lang,
                                        answerKey,
                                        `/LC_MESSAGES/Common/CovidPopup/${orgId}`,
                                        `dynamic`
                                    );
                                    if (translatedAnswer !== answerKey) {
                                        ele['title'] = translatedAnswer;
                                    }
                                }
                                if (ele['question'] && ele['question']['title']) {
                                    const questionKey = `covidquestion_title_${ele['question']['id']}`;
                                    const translatedQuestion = await this.translatorService.frontendReadTranslation(
                                        req.lang,
                                        questionKey,
                                        `/LC_MESSAGES/Common/CovidPopup/${orgId}`,
                                        `dynamic`
                                    );
                                    if (translatedQuestion !== questionKey) {
                                        ele['question']['title'] = translatedQuestion;
                                    }
                                }
                            }));
                        }
                        useranswerDetails['user_question_answers'] = questionDetails;
                    }catch(e){
                        useranswerDetails['user_question_answers'] = [];
                    }      
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: useranswerDetails,
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
    @Post('create')
    @UseInterceptors(
        AnyFilesInterceptor({
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.COVID_ASSETS_TEMP_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateCovidUserAnswersInput,
        @UploadedFiles() file: Record<string, any>
    ) {
        try {
            if (!postData?.org_id ) {
                if (file && Object.keys(file).length > 0) {
                    for (let fileData of Object.keys(file)) {
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData['user_id'] = postData?.user_id ?? req.tokenUser?.id;
            postData['created_by'] = req.tokenUser?.id;
            postData['question_answers'] = postData?.question_answers ?? `[]`;
            let recordDetails: any 
            if(!postData?.are_you_vaccinated){
                postData.are_you_vaccinated = 0;
            }
            if(postData?.are_you_vaccinated && postData?.are_you_vaccinated?.toString() === '3'){
                let data ={
                    org_id: postData?.org_id,
                    user_id: postData?.user_id ?? req.tokenUser?.id,
                    question_answers:'[]',
                    are_you_vaccinated:3,
                    created_by:req.tokenUser?.id,
                }
                recordDetails = await this.useranswersService.save(data);
            }else{
                recordDetails = await this.useranswersService.save(postData);
            }
            let lastId 
            if(recordDetails){
                recordDetails = recordDetails?.generatedMaps[0];
                lastId = recordDetails?.id;
            }
            if (file && Object.keys(file).length > 0) {
                const imageData = {};
                for (let fileData of Object.keys(file)) {
                    if (file[fileData].fieldname == 'vecctionationrecord' || file[fileData].fieldname == 'testpositivecertificate') {
                        const key = file[fileData].fieldname;
                        const prefix = key == 'vecctionationrecord' ? 'covidred' : 'covidcerti';
                        file[fileData].originalname = this.commonFileService.formatFileName(file[fileData].originalname);
                        file[fileData].filename = `covid/${postData['org_id']}/ans/${postData['user_id']}/${prefix}_${this.commonService.generateMD5(lastId.toString())}.${file[fileData].originalname.split('.')[file[fileData].originalname.split('.').length - 1]}`;
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file[fileData].path),  filename: file[fileData].filename, userBucket: 'private'}));
                        imageData[key] = file[fileData].filename;
                    }
                }
                await this.useranswersService.update({ id: lastId }, { ...imageData });
            }
            const where = { id: req.tokenUser?.id };
            let result = Object.create(null)
            let recordDetailss = await this.userService.findOne(where, ['user', 'role.id', 'role.title', 'company.id', 'company.company_name', 'company.code', 'company.company_logo', 'company.status','companysetting', 'meta']);
            if(recordDetailss){
                let data =await this.covidAnswerCheck(recordDetailss);
                result['covid_details']=data
                if(postData?.are_you_vaccinated?.toString() === '1' || postData?.are_you_vaccinated?.toString() === '3'){
                    result['message']='Great, you have successfully uploaded your COVID-19 vaccination records.';
                }
                if(postData?.are_you_vaccinated?.toString() === '2'){
                    result['message']='Great, you have successfully uploaded your COVID-19 test report records.';
                }
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success',
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                for (let fileData of Object.keys(file)) {
                    await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = { id: postData?.id };
            const recordDetails = await this.useranswersService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.useranswersService.update(where, { status: 2 });
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.COVID.COVID_USER_ANSWERS, req.tokenUser?.id, 'delete');
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
        AnyFilesInterceptor({
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.COVID_ASSETS_TEMP_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateCovidUserAnswersInput,
        @UploadedFiles() file: Record<string, any>
    ) {
        try {
            if (!postData?.id || !postData?.org_id || !postData?.question_answers || postData?.status == undefined || postData?.status == null) {
                if (file && Object.keys(file).length > 0) {
                    for (let fileData of Object.keys(file)) {
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id };
            let recordDetails: any = await this.useranswersService.findOne(where);
            if (!recordDetails) {
                recordDetails = await this.useranswersService.save({
                    ...postData,
                    user_id: postData?.user_id ?? req.tokenUser?.id,
                    created_by: req.tokenUser?.id,
                });
            }
            if (file && Object.keys(file).length > 0) {
                const imageData = {};
                for (let fileData of Object.keys(file)) {
                    if (file[fileData].fieldname == 'vecctionationrecord' || file[fileData].fieldname == 'testpositivecertificate') {
                        const key = file[fileData].fieldname;
                        const prefix = key == 'vecctionationrecord' ? 'covidred' : 'covidcerti';
                        file[fileData].originalname = this.commonFileService.formatFileName(file[fileData].originalname);
                        file[fileData].filename = `covid/${postData['org_id']}/ans/${postData['user_id']}/${prefix}_${this.commonService.generateMD5(postData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file[fileData].path),  filename: file[fileData].filename, userBucket: 'private'}));
                        imageData[key] = file[fileData].filename;
                    }
                }
                if (Object.keys(file).length) {
                    postData = { ...postData, ...imageData };
                }
            }
            await this.useranswersService.update(where, {
                ...postData,
                updated_by: req.tokenUser?.id,
            });
            this.activityLogService.create(recordDetails, { ...postData, updated_by: req.tokenUser?.id }, tableConstant.COVID.COVID_USER_ANSWERS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                for (let fileData of Object.keys(file)) {
                    await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {
                status: 1,
            };
            let resultedData = await this.useranswersService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(
                    CovidUserAnswersDto,
                    resultedData,
                    req.lang
                )
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
    async getQuestionDetails(condition: any) {                
        try {
            let answerID = Object.values(condition).join(',');
            const where = `answers.id IN (${answerID})`;        
            let answers = await this.answersService.listRecord(where);
            return answers;
        }catch(err){
            throw new Error(err?.message);
        }
    }
    async covidAnswerCheck(recordDetails){
        try {
            let user = recordDetails;
            let data = Object.create(null)
            let covidData = await this.covidSettingsService.covidUserAnswerData(
                user.org_id,
                user.id,);
                let covidQueAns = covidData['Covidquestions'].map((que) => {
                    return { [que.id]: que.CovidAnswer?.id || null };
                });
                if (recordDetails['companysetting'].covid_menu === 1) {
                    let getCovidsetting = covidData ;
                    let covid_is_eligibility = getCovidsetting?.is_eligibility || '0';
                    let show_eligibility = '0';
                    let covid_show = '0';
                        let userTimeZone = user.timezone || 'UTC';
                        const covidcurrent_date = moment.tz(userTimeZone).format('YYYY-MM-DD');
                        const covidcurrent_datetime = moment.tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
                        const covidDate = covidcurrent_date; 
                        let covid_ts = moment(covidDate).valueOf(); 
                        let covid_year = moment(covid_ts).year();
                        let covid_month = moment(covid_ts).month() + 1; 
                        const today = moment.tz(userTimeZone);
                        const dayOfWeek = today.day(); 
                        const getDayOffset = (day) => {
                            const weekdays = {
                                'sunday': 0,
                                'monday': 1,
                                'tuesday': 2,
                                'wednesday': 3,
                                'thursday': 4,
                                'friday': 5,
                                'saturday': 6
                            };
                            return weekdays[day.toLowerCase()] || 0; 
                        };
                        const selectedWeekDay = getCovidsetting?.selectedweekday || 'monday';
                        const selectedWeekDayOffset = getDayOffset(selectedWeekDay);
                        let daysUntilSelectedWeekday = selectedWeekDayOffset - dayOfWeek;
                        if (daysUntilSelectedWeekday < 0) {
                            daysUntilSelectedWeekday += 7;
                        }
                        if (daysUntilSelectedWeekday < 0) {
                            daysUntilSelectedWeekday = 0;
                        }
                        let weekStartDate = today.clone().add(daysUntilSelectedWeekday, 'days').startOf('day');
                        let weekEndDate = weekStartDate.clone().add(6, 'days'); 
                        const formattedWeekStartDate = weekStartDate.format('YYYY-MM-DD');
                        const formattedWeekEndDate = weekEndDate.format('YYYY-MM-DD');
                        let month_start_date = `${covid_year}-${covid_month.toString().padStart(2, '0')}-01`;
                        const lastDayOfCurrentMonth = today.clone().endOf('month').date();
                        let month_end_date = `${covid_year}-${covid_month.toString().padStart(2, '0')}-${lastDayOfCurrentMonth}`;
                        let year_start_date = `${covid_year}-01-01`;
                        let year_end_date = `${covid_year}-12-31`;
                        let frequency_time = getCovidsetting?.selected_frequency_time || '00:00:00';
                        let m_covidshow = '0';
                        let from_date_covid = '';
                        let to_date_covid = '';
                        switch (getCovidsetting?.selected_frequency) {
                            case 0: 
                                from_date_covid = `${covidcurrent_date} ${frequency_time}`;
                                to_date_covid = `${covidcurrent_date} 23:59:59`;
                                break;
                            case 1: 
                                from_date_covid = `${formattedWeekStartDate} ${frequency_time}`;
                                to_date_covid = `${formattedWeekEndDate} ${frequency_time}`;
                                break;
                            case 2: 
                                from_date_covid = `${month_start_date} 00:00:00`;
                                to_date_covid = `${month_end_date} 23:59:59`;
                                break;
                            case 3: 
                                from_date_covid = `${year_start_date} 00:00:00`;
                                to_date_covid = `${year_end_date} 23:59:59`;
                                break;
                            case 4: 
                                from_date_covid = to_date_covid = '1';
                                m_covidshow = '1';
                                break;
                            default:
                                from_date_covid = to_date_covid = '';
                                break;
                        }
                        if (from_date_covid && to_date_covid && m_covidshow === '0') {
                            if (moment(covidcurrent_datetime).isBetween(moment(from_date_covid), moment(to_date_covid), null, '[]')) {
                                m_covidshow = '1';
                            }
                        }
                        let covidanswers = []
                        if (m_covidshow === '1') {
                            let datecon = getCovidsetting['Coviduseranswers']?.filter(answer => {
                                const isValidOrg = answer.org_id === user.org_id;
                                const isValidUser = answer.user_id === user.id;
                                const isValidStatus = answer.status === 1;
                                if (getCovidsetting?.selected_frequency !== 4) {
                                    const createdDateUTC = moment(answer.created).tz(userTimeZone);
                                    const fromDate = moment(from_date_covid).tz(userTimeZone);
                                    const toDate = moment(to_date_covid).tz(userTimeZone);
                                    return isValidOrg && isValidUser && isValidStatus && (createdDateUTC.isBetween(fromDate, toDate, null, '[]'));
                                }
                                return isValidOrg && isValidUser && isValidStatus;
                            });
                            if (getCovidsetting?.selected_frequency === 4) {
                                covid_show = datecon.length <= getCovidsetting?.show_login_time ? '1' : '0';
                                datecon.length <= getCovidsetting?.show_login_time ? covidanswers = [] : covidanswers = datecon;
                            }
                        }
                        else{
                            covidanswers = []
                        }
                    if(covidanswers.length===0 && m_covidshow === '1'){ 
                        let userQueAns = 
                            covidData['Coviduseranswers'][0]?.question_answers && 
                            covidData['Coviduseranswers'][0]?.question_answers.length > 0 
                                ? covidData['Coviduseranswers'][0].question_answers 
                                : '';
                        if (userQueAns !== '' && 
                            (Array.isArray(JSON.parse(userQueAns)) 
                                ? JSON.parse(userQueAns).length > 0 
                                : Object.keys(JSON.parse(userQueAns)).length > 0)) {
                            let userQueAnsData = userQueAns !== '' 
                                ? JSON.parse(userQueAns) 
                                : {};
                            let positiveCount = 0
                            covidQueAns.forEach((covidQue) => {
                                let questionId = Object.keys(covidQue)[0];
                                let answerId = covidQue[questionId]; 
                                if (userQueAnsData[questionId] && Number(userQueAnsData[questionId]) === answerId) {
                                    positiveCount++;
                                }
                            });
                            let no_need_checkup_text= covidData?.no_need_checkup_text || 'Pass! No Need To CheckUp'
                            let no_need_checkup_desc= covidData?.no_need_checkup_desc || 'Pass! No Need To CheckUp'
                            let need_checkup_text= covidData?.need_checkup_text || 'Fail! Need To CheckUp'
                            let need_checkup_desc= covidData?.need_checkup_desc || 'Fail! Need To CheckUp'
                            positiveCount === 0 ? data['pf_text'] = no_need_checkup_text : data['pf_text'] = need_checkup_text
                            positiveCount === 0 ? data['pf_desc'] = no_need_checkup_desc : data['pf_desc'] = need_checkup_desc
                            positiveCount === 0 ?data['pf_status'] = 1 : data['pf_status'] = 2
                            positiveCount === 0 ?data['messagestatus'] = 1 : data['messagestatus'] = 2
                            data['error'] = 0
                            if(positiveCount!==0 &&covidData.email_setting ===1 && covidData.email_added !== '' ){
                                let templateText = await this.communicationTemplateTextService.findOne({org_id:In([user.org_id,0]),type:27}) 
                                let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                let toEmail = covidData.email_added;
                                let emailDetails = Object.create(null);
                                emailDetails['type'] = 27;
                                emailDetails['company'] = '';
                                emailDetails['usercode'] = recordDetails.code;
                                emailDetails['name'] = recordDetails.full_name;
                                emailDetails['email'] = recordDetails.email;
                                let emaildata = {
                                    sender: ``,
                                    receiver: toEmail,
                                    subject: 'COVID-19 Failed Survey.',
                                    content: emailDetails,
                                    template: templateNewText
                                }
                                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                            }
                        }
                        if(covidData['Coviduseranswers'][0]['are_you_vaccinated'] &&  covidData['Coviduseranswers'][0]['are_you_vaccinated'] !== 0){
                            let messagestatuss =0;
                            let dynamictext;
                            let mailsentoption=0
                            let m_message = 'Great, you have successfully uploaded your COVID-19 vaccination records';
                            if(covidData['Coviduseranswers'][0]['are_you_vaccinated'] == 1){
                                messagestatuss = 1
                                m_message = 'Great, you have successfully uploaded your COVID-19 vaccination records'
                            }
                            if(covidData['Coviduseranswers'][0]['are_you_vaccinated'] == 2){
                                messagestatuss = 1
                                m_message = 'Great, you have successfully uploaded your COVID-19 test report records'
                                if(covidData['Coviduseranswers'][0]['tested_positive_covid'] && covidData['Coviduseranswers'][0]['tested_positive_covid'] === 1){
                                    messagestatuss = 2;
                                    dynamictext = "You have sent documentation for a POSITIVE COVID-19 test. Please do not report to work. Please contact your Human Resource Department for more further information. Thank you"
                                    mailsentoption = 1;
                                }
                            }
                            if(covidData['Coviduseranswers'][0]['are_you_vaccinated'] == 3){
                                mailsentoption = 1;
                                messagestatuss = 1;
                                dynamictext = "You are receiving this email because you have not properly documented your COVID-19 testing twice a week as requested by Tactile Medical. Please contact your Human Resource Department for further information. Thank you"
                            }
                            if(mailsentoption == 1){
                                if( covidData.email_setting ===1 && covidData.email_added !== '' ){
                                    let templateText = await this.communicationTemplateTextService.findOne({org_id:In([user.org_id,0]),type:29}) 
                                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                    let toEmail = covidData.email_added;
                                    let emailDetails = Object.create(null);
                                    emailDetails['type'] = 29;
                                    emailDetails['msg'] = dynamictext;
                                    emailDetails['usercode'] = recordDetails.code;
                                    emailDetails['name'] = recordDetails.full_name;
                                    emailDetails['email'] = recordDetails.email;
                                    let emaildata = {
                                        sender: ``,
                                        receiver: toEmail,
                                        subject: 'COVID-19 Survey.',
                                        content: emailDetails,
                                        template: templateNewText
                                    }
                                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                                }
                            }
                            else{
                                data['message'] = m_message
                                data['status'] = messagestatuss 
                                data['error'] = 0 
                            }
                            data['message'] = m_message
                            data['messagestatus'] = messagestatuss 
                        }
                    }
                    else{
                        data['message'] = 'You are already successfully uploaded your COVID-19 vaccination records'
                        data['status'] = 2 
                        data['error'] = 1
                    }
                }
                return data
        }catch(err){
            throw new Error(err?.message);
        }
    }
}
