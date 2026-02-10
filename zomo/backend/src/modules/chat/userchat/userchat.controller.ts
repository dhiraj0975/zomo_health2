import { ScheduleChallengeJoinUsersService } from '@/modules/challenge/schedulechallengejoinusers/schedulechallengejoinusers.service';
import { appConstant, CommonArrayService, CommonDateService, CommonService, tableConstant, UserDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { ScheduleChallengeService } from 'src/modules/challenge/schedulechallenge/schedulechallenge.service';
import { ActivePluginService } from 'src/modules/company/activeplugins/activeplugin.service';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TeamsService } from "../../challenge/teams/teams.service";
import { TranslationService } from "../../translation/translation.service";
import { UserService } from "../../user/user/user.service";
import { ChatService } from '../chat/chat.service';
import { ChatHelperService } from '../chat/chathelper.service';
import { ChatSettingsService } from '../chatsettings/chatsettings.service';
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Controller('chat/chat')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly teamService: TeamsService,
        private readonly chatSettingsService: ChatSettingsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly companyService: CompanyService,
        private readonly activePluginService: ActivePluginService,
        private readonly chatHelperService: ChatHelperService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
    ) {}

    @Post('users-chat')
    async usersChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let result = Object.create(null);
            let user_id = req.tokenUser?.id;
            let joinCond = `((user.id = ch_chat.user_id AND ch_chat.user_id != '${user_id}') OR (user.id = ch_chat.sender_id AND ch_chat.sender_id != '${user_id}'))`
            let where=`(ch_chat.sender_id = '${user_id}' OR ch_chat.user_id = '${user_id}') 
                AND (ch_chat.user_id <> '') 
                AND event_id = -1 
                AND is_private = 1`;
            let users = await this.chatService.userChat(where,null, 
            [
                `COUNT(IF(read_by NOT REGEXP '^${user_id}' AND read_by NOT REGEXP '${user_id}$' AND read_by != '${user_id}' AND read_by NOT REGEXP '${user_id}', 1, NULL)) AS Total`, 
                "user.profile_image", 
                "user.first_name", 
                "user.last_name", 
                "ch_chat.read_by", 
                "ch_chat.reactions", 
                "ch_chat.added_date", 
                "ch_chat.text", 
                "ch_chat.id", 
                "ch_chat.user_id", 
                "user.id"
            ],
            joinCond
            );
            joinCond = 'user.id = ch_chat.sender_id';
            where = `(ch_chat.user_id = '-1') 
                AND (ch_chat.user_id <> '') 
                AND event_id = -1 
                AND is_private = 1 `;
            let G_users = await this.chatService.userChat(where,null, 
            [
                `COUNT(IF(read_by NOT REGEXP '^${user_id}' AND read_by NOT REGEXP '${user_id}$' AND read_by != '${user_id}' AND read_by NOT REGEXP '${user_id}', 1, NULL)) AS Total`, 
                "user.profile_image", 
                "user.first_name", 
                "user.last_name", 
                "ch_chat.read_by", 
                "ch_chat.added_date", 
                "ch_chat.reactions", 
                "ch_chat.text", 
                "ch_chat.id", 
                "ch_chat.user_id", 
                "user.id"
            ],
            joinCond
            );
            await Promise.all(users.map(async (ele) => {
                if(ele.reactions){
                    ele.reactions = Object.keys(ele.reactions); 
                }
                else{
                    ele.reactions = [];
                }
                if (ele['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: ele['user']['profile_image']}))) {
                    ele['user']['profile_image'] = S3_URL + ele['user']['profile_image'];
                } else {
                    ele['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png';
                }
            }));
            await Promise.all(G_users.map(async (ele) => {
                if(ele.reactions){
                    ele.reactions = Object.keys(ele.reactions); 
                }
                else{
                    ele.reactions = [];
                }
                if (ele['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: ele['user']['profile_image']}))) {
                    ele['user']['profile_image'] = S3_URL + ele['user']['profile_image'];
                } else {
                    ele['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png';
                }
            }));
            result['users']=users;
            result['G_users']=G_users;
            if (G_users && G_users.length > 0) {
                let G_users_to = G_users.reduce((sum, user) => sum + (user[0]?.Total || 0), 0);
                if (G_users_to !== 0) {
                    result['G_users_to'] = G_users_to;
                }
            }
            if (users && users.length > 0) {
                let users_to = users.reduce((sum, user) => sum + (user[0]?.Total || 0), 0);
                if (users_to !== 0) {
                    result['users_to'] = users_to;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
    @Post('user-chat')
    async userChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user_array = Object.create(null);
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let userData = await this.userService.findOne({id: postData?.user_id}, ['user.id','user.code', 'user.first_name', 'user.last_name', 'user.profile_image']);
            userData = <any>(await this.commonArrayService.formatToDto(UserDto, userData, req.lang));
            if (user.role_id == appConstant.ROLE.WCH) {
                const assignment = await this.chatHelperService.checkAndGetAssignment(user.id, 'users', req); 
                if (!assignment.includes(Number(postData?.user_id))) {
                    userData = null;
                }
            }
            if (!userData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Please select user.'));
            }
            let where = `
            ch_chat.is_private=0 AND ch_chat.status !=2 AND (
            (ch_chat.user_id='${user_id}' AND ch_chat.sender_id='${postData?.user_id}') 
            OR (ch_chat.user_id='${postData?.user_id}' AND ch_chat.sender_id='${user_id}') 
            ) 
            AND (ch_chat.user_id <> '') `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE 
                (read_by REGEXP '^${user_id},' 
                OR read_by REGEXP ',${user_id}$' 
                OR read_by = ${user_id} 
                OR read_by REGEXP ',${user_id},')
                AND status !=2
                )`;
            }
            let user_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','ch_chat.user_id','sender.id'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit});
            if(user_chat && user_chat?.list?.length){
                user_array = await this.chatHelperService.process_user_chat(user,user_chat?.list,user_array,true, req.lang);
                user_array = {list: user_array?.['chat'] ?? []};
            }
            else{
                user_array['list'] = [];
            }
            user_array['details'] = userData;
            user_array['page'] = user_chat.page;
            user_array['pages'] = user_chat.pages; 
            user_array['total'] = user_chat.total;
            user_array['limit'] = user_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: user_array,
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
    @Post('user-personal-chat')
    async userPersonalChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let userData = await this.userService.findOne({id: postData?.user_id}, ['user.id', 'user.first_name', 'user.last_name', 'user.profile_image']);
            userData = <any>(await this.commonArrayService.formatToDto(UserDto, userData, req.lang));
            if (!userData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Please select user.'));
            }
            let user_array = Object.create(null);
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let user_chat
            let where = '';
            if(user.role_id==18){  
                where = `(
                (ch_chat.user_id='${user_id}' AND ch_chat.sender_id='${postData?.user_id}') 
                OR (ch_chat.user_id='${postData?.user_id}' AND ch_chat.sender_id='${user_id}') 
                OR (ch_chat.user_id='-1' AND ch_chat.sender_id='${postData?.user_id}') ) 
                AND (ch_chat.user_id <> '')  AND ch_chat.status !=2
                AND ch_chat.id IN (
                SELECT id FROM ch_chat WHERE 
                (read_by REGEXP '^${user_id},' 
                OR read_by REGEXP ',${user_id}$' 
                OR read_by = ${user_id} 
                OR read_by REGEXP ',${user_id},') AND status !=2
                )`;
            }
            else{
                where =`(
                (ch_chat.user_id='${user_id}' AND ch_chat.sender_id='${postData?.user_id}')
                OR (ch_chat.user_id='${postData?.user_id}' AND ch_chat.sender_id='${user_id}') ) 
                AND (ch_chat.user_id <> '')  AND ch_chat.status !=2
                AND ch_chat.id IN (SELECT id FROM ch_chat WHERE 
                (read_by REGEXP '^${user_id},' 
                OR read_by REGEXP ',${user_id}$' 
                OR read_by = ${user_id} 
                OR read_by REGEXP ',${user_id},') AND status !=2
                )`;
            }
            user_chat = await this.chatService.PaginateListRecord(['sender.profile_image','sender.first_name','sender.last_name','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','ch_chat.user_id','sender.id'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit});
            if(user_chat && user_chat?.list?.length){
                user_array = await this.chatHelperService.process_user_chat(user,user_chat?.list,user_array, true, req.lang);
                user_array = {list: user_array?.['chat'] ?? []};
            }
            else{
                user_array['list'] = [];
            }
            user_array['details'] = userData;
            user_array['page'] = user_chat.page;
            user_array['pages'] = user_chat.pages; 
            user_array['total'] = user_chat.total;
            user_array['limit'] = user_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: user_array,
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
    @Post('fetch-user-chat')
    async fetchUserChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user_array = Object.create(null);
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let userData = await this.userService.findOne({id: postData?.user_id});
            if (!userData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Please select user.'));
            }
            let user_chat
            let where = `ch_chat.is_private=0 AND ch_chat.status !=2 AND ch_chat.user_id='${user_id}' AND ch_chat.sender_id='${postData?.user_id}'`; 
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (SELECT id FROM ch_chat 
                WHERE 
                (read_by REGEXP '^${user_id},' 
                OR read_by REGEXP ',${user_id}$' 
                OR read_by = ${user_id} 
                OR read_by REGEXP ',${user_id},') AND status !=2
                )`;
            }
            user_chat = await this.chatService.listRecord(['sender.profile_image','sender.first_name','sender.last_name','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','ch_chat.user_id','sender.id'],
                where,
            {id: 'ASC'});
            if(user_chat && user_chat.length){
                for(let chat of user_chat) {
                    let image
                     if (chat['sender']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat['sender']['profile_image']}))) {
                        image = S3_URL + chat['sender']['profile_image'];
                     } else {
                        image = S3_URL + 'comn/img/avatar_0001.png';
                     }
                     let timezone = user.timezone;
                     if(timezone.trim() != ""){
                        if(timezone.trim() == "Pacific Standard Time (PST)"){
                            timezone = "America/Los_Angeles";
                        }
                        if(timezone.trim() == "Mountain Standard Time (MST)"){
                            timezone = "America/Denver";
                        }
                        if(timezone.trim() == "Central Standard Time (CST)"){
                            timezone = "America/Chicago";
                        }
                        if(timezone.trim() == "Eastern Standard Time (EST)"){
                            timezone = "America/New_York";
                        }                                                
                    }
                    let uCurrentDate
                    let msg_date
                    if (timezone && timezone !== "UTC") {
                        // uCurrentDate = moment(chat.added_date).utc().tz(timezone);
                        uCurrentDate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                        msg_date = uCurrentDate.format('MMM D, YYYY h:mma');
                    } else {
                        // msg_date = moment(chat.added_date).format('MMM D, YYYY h:mma');
                        msg_date = this.commonDateService.DateTimeFormat(chat.added_date, 'MMM D, YYYY h:mma');
                    }
                    let user_key = `chat`
                    let user_object = {
                        chat_id : chat.id,
                        image : image,
                        name: `${chat['sender']['first_name']} ${chat['sender']['last_name']}`,
                        sender_id: chat['sender']['id'],
                        date: msg_date,
                        text: chat['text']
                    };
                    if (user_array[user_key] && user_array[user_key].length) {
                        user_array[user_key].unshift(user_object);
                    }
                    else{
                        if(!user_array[user_key] || user_array[user_key].length == 0){
                            user_array[user_key] = [];
                        }
                        user_array[user_key].push(user_object);
                    }
                    let read_by = chat['read_by'];
                    if (read_by != "") {
                        if(read_by.split(',').includes(user_id.toString()) == false){
                            read_by += `,${user_id}`; 
                        }
                    } else {
                    read_by = user_id.toString();
                    }
                    await this.chatService.update({id: chat['id']},{read_by});
                }
            }
            else{
                user_array[`chat`] = [];
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {user_array},
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
    @Post('select-user-chat')
    async selectUserChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = req.tokenUser;       
            let user_id = user.id;
            let org_id = user.org_id;  
            let assignment
            if (user.role_id == appConstant.ROLE.WCH) {
                assignment = await this.chatHelperService.checkAndGetAssignment(user_id, 'users', req); 
                if (!assignment) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FORBIDDEN_ACCESS'));
                }
                assignment = `user.org_id = ${org_id} AND user.status = 1 AND user.username <> '' AND user.id in(${assignment})`;
            }
            else{
                assignment = `user.org_id = ${org_id} AND user.status = 1 AND user.username <> ''`;
            }
            if(postData?.search_str){
                assignment += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['user.username','full_name','user.first_name','user.last_name']);
            }
            let users = await this.chatService.getUsersWithChatCount(assignment,user_id, {page: postData?.page, limit: postData?.limit, order: postData?.order, order_by: postData?.order_by});
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: users,
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
    @Post('get-unread-from-assignment')
    async getUnreadFromAssignment(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.role_id || !postData?.type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let count = await this.getUnreadFromAssignmentCount(req, postData);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: count,
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
    async getUnreadFromAssignmentCount(req: Request,  postData: any) {
        try{
            let count = 0;       
            let user = req.tokenUser;       
            let user_id = user.id;
            let org_id = user.org_id;  
            let assignment = '';
            let user_count_where;
            let innerJoin = [];
            if(postData?.type == 'Organization' || postData?.type=='User'){
                if (user.role_id == appConstant.ROLE.WCH) {
                    let usersData = await this.chatHelperService.checkAndGetAssignment(user_id, 'users', req); 
                    if(postData?.type == 'Organization'){
                        usersData.push(user_id);
                        user_count_where = `
                        ch_chat.is_private=0 AND ch_chat.status !=2 AND  ch_chat.org_id='${postData?.org_id ?? org_id}' AND (ch_chat.user_id IN (${usersData.join(',')}) OR ch_chat.sender_id IN(${usersData.join(',')})) AND ch_chat.sender_id !='${user_id}'
                        AND ch_chat.read_by NOT REGEXP '^${user_id},' 
                        AND ch_chat.read_by NOT REGEXP ',${user_id}$' 
                        AND ch_chat.read_by != ${user_id} 
                        AND ch_chat.sender_id != ${user_id} 
                        AND ch_chat.read_by NOT REGEXP ',${user_id},'
                        `;
                        innerJoin = [
                            {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id= ch_chat.sender_id`, 'connect' : 'ch_chat', 'type' : 'LEFT' }
                        ];
                    }
                    else{
                        user_count_where = `
                        ch_chat.is_private=0 AND ch_chat.status !=2 AND (ch_chat.user_id IN (${user_id}) OR ch_chat.sender_id IN(${user_id})) AND (ch_chat.user_id IN (${usersData.join(',')}) OR ch_chat.sender_id IN(${usersData.join(',')})) AND ch_chat.sender_id != '${user_id}'
                        AND ch_chat.read_by NOT REGEXP '^${user_id},' 
                        AND ch_chat.read_by NOT REGEXP ',${user_id}$' 
                        AND ch_chat.read_by != ${user_id} 
                        AND ch_chat.sender_id != ${user_id} 
                        AND ch_chat.read_by NOT REGEXP ',${user_id},'
                        `;
                        innerJoin = [
                            {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id= ch_chat.user_id`, 'connect' : 'ch_chat', 'type' : 'INNER' }
                        ];
                    }
                }
                else{
                    if(postData?.type == 'Organization'){
                        user_count_where = `
                        ch_chat.is_private=0 AND  ch_chat.org_id='${postData?.org_id ?? org_id}' AND ch_chat.status !=2
                        AND ch_chat.read_by NOT REGEXP '^${user_id},' 
                        AND ch_chat.read_by NOT REGEXP ',${user_id}$' 
                        AND ch_chat.read_by != ${user_id} 
                        AND ch_chat.sender_id != ${user_id} 
                        AND ch_chat.read_by NOT REGEXP ',${user_id},'
                        `;
                        innerJoin = [
                            {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id= ch_chat.sender_id`, 'connect' : 'ch_chat', 'type' : 'LEFT' }
                        ];
                    }
                    else{
                        user_count_where = `
                        ch_chat.is_private=0 AND (ch_chat.user_id IN (${user_id}) OR ch_chat.sender_id IN(${user_id}))
                        AND ch_chat.sender_id !='${user_id}' AND ch_chat.status !=2
                        AND ch_chat.read_by NOT REGEXP '^${user_id},' 
                        AND ch_chat.read_by NOT REGEXP ',${user_id}$' 
                        AND ch_chat.read_by != ${user_id} 
                        AND ch_chat.read_by NOT REGEXP ',${user_id},'
                        `;
                        innerJoin = [
                            {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id= ch_chat.user_id`, 'connect' : 'ch_chat', 'type' : 'INNER' }
                        ];
                    }
                }
            }
            else{
                if(postData?.type=='Location'){
                    if (user.role_id == appConstant.ROLE.WCH) {
                        let usersData = await this.chatHelperService.checkAndGetAssignment(user_id, 'location', req); 
                        assignment = ` AND location.id IN(${usersData})`;
                    }
                    user_count_where = `ch_chat.is_private=0 AND ch_chat.sender_id !='${user_id}' ${assignment} AND ch_chat.status !=2
                        AND ch_chat.read_by NOT REGEXP '^${user_id},' 
                        AND ch_chat.read_by NOT REGEXP ',${user_id}$' 
                        AND ch_chat.read_by != ${user_id} 
                        AND ch_chat.read_by NOT REGEXP ',${user_id},'
                        `;
                    innerJoin = [
                        {'alias':'location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `location.id = ch_chat.location_id AND location.company_id = '${org_id}'`, 'connect' : 'ch_chat', 'type' : 'INNER' },
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id= ch_chat.sender_id`, 'connect' : 'ch_chat', 'type' : 'INNER' }
                    ];
                }
                if(postData?.type=='Department'){
                    if (user.role_id == appConstant.ROLE.WCH) {
                        let usersData = await this.chatHelperService.checkAndGetAssignment(user_id, 'department', req); 
                        assignment = ` AND department.id IN(${usersData})`;
                    }
                    user_count_where = `
                        ch_chat.is_private=0 AND ch_chat.sender_id !='${user_id}' ${assignment} AND ch_chat.status !=2
                        AND ch_chat.read_by NOT REGEXP '^${user_id},' 
                        AND ch_chat.read_by NOT REGEXP ',${user_id}$' 
                        AND ch_chat.read_by != ${user_id} 
                        AND ch_chat.read_by NOT REGEXP ',${user_id},'
                        `;
                    innerJoin = [
                        {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = ch_chat.department_id AND department.company_id = '${org_id}'`, 'connect' : 'ch_chat', 'type' : 'INNER' },
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id= ch_chat.sender_id`, 'connect' : 'ch_chat', 'type' : 'INNER' }
                    ];
                }
                if(postData?.type=='Team'){
                    user_count_where = `
                        ch_chat.sender_id !='${user_id}' AND ch_chat.status !=2
                        AND ch_chat.read_by NOT REGEXP '^${user_id},' 
                        AND ch_chat.read_by NOT REGEXP ',${user_id}$' 
                        AND ch_chat.read_by != ${user_id} 
                        AND ch_chat.read_by NOT REGEXP ',${user_id},'
                        `;                    
                    innerJoin = [
                        {'alias':'team', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAMS, 'on' : `team.id = ch_chat.team_id AND team.org_id = '${org_id}'`, 'connect' : 'ch_chat', 'type' : 'INNER' },
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `user.id= ch_chat.sender_id`, 'connect' : 'ch_chat', 'type' : 'INNER' }
                    ];
                }
            }
            let user_array_count = await this.chatService.listRecord(['ch_chat.id'],user_count_where, null,null,null,innerJoin);
            if(user_array_count){
                count = user_array_count.length;
            }
            if(postData?.internal){
                return count;
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
    @Post('chats')
    async chats(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {     
            let user = req.tokenUser;       
            let user_id = user.id;
            let org_id = user.org_id;  
            let assignment = Object.create(null);
            let chat_with: {
                [key: string]: {
                    title?: string;
                    total?: number;
                };
            } = {
                all_org: {},
                spec_dep: {},
                spec_loc: {},
                spec_team: {},
                spec_user: {},
            };
            if (user.role_id == appConstant.ROLE.WCH) {
                assignment = await this.chatHelperService.checkAndGetAssignment(user_id, 'All', req); 
            }
            if(user.role_id!=appConstant.ROLE.WCH || Object.keys(assignment).length !=0 ){ 
                chat_with['all_org']['title'] = await this.translatorService.frontendReadTranslation(req.lang,`With ${(user.role_id == appConstant.ROLE.WCH) ? "assign " : ""}all users of Organization`, `/LC_MESSAGES/OrgAdmin/Chat`,`static`);
                chat_with['all_org']['total'] = await this.getUnreadFromAssignmentCount(req, {role_id: user.role_id, type: 'Organization', internal: true});
            }                                                             
            if(user.role_id!=appConstant.ROLE.WCH || (Object.keys(assignment).length !=0 && assignment?.['location'])){
                chat_with['spec_loc']['title'] = await this.translatorService.frontendReadTranslation(req.lang,`With ${(user.role_id == appConstant.ROLE.WCH) ? "assign " : ""}all users of specific Location`, `/LC_MESSAGES/OrgAdmin/Chat`,`static`);
                chat_with['spec_loc']['total'] = await this.getUnreadFromAssignmentCount(req, {role_id: user.role_id,type:'Location', internal: true});
            }
            if(user.role_id!=appConstant.ROLE.WCH || (Object.keys(assignment).length !=0 && assignment?.['department'])){
                chat_with['spec_dep']['title'] = await this.translatorService.frontendReadTranslation(req.lang,`With ${(user.role_id == appConstant.ROLE.WCH) ? "assign " : ""}all users of specific Department`, `/LC_MESSAGES/OrgAdmin/Chat`,`static`);
                chat_with['spec_dep']['total'] = await this.getUnreadFromAssignmentCount(req, {role_id: user.role_id, type: 'Department', internal: true});
            }
            if(user.role_id!=appConstant.ROLE.WCH || Object.keys(assignment).length !=0){
                chat_with['spec_user']['title'] = await this.translatorService.frontendReadTranslation(req.lang,`With ${(user.role_id == appConstant.ROLE.WCH) ? "assign " : ""}specific user of Organization`, `/LC_MESSAGES/OrgAdmin/Chat`,`static`);
                chat_with['spec_user']['total'] = await this.getUnreadFromAssignmentCount(req, {role_id: user.role_id, type: 'User', internal: true});
            }
            if(user.role_id!=appConstant.ROLE.WCH){
              chat_with['spec_team']['title'] = await this.translatorService.frontendReadTranslation(req.lang,`With ${(user.role_id == appConstant.ROLE.WCH) ? "assign " : ""}specific challenge Team`, `/LC_MESSAGES/OrgAdmin/Chat`,`static`);
              chat_with['spec_team']['total'] = await this.getUnreadFromAssignmentCount(req, {role_id: user.role_id, type:'Team', internal: true});
            }
            if (user.role_id == appConstant.ROLE.WCH) {
                delete (chat_with.spec_team);
                Object.entries(chat_with).forEach(([key, value]) => {
                    if(!value || Object.keys(value).length ==0){
                        if (key == 'all_org') {
                            // chat_with['all_org']['title'] = `With assign all users of Organization`; // for default show
                            // chat_with['all_org']['total'] = 0;                                       // for default show
                            delete (chat_with.all_org);         // corrently remove if nothing is assigned
                        }
                        if (key == 'spec_loc') {
                            // chat_with['spec_loc']['title'] = `With assign all users of specific Location`;   // for default show
                            // chat_with['spec_loc']['total'] = 0;                                              // for default show
                            delete (chat_with.spec_loc);        // corrently remove if no location is assigned
                        }
                        if (key == 'spec_dep') {
                            // chat_with['spec_dep']['title'] = `With assign all users of specific Department`; // for default show
                            // chat_with['spec_dep']['total'] = 0;                                              // for default show
                            delete (chat_with.spec_dep);        // corrently remove if no department is assigned
                        }
                        if (key == 'spec_user') {
                            // chat_with['spec_user']['title'] = `With assign specific user of Organization`;   // for default show
                            // chat_with['spec_user']['total'] = 0;                                             // for default show
                            delete (chat_with.spec_user);       // corrently remove if no user is assigned
                        }
                    }
                });
            }
            if (postData?.search_str) {
                const search = postData.search_str.toLowerCase();
                chat_with = Object.fromEntries(
                    Object.entries(chat_with).filter(([key, value]) =>
                        value.title?.toLowerCase().includes(search)
                    )
                );
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: chat_with,
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
    @Post('dashboard-chat')
    async dashboardChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {   
            let result = Object.create(null);;
            let user = req.tokenUser;  
            let usersDataChat = user?.usersdatawellness;  
            let user_id = user.id
            let org_id = user.org_id
            let loc_id = user.location
            let dep_id = user.department_id
            let role_id = user.role_id
            let company = await this.companyService.findOne(`company.id = ${org_id} AND company.status = 1`,[tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,tableConstant.COMPANIES.TBL_COMPANY_META],['company','companySetting','companyMeta'])
            company['company_logo'] = company?.['company_logo']?.includes('comimg_') ? S3_URL + `companylogos/${company['id']}/` + company['company_logo'] : '';
            let org_code = company.code;
            let user_array = Object.create(null);
            let dept_array = Object.create(null);
            let loc_array = Object.create(null);
            let team_array = Object.create(null);
            let org_array = Object.create(null);
            let chatWith = Object.create(null);
            let activePlugins = await this.activePluginService.getActivePluginList(org_id);
            let callOn = '';
            let chatWithType = 'org';
            if(postData?.schedule_id && postData?.schedule_id != ''){
                callOn = 'challenge';
                let schedule = await this.scheduleChallengeService.findOne({id: postData?.schedule_id, org_id: org_id, status: 1});
                if(!schedule){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_SCHEDULE_NOT_FOUND'));
                }
                if(schedule?.team && schedule?.team == 1){
                    chatWithType = 'team';
                }
                result['schedule_id'] = schedule.id;
                result['org_id'] = org_id;
            }
            if(activePlugins.includes('Chat')){
                if(company?.companySetting?.chat_type != 1){
                    let settings = await this.chatSettingsService.findOne({user_id: user.id});

                    if(callOn == '' || (callOn == 'challenge' && chatWithType == 'org')) {
                        chatWith['organization'] = {
                            "idType": "organization",
                            "name": await this.translatorService.frontendReadTranslation(req.lang,'With My Organization', `/LC_MESSAGES/Dashboard/Chat`,`static`),
                            "logo": company?.company_logo,
                            unreadCount: 0,
                            unreadIds: ''
                        }
                    }
                    if(activePlugins.includes('Coach') && company?.companySetting?.chat_with_coach == 1){
                        let innerJoin = [
                            {
                                'alias':'settings', 
                                'table' : tableConstant.TBL_USERS_SETTINGS, 
                                'on' : `settings.user_id = user.id`, 
                                'connect' : 'user', 
                                'type' : 'INNER' 
                            },
                            {
                                'alias':'Coach',
                                'table' : tableConstant.COACH.TBL_CO_COACHES, 
                                'on' : `(Coach.location= user.location AND user.location !="") OR (Coach.department = user.department_id AND user.department_id !=0) OR (Coach.state = settings.state AND settings.state!="") OR (Coach.city = settings.city AND settings.city!="") OR is_global = 1`, 
                                'connect' : 'user', 
                                'type' : 'LEFT' 
                            },
                            {
                                'alias':'Users', 
                                'table' : tableConstant.TBL_USERS, 
                                'on' : `Users.id = Coach.user_id`, 
                                'connect' : 'user', 
                                'type' : 'INNER' 
                            }
                        ];
                        let user_coach_chat = await this.userService.listRecord(`user.id = ${user_id} AND Coach.org_id = ${org_id} AND Coach.coach_manager_id =0`,null,[],null,innerJoin);
                        if(user_coach_chat && user_coach_chat.length){
                            let where = `(ch_chat.user_id='${user.id}' OR ch_chat.sender_id='${user.id}') AND (ch_chat.user_id <> '') AND ch_chat.is_private=0 AND ch_chat.status !=2`;
                            let event_chat = await this.chatService.listRecord(
                                ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.text','ch_chat.id','ch_chat.reactions','user.id','user.profile_image','user.first_name','user.last_name'],
                                where,
                                {id: 'DESC'},
                                10
                            );
                            if(event_chat && event_chat.length){
                                let user_chat = await this.chatHelperService.process_chat(user,event_chat,{},chatWith,null,'user',null,null,null,null,false);
                                user_array = user_chat.user_array;
                                chatWith = user_chat.chatWith;
                            }
                            for(let user of user_coach_chat){
                                let image
                                if (user['Users']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: user['Users']['profile_image']}))) {
                                    image = S3_URL + user['Users']['profile_image'];
                                } else {
                                    image = S3_URL + 'comn/img/avatar_0001.png';
                                }
                                let sender = user['Users']?.id ?? null;
                                if (!sender) continue;
                                let user_key = `R${user_id}S${sender}`
                                if (!user_array[user_key]) {
                                    user_array[user_key] = Object.create(null);
                                }
                                chatWith[user_key] ={
                                    idType: user_key,
                                    name: `${user['Users']['first_name']} ${user['Users']['last_name']}`,
                                    logo: image,
                                };
                                if (user_array[user_key]) {
                                    if(!user_array[user_key]['chat'] || user_array[user_key]['chat'].length == 0){
                                        user_array[user_key]['chat'] = '';
                                    }
                                    if(!user_array[user_key]['info'] || user_array[user_key]['info'].length == 0){
                                        user_array[user_key]['info'] = [];
                                    }
                                    user_array[user_key]['info'].push({
                                        org_id : user.org_id,
                                        c_type: `user`,
                                        send_to: sender,
                                        dep_id: '',
                                        loc_id: '',
                                        team_id: '',
                                    });
                                }                                
                            }
                        }
                    }
                    if(settings){
                        if(callOn == '') {         
                            if (settings['chat_with_users'] && settings['chat_with_users'] == 1) {
                                let where = `(ch_chat.user_id='${user_id}' OR ch_chat.sender_id='${user_id}') AND ch_chat.is_private = 0 AND ch_chat.user_id is not null AND ch_chat.status !=2 `;
                                let chat_data = await this.chatService.listRecord(
                                    ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                                    where,
                                    {id: 'DESC'},
                                    10
                                );
                                if(chat_data && chat_data.length){
                                    let user_chat = await this.chatHelperService.process_chat(user,chat_data,{},chatWith,null,'user',null,null,null,null,false);
                                    user_array = user_chat.user_array;
                                    chatWith = user_chat.chatWith;
                                }
                                const allUsers = await this.userService.listRecord(
                                    { org_id: org_id, status: 1 },
                                    null,
                                    ['user.id','user.first_name','user.last_name','user.profile_image']
                                );
                                for (const u of allUsers) {
                                    if (u.id === user_id) continue;
                                    let image;
                                    const hasImage = u.profile_image 
                                        ? await lastValueFrom(
                                            this.commonMicroservice.send({ cmd: 'check_file' }, { prefix: u.profile_image })
                                        )
                                        : false;

                                    if (hasImage) {
                                        image = S3_URL + u.profile_image;
                                    } else {
                                        image = S3_URL + 'comn/img/avatar_0001.png';
                                    }
                                    const key = `U${u.id}`;
                                    const rkey = `R${user_id}S${u.id}`;
                                    if (!chatWith[key]) {
                                        chatWith[key] = {
                                            idType: key,
                                            name: `${u.first_name} ${u.last_name}`,
                                            logo: image,
                                        };
                                    }
                                    if (!user_array[key]) {
                                        user_array[key] = {
                                            chat: [],
                                            info: [
                                                {
                                                    org_id: org_id,
                                                    c_type: 'user',
                                                    send_to: u.id,
                                                    dep_id: '',
                                                    loc_id: '',
                                                    team_id: '',
                                                },
                                            ],
                                        };
                                        if (user_array[rkey]) {
                                            user_array[key].chat = user_array[rkey].chat;
                                        }
                                    }
                                }
                            }
                            if (settings['chat_with_dept'] && settings['chat_with_dept'] == 1) {
                                    chatWith['department'] = {
                                        "idType": "department",
                                        "name": await this.translatorService.frontendReadTranslation(req.lang,'With My Department', `/LC_MESSAGES/Dashboard/Chat`,`static`),
                                        unreadCount: 0,
                                        unreadIds: ''
                                    }
                                    let where = `ch_chat.department_id='${dep_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2`;
                                    let dept_chat = await this.chatService.listRecord(
                                        ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                                        where,
                                        {id: 'DESC'},
                                        10
                                    );
                                    if(dept_chat && dept_chat.length){
                                        let user_chat = await this.chatHelperService.process_chat(user,dept_chat,user_array,chatWith,{...settings, company_logo: company?.company_logo},`department`,dept_array,null,null,null,false);
                                        user_array = user_chat.user_array;
                                        dept_array = user_chat.dept_array;
                                        chatWith = user_chat.chatWith;
                                        chatWith['department']['unreadCount'] = user_chat?.dept_array?.['unreadCount'];
                                        chatWith['department']['unreadIds'] = user_chat?.dept_array?.['unreadIds'];
                                    }
                                    dept_array['info'] ={
                                        org_id : user.org_id,
                                        c_type: `department`,
                                        send_to: '',
                                        dep_id: dep_id,
                                        loc_id: '',
                                        team_id: '',
                                    };
                            }
                            if (settings['chat_with_loc'] && settings['chat_with_loc'] == 1) {
                                    chatWith['location'] = {
                                        "idType": "location",
                                        "name": await this.translatorService.frontendReadTranslation(req.lang,'With My Location', `/LC_MESSAGES/Dashboard/Chat`,`static`),
                                        unreadCount: 0,
                                        unreadIds: ''
                                    }
                                    let where = `ch_chat.location_id='${loc_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2`;
                                    let loc_chat = await this.chatService.listRecord(
                                        ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                                        where,
                                        {id: 'DESC'},
                                        10
                                    );
                                    if(loc_chat && loc_chat.length){
                                        let user_chat = await this.chatHelperService.process_chat(user,loc_chat,user_array,chatWith,{...settings, company_logo: company?.company_logo},`location`,null,loc_array,null,null,false);
                                        user_array = user_chat.user_array;
                                        loc_array = user_chat.loc_array;
                                        chatWith = user_chat.chatWith;
                                        chatWith['location']['unreadCount'] = user_chat?.loc_array?.['unreadCount'];
                                        chatWith['location']['unreadIds'] = user_chat?.loc_array?.['unreadIds'];
                                    }
                                    loc_array['info'] ={
                                        org_id : user.org_id,
                                        c_type: `location`,
                                        send_to: '',
                                        dep_id: '',
                                        loc_id: loc_id,
                                        team_id: '',
                                    };
                            }
                            if (settings['chat_with_team'] && settings['chat_with_team'] == 1) {
                                let where =  `company.id = ${org_id} AND scj.user_id = ${user_id} AND scj.status = 1 AND sc.status = 1`;
                                const wellnessData = await this.userService.userChallengeData(req.tokenUser);
                                if(wellnessData?.length){
                                    where += ` AND sc.created_by Not In(${wellnessData.map(ele=>`${ele.id}`)})`;
                                }
                                let eligibility_opt = [0];
                                if(req.tokenUser?.is_camp_eligible === 1 ){
                                    eligibility_opt.push(1);
                                    if(req.tokenUser?.role_id === 2 ){
                                        eligibility_opt.push(3);
                                    }
                                    if(req.tokenUser?.role_id === 16 ){
                                        eligibility_opt.push(5);
                                    }
                                }
                                else if(req.tokenUser?.is_camp_eligible === 0 ){
                                    eligibility_opt.push(2);
                                    if(req.tokenUser?.role_id === 2 ){
                                        eligibility_opt.push(4);
                                    }
                                    if(req.tokenUser?.role_id === 16 ){
                                        eligibility_opt.push(6);
                                    }
                                }
                                where += ` AND sc.eligibility In(${eligibility_opt})`;
                                let uCurrentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
                                let resultedData = await this.scheduleChallengeJoinUsersService.myChallenge(where,['scj.id','sc.id','sc.deactive_date','sc.deactive_time']);
                                resultedData = resultedData.filter(schedule => (schedule['sc']['deactive_date'] == null || schedule['sc']['deactive_date'] == undefined) || (schedule['sc']['deactive_date'] && moment(`${schedule['sc']['deactive_date']} ${schedule['sc']['deactive_time'] ?? '23:59:59'}`).isAfter(moment(uCurrentDate))));
                                let team_ids = resultedData.map(ele => ele['sc']['id']);
                                let teamWhere = `team.org_id = ${org_id} AND team.status = 1 AND team.tname <> ''`;
                                if(team_ids && team_ids.length > 0){
                                    teamWhere += ` AND team.schedule_id IN (${team_ids.join(',')})`;
                                }
                                let teams = await this.teamService.listRecord(teamWhere);
                                for(let team of teams){
                                    let icons = team.logo;
                                    if (icons?.length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                                        let iconImages = icons;
                                        team['logo'] = S3_URL + iconImages;
                                    } else {
                                        team['logo'] = await this.commonService.getIconPath(icons,S3_URL);
                                    }
                                    let teamKey = `T${team.id}`;
                                    chatWith[teamKey] = {
                                        "idType": teamKey,
                                        "name": await this.translatorService.frontendReadTranslation(req.lang,'With Team', `/LC_MESSAGES/Dashboard/Chat`,`static`) + ' ' +team.tname,
                                        "logo": team.logo,
                                        unreadCount: 0,
                                        unreadIds: ''
                                    }
                                    let where = `ch_chat.team_id='${team.id}' AND ch_chat.is_private=0 AND ch_chat.status !=2`;
                                    let team_chat = await this.chatService.listRecord(
                                        ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                                        where,
                                        {id: 'DESC'},
                                        10
                                    );
                                    if(!team_array[teamKey] || team_array[teamKey].length == 0){
                                        team_array[teamKey] = {};
                                    }
                                    if(!team_array[teamKey]['info'] || team_array[teamKey]['info'].length == 0){
                                        team_array[teamKey]['info'] = {};
                                    }
                                    if(!team_array[teamKey]['chat'] || team_array[teamKey]['chat'].length == 0){
                                        team_array[teamKey]['chat'] = [];
                                    }
                                    if(team_chat && team_chat.length){
                                        let user_chat = await this.chatHelperService.process_chat(user,team_chat,user_array,chatWith,{...settings,team_id: team.id, team_logo: team.logo},`team`,null,null,team_array,null,false);
                                        user_array = user_chat.user_array;
                                        team_array = user_chat.team_array;
                                        if(user_chat.team_array && user_chat.team_array[teamKey] && user_chat.team_array[teamKey]['chat']) {
                                            team_array[teamKey]['chat'] = user_chat.team_array[teamKey]['chat'];
                                        }
                                        chatWith = user_chat.chatWith;
                                        chatWith[teamKey]['unreadCount'] = user_chat?.team_array?.[teamKey]?.['unreadCount'];
                                        chatWith[teamKey]['unreadIds'] = user_chat?.team_array?.[teamKey]?.['unreadIds'];
                                    }
                                    team_array[teamKey]['info'] ={
                                        org_id : '',
                                        c_type: `team`,
                                        send_to: '',
                                        dep_id: '',
                                        loc_id: '',
                                        team_id: team.id,
                                    };
                                }
                            }
                        }
                        if(callOn == '' || (callOn == 'challenge' && chatWithType == 'team')) {
                            // if (settings['chat_own_team'] && settings['chat_own_team'] == 1) { // repeated team chat data
                            if (settings['chat_own_team'] && settings['chat_own_team'] == 1 && settings['chat_with_team'] != 1 && callOn != '') {
                                let teams = await this.teamService.listRecord(`team.org_id = ${org_id} AND team.status = 1 AND team.tname <> '' AND teamMember.user_id = ${user_id}`,null,['team', 'teamMember']);
                                for(let team of teams){
                                    let icons = team.logo;
                                    if (icons?.length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                                        let iconImages = icons;
                                        team['logo'] = S3_URL + iconImages;
                                    } else {
                                        team['logo'] = await this.commonService.getIconPath(icons,S3_URL);
                                    }
                                    let teamKey = `T${team.id}`;
                                    chatWith[teamKey] = {
                                        "idType": teamKey,
                                        "name": 'With Team - ' + team.tname,
                                        "logo": team.logo,
                                        unreadCount: 0,
                                        unreadIds: ''
                                    }
                                    let where = `ch_chat.team_id='${team.id}' AND ch_chat.is_private=0 AND ch_chat.status !=2`;
                                    let team_chat = await this.chatService.listRecord(
                                        ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                                        where,
                                        {id: 'DESC'},
                                        10
                                    );
                                    if(!team_array[teamKey] || team_array[teamKey].length == 0){
                                        team_array[teamKey] = {};
                                    }
                                    if(!team_array[teamKey]['chat'] || team_array[teamKey]['chat'].length == 0){
                                        team_array[teamKey]['chat'] = [];
                                    }
                                    if(!team_array[teamKey]['info'] || team_array[teamKey]['info'].length == 0){
                                        team_array[teamKey]['info'] = {};
                                    }
                                    if(team_chat && team_chat.length){
                                        let user_chat = await this.chatHelperService.process_chat(user,team_chat,user_array,chatWith,{...settings,team_id: team.id, team_logo: team.logo},`team`,null,null,team_array,null,false);
                                        user_array = user_chat.user_array;
                                        team_array = user_chat.team_array;
                                        chatWith = user_chat.chatWith;
                                        chatWith[teamKey]['unreadCount'] = user_chat?.team_array?.[teamKey]?.['unreadCount'];
                                        chatWith[teamKey]['unreadIds'] = user_chat?.team_array?.[teamKey]?.['unreadIds'];
                                    }
                                    // if(!team_array[teamKey] || team_array[teamKey].length == 0){
                                    //     team_array[teamKey] = {};
                                    // }
                                    // if(!team_array[teamKey]['info'] || team_array[teamKey]['info'].length == 0){
                                    //     team_array[teamKey]['info'] = {};
                                    // }
                                    team_array[teamKey]['info'] ={
                                        org_id : '',
                                        c_type: `team`,
                                        send_to: '',
                                        dep_id: '',
                                        loc_id: '',
                                        team_id: team.id,
                                    };
                                }
                            }
                        }
                    }
                    let usersDataNotConsider = ''
                    if(usersDataChat  && usersDataChat.length){
                        let userWellnessIds = usersDataChat
                            .filter(item => item.id != null && item.id !== '')
                            .map(item => item.id);
                        usersDataNotConsider= ` AND ch_chat.sender_id NOT IN (${userWellnessIds.join(',')})`;
                    }
                    let where = `ch_chat.org_id='${org_id}' AND ch_chat.status !=2 AND ch_chat.is_private=0 ${usersDataNotConsider}`;
                    let org_chat = await this.chatService.listRecord(
                        ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                        where,
                        {id: 'DESC'},
                        10
                    );
                    if(org_chat && org_chat.length){
                        let user_chat = await this.chatHelperService.process_chat(user,org_chat,user_array,chatWith,{...settings, company_logo: company?.company_logo},`organization`,null,null,null,org_array,false);
                        user_array = user_chat.user_array;
                        org_array = user_chat.org_array;
                        chatWith = user_chat.chatWith;
                        chatWith['organization']['unreadCount'] = user_chat?.org_array?.['unreadCount'];
                        chatWith['organization']['unreadIds'] = user_chat?.org_array?.['unreadIds'];
                    }
                    org_array['info'] ={
                        org_id : org_id,
                        c_type: `organization`,
                        send_to: '',
                        dep_id: '',
                        loc_id: '',
                        team_id: '',
                    };
                     if (company?.companySetting?.chat_type == 1 || (settings && settings['chat_with_users'] == 1)) {
                        const activeChatUserIds = new Set<string>();
                        for (const [key, rawValue] of Object.entries(user_array)) {
                            const value = rawValue as { info?: any[] };
                            if (value?.info && Array.isArray(value.info)) {
                                for (const info of value.info) {
                                    if (info?.send_to) {
                                        // const user_key = `R${user_id}S${info.send_to}`;                                        
                                        const user_key = `U${info?.send_to ?? user_id}`;                                        
                                        activeChatUserIds.add(user_key);
                                    }
                                }
                            }
                        }
                        if (org_array?.info) activeChatUserIds.add('organization');
                        if (Object.keys(dept_array || {}).length) activeChatUserIds.add('department');
                        if (Object.keys(loc_array || {}).length) activeChatUserIds.add('location');
                        if (Object.keys(team_array || {}).length) {
                            for (const k of Object.keys(team_array)) {
                                activeChatUserIds.add(k);
                            }
                        }
                        const filteredChatWith = {};
                        for (const key of Object.keys(chatWith)) {
                            if (activeChatUserIds.has(key)) {
                                filteredChatWith[key] = chatWith[key];
                            }
                        }
                        chatWith = filteredChatWith;
                        result.chatWith = chatWith;
                    }
                    let dataChat = {
                    u_chat: user_array,
                    d_chat: dept_array,
                    l_chat: loc_array,
                    t_chat: team_array,
                    o_chat: org_array
                };
                
                result = {
                    dataChat,
                    chatWith,
                    user_id
                };
                }
                else{
                    let support_chat_tmp_count = 0;
                    let where = `ch_chat.user_id = ${user_id} AND ch_chat.event_id in(-1) AND ch_chat.is_private = 1 AND ch_chat.status !=2 AND ch_chat.id NOT IN (
                    SELECT id FROM ch_chat WHERE  
                    (
                        read_by REGEXP '^${user_id},' 
                        OR read_by REGEXP ',${user_id}$' 
                        OR read_by = ${user_id} 
                        OR read_by REGEXP ',${user_id},'
                    ) AND status !=2
                    )`;
                    let user_array_count = await this.chatService.listRecord(['ch_chat.id'],where,{id: 'ASC'});
                    if(user_array_count){
                        support_chat_tmp_count = user_array_count.length;
                    }
                    let support_chat_user = Object.create(null);
                    where = `(ch_chat.user_id='${user_id}' OR ch_chat.sender_id='${user_id}') AND (ch_chat.user_id <> '') AND ch_chat.event_id=-1 AND ch_chat.is_private=1 AND ch_chat.status !=2 AND ch_chat.id IN (
                    SELECT id FROM ch_chat WHERE  
                    (
                        read_by REGEXP '^${user_id},' 
                        OR read_by REGEXP ',${user_id}$' 
                        OR read_by = ${user_id} 
                        OR read_by REGEXP ',${user_id},'
                    ) AND status !=2
                    )`;
                    let support_chat = await this.chatService.listRecord(
                        ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                        where,
                        {id: 'DESC'},
                        20
                    );
                    if(support_chat && support_chat.length){
                        support_chat_user = await this.chatHelperService.process_load_event_chat(user,support_chat,support_chat_user);
                        support_chat_user = support_chat_user.support_chat_user;
                    }
                    let support_chat_tot_count = 0;
                    where = `ch_chat.user_id = ${user_id} AND ch_chat.event_id in(-1) AND ch_chat.is_private = 1 AND ch_chat.status !=2 AND ch_chat.id IN (
                        SELECT id FROM ch_chat WHERE  
                        (
                            read_by REGEXP '^${user_id},' 
                            OR read_by REGEXP ',${user_id}$' 
                            OR read_by = ${user_id} 
                            OR read_by REGEXP ',${user_id},'
                        ) AND status !=2
                        )`;
                    user_array_count = await this.chatService.listRecord(['ch_chat.id'],where,{id: 'ASC'});
                    if(user_array_count.length > 0){
                        support_chat_tot_count = user_array_count.length - 20;
                    }
                    result = {
                        support_chat_tot_count,
                        support_chat_user_ID: support_chat_user.support_chat_user_ID,
                        support_chat_user: support_chat_user.support_chat_user,
                        chatType : 'supportChat'
                    };
                }
            }         
            if(result && result.dataChat){
                let sortFunction = (firstDate, secondDate) => Number(this.commonDateService.DateTimeFormat(firstDate.record_date, 'timestamp')) - Number(this.commonDateService.DateTimeFormat(secondDate.record_date, 'timestamp'));
                if(result.dataChat.d_chat && result.dataChat.d_chat?.chat?.length){
                    result.dataChat.d_chat.chat = this.commonService.dynamicSort(result.dataChat.d_chat.chat, sortFunction);
                }
                if(result.dataChat.l_chat && result.dataChat.l_chat?.chat?.length){
                    result.dataChat.l_chat.chat = this.commonService.dynamicSort(result.dataChat.l_chat.chat, sortFunction);
                }
                if(result.dataChat.o_chat && result.dataChat.o_chat?.chat?.length){
                    result.dataChat.o_chat.chat = this.commonService.dynamicSort(result.dataChat.o_chat.chat, sortFunction);
                }
                if(result.dataChat.t_chat && Object.keys(result.dataChat.t_chat)?.length){
                    for(let key of Object.keys(result.dataChat.t_chat)){
                       if(result.dataChat.t_chat[key]?.chat && result.dataChat.t_chat[key]?.chat?.length){
                           result.dataChat.t_chat[key].chat = this.commonService.dynamicSort(result.dataChat.t_chat[key]?.chat, sortFunction);
                       } 
                    }
                }
                if(result.dataChat.u_chat && Object.keys(result.dataChat.u_chat)?.length){
                    for(let key of Object.keys(result.dataChat.u_chat)){
                        if(result.dataChat.u_chat[key]?.chat && result.dataChat.u_chat[key]?.chat?.length){
                            result.dataChat.u_chat[key].chat = this.commonService.dynamicSort(result.dataChat.u_chat[key].chat, sortFunction);
                        }
                    } 
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
