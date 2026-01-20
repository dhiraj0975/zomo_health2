import { CommonArrayService, CommonDateService, CommonService, CommunicationEmailDto, tableConstant } from '@common-constants';
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
import { CreateCommunicationEmailInput, PaginateWithCommunicationInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { CommunicationEmailService } from "./communicationemail.service";
import { CommunicationEmailToService } from '../emailto/communicationemailto.service';
import { In, Not } from 'typeorm';
import { CommunicationHelperService } from '../communicationHelper.service';
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
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCommunicationInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = req.tokenUser;
            let userId = user?.id;
            if (postData?.type && (postData?.type == 'inbox' || postData?.type == 'inbox_send')) {
                let mailId: any[] = [];
                let parentId: any[] = [];
                let emailToDetails = await this.communicationEmailToService.listRecord({
                    user_id: userId,
                    is_send: 1,
                    is_spam: 0,
                    is_trash: 0,
                });
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
                    if( postData?.type == 'inbox_send') {
                        subCondition = `user.id = EmailTo.user_id`
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
            if (postData?.type && (postData?.type == 'inbox_send' || postData?.type == 'inbox')) {
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
                where += `AND communication.parent_id = '${postData?.parent_id}' `;
            }
            if (postData?.search_str) {
                where += `AND(communication.state LIKE '%${postData?.search_str}%' OR communication.city LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.communicationEmailService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CommunicationEmailDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
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
}