import { appConstant, CommonArrayService, CommonFileService, CommonService, QuizCategoriesDto, tableConstant } from '@common-constants';
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
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateCategoriesInput,
    DeleteCategoriesInput,
    GetOneCategoriesInput,
    ListInput,
    PaginateWithCompanyInput,
    UpdateCategoriesInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { QuizCategoriesService } from './categories.service';
@Controller('quiz/categories')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuizCategoriesController {
    constructor(
        private readonly quizCategoriesService: QuizCategoriesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `qc.status !=2` : `qc.status = '1'`;
            if (postData?.search_str) {
                if (postData?.filter_by?.toLowerCase() == 'id') {
                    where += ` AND qc.id LIKE '${postData?.search_str}' ESCAPE '!'`;
                }
                if (postData?.filter_by?.toLowerCase() == 'name') {
                    where += ` AND qc.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                }
                if (postData?.filter_by?.toLowerCase() == 'category_type') {
                    where += ` AND qc.category_type LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                }
            }
            let resultedData = await this.quizCategoriesService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuizCategoriesDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_category_name_${ele.id}`, `/LC_MESSAGES/Quizzes/Categories/${ele['id']}`,`dynamic`);
                        ele.name = (customName == '' || customName == `quiz_category_name_${ele.id}`) ? ele['name'] : customName;
                    }
                    if(ele.category_type){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_category_type_${ele['id']}`, `/LC_MESSAGES/Quizzes/Categories/${ele['id']}`,`dynamic`);
                        ele.category_type = (customName == '' || customName == `quiz_category_type_${ele['id']}`) ? ele['category_type'] : customName;
                    }
                    if(ele.description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_category_description_${ele.id}`, `/LC_MESSAGES/Quizzes/Categories/${ele['id']}`,`dynamic`);
                        ele.description = (customName == '' || customName == `quiz_category_description_${ele.id}`) ? ele['description'] : customName;
                    }
                }));
            }
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCategoriesInput) {
        try {
            if (!postData?.name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.name) {
                const checkExist = await this.frontService.quizCategoriesExists({name: postData?.name.trim(), status: Not(2)});
                if (checkExist) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CATEGORY_ALREADY_EXIST"));
                }
            }
            postData.category_type = postData?.category_type ?? 'Normal';
            let saveData = await this.quizCategoriesService.save({...postData, created_by: req.tokenUser?.id,modified_by: req.tokenUser?.id});
            let dynamicData = Object.create(null);
            if(postData?.name){
                let name = `quiz_category_name_${saveData['id']}`
                dynamicData[`${name}`]= postData?.name;
            }
            if(postData?.category_type){
                let type = `quiz_category_type_${saveData['id']}`
                dynamicData[`${type}`]= postData?.category_type;
            }
            if(postData?.description){
                let description = `quiz_category_description_${saveData['id']}`
                dynamicData[`${description}`]= postData?.description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes',saveData['id'],dynamicData,'Add','Categories')
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCategoriesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (postData?.name) {
                const checkExist = await this.frontService.quizCategoriesExists({name: postData?.name.trim(), status: Not(2)});
                if (checkExist) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CATEGORY_ALREADY_EXIST"));
                }
            }
            const recordDetails = await this.quizCategoriesService.findOne({ id: postData?.id});
            await this.quizCategoriesService.update({ id: postData?.id},{...postData, modified_by: req.tokenUser?.id});
            let dynamicData = Object.create(null);
            if(postData?.name){
                let name = `quiz_category_name_${postData?.id}`
                dynamicData[`${name}`]= postData?.name;
            }
            if(postData?.category_type){
                let type = `quiz_category_type_${postData['id']}`
                dynamicData[`${type}`]= postData?.category_type;
            }
            if(postData?.description){
                let description = `quiz_category_description_${postData?.id}`
                dynamicData[`${description}`]= postData?.description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes',postData?.id,dynamicData,'Edit','Categories')
            await this.activityLogService.create(recordDetails, {...postData, modified_by: req.tokenUser?.id}, tableConstant.QUIZ.TBL_QZ_CATEGORIES, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteCategoriesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizCategoriesService.findOne({
                id: postData?.id,
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.quizCategoriesService.update({ id: postData?.id},{status: 2, modified_by: req.tokenUser?.id});
            let name = `quiz_category_name_${recordDetails['id']}`
            let type = `quiz_category_type_${recordDetails['id']}`
            let description = `quiz_category_description_${recordDetails['id']}`
            const dynamicData = {
                [name]: name,
                [type]: type,
                [description]: description,
            };
            await this.translatorService.DynamicEngJsonData(
                'Quizzes',
                recordDetails['id'],
                dynamicData,
                'Delete',
                'Categories',
            );
            this.activityLogService.create(recordDetails, {status: 2, modified_by: req.tokenUser?.id}, tableConstant.QUIZ.TBL_QZ_CATEGORIES, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneCategoriesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizCategoriesService.findOne({id: postData?.id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizCategoriesDto, resultedData, req.lang)
            );
            if(resultedData?.name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_category_name_${resultedData.id}`, `/LC_MESSAGES/Quizzes/Categories/${resultedData['id']}`,`dynamic`);
                resultedData.name = (customName == '' || customName == `quiz_category_name_${resultedData.id}`) ? resultedData['name'] : customName;
            }
            if(resultedData?.category_type){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_category_type_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/Categories/${resultedData['id']}`,`dynamic`);
                resultedData.category_type = (customName == '' || customName == `quiz_category_type_${resultedData['id']}`) ? resultedData['category_type'] : customName;
            }
            if(resultedData?.description){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_category_description_${resultedData.id}`, `/LC_MESSAGES/Quizzes/Categories/${resultedData['id']}`,`dynamic`);
                resultedData.description = (customName == '' || customName == `quiz_category_description_${resultedData.id}`) ? resultedData['description'] : customName;
            }
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListInput) {
        try {
            let where: any = { status: '1'};
            if (postData?.type) {
                where['category_type'] = postData?.type;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.quizCategoriesService.listRecord(["id","name"],where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(QuizCategoriesDto, result, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (result && result.length) {
                    await Promise.all(result.map(async (ele) => {
                        if (ele.name) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_category_name_${ele.id}`, `/LC_MESSAGES/Quizzes/Categories/${ele['id']}`, `dynamic`);
                            ele.name = (customName == '' || customName == `quiz_category_name_${ele.id}`) ? ele['name'] : customName;
                        }
                        if (ele.category_type) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_category_type_${ele['id']}`, `/LC_MESSAGES/Quizzes/Categories/${ele['id']}`, `dynamic`);
                            ele.category_type = (customName == '' || customName == `quiz_category_type_${ele['id']}`) ? ele['category_type'] : customName;
                        }
                        if (ele.description) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_category_description_${ele.id}`, `/LC_MESSAGES/Quizzes/Categories/${ele['id']}`, `dynamic`);
                            ele.description = (customName == '' || customName == `quiz_category_description_${ele.id}`) ? ele['description'] : customName;
                        }
                    }));
                }
            }
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