import { appConstant, CommonArrayService, CommonService, CreateFormsDto, CreateFormsEntity, tableConstant } from '@common-constants';
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
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { FindOptionsWhere, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from "../../translation/translation.service";
import { SubmitFormsService } from '../submitforms/submitforms.service';
import { CreateFormsService } from './createforms.service';
import { CreateFormsInput, DeleteActivityTrackerFormInput, FormListCreateFormsInput, PaginationCreateFormsInput, UpdateFormsInput } from './input';
@Controller('activitytracker/create-forms')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CreateFormsController {
    constructor(
        private readonly createFormsService: CreateFormsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly submitFormsService: SubmitFormsService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationCreateFormsInput) {
        try {
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER, appConstant.ROLE.ORGADMIN , appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) ? `cf.deleted = 0` : `cf.deleted = '0' AND cf.status = '1'`;
            if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.ORGADMIN  , appConstant.ROLE.WCH].includes(req.tokenUser?.role_id) && postData?.org_id) {
                where += ` AND cf.org_id = '${postData?.org_id}'`;
            }
            else{
                if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                    let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                    if(resultedData.length > 0){
                        where += `AND cf.org_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
                    }
                    else{
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: {
                                list: [],
                                limit: postData?.limit,
                                page: postData?.page,
                                pages: 0,
                                total: 0
                            },
                            message: 'success',
                        });
                    }
                }
            }
            if (postData?.status != undefined || postData?.status != null) {
                where += ` AND cf.status = ${postData?.status}`;
            }
            postData = this.commonService.sanitizePayload(postData)
            if (postData?.search_str) {
                if (postData?.filter_by == 'id') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, 'cf.id');
                } else if (postData?.filter_by == 'title') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, 'cf.title');
                } else {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['cf.id','cf.title']);
                }
            }
            if (postData?.approval_type) {
                where += ` AND (cf.approval_type = '${postData?.approval_type}')`;
            }
            const resultedData = await this.createFormsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CreateFormsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele.id}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${ele.org_id}/${ele.id}`,`dynamic`);
                        if (!customeName.includes('title_')) {
                            ele.title = customeName;
                        }
                    }
                    if(ele && ele.description){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`description_${ele.id}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${ele.org_id}/${ele.id}`,`dynamic`);
                        if (!customeName.includes('description_')) {
                            ele.description = customeName;
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFormsInput) {
        try {
            if (!postData?.title || !postData?.activity_id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const formCheck = await this.createFormsService.findOne({
                title: postData?.title?.trim(),
                org_id: postData?.org_id,
                deleted: 0,
            });
            if (formCheck) {
                throw Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Created Form'));
            }
            if(!this.commonService.isValidNumber(postData?.activity_date)){
                postData.activity_date = 1;
            }
            if(!this.commonService.isValidNumber(postData?.attachments)){
                postData.attachments = 1;
            }
            let created_by: number = 2;
            if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN){                
                created_by = 1;
            } else if(req.tokenUser?.role_id == appConstant.ROLE.WCH){
                created_by = req.tokenUser?.id
            }
            let recordDetails = await this.createFormsService.save({ ...postData, created_by: created_by });
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let title:string = `title_${recordDetails['id']}`;
                dynamicDatas[`${title}`] = postData?.title;                           
                let description:string = `description_${recordDetails['id']}`;
                dynamicDatas[`${description}`] = postData?.description;           
            }
            await this.translatorService.DynamicEngJsonData('ActivityForms',postData?.org_id,dynamicDatas,'Add','SubmitForm',recordDetails['id'].toString());
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Form has been created successfully.',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateFormsInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where: FindOptionsWhere<CreateFormsEntity> = { id: postData?.id, deleted: 0, org_id: postData?.org_id };
            const recordDetails = await this.createFormsService.findOne(where);
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
            postData.id = Number(postData?.id);
            let findWhere: FindOptionsWhere<CreateFormsEntity> = {
                org_id: postData?.org_id,
                id: Not(postData?.id),
                deleted: 0,
            };
            if (postData?.title) {
                findWhere['title'] = postData?.title?.trim();
                const formCheck = await this.createFormsService.findOne(findWhere);
                if (formCheck) {
                    throw Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Created Form'));
                }
            }
            await this.createFormsService.update({ id: postData?.id, org_id: postData?.org_id }, postData);
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `title_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`] = postData?.title;                           
                let description = `description_${recordDetails['id']}`; 
                dynamicDatas[`${description}`] = postData?.description;           
            }
            await this.translatorService.DynamicEngJsonData('ActivityForms',postData?.org_id,dynamicDatas,'Edit','SubmitForm',recordDetails['id'].toString()); 
            this.activityLogService.create(recordDetails, postData, tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Form has been updated successfully.',
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteActivityTrackerFormInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = { id: postData?.id, org_id: Number(postData?.org_id) };
            const recordDetails = await this.createFormsService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.createFormsService.update(where, { deleted: 1 });
            this.activityLogService.create(recordDetails, { deleted: 1 }, tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS, req.tokenUser?.id, 'delete');
            await this.submitFormsService.update({ form_id: postData?.id, org_id: postData?.org_id }, { deleted: '1' });
            this.activityLogService.create(recordDetails, { deleted: 1, remark: 'form_id' }, tableConstant.ACTIVITY_TRACKER.TBL_SUBMITTED_FORMS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_FORM_DELETED_SUCCESSFULLY"),
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
    @Post('form-list')
    async formList(@Req() req: Request, @Res() res: Response, @Body() postData: FormListCreateFormsInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = {
                org_id: postData?.org_id,
                status: 1,
                deleted: 0,
                activity_id: Not(''),
            };
            let resultedData = await this.createFormsService.listRecord(["id", "org_id" ,"title", "activity_id", "activity_date", "multiple_selection", "attachments", "approval_type", "attachment_req"], where, { id: 'ASC' });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CreateFormsDto, resultedData, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.title) {
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang, `title_${ele.id}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${ele.org_id}/${ele.id}`, `dynamic`);
                            if (!customeName.includes('title_')) {
                                ele.title = customeName;
                            }
                        }
                        if (ele && ele.description) {
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang, `description_${ele.id}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${ele.org_id}/${ele.id}`, `dynamic`);
                            if (!customeName.includes('description_')) {
                                ele.description = customeName;
                            }
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
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let where = { deleted: 0 };
            if (postData?.org_id) {
                where['org_id'] = postData?.org_id;
            }
            let resultedData = await this.createFormsService.listRecord(['id','title',"activity_id", "activity_date", "multiple_selection", "attachments", "attachment_req"], where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CreateFormsDto, resultedData, req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let recordDetails = await this.createFormsService.findOne(where);
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
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(CreateFormsDto, recordDetails, req.lang)
            );            
            if(recordDetails.title){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang, `title_${recordDetails['id']}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${req.tokenUser?.org_id}/${recordDetails['id']}`,`dynamic`);
                if (customeName != `title_${recordDetails['id']}`) {
                    recordDetails.title = customeName;
                }
            }
            if(recordDetails.description){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang, `description_${recordDetails['id']}`, `/LC_MESSAGES/ActivityForms/SubmitForm/${req.tokenUser?.org_id}/${recordDetails['id']}`,`dynamic`);
                if (customeName != `description_${recordDetails['id']}`) {
                    recordDetails.description = customeName;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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
