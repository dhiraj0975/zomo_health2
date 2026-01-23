import { CommonArrayService, CommonDateService, CommonService, CommunicationEmailDto, Status, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCommunicationEmailInput, PaginateWithCommunicationInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { CommunicationEmailService } from "./communicationemail.service";
import { CommunicationEmailToService } from '../emailto/communicationemailto.service';
import { In, Not } from 'typeorm';
import { CommunicationHelperService } from '../communicationHelper.service';
import { EmailActionInput, getOneEmailInput } from './input';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { EmailAttachmentsService } from '../emailattachments/emailattachments.service';
const S3_URL = process.env.S3_URL_PROD

@Controller('communication/email')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CommunicationEmailController {
    constructor(
        private readonly communicationEmailService: CommunicationEmailService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly communicationEmailToService: CommunicationEmailToService,
        private readonly communicationHelperService: CommunicationHelperService,
        private readonly commonDateService: CommonDateService,
        private readonly emailAttachmentsService: EmailAttachmentsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCommunicationInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = req.tokenUser;
            let userId = user?.id;
            if (postData?.type && (postData?.type == 'inbox' || postData?.type == 'inbox_send' || postData?.type == 'inbox_trash' || postData?.type == 'inbox_spam')) {
                let mailId: any[] = [];
                let parentId: any[] = [];
                let where = {};
                if (postData?.type == 'inbox_trash') {
                    where = {
                        user_id: userId,
                        is_send: 1,
                        is_trash: 1,
                    };
                }
                else if (postData?.type == 'inbox_spam') {
                    where = {
                        user_id: userId,
                        is_send: 1,
                        is_spam: 1,
                    }
                } else {
                    where = {
                        user_id: userId,
                        is_send: 1,
                        is_spam: 0,
                        is_trash: 0,
                    };
                }
                let emailToDetails = await this.communicationEmailToService.listRecord(where);
                if (emailToDetails && emailToDetails.length > 0) {
                    mailId = emailToDetails.map(item => item.mail_id);
                }
                if (mailId.length > 0) {
                    let parentEmails = await this.communicationEmailService.listRecord({
                        id: In(mailId),
                        is_send: 1,
                    });
                    if (parentEmails && parentEmails.length > 0) {
                        parentId = parentEmails
                            .map(item => item.parent_id)
                            .filter(val => val);
                    }
                    let emailToId = [...new Set([...mailId, ...parentId])];
                    let sentWhere = [];
                    if (postData?.type == 'inbox') {
                        sentWhere.push({
                            from_user_id: userId,
                            is_send: 1,
                            is_spam: 0,
                            is_trash: 0,
                            parent_id: Not(0),
                        },
                            {
                                id: In(emailToId),
                            });
                    }
                    if (postData?.type == 'inbox_send') {
                        sentWhere.push(
                            {
                                from_user_id: userId,
                                is_send: 1,
                                is_spam: 0,
                                is_trash: 0,
                            },
                            {
                                id: In(emailToId),
                                parent_id: Not(0),

                            }
                        )
                    }
                    if (postData?.type == 'inbox_trash') {
                        sentWhere.push(
                            {
                                from_user_id: userId,
                                is_send: 1,
                                is_trash: 1,
                            },
                            {
                                id: In(emailToId),
                            }
                        )
                    }
                    if (postData?.type == 'inbox_spam') {
                        sentWhere.push(
                            {
                                from_user_id: userId,
                                is_send: 1,
                                is_spam: 1,
                            },
                            {
                                id: In(emailToId),
                            }
                        )
                    }
                    let sent = await this.communicationEmailService.listRecord(sentWhere);
                    let key = sent.map(item => item.id);
                    let value = sent.map(item => item.parent_id);
                    let sentFinal = [...new Set([...key, ...value])].filter(val => val);
                    let condition = `communication.id IN (${sentFinal.length > 0 ? sentFinal.join(',') : null}) `;
                    if (postData?.search_str) {
                        condition += ` AND (communication.subject LIKE '%${postData?.search_str}%' OR user.first_name LIKE '%${postData?.search_str}%' OR user.last_name LIKE '%${postData?.search_str}%' )`;
                    }
                    let subCondition = ``;
                    if (postData?.type == 'inbox') {
                        subCondition = `user.id = communication.from_user_id`
                    }
                    if (postData?.type == 'inbox_send') {
                        subCondition = `user.id = EmailTo.user_id`
                    }
                    if (postData?.type == 'inbox_trash') {
                        subCondition = `user.id = communication.from_user_id`
                    }
                    if (postData?.type == 'inbox_spam') {
                        subCondition = `user.id = communication.from_user_id`
                    }
                    let emailInbox = await this.communicationEmailService.paginateWithEmT(
                        condition,
                        null,
                        [
                            'communication.from_user_id',
                            'EmailTo.user_id',
                            'user.first_name',
                            'user.last_name',
                            'communication.id',
                            'communication.subject',
                            'communication.is_attachment',
                            'communication.created_date',
                            'communication.is_important',
                        ],
                        postData,
                        subCondition,
                    );
                    let emailInboxIds = emailInbox['list'].map(item => item.id);
                    let emailStatusMap = await this.getEmailStatusBulk(emailInboxIds, userId);
                    let resultData = {};
                    await Promise.all(
                        emailInbox['list'].map(async item => {
                            const statusInfo = emailStatusMap.get(item.id) || { read: 0, important: 0, count: 0 };
                            resultData[item.id] = {
                                ...item,
                                status: statusInfo.read,
                                is_important: statusInfo.important,
                                total_count: statusInfo.count,
                            };
                            item.created_date_copy = item.created_date;
                            const addedDate = this.commonDateService.DateTimeFormat(
                                item.created_date,
                                'utcTimeFormat',
                                'YYYY-MM-DD HH:mm:ss'
                            );
                            let monthName = this.commonDateService.DateTimeFormat(addedDate, 'MMM')?.toString();
                            monthName = await this.translatorService.frontendReadTranslation(req.lang, monthName, `/LC_MESSAGES/Common/Month`, 'static');
                            const formattedDate =
                                monthName + ' ' + this.commonDateService.DateTimeFormat(addedDate, 'D') + ', ' + this.commonDateService.DateTimeFormat(addedDate, 'YYYY');

                            item.created_date = formattedDate + ' ' + this.commonDateService.getTodayDate(addedDate).format('HH:mm');
                        })
                    );
                    let emailCount = await this.communicationHelperService.getEmailCounting({ coach_id: userId }, req);
                    emailInbox['emailCount'] = emailCount || {
                        inbox: 0,
                        sent: 0,
                        draft: 0,
                        trash: 0,
                        spam: 0,
                    };
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: emailInbox,
                        message: 'success',
                    });
                }
            }
            if (
                postData?.type
                &&
                (
                    postData?.type == 'inbox_send' ||
                    postData?.type == 'inbox' ||
                    postData?.type == 'inbox_trash' ||
                    postData?.type == 'inbox_spam'
                )
            ) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {
                        list: [],
                        total: 0,
                        page: postData?.page || 1,
                        limit: postData?.limit || 10,
                        pages: 0,
                        emailCount: {
                            inbox: 0,
                            sent: 0,
                            draft: 0,
                            trash: 0,
                            spam: 0,
                        },
                    },
                    message: 'success',
                });
            }
            let where = `communication.status !=0 `;
            if (postData?.parent_id) {
                where += ` AND communication.parent_id = '${postData?.parent_id}' `;
            }
            if (postData?.search_str) {
                where += ` AND(communication.state LIKE '%${postData?.search_str}%' OR communication.city LIKE '%${postData?.search_str}%')`;
            }
            if (postData?.type && postData?.type == 'inbox_draft') {
                where += ` AND communication.is_send = 0 AND communication.from_user_id = ${userId} `;
                postData.order_by = 'communication.id';
                postData.order = 'DESC';
            }
            const resultedData = await this.communicationEmailService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CommunicationEmailDto, resultedData['list'], req.lang)
            );
            if (postData?.type && postData?.type == 'inbox_draft') {
                let emailCount = await this.communicationHelperService.getEmailCounting({ coach_id: userId }, req);
                resultedData['emailCount'] = emailCount || {
                    inbox: 0,
                    sent: 0,
                    draft: 0,
                    trash: 0,
                    spam: 0,
                };
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: getOneEmailInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let mailId: number = postData?.id;
            let user = req.tokenUser;
            let userId = user?.id;
            if (postData?.type && postData?.type == 'inbox_view') {
                let emailWhere = `( communication.id = ${mailId} OR communication.parent_id = ${mailId} ) AND ( suser.id = ${userId} OR ruser.id = ${userId} )`;
                const emailSent = await this.communicationEmailService.listRecordWithEmailToUser(
                    emailWhere,
                    {
                        'communication.id': 'ASC'
                    },
                    [
                        'communication.created_date',
                        'communication.subject',
                        'communication.email_body',
                        'communication.id',
                        'communication.from_user_id',
                        'communication.is_attachment',
                        'EmailTo',
                        'suser.id',
                        'suser.first_name',
                        'ruser.id',
                        'ruser.first_name',
                        'suser.last_name',
                        'ruser.last_name',
                        'suser.email',
                        'ruser.email',
                        'suser.profile_image',
                        'ruser.profile_image',
                    ]
                );
                const allMailIdArray: number[] = [];
                let email = [];
                if (emailSent && emailSent.length > 0) {
                    for (const emails of emailSent) {
                        let emaildata = {};
                        const emailId = emails?.id;
                        if (!allMailIdArray.includes(emailId)) {
                            allMailIdArray.push(emailId);
                        }
                        if (!emaildata) {
                            emaildata = Object.create(null);
                            if (emaildata['S_User'] === undefined) {
                                emaildata['S_User'] = Object.create(null);
                            }
                            if (emaildata['R_User'] === undefined) {
                                emaildata['R_User'] = Object.create(null);
                            }
                            if (emaildata['EmailTo'] === undefined) {
                                emaildata['EmailTo'] = Object.create(null);
                            }
                        }
                        emaildata['S_User'].S_id = emails?.['suser']?.id;
                        emaildata['S_User'].S_name = `${emails?.['suser']?.first_name || ''} ${emails?.['suser']?.last_name || ''}`.trim();
                        emaildata['S_User'].S_email = emails?.['suser']?.email;
                        if (emails?.['suser']?.profile_image) {
                            try {
                                const fileData = await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'check_file' },
                                        { prefix: emails?.['suser']?.profile_image }
                                    )
                                );
                                emaildata['S_User'].S_profile = fileData ? `${S3_URL}/${emails?.['suser']?.profile_image}` : '';
                            } catch (error) {
                                emaildata['S_User'].S_profile = '';
                            }
                        } else {
                            emaildata['S_User'].S_profile = '';
                        }
                        const rUserId = emails?.['ruser']?.id;
                        if (rUserId) {
                            emaildata['R_User'] = {
                                name: `${emails?.['ruser']?.first_name || ''} ${emails?.['ruser']?.last_name || ''}`.trim(),
                                emaildata: emails?.['ruser']?.email,
                            };
                            if (emails?.['ruser']?.profile_image) {
                                try {
                                    const fileData = await lastValueFrom(
                                        this.commonMicroservice.send(
                                            { cmd: 'check_file' },
                                            { prefix: emails?.['ruser']?.profile_image }
                                        )
                                    );
                                    emaildata['R_User'].r_profile = fileData ? `${S3_URL}/${emails?.['ruser']?.profile_image}` : '';
                                } catch (error) {
                                    emaildata['R_User'].r_profile = '';
                                }
                            } else {
                                emaildata['R_User'].r_profile = '';
                            }
                        }
                        emaildata['subject'] = emails?.subject;
                        emaildata['created_date'] = emails?.created_date;
                        emaildata['id'] = emailId;
                        emaildata['email_body'] = emails?.email_body;
                        emaildata['from_user_id'] = emails?.from_user_id;
                        emaildata['is_attachment'] = emails?.is_attachment;
                        if (emails?.['EmailTo']) {
                            emaildata['EmailTo'] = {
                                id: emails?.['EmailTo']?.id,
                                status: emails?.['EmailTo']?.status,
                                is_important: emails?.['EmailTo']?.is_important
                            };
                        }
                        email.push(emaildata);
                    }
                }
                let allMailAttechments = await this.emailAttachmentsService.listRecordWithType(
                    `attachment.mail_id IN (${allMailIdArray.length > 0 ? allMailIdArray.join(',') : null})`,
                    { 'attachment.id': 'ASC' },
                    ['attachment', 'type']
                );
                email.forEach(item => {
                    const attachments = allMailAttechments.filter(att => att.mail_id == item.id);
                    item['attachments'] = attachments;
                });
                let resultData = {};
                resultData['email'] = email;
                let emailCount = await this.communicationHelperService.getEmailCounting({ coach_id: userId }, req);
                resultData['emailCount'] = emailCount || {
                    inbox: 0,
                    sent: 0,
                    draft: 0,
                    trash: 0,
                    spam: 0,
                };
                resultData['emailSubject'] = email.length > 0 ? email[0]?.subject : '';
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultData,
                    message: 'success',
                });
            }
            if (postData?.type && postData?.type == 'inbox_view') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success',
                });
            }
            const where = { id: postData?.id };
            let biometricDetails = await this.communicationEmailService.findOne(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(CommunicationEmailDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
                message: 'success',
            });
        } catch (error) {
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailInput) {
        try {
            if (
                !postData?.parent_id ||
                !postData?.is_send ||
                !postData?.is_spam ||
                !postData?.is_important ||
                !postData?.is_attachment ||
                !postData?.is_trash
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.communicationEmailService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            const recordDetails = await this.communicationEmailService.findOne(where);
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
            await this.communicationEmailService.update(where, { status: 2 });
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.COMMUNICATION.TBL_COM_EMAIL, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            const recordDetails = await this.communicationEmailService.findOne(where);
            if (!recordDetails) {
                await this.communicationEmailService.save(
                    postData
                );
            }
            await this.communicationEmailService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.COMMUNICATION.TBL_COM_EMAIL, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {};
            let resultedData = await this.communicationEmailService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CommunicationEmailDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    async getEmailStatusBulk(emailIds: number[], userId: number): Promise<Map<number, any>> {
        const statusMap = new Map();
        if (!emailIds || emailIds.length === 0) {
            return statusMap;
        }
        const emails = await this.communicationEmailService.listRecord({
            id: In(emailIds)
        }, { id: true, status: true, from_user_id: true, is_important: true });
        const relatedEmails = await this.communicationEmailService.listRecord(
            {
                id: In(emailIds),
                parent_id: In(emailIds)
            },
            {
                id: true,
                parent_id: true,
                from_user_id: true
            }
        );
        const allRelatedIds = relatedEmails.map(e => e.id);
        const emailToRecords = await this.communicationEmailToService.listRecord({
            mail_id: In(allRelatedIds),
            user_id: userId
        }, { mail_id: true, status: true, is_important: true });
        const emailToMap = new Map<number, any[]>();
        emailToRecords.forEach(record => {
            const mailId = record.mail_id;
            if (!emailToMap.has(mailId)) {
                emailToMap.set(mailId, []);
            }
            emailToMap.get(mailId).push(record);
        });
        const relatedEmailMap = new Map<number, number[]>();
        relatedEmails.forEach(email => {
            const key = email.parent_id || email.id;
            if (!relatedEmailMap.has(key)) {
                relatedEmailMap.set(key, []);
            }
            relatedEmailMap.get(key).push(email.id);
        });
        const countEmailsSent = await this.communicationEmailService.listRecord(
            [
                {
                    from_user_id: userId,
                    id: In(emailIds)
                },
                {
                    from_user_id: userId,
                    parent_id: In(emailIds)
                }
            ],
            {
                id: true,
                parent_id: true
            }
        );
        const countMap = new Map<number, number>();
        countEmailsSent.forEach(email => {
            const key = email.parent_id || email.id;
            countMap.set(key, (countMap.get(key) || 0) + 1);
        });
        emailIds.forEach(emailId => {
            const email = emails.find(e => e.id === emailId);
            if (!email) {
                statusMap.set(emailId, {
                    read: 0,
                    important: 0,
                    count: 0
                });
                return;
            }
            let result = {
                read: 0,
                important: 0,
                count: 0
            };
            if (email.from_user_id === userId) {
                result.read = email.status;
                result.important = email.is_important;
            } else {
                const relatedIds = relatedEmailMap.get(emailId) || [emailId];
                const emailToForThis = relatedIds.flatMap(id => emailToMap.get(id) || []);
                const statusValues = emailToForThis.map(et => et.status);
                result.read = statusValues.includes(0) ? 0 : 1;
                const importantValues = emailToForThis.map(et => et.is_important);
                result.important = importantValues.includes(0) ? 0 : 1;
            }
            const sentCount = countMap.get(emailId) || 0;
            const relatedIds = relatedEmailMap.get(emailId) || [emailId];
            const emailToCount = relatedIds.reduce((sum, id) => {
                return sum + (emailToMap.get(id)?.length || 0);
            }, 0);
            result.count = sentCount + emailToCount;
            statusMap.set(emailId, result);
        });
        return statusMap;
    }
    @Post('email-action')
    async emailAction(@Req() req: Request, @Res() res: Response, @Body() postData: EmailActionInput) {
        try {
            const userId = req.tokenUser?.id;
            const mailId = postData?.id;
            const selectedMailIds = this.commonArrayService.transformToArray(postData?.selected_mail_ids, ',') || [];
            const isMulti = selectedMailIds.length > 0;
            const baseIds: any =
                isMulti ?
                    selectedMailIds
                    :
                    (
                        mailId ?
                            [mailId]
                            :
                            []
                    );
            const updateEmail: any[] = [];
            const updateEmailTo: any[] = [];
            const getUserSentIds = async () => {
                if (!baseIds.length) return [];
                const records = await this.communicationEmailService.listRecord(
                    [
                        {
                            id: In(baseIds),
                            from_user_id: userId
                        },
                        {
                            parent_id: In(baseIds),
                            from_user_id: userId
                        }
                    ],
                    null,
                    {
                        id: true
                    }
                );
                return records.map(r => r.id);
            };
            const getFullThreadIds = async () => {
                if (!baseIds.length) return [];
                const records = await this.communicationEmailService.listRecord(
                    [
                        {
                            id: In(baseIds)
                        },
                        {
                            parent_id: In(baseIds)
                        }
                    ],
                    null,
                    {
                        id: true
                    }
                );
                return records.map(r => r.id);
            };
            const addToEmailTo = (records: any[], payload: Record<string, any>) => {
                records.forEach(rec => updateEmailTo.push({ id: rec.id, ...payload }));
            };
            const action = postData?.type;
            if (action) {
                const userSentIds = await getUserSentIds();
                const threadIds = await getFullThreadIds();
                const inboxRecords = threadIds.length > 0
                    ? await this.communicationEmailToService.listRecord(
                        { mail_id: { $in: threadIds }, user_id: userId },
                        null,
                        { id: true }
                    )
                    : [];
                switch (action) {
                    case 'mark_as_read':
                    case 'mark_as_unread': {
                        const status = action === 'mark_as_read' ? 1 : 0;
                        userSentIds.forEach(id => updateEmail.push({ id, status }));
                        if (inboxRecords.length) {
                            addToEmailTo(inboxRecords, { status });
                        }
                        break;
                    }
                    case 'add_star':
                    case 'remove_star': {
                        const isImportant = action === 'add_star' ? 1 : 0;
                        userSentIds.forEach(id => updateEmail.push({ id, is_important: isImportant }));
                        if (inboxRecords.length) {
                            addToEmailTo(inboxRecords, { is_important: isImportant });
                        }
                        break;
                    }
                    case 'mark_as_spam': {
                        userSentIds.forEach(id => updateEmail.push({ id, is_spam: 1, is_trash: 0 }));
                        if (inboxRecords.length) {
                            addToEmailTo(inboxRecords, { is_spam: 1, is_trash: 0 });
                        }
                        break;
                    }
                    case 'move_to_trash': {
                        userSentIds.forEach(id => updateEmail.push({ id, is_spam: 0, is_trash: 1 }));
                        if (inboxRecords.length) {
                            addToEmailTo(inboxRecords, { is_spam: 0, is_trash: 1 });
                        }
                        break;
                    }
                    case 'move_to_inbox': {
                        userSentIds.forEach(id => updateEmail.push({ id, is_trash: 0, is_spam: 0 }));
                        if (inboxRecords.length) {
                            addToEmailTo(inboxRecords, { is_trash: 0, is_spam: 0 });
                        }
                        break;
                    }
                    case 'permanent_delete': {
                        userSentIds.forEach(id => updateEmail.push({ id, is_trash: 2 }));
                        if (inboxRecords.length) {
                            addToEmailTo(inboxRecords, { is_trash: 2 });
                        }
                        break;
                    }
                    case 'remove_draft': {
                        userSentIds.forEach(id => updateEmail.push({ id, status: 2 }));
                        if (inboxRecords.length) {
                            addToEmailTo(inboxRecords, { status: 2 });
                        }
                        break;
                    }
                    default:
                        break;
                }
            }
            for (const email of updateEmail) {
                const id = email.id;
                delete email.id;
                await this.communicationEmailService.update(
                    {
                        id: id
                    },
                    email
                );
            }
            for (const emailTo of updateEmailTo) {
                const id = emailTo.id;
                delete emailTo.id;
                await this.communicationEmailToService.update(
                    {
                        id: id
                    },
                    emailTo
                );
            }
            let result = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS")
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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