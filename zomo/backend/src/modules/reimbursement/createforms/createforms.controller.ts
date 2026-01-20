import { appConstant, CommonArrayService, CommonService, ReimbursementCreateFormsDto, tableConstant } from '@common-constants';
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
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateReimbursementFormsInput,
    DeleteReimbursementFormInput,
    FormListReimbursementCreateFormsInput,
    PaginationReimbursementCreateFormsInput,
    UpdateReimbursementFormsInput
} from '../../../input';
import { TranslationService } from "../../translation/translation.service";
import { SubmitFormsService } from '../submitforms/submitforms.service';
import { CreateFormsService } from './createforms.service';
@Controller('reimbursement/create-forms')
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
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationReimbursementCreateFormsInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ([appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER, appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) ? `cf.deleted = 0` : `cf.deleted = '0' AND cf.status = '1'`;
            if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.ORGADMIN, appConstant.ROLE.WCH].includes(req.tokenUser?.role_id) && postData?.org_id) {
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
                            message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                        });
                    }
                }
            }
            if (postData?.status != undefined || postData?.status != null) {
                where += ` AND cf.status = ${postData?.status}`;
            }
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['cf.title','cf.id']);
            }
            if (postData?.approval_type) {
                where += ` AND (cf.approval_type = '${postData?.approval_type}')`;
            }
            const resultedData = await this.createFormsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ReimbursementCreateFormsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele.id}`, `/LC_MESSAGES/Reimbursements/SubmitForm/${ele.org_id}/${ele.id}`,`dynamic`);
                        if (!customName.includes('title_')) {
                            ele.title = customName;
                        }
                    }
                    if(ele && ele.description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`description_${ele.id}`, `/LC_MESSAGES/Reimbursements/SubmitForm/${ele.org_id}/${ele.id}`,`dynamic`);
                        if (!customName.includes('description_')) {
                            ele.description = customName;
                        }
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
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateReimbursementFormsInput) {
        try {
            if (!postData?.title || !postData?.activity_id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const formCheck = await this.createFormsService.findOne({
                title: postData?.title.trim(),
                org_id: postData?.org_id,
                deleted: '0',
            });
            if (formCheck) {
                throw Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Created Form'));
            }
            if (postData?.activity_date == undefined || postData?.activity_date == null) {
                postData.activity_date = 1;
            }
            if (postData?.attachments == undefined || postData?.attachments == null) {
                postData.attachments = 1;
            }            
            postData.deleted = 0;
            let created_by = 2;
            if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN){                
                created_by = 1;
            } else if(req.tokenUser?.role_id == appConstant.ROLE.WCH){
                created_by = req.tokenUser?.id
            }
            let recordDetails = await this.createFormsService.save({ ...postData, created_by: created_by });
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `title_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`] = postData?.title;                           
                let description = `description_${recordDetails['id']}`; 
                dynamicDatas[`${description}`] = postData?.description;           
            }
            await this.translatorService.DynamicEngJsonData('Reimbursements',postData?.org_id,dynamicDatas,'Add','SubmitForm',recordDetails['id'].toString());
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_FORM_CREATED_SUCCESSFULLY"),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateReimbursementFormsInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = { id: postData?.id, deleted: '0', org_id: postData?.org_id };
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
            let findWhere = {
                org_id: postData?.org_id,
                id: Not(postData?.id),
                deleted: '0',
            }
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
            }                          
            if(postData?.description){
                let description = `description_${recordDetails['id']}`; 
                dynamicDatas[`${description}`] = postData?.description;           
            }
            await this.translatorService.DynamicEngJsonData('Reimbursements',postData?.org_id,dynamicDatas,'Edit','SubmitForm',recordDetails['id'].toString());
            this.activityLogService.create(recordDetails, postData, tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "FORM_UPDATED"),
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteReimbursementFormInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = { id: postData?.id, org_id: postData?.org_id };
            const recordDetails = await this.createFormsService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.createFormsService.update(where, { deleted: '1' });
            this.activityLogService.create(recordDetails, { deleted: 1 }, tableConstant.REIMBURSEMENT.TBL_RE_CREATE_FORMS, req.tokenUser?.id, 'delete');
            await this.submitFormsService.update({ form_id: postData?.id, org_id: postData?.org_id }, { deleted: '1' });
            this.activityLogService.create(recordDetails, { deleted: 1, remark: 'form_id' }, tableConstant.REIMBURSEMENT.TBL_RE_SUBMITTED_FORMS, req.tokenUser?.id, 'delete');
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
    async formList(@Req() req: Request, @Res() res: Response, @Body() postData: FormListReimbursementCreateFormsInput) {
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
            let resultedData = await this.createFormsService.listRecord(["id", "title", "activity_id", "activity_date", "multiple_selection", "attachments", "act_reim_amount", "approval_type", "attachment_req"], where, { id: 'ASC' });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ReimbursementCreateFormsDto, resultedData, req.lang)
            );
            await Promise.all(resultedData.map(async ele =>{
                if(ele.title){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `title_${ele['id']}`, `/LC_MESSAGES/Reimbursements/SubmitForm/${postData?.org_id}/${ele['id']}`,`dynamic`);
                    if (customName != `title_${ele['id']}`) {
                        ele.title = customName;
                    }
                }
            }));
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
            let where = { deleted: 0 };
            if (postData?.org_id) {
                where['org_id'] = postData?.org_id;
            }
            let resultedData = await this.createFormsService.listRecord(['id','title',"activity_id", "activity_date", "multiple_selection", "attachments", "attachment_req"], where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ReimbursementCreateFormsDto, resultedData, req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
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
                await this.commonArrayService.formatToDto(ReimbursementCreateFormsDto, recordDetails, req.lang)
            );
            if(recordDetails.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `title_${recordDetails['id']}`, `/LC_MESSAGES/Reimbursements/SubmitForm/${req.tokenUser?.org_id}/${recordDetails['id']}`,`dynamic`);
                if (customName != `title_${recordDetails['id']}`) {
                    recordDetails.title = customName;
                }
            }
            if(recordDetails.description){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `description_${recordDetails['id']}`, `/LC_MESSAGES/Reimbursements/SubmitForm/${req.tokenUser?.org_id}/${recordDetails['id']}`,`dynamic`);
                if (customName != `description_${recordDetails['id']}`) {
                    recordDetails.description = customName;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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
