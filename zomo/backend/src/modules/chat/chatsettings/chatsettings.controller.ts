import { ChatSettingsDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { UserService } from 'src/modules/user/user/user.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateChatSettingsInput, DeleteChallengeInput, PaginateWithChallengeInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ChatSettingsService } from './chatsettings.service';
@Controller('chat/chat-settings')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ChatSettingsController {
    constructor(
        private readonly chatSettingsService: ChatSettingsService,
        private readonly userService: UserService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `user.status = 1`;
            if (postData?.org_id) {
                where += ` AND user.org_id = ${postData?.org_id}`;
            }
            if (postData?.user_id) {
                where += ` AND cs.user_id = ${postData?.user_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '','full_name' , false);
            }
            let resultedData = await this.userService.paginateList(where, {...postData, order_by: postData?.order_by, order: postData?.order} as any, 
                ['user.id','user.code','user.first_name','user.last_name','user.timezone','cs'],
                [tableConstant.CHALLENGE.TBL_CH_CHAT_SETTINGS]);
            resultedData['list'] = await Promise.all(resultedData['list']?.map(ele => {
                let object = {};
                if(ele.cs){
                    object = ele.cs; 
                }
                else{
                    object = {
                    "org_id": postData?.org_id,
                    "user_id": ele.id,
                    "chat_with_dept": 0,
                    "chat_with_loc": 0,
                    "chat_with_users": 0,
                    "chat_with_team": 0,
                    "chat_own_team": 0,
                    "status": 1,
                    };
                     
                }
                object['user'] = {
                        id: ele.id,
                        code: ele.code,
                        first_name: ele.first_name,
                        full_name: ele.full_name,
                        last_name: ele.last_name,
                        timezone: ele.timezone,
                    };
                return object;
            }));
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ChatSettingsDto, resultedData['list'], req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateChatSettingsInput) {
        try {
            if (!postData?.org_id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.chatSettingsService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'The Chat setting has been saved')
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
    @Post('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateChatSettingsInput) {
        try {
            if (!postData?.id && !postData?.org_id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.id) {
                if (!postData?.org_id || !postData?.user_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                const recordDetails = await this.chatSettingsService.findOne({
                    id: postData?.id, org_id: postData?.org_id
                });
                if (!recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                await this.chatSettingsService.update({id: postData?.id, org_id: postData?.org_id}, {...postData});
                this.activityLogService.create(recordDetails, {...postData}, tableConstant.CHALLENGE.TBL_CH_CHAT_SETTINGS, req.tokenUser?.id, 'update');
            }
            else{
                let users: any = null;
                if (postData?.chatSettings) {
                    users = await this.userService.listRecord({ org_id: postData?.org_id, status: 1 }, null, ['user.id']);
                    for (let i = 0; i < users.length; i++) {
                        users[i].user_id = users[i].id;
                        delete users[i].id;
                    }
                }
                if (postData?.user_ids?.length) {
                    users = postData?.user_ids;
                }
                if (users) {
                    for (let user of users) {
                        let settings: any = { org_id: postData?.org_id, user_id: user.user_id, status: 1 };
                        let userSettings = postData?.chatSettings || user;
                        if (user.hasOwnProperty('chat_with_dept')) settings.chat_with_dept = user.chat_with_dept;
                        if (user.hasOwnProperty('chat_with_loc')) settings.chat_with_loc = user.chat_with_loc;
                        if (user.hasOwnProperty('chat_with_team')) settings.chat_with_team = user.chat_with_team;
                        if (user.hasOwnProperty('chat_own_team')) settings.chat_own_team = user.chat_own_team;
                        if (user.hasOwnProperty('chat_with_users')) settings.chat_with_users = user.chat_with_users;
                        if (userSettings?.all_dept == 1 || userSettings?.chat_with_dept == 1) settings.chat_with_dept = 1;
                        if (userSettings?.all_loc == 1 || userSettings?.chat_with_loc == 1) settings.chat_with_loc = 1;
                        if (userSettings?.all_team == 1 || userSettings?.chat_with_team == 1) settings.chat_with_team = 1;
                        if (userSettings?.all_uteam == 1 || userSettings?.chat_own_team == 1) settings.chat_own_team = 1;
                        if (userSettings?.all_user == 1 || userSettings?.chat_with_users == 1) settings.chat_with_users = 1;
                        let checkedData = await this.chatSettingsService.findOne(user?.id ? { id: user?.id } : { org_id: postData?.org_id, user_id: user.user_id });
                        if (checkedData) {
                            await this.chatSettingsService.update({ id: checkedData.id }, settings);
                        } else {
                            await this.chatSettingsService.save(settings);
                        }
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'The Chat setting has been updated')
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.chatSettingsService.findOne({
                id: postData?.id, org_id: postData?.org_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.chatSettingsService.update({id: postData?.id, org_id: postData?.org_id},{status: 2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_CHAT_SETTINGS, req.tokenUser?.id, 'delete');
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
}