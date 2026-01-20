import { appConstant, CommonArrayService, CommonService, EventCategoryDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put, Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In, Like, Not } from "typeorm";
import { TokenGuard } from '../../../guard';
import {
    PaginateWithCompanyInput,
} from "../../../input";
import { EventCategoryService } from "./eventcategory.service";
import { AddEventCategoryInput, DeleteEventCategoryInput, ListEventCategoryInput, UpdateEventCategoryInput } from './input';
@Controller('events/category')
@UseGuards(TokenGuard)
export class EventCategoryController {
    constructor(
        private readonly eventCategoryService: EventCategoryService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `e_category.status = 1`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['e_category.id','e_category.category_name']);
            }
            let resultedData = await this.eventCategoryService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(EventCategoryDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.category_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele['id']}`, `/LC_MESSAGES/Events/Category/${ele['c_companies_id']}/${ele['id']}`,`dynamic`);
                        ele.category_name = (customName == '' || customName == `category_name_${ele['id']}`) ? ele['category_name'] : customName;
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async add(@Req() req: Request, @Res() res: Response, @Body() postData: AddEventCategoryInput) {
        try {
            if (!postData?.c_companies_id || !postData?.category_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let recordDetails: any = await this.eventCategoryService.findOne({c_companies_id: postData?.c_companies_id, category_name: postData?.category_name, status: 1});
            if (recordDetails) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Category'));
            }
            recordDetails = await this.eventCategoryService.save({...postData,
                created_by: postData?.created_by ?? req.tokenUser?.id,
                updated_by: postData?.updated_by ?? req.tokenUser?.id,
            });
            let dynamicDatas = Object.create(null);
            if(postData?.category_name){
                let tilte = `category_name_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.category_name;
            }                       
            await this.translatorService.DynamicEngJsonData('Events',postData?.c_companies_id,dynamicDatas,'Edit','Category',recordDetails['id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation( req.lang, 'Event category has been created successfully', `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
    async edit(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateEventCategoryInput) {
        try {
            if (!postData?.id || !postData?.c_companies_id || !postData?.category_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.eventCategoryService.findOne({ id: postData?.id});
            if(!recordDetails){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            const recordDetailsExist = await this.eventCategoryService.findOne({ c_companies_id: postData?.c_companies_id, category_name: postData?.category_name, id: Not(postData?.id), status: Not(2) });          
            if (recordDetailsExist) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Category'));
            }
            await this.eventCategoryService.update({ id: postData?.id},{...postData,updated_by: postData?.updated_by ?? req.tokenUser?.id});
            this.activityLogService.create(recordDetails, {...postData,updated_by: postData?.updated_by ?? req.tokenUser?.id}, tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.category_name){
                let tilte = `category_name_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.category_name;
            }                       
            await this.translatorService.DynamicEngJsonData('Events',postData?.c_companies_id,dynamicDatas,'Edit','Category',recordDetails['id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation( req.lang, 'Event category has been updated successfully', `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteEventCategoryInput) {
        try {
            if (!postData?.id || !postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, c_companies_id: postData?.c_companies_id };
            const recordDetails = await this.eventCategoryService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.eventCategoryService.update(where,{status:2});
            await this.translatorService.DynamicEngJsonData('Events',recordDetails?.c_companies_id, null,'Delete','Category',recordDetails?.id);
            this.activityLogService.create(recordDetails, postData, tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation( req.lang, 'Event category has been deleted successfully', `/LC_MESSAGES/Events/Events`, `static`)+`.`
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListEventCategoryInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any = {c_companies_id: In(postData?.c_companies_id.split(',')), status: '1'};
            if (postData?.search_str) {
                where = [
                    { c_companies_id: In(postData?.c_companies_id.split(',')), status: '1', category_name: Like('%' + postData?.search_str + '%') },
                ];
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.eventCategoryService.listRecord(null,where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(EventCategoryDto, resultedData, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.category_name) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `category_name_${ele['id']}`, `/LC_MESSAGES/Events/Category/${ele['c_companies_id']}/${ele['id']}`, `dynamic`);
                            ele.category_name = (customName == '' || customName == `category_name_${ele['id']}`) ? ele['category_name'] : customName;
                        }
                    }));
                }
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: ListEventCategoryInput) {
        try {
            if (!postData?.id && !postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = postData?.id ? postData?.c_companies_id ? { id: postData?.id, c_companies_id: postData?.c_companies_id } : { id: postData?.id}: { c_companies_id: postData?.c_companies_id};
            if(req.tokenUser?.role_id != 1){
                where['status']  = 1;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.eventCategoryService.findOne(where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(EventCategoryDto, resultedData, req.lang)
            );
            if(resultedData.category_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${resultedData['id']}`, `/LC_MESSAGES/Events/Category/${resultedData['c_companies_id']}/${resultedData['id']}`,`dynamic`);
                resultedData.category_name = (customName == '' || customName == `category_name_${resultedData['id']}`) ? resultedData['category_name'] : customName;
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let resultedData = await this.eventCategoryService.updateOrder(postData, req);
            this.activityLogService.create({order:[]}, postData, tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES, req.tokenUser?.id);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(EventCategoryDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ORDER_CHANGE"),
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
