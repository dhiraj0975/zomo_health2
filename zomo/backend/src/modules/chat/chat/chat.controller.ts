import { appConstant, ChatDto, CommonArrayService, CommonDateService, CommonService, tableConstant, TeamsDto, UserDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { SocketService } from 'src/socket-io/socket.service';
import { In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateChatInput,
    DeleteChallengeInput, ListChallengeInput,
} from "../../../input";
import { TeamsService } from "../../challenge/teams/teams.service";
import { DepartmentService } from "../../company/departments/department.service";
import { LocationService } from "../../company/locations/location.service";
import { TranslationService } from "../../translation/translation.service";
import { UserService } from "../../user/user/user.service";
import { BannedWordService } from '../bannedword/bannedword.service';
import { ChatService } from './chat.service';
import { ChatHelperService } from './chathelper.service';
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Controller('chat/chat')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly bannedWordService: BannedWordService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
        private readonly teamService: TeamsService,
        private socketService: SocketService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly teamsService: TeamsService,
        private readonly chatHelperService: ChatHelperService,
        private readonly commonService: CommonService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateChatInput) {
        try {
            let user = Object.create(req.tokenUser);
            let timezone = user.timezone;
            if (!postData?.type || !postData?.text) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let chatData = Object.create(null);
            const getBannedWords = await this.bannedWordService.listRecord({org_id: In([0,user?.org_id]), status: 1},['bw.word']);
            let text = postData?.text;
            let bannedWords = [];
            getBannedWords.forEach((bannedWordObj) => {
                const bannedWord = bannedWordObj.bw_word;
                const pattern = new RegExp(`\\b${bannedWord}\\b`, 'gi');
                if(text.match(pattern)){
                    if(!bannedWords.includes(bannedWord)){
                        bannedWords.push(bannedWord);
                    }
                }
            });
            if(postData?.reactions){
                postData['reactions'] = postData?.reactions; 
            }
            if(bannedWords.length > 0){
                throw new Error(bannedWords.join(',') + ' - ' + await this.translatorService.frontendReadTranslation(req.lang, bannedWords.length > 1 ? 'ERR_BANNED_WORDS' : 'ERR_BANNED_WORD'));
            }else{
                let insertedRecordId = 0;
                let date = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
                if(postData?.type === 'team') {
                    if(!postData?.team_id){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        let data = Object.create(null);
                        data['team_id'] = postData?.team_id;
                        if(postData?.schedule_id){
                            data['schedule_id'] = postData?.schedule_id;
                        }
                        data['text'] = text;
                        data['added_date'] = date;
                        data['datetime'] = date;
                        data['sender_id'] = user.id;
                        data['read_by'] = user.id;
                        const insertedRecord = await this.chatService.save({...data});
                        if(insertedRecord){
                            insertedRecordId = insertedRecord['id'];
                        }
                    }
                }
                else if(postData?.type === 'organization') {
                    if(!postData?.org_id){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        let data = Object.create(null);
                        data['org_id'] = postData?.org_id;
                        data['text'] = text;
                        data['added_date'] = date;
                        data['datetime'] = date;
                        data['sender_id'] = user.id;
                        data['read_by'] = user.id;
                        const insertedRecord = await this.chatService.save({...data});
                        if(insertedRecord){
                            insertedRecordId = insertedRecord['id'];
                        }
                    }
                }
                else if(postData?.type === 'department') {
                    if(!postData?.department_id){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        let data = Object.create(null);
                        data['department_id'] = postData?.department_id;
                        data['text'] = text;
                        data['added_date'] = date;
                        data['datetime'] = date;
                        data['sender_id'] = user.id;
                        data['read_by'] = user.id;
                        const insertedRecord = await this.chatService.save({...data});
                        if(insertedRecord){
                            insertedRecordId = insertedRecord['id'];
                        }
                    }
                }
                else if(postData?.type === 'location') {
                    if(!postData?.location_id){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        let data = Object.create(null);
                        data['location_id'] = postData?.location_id;
                        data['text'] = text;
                        data['added_date'] = date;
                        data['datetime'] = date;
                        data['sender_id'] = user.id;
                        data['read_by'] = user.id;
                        const insertedRecord = await this.chatService.save({...data});
                        if(insertedRecord){
                            insertedRecordId = insertedRecord['id'];
                        }
                    }
                }
                else if(postData?.type === 'user') {
                    postData.user_id = postData?.user_id ?? postData?.send_to;
                    if(!postData?.user_id){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        let data = Object.create(null);
                        data['user_id'] = postData?.user_id;
                        data['text'] = text;
                        data['added_date'] = date;
                        data['datetime'] = date;
                        data['sender_id'] = user.id;
                        data['read_by'] = user.id;
                        if(postData?.event_id){
                            data['event_id'] = postData?.event_id;
                            data['is_private'] = 1;
                            if(postData?.event_id ==-1 && postData?.user_id !=-1){
                                await this.chatService.update({event_id: -1, sender_id: postData?.user_id},{user_id: user.id});
                                let checkMinus = await this.chatService.listRecord(['ch_chat.id'],`ch_chat.sender_id != ${user.id} AND ch_chat.user_id = ${postData?.user_id} AND ch_chat.event_id = -1 AND ch_chat.is_private = 1 AND ch_chat.status !=2`);
                                if(checkMinus.length >0){
                                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "This user assign to another support person."));
                                }                                
                            }
                       }
                        const insertedRecord = await this.chatService.save({...data});
                        if(insertedRecord){
                            insertedRecordId = insertedRecord['id'];
                        }
                    }
                }
                else if(postData?.type === 'support') {
                    if(!postData?.org_id){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        let data = Object.create(null);
                        data['org_id'] = postData?.org_id;
                        data['text'] = text;
                        data['added_date'] = date;
                        data['datetime'] = date;
                        data['user_id'] = postData?.user_id;
                        data['event_id'] = postData?.event_id;
                        data['is_private'] = 1;
                        data['sender_id'] = user.id;
                        data['read_by'] = user.id;
                        const insertedRecord = await this.chatService.save({...data});
                        if(insertedRecord){
                            insertedRecordId = insertedRecord['id'];
                        }
                    }
                }
                else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_CHAT_TYPE'));
                }
                if(insertedRecordId && insertedRecordId !== 0){
                    let chatDate = date;
                    if (timezone && timezone?.trim() !== '' && timezone !== 'UTC') {
                        chatDate = await this.commonDateService.DateTimeFormat(date, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss', timezone);
                    }
                    let image = '';
                    let msg_date = '';
                    if (user?.profile_image && user?.profile_image?.trim() !== '') {
                        image = S3_URL +  `${user.profile_image}`;
                    } else {
                        image = S3_URL + `comn/img/avatar_0001.png`;
                    }
                    let month = moment(chatDate).format('MMM'); 
                    let timePeriod = moment(chatDate).format('a');
                    let dateData = moment.utc(chatDate).format('D, YYYY h:mm');
                    month = await this.translatorService.frontendReadTranslation(req.lang,month, `/LC_MESSAGES/Common/Month`,`static`);
                    timePeriod = await this.translatorService.frontendReadTranslation(req.lang,timePeriod, `/LC_MESSAGES/Common/Common`,`static`);
                    msg_date = `${month} ${dateData} ${timePeriod}`;
                    chatData = {
                        chat_id: insertedRecordId,
                        image: image, 
                        name: user.first_name + ' ' + user.last_name,
                        msg_date: msg_date,
                        text: text,
                        sender_id : user.id,
                        type: postData?.type,
                        align: 'right'
                    };
                    if(postData?.reactions){
                        chatData.reactions = Object.keys(postData?.reactions); 
                    }
                    else{
                        chatData.reactions = [];
                    }
                    if(postData?.event_id){
                        chatData['event'] = true;
                        chatData['event_id'] = postData?.event_id;
                    }
                    if(postData?.team_id){
                        chatData['team_id'] = postData?.team_id;
                    }
                    if(postData?.schedule_id){
                        chatData['schedule_id'] = postData?.schedule_id;
                    }
                    if(postData?.org_id){
                        chatData['org_id'] = postData?.org_id;
                    }
                    if(postData?.department_id){
                        chatData['department_id'] = postData?.department_id;
                    }
                    if(postData?.location_id){
                        chatData['location_id'] = postData?.location_id;
                    }
                    if(postData?.user_id){
                        chatData['user_id'] = postData?.user_id;
                    }
                    if(postData?.type === 'user'){
                        chatData['idType'] = `U${postData?.user_id}`;
                        chatData['user_id_format'] = `R${postData?.user_id}S${user.id}`;
                    }
                }
            }
            if(Object.keys(chatData).length > 0){
                let where = { };
                let payload = {};
                if(postData?.type === 'team') {
                    let where = `team.id= ${postData?.team_id}`;
                    if(postData?.schedule_id){
                        where += ` AND team.schedule_id= ${postData?.schedule_id}`;
                    }
                    let teamData: any = await this.teamService.listRecord(where);
                    payload['c_type'] = 'team';
                    if(teamData && teamData.length){
                        teamData = teamData[0];
                        if(teamData?.teamMember && teamData?.teamMember?.length){
                           where['id'] = In(teamData?.teamMember.map(ele=>ele.user_id));
                        }
                        payload['team_id'] = teamData.id;
                        payload['tname'] = teamData.tname;
                    }
                }
                if(postData?.type === 'organization'){
                    where['org_id'] = postData?.org_id;
                    payload['c_type'] = 'organization';
                }
                else{
                    where['org_id'] = req?.tokenUser?.org_id;
                    payload['c_type'] = 'organization';
                }
                payload['org_id'] = where['org_id'];
                if(postData?.type === 'department') {
                    where['department_id'] = postData?.department_id;
                    payload['c_type'] = 'department';
                    payload['dept_id'] = postData?.department_id;
                }
                if(postData?.type === 'location') {
                    where['location'] = postData?.location_id;
                    payload['c_type'] = 'location';
                    payload['loc_id'] = postData?.location_id;
                }
                if(postData?.type === 'user') {
                    where['id'] = postData?.user_id;
                    payload['c_type'] = 'user';
                    payload['user_id'] = postData?.user_id;
                }
                let userData = await this.userService.usersList(where, ['id']);
                for (let i = 0; i < userData.length; i++) {
                   const clientSocket = this.socketService.getClientSocket(userData[i]['id'].toString());
                   if (clientSocket) {
                    if (['organization', 'location', 'department'].includes(postData?.type) && userData[i]['id'] === user.id) {
                        continue;
                    }
                    clientSocket.emit('chat', { data: chatData });
                   }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: (Object.keys(chatData).length > 0) ? chatData : null,
                message: 'success'
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
    @Post('add-reaction')
    async addReaction(@Req() req: Request, @Res() res: Response, @Body() postData: CreateChatInput) {
        try {
            let user_id = req.tokenUser?.id;
            if (!postData?.id || !postData?.reactions) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.chatService.findOne({
                id: postData?.id, status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let month = moment(recordDetails.added_date).format('MMM'); 
            let timePeriod = moment(recordDetails.added_date).format('a');
            let dateData = moment.utc(recordDetails.added_date).format('D, YYYY h:mm');
            month = await this.translatorService.frontendReadTranslation(req.lang,month, `/LC_MESSAGES/Common/Month`,`static`);
            timePeriod = await this.translatorService.frontendReadTranslation(req.lang,timePeriod, `/LC_MESSAGES/Common/Common`,`static`);
            let msg_date = `${month} ${dateData} ${timePeriod}`;
            let reaction = recordDetails.reactions;
            if(reaction){
                for (let key in reaction) {
                    if (reaction[key].includes(user_id)) {
                        reaction[key] = reaction[key].filter((item: any) => item !== user_id);
                    }
                    if(reaction[key].length === 0) {
                        delete reaction[key];
                    }
                }
            }
            if((!postData?.type || postData?.type)&& postData?.type != 'remove'){
                if(postData?.reactions) {
                    if(!reaction) {
                        reaction = {};
                    }
                    if (reaction[postData?.reactions] && [reaction[postData?.reactions]].length) {
                        if (!reaction[postData?.reactions].includes(user_id)) {
                            reaction[postData?.reactions].push(user_id);
                        } 
                    } else {
                        reaction[postData?.reactions] = [user_id];
                    }
                }
            }
            await this.chatService.update({id: postData?.id}, {reactions: reaction});
            if(reaction){
                recordDetails.reactions = Object.keys(reaction);
            }
            else{
                recordDetails.reactions = [];  
            }
            let userIds = recordDetails.read_by.split(',');
            if(recordDetails.user_id){
                userIds.push(recordDetails.user_id.toString());
            }
            if(recordDetails.sender_id){
                userIds.push(recordDetails.sender_id.toString());
            }
            let userData = await this.userService.usersList({id: In(userIds)}, ['id']);
            for (let i = 0; i < userData.length; i++) {
                const clientSocket = this.socketService.getClientSocket(userData[i]['id'].toString());
                if (clientSocket) {
                    if(postData?.type && postData?.type == 'remove'){
                        clientSocket.emit('remove-reaction', { ...recordDetails, chat_id: recordDetails.id, type: postData?.type, msg_date, payload: postData });
                    }
                    else{
                        clientSocket.emit('add-reaction', { ...recordDetails, chat_id: recordDetails.id, type: postData?.type, msg_date, payload: postData });
                    }
                }
            }
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
    @Post('view-reaction')
    async viewReaction(@Req() req: Request, @Res() res: Response, @Body() postData: CreateChatInput) {
        try {
            let user_id = req.tokenUser?.id;
            let result
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.chatService.findOne({
                id: postData?.id, status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let reaction = recordDetails.reactions;
            if(reaction){
                const allValues = Object.values(reaction).flat();
                let users = await this.userService.usersList({id: In(allValues)}, ['id', 'first_name', 'last_name', 'profile_image']);
                users = <any>(await this.commonArrayService.formatToDto(UserDto, users, req.lang));
                const objectMap = users.reduce((map, obj) => {
                    map[obj.id] = obj;
                    return map;
                  }, {});
                result = Object.keys(reaction).reduce((acc, key) => {
                    acc[key] = reaction[key].map(item => {
                      if (objectMap[item]) {
                        return objectMap[item];
                      } else {
                        return item;
                      }
                    });
                    return acc;
                  }, {});
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
    @Post('get-list')
    async getList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user = Object.create(req.tokenUser);
            let timezone = user.timezone;
            let userId = user.id;
            if (!postData?.type || !postData?.page) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            let chatData = Object.create(null);
            let chatDataList = Object.create(null);
            if(postData?.type === 'team') {
                if(!postData?.team_id){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }else{
                    chatData = await this.chatService.paginateList(`chat.is_private = 0 AND chat.team_id='${postData?.team_id}' `,['user.profile_image','user.first_name','user.last_name','chat.read_by','chat.added_date','chat.text','chat.id','chat.user_id','user.id'], { page: postData?.page, limit:20 });
                    if (chatData && chatData?.list && chatData?.list?.length > 0) {
                        chatDataList['list'] = [];
                        const chatDatas = chatData.list;
                        await Promise.all(
                            chatDatas.map(async (chatuser) => {
                                let image = '';
                                let msg_date = '';
                                if (chatuser?.user?.profile_image && chatuser?.user?.profile_image?.trim() !== '') {
                                    image = S3_URL +  `${chatuser.user.profile_image}`;
                                } else {
                                    image = S3_URL + `comn/img/avatar_0001.png`;
                                }
                                if (timezone && timezone?.trim() !== '' && timezone !== 'UTC') {
                                    let chatDate = await this.commonDateService.DateTimeFormat(chatuser?.added_date, 'YYYY-MM-DD HH:mm:ss', '', timezone);
                                    let month = moment(chatDate).format('MMM'); 
                                    let timePeriod = moment(chatDate).format('a');
                                    let dateData = moment.utc(chatDate).format('D, YYYY h:mm');
                                    month = await this.translatorService.frontendReadTranslation(req.lang,month, `/LC_MESSAGES/Common/Month`,`static`);
                                    timePeriod = await this.translatorService.frontendReadTranslation(req.lang,timePeriod, `/LC_MESSAGES/Common/Common`,`static`);
                                    msg_date = `${month} ${dateData} ${timePeriod}`;
                                } else {
                                    let chatDate = await this.commonDateService.DateTimeFormat(chatuser?.added_date, 'YYYY-MM-DD HH:mm:ss');
                                    let month = moment(chatDate).format('MMM'); 
                                    let timePeriod = moment(chatDate).format('a');
                                    let dateData = moment.utc(chatDate).format('D, YYYY h:mm');
                                    month = await this.translatorService.frontendReadTranslation(req.lang,month, `/LC_MESSAGES/Common/Month`,`static`);
                                    timePeriod = await this.translatorService.frontendReadTranslation(req.lang,timePeriod, `/LC_MESSAGES/Common/Common`,`static`);
                                    msg_date = `${month} ${dateData} ${timePeriod}`;
                                }
                                let sender = chatuser.user.id;
                                let read_by = chatuser.read_by;
                                let read_by_array = read_by.split(',');
                                chatDataList['list'].push({
                                    chat_id: chatuser['id'],
                                    image: image, 
                                    name: chatuser['user']['first_name'] + ' ' + chatuser['user']['last_name'],
                                    msg_date: msg_date,
                                    text: chatuser['text'],
                                    align: (sender === userId) ? 'right' : 'left'
                                });
                                if (!read_by_array.includes(userId)) {
                                    read_by += (read_by ? ',' : '') + userId;
                                    let id = chatuser['id'];
                                    let recordDetails = await this.chatService.findOne({ id: id, status: Not(2) });
                                    await this.chatService.update({ id: id }, { read_by: read_by });
                                    //this.activityLogService.create(recordDetails, {read_by: read_by}, tableConstant.CHALLENGE.TBL_CH_CHAT, userId);
                                }
                            })
                        )
                        chatDataList['total'] = chatData.total;
                        chatDataList['pages'] = chatData.pages;
                        chatDataList['limit'] = chatData.limit;
                        chatDataList['page'] = chatData.page;
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: (Object.keys(chatDataList).length > 0) ? chatDataList : null,
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
    @Post('online-status')
    async onlineStatus(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let status = 'offline';
            const clientSocket = this.socketService.getClientSocket(postData?.user_id.toString());
            if (clientSocket) {
                status = 'online';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {status},
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.sender_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.chatService.findOne({
                id: postData?.id, sender_id: postData?.sender_id, status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.chatService.update({id: postData?.id, sender_id: postData?.sender_id},{status: 2});
            let userIds = recordDetails.read_by.split(',');
            if(recordDetails.user_id){
                userIds.push(recordDetails.user_id.toString());
            }
            if(recordDetails.sender_id){
                userIds.push(recordDetails.sender_id.toString());
            }
            let userData = await this.userService.usersList({id: In(userIds)}, ['id']);
            for (let i = 0; i < userData.length; i++) {
               const clientSocket = this.socketService.getClientSocket(userData[i]['id'].toString());
               if (clientSocket) {
                clientSocket.emit('delete-chat', { ...recordDetails, chat_id: recordDetails.id, type: postData?.type });
               }
            }
            this.activityLogService.create(recordDetails, {text: recordDetails}, tableConstant.CHALLENGE.TBL_CH_CHAT, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Message deleted successfully',
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListChallengeInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.chatService.listRecord(["ch_chat.sender_id","ch_chat.text"],{org_id: postData?.org_id, status: Not(2)},{ [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ChatDto, resultedData, req.lang)
            );
            let userData = await this.userService.usersList({org_id: postData?.org_id}, ['id']);
                for (let i = 0; i < userData.length; i++) {
                   const clientSocket = this.socketService.getClientSocket(userData[i]['id'].toString());
                   if (clientSocket) {
                      clientSocket.emit('chat', {data: resultedData});
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
    @Post('clean-chat')
    async cleanChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id || !postData?.code) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let userData = await this.userService.usersList({ membership_code: postData?.code }, ['id']);
            let departmentData = await this.departmentService.listRecord({ company_id: postData?.org_id });
            let locationData = await this.locationService.listRecord(['id'], { company_id: postData?.org_id });
            let teamData = await this.teamService.listRecord({ org_id: postData?.org_id }, null, ['team.id']);
            if (userData && userData.length > 0) {
                const userIds = userData.map(user => user.id);
                await this.chatService.update(`sender_id IN (${userIds.join(',')})`,{status: 2});
            }
            if (postData?.org_id) {
                await this.chatService.update({ org_id: postData?.org_id },{status: 2});
            }
            if (departmentData && departmentData.length > 0) {
                const departmentIds = departmentData.map(department => department.id);
                await this.chatService.update(`department_id IN (${departmentIds.join(',')})`,{status: 2});
            }
            if (locationData && locationData.length > 0) {
                const locationIds = locationData.map(location => location.id);
                await this.chatService.update(`location_id IN (${locationIds.join(',')})`,{status: 2});
            }
            if (teamData && teamData.length > 0) {
                const teamIds = teamData.map(team => team.id);
                await this.chatService.update(`team_id IN (${teamIds.join(',')})`,{status: 2});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Organization chat clean successfully.',
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
    @Post('fetch-chat')
    async fetchChatList(@Req() req: Request, @Res() res: Response, @Body() postData: ListChallengeInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.chatHelperService.fetchChat(req.tokenUser, req);
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
    @Post('event-chat-user-list')
    async eventChatUserList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.event_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let where = `user.org_id='${user.org_id}' AND user.status=1 AND user.username <> ''`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '','full_name' , false);
            }
            let userData = await this.chatService.eventChatUserList(where, {page: postData?.page, limit: postData?.limit, order: postData?.order, order_by: postData?.order_by}, user.id, postData?.event_id);
            for(let chat of userData?.list) {
                if (chat['profile_image'] && chat['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat['profile_image']}))) {
                    chat['profile_image'] = S3_URL + chat['profile_image'];
                } else {
                    chat['profile_image'] = S3_URL + 'comn/img/avatar_0001.png';
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: userData,
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
    @Post('event-chat-list')
    async eventChatList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.event_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let user_array = Object.create(null);
            let where = `ch_chat.event_id in(${postData?.event_id}) AND ch_chat.user_id = '${user.id}' AND ch_chat.is_private=1  AND ch_chat.status !=2 `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
                (
                    read_by REGEXP '^${user.id},' 
                    OR read_by REGEXP ',${user.id}$' 
                    OR read_by = ${user.id} 
                    OR read_by REGEXP ',${user.id},'
                )
                )`;
            }
            let event_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.event_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(event_chat && event_chat?.list?.length){
                user_array = await this.chatHelperService.process_event_chat(user, event_chat.list, user_array);
                user_array = {list: user_array ? Object.values(user_array) : []};
            }
            else{
                user_array['list'] = [];
            }
            user_array['page'] = event_chat.page;
            user_array['pages'] = event_chat.pages; 
            user_array['total'] = event_chat.total;
            user_array['limit'] = event_chat.limit; 
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
    @Post('event-user-chat')
    async eventUserChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id || !postData?.event_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let user_array = Object.create(null);
            let where = `ch_chat.sender_id ='${postData?.user_id}'  AND ch_chat.status !=2 AND (ch_chat.user_id=-1 OR ch_chat.user_id = '${user.id}') AND event_id = '${postData?.event_id}' `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE
                (
                    read_by REGEXP '^${user.id},' 
                    OR read_by REGEXP ',${user.id}$' 
                    OR read_by = ${user.id} 
                    OR read_by REGEXP ',${user.id},'
                ) AND status !=2
                )`;
            }
            let event_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.event_id','sender.id','ch_chat.read_by','ch_chat.reactions','ch_chat.added_date','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(event_chat && event_chat?.list?.length){
                user_array = await this.chatHelperService.process_event_chat(user, event_chat?.['list'], [],false);
                user_array = {list: user_array};
            }
            else{
                user_array['list'] = [];
            }
            user_array['page'] = event_chat.page;
            user_array['pages'] = event_chat.pages; 
            user_array['total'] = event_chat.total;
            user_array['limit'] = event_chat.limit; 
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
    @Post('event-load-more-chat')
    async eventLoadMoreChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.event_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let support_chat_user = Object.create(null);
            let where = `(ch_chat.user_id='${user.id}' OR ch_chat.sender_id='${user.id}') AND (ch_chat.user_id <> '') AND ch_chat.event_id in(${postData?.event_id}) AND ch_chat.is_private=1 AND ch_chat.status !=2 `;
            let event_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(event_chat && event_chat?.list?.length){
                support_chat_user = await this.chatHelperService.process_load_event_chat(user,event_chat?.list,support_chat_user);
                support_chat_user = {list: support_chat_user ? support_chat_user?.support_chat_user?.chat : []};
            }else{
                support_chat_user['list'] = [];
            }
            support_chat_user['page'] = event_chat.page;
            support_chat_user['pages'] = event_chat.pages; 
            support_chat_user['total'] = event_chat.total;
            support_chat_user['limit'] = event_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: support_chat_user,
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
    @Post('load-more-chat')
    async loadMoreChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let support_chat_user = Object.create(null);
            let where = `(ch_chat.user_id='${user.id}' OR ch_chat.sender_id='${user.id}') AND (ch_chat.user_id = '${postData?.user_id}' OR ch_chat.user_id = '${postData?.user_id}') AND (ch_chat.user_id <> '') AND ch_chat.is_private=0 AND ch_chat.status !=2 `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE 
                (
                    read_by REGEXP '^${user.id},' 
                    OR read_by REGEXP ',${user.id}$' 
                    OR read_by = ${user.id} 
                    OR read_by REGEXP ',${user.id},'
                ) AND status !=2
                )`;
            }
            let user_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','ch_chat.user_id','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(user_chat && user_chat?.list?.length){
                support_chat_user = await this.chatHelperService.process_user_chat(user,user_chat?.list,support_chat_user, true);
                support_chat_user = {list: support_chat_user ? support_chat_user?.chat : []};
            }
            else{
                support_chat_user['list'] = [];
            }
            support_chat_user['page'] = user_chat.page;
            support_chat_user['pages'] = user_chat.pages; 
            support_chat_user['total'] = user_chat.total;
            support_chat_user['limit'] = user_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: support_chat_user,
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
    @Post('fetch-team-chat-user')
    async fetchTeamChatUser(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.team_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let team_array = Object.create(null);
            let teams = await this.teamsService.listRecord(`team.id = ${postData?.team_id} AND team.status = 1 AND team.tname <> ''`,null,['team'],'team.id');
            if (teams && teams.length) {
                for (let team of teams) {
                    let team_id = team['id'];
                    let chatWith = { [`T${team_id}`]:  `With Team - ${team['tname']}`};
                    let where = `ch_chat.team_id= '${team_id}' AND ch_chat.sender_id != '${user.id}' AND ch_chat.status !=2 `;
                    if(postData?.unread){
                        where += ` AND ch_chat.id NOT IN (
                        SELECT id FROM ch_chat WHERE
                        (
                            read_by REGEXP '^${user.id},' 
                            OR read_by REGEXP ',${user.id}$' 
                            OR read_by = ${user.id} 
                            OR read_by REGEXP ',${user.id},'
                        ) AND status !=2
                        )`;
                    }
                    let t_chat = await this.chatService.PaginateListRecord(
                        ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.user_id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                        where,
                        {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
                    );
                    if(t_chat && t_chat?.list?.length){
                        team_array = await this.chatHelperService.process_team_chat(user,t_chat?.list,team_array,team_id);
                        team_array = {list: team_array ? team_array[`T${team_id}`]?.['chat'] : []};
                    }
                    else{
                        team_array['list'] = [];
                    }
                    team_array['page'] = t_chat.page;
                    team_array['pages'] = t_chat.pages; 
                    team_array['total'] = t_chat.total;
                    team_array['limit'] = t_chat.limit; 
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: team_array,
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
    @Post('fetch-team-chat')
    async fetchTeamChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.team_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let team_array = Object.create(null);            
            let team_id = postData?.team_id;
            let where = `ch_chat.team_id= '${team_id}' AND ch_chat.sender_id <> '${user.id}' AND ch_chat.status !=2 `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE
                (
                    read_by REGEXP '^${user.id},' 
                    OR read_by REGEXP ',${user.id}$' 
                    OR read_by = ${user.id} 
                    OR read_by REGEXP ',${user.id},'
                ) AND status !=2
                )`;
            }
            let t_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.user_id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {id: 'ASC'}
            );
            if(t_chat && t_chat?.list?.length){
                team_array = await this.chatHelperService.process_team_chat(user,t_chat?.list,[],team_id, false);
                team_array = {list: team_array};
            }
            else{
                team_array['list'] = [];
            }
            team_array['page'] = t_chat.page;
            team_array['pages'] = t_chat.pages; 
            team_array['total'] = t_chat.total;
            team_array['limit'] = t_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: team_array,
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
    @Post('team-chat')
    async teamChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.team_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let team_array = Object.create(null);            
            let team_id = postData?.team_id;
            let where =`
                ch_chat.team_id='${team_id}' AND ch_chat.status !=2 
                AND ch_chat.id IN (SELECT id FROM ch_chat WHERE 
                (read_by REGEXP '^${user.id},' 
                OR read_by REGEXP ',${user.id}$' 
                OR read_by = ${user.id} 
                OR read_by REGEXP ',${user.id},') AND status !=2
                )`;
            let team = await this.teamService.findOne({id: team_id},null,['team.id','team.tname','team.logo']);
            team = <any>(await this.commonArrayService.formatToDto(TeamsDto, team, req.lang));
            let icons = team['logo'];
            if (!icons?.includes(S3_URL) && !await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                team['logo'] = this.commonService.getIconPath(icons,S3_URL);
            }
            let t_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.user_id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(t_chat && t_chat?.list?.length){
                team_array = await this.chatHelperService.process_user_chat(user,t_chat?.list,team_array,true);
                team_array = {list: team_array['chat']};
            }
            else{
                team_array['list'] = [];
            }
            team_array['details'] = team;
            team_array['page'] = t_chat.page;
            team_array['pages'] = t_chat.pages; 
            team_array['total'] = t_chat.total;
            team_array['limit'] = t_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: team_array,
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
    @Post('select-team-chat')
    async selectTeamChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = req.tokenUser;
            let where = `(
                team.org_id='${user.org_id}' 
                AND team.status = 1 AND team.tname <> '')`;
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['team.tname']);
            }
            let teamData = await this.teamService.chatTeamList(where, {page: postData?.page, limit: postData?.limit, order: postData?.order, order_by: postData?.order_by}, user.id);
            if (req.lang !== 'eng' && !Array.isArray(teamData) && teamData.list?.length) {
                teamData.list = await Promise.all(
                    teamData.list.map(async (ele) => {
                        if (ele.tname) {
                            const key = `team_name_${ele.schedule_id}_${ele.id}`;
                            const customeName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                key,
                                `/LC_MESSAGES/Challenge/MyChallenges/${user.org_id}/${ele.schedule_id}`,
                                'dynamic'
                            );
                            ele.tname =
                                customeName === '' || customeName === key
                                    ? ele.tname
                                    : customeName;
                        }
                        return ele;
                    })
                );
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: teamData,
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
    @Post('fetch-location-chat')
    async fetchLocationChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.loc_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let loc_array = Object.create(null);
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let where = `ch_chat.location_id= '${postData?.loc_id}' AND ch_chat.status !=2 AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
                (
                    read_by REGEXP '^${user_id},' 
                    OR read_by REGEXP ',${user_id}$' 
                    OR read_by = ${user_id} 
                    OR read_by REGEXP ',${user_id},'
                )
                )`;
            }
            let loc_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.text','ch_chat.reactions','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(loc_chat && loc_chat?.list?.length){
                loc_array = await this.chatHelperService.process_loc_chat(user,loc_chat?.list,[],false);
                loc_array = {list: loc_array['chat']};
            }else{
                loc_array['list'] = [];
            }
            loc_array['page'] = loc_chat.page;
            loc_array['pages'] = loc_chat.pages; 
            loc_array['total'] = loc_chat.total;
            loc_array['limit'] = loc_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: loc_array,
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
    @Post('location-chat')
    async locationChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.loc_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let assignment;
            let locationData = await this.locationService.listRecord(['id'], { company_id: postData?.org_id });
            if (user.role_id == appConstant.ROLE.WCH) {
                assignment = await this.chatHelperService.checkAndGetAssignment(user.id, 'location', req); 
                if (!assignment.includes(String(postData?.loc_id))) {
                    locationData = null;
                }
            }
            if (!locationData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Please select location.'));
            }
            let loc_array = Object.create(null);
            let where = `
            ch_chat.is_private=0 AND ch_chat.status !=2 AND  ch_chat.location_id='${postData?.loc_id}' 
            `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE 
                (read_by REGEXP '^${user_id},' 
                OR read_by REGEXP ',${user_id}$' 
                OR read_by = ${user_id} 
                OR read_by REGEXP ',${user_id},') AND status !=2
                )`;
            }
            let location = await this.locationService.findOne({id: postData?.loc_id},['location.id','location.location_name','location.is_default','location.lname']);
            let loc_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.text','ch_chat.reactions','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(loc_chat && loc_chat?.list?.length){
                // Ordering for org_admin and champion role.    (false)
                loc_array = await this.chatHelperService.process_loc_chat(user,loc_chat?.list,loc_array,false);  
                loc_array = {list: loc_array['chat']}; 
            }
            else{
                loc_array['list'] = [];
            }
            loc_array['details'] = location;
            loc_array['page'] = loc_chat.page;
            loc_array['pages'] = loc_chat.pages; 
            loc_array['total'] = loc_chat.total;
            loc_array['limit'] = loc_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: loc_array,
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
    @Post('select-location-chat')
    async selectLocationChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = req.tokenUser;       
            let user_id = user.id;
            let org_id = user.org_id;  
            let assignment
            if (user.role_id == appConstant.ROLE.WCH) {
                assignment = await this.chatHelperService.checkAndGetAssignment(user_id, 'location', req); 
                if (!assignment) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FORBIDDEN_ACCESS'));
                }
                assignment = `location.company_id = ${org_id} AND location.status = 1 AND location.deleted = 0 AND location.location_name <> '' AND location.id in(${assignment})`;
            }
            else{
                assignment = `location.company_id = ${org_id} AND location.status = 1 AND location.deleted = 0 AND location.location_name <> ''`;
            }
            if(postData?.search_str){
                assignment += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['location.location_name']);
            }
            let locations = await this.locationService.getLocationWithChatCount(assignment,user_id,{page: postData?.page, limit: postData?.limit, order: postData?.order, order_by: postData?.order_by});
            if (req.lang !== 'eng' && !Array.isArray(locations) && locations.list?.length) {
                locations.list = await Promise.all(
                    locations.list.map(async (ele) => {
                        if (ele.location_name) {
                            const key = `location_name_${ele.id}`;

                            const customeName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                key,
                                `/LC_MESSAGES/OrgAdmin/Location/${org_id}/${ele.id}`,
                                'dynamic'
                            );

                            ele.location_name =
                                customeName === '' || customeName === key
                                    ? ele.location_name
                                    : customeName;
                        }
                        return ele;
                    })
                );
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: locations,
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
    @Post('fetch-department-chat')
    async fetchDepartmentChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.dept_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let dept_array = Object.create(null);
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let where = `ch_chat.department_id= '${postData?.dept_id}' AND ch_chat.status !=2 AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND 
                (
                    read_by REGEXP '^${user_id},' 
                    OR read_by REGEXP ',${user_id}$' 
                    OR read_by = ${user_id} 
                    OR read_by REGEXP ',${user_id},'
                ) AND status !=2
                )`;
            }
            let dept_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.text','ch_chat.reactions','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(dept_chat && dept_chat?.list?.length){
                dept_array = await this.chatHelperService.process_dept_chat(user,dept_chat?.list,dept_array,false);
                dept_array = {list: dept_array['chat']};
            }
            else{
                dept_array['list'] = [];
            }
            dept_array['page'] = dept_chat.page;
            dept_array['pages'] = dept_chat.pages; 
            dept_array['total'] = dept_chat.total;
            dept_array['limit'] = dept_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: dept_array,
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
    @Post('department-chat')
    async departmentChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.dept_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let assignment;
            let departmentData = await this.departmentService.findOne({ company_id: postData?.org_id || org_id, id: postData?.dept_id },['department.id', 'department.code', 'department.dept_name', 'department.default_dept']);
            if (user.role_id == appConstant.ROLE.WCH) {
                assignment = await this.chatHelperService.checkAndGetAssignment(user.id, 'department', req); 
                if (!assignment.includes(Number(postData?.dept_id))) {
                    departmentData = null;
                }
            }
            if (!departmentData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Please select department.'));
            }
            let dept_array = Object.create(null);
            let where = `ch_chat.is_private = 0 AND ch_chat.status !=2 AND  ch_chat.department_id='${postData?.dept_id}' `;
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE 
                (read_by REGEXP '^${user_id},' 
                OR read_by REGEXP ',${user_id}$' 
                OR read_by = ${user_id} 
                OR read_by REGEXP ',${user_id},') AND status !=2
                )`;
            }
            let dept_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.text','ch_chat.reactions','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(dept_chat && dept_chat?.list?.length){
                // Ordering for org_admin and champion role.    (false)
                dept_array = await this.chatHelperService.process_dept_chat(user,dept_chat?.list,dept_array,false);
                dept_array = {list: dept_array['chat']};
            }
            else{
                dept_array['list'] = [];
            }
            dept_array['details'] = departmentData;
            dept_array['page'] = dept_chat.page;
            dept_array['pages'] = dept_chat.pages; 
            dept_array['total'] = dept_chat.total;
            dept_array['limit'] = dept_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: dept_array,
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
    @Post('select-department-chat')
    async selectDepartmentChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user = req.tokenUser;       
            let user_id = user.id;
            let org_id = user.org_id;  
            let assignment
            if (user.role_id == appConstant.ROLE.WCH) {
                assignment = await this.chatHelperService.checkAndGetAssignment(user_id, 'department', req); 
                if (!assignment) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FORBIDDEN_ACCESS'));
                }
                assignment = `department.company_id = ${org_id} AND department.status = 1 AND department.deleted = 0 AND department.dept_name <> '' AND department.id in(${assignment})`;
            }
            else{
                assignment = `department.company_id = ${org_id} AND department.status = 1 AND department.deleted = 0 AND department.dept_name <> ''`;
            }
            if(postData?.search_str){
                assignment += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['department.dept_name']);
            }
            let departments = await this.departmentService.getDepartmentWithChatCount(assignment,user_id,{page: postData?.page, limit: postData?.limit, order: postData?.order, order_by: postData?.order_by});
            if (req.lang !== 'eng' && !Array.isArray(departments) && departments.list?.length) {
                departments.list = await Promise.all(
                    departments.list.map(async (ele) => {
                        if (ele.dept_name) {
                            const key = `department_name_${ele.id}`;

                            const customeName = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                key,
                                `/LC_MESSAGES/OrgAdmin/Department/${org_id}/${ele.id}`,
                                'dynamic'
                            );

                            ele.dept_name =
                                customeName === '' || customeName === key
                                    ? ele.dept_name
                                    : customeName;
                        }
                        return ele;
                    })
                );
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: departments,
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
    @Post('fetch-organization-chat')
    async fetchOrganizationChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let org_array = Object.create(null);
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let where;
            if (user.role_id == appConstant.ROLE.WCH) {
                let usersdata = await this.chatHelperService.checkAndGetAssignment(user.id, 'users', req) || [];
                usersdata.push(user_id); 
                where = `ch_chat.org_id= '${postData?.org_id}' AND (ch_chat.user_id IN (${usersdata}) OR ch_chat.sender_id IN(${usersdata})) AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 `;
                if(postData?.unread){
                    where += ` AND ch_chat.id NOT IN (
                    SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND 
                    (
                        read_by REGEXP '^${user_id},' 
                        OR read_by REGEXP ',${user_id}$' 
                        OR read_by = ${user_id} 
                        OR read_by REGEXP ',${user_id},'
                    )
                    )`;
                }
            }
            else{
                where = `ch_chat.org_id= '${postData?.org_id}' AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 `;
                if(postData?.unread){
                    where += ` AND ch_chat.id NOT IN (
                    SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND 
                    (
                        read_by REGEXP '^${user_id},' 
                        OR read_by REGEXP ',${user_id}$' 
                        OR read_by = ${user_id} 
                        OR read_by REGEXP ',${user_id},'
                    ) AND status !=2
                    )`;
                }
            }
            let org_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.text','ch_chat.reactions','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if(org_chat && org_chat?.list?.length){
                org_array = await this.chatHelperService.process_org_chat(user,org_chat?.list,org_array,false,req.lang);
                org_array = {list: org_array['chat']};
            }
            else{
                org_array['list'] = [];
            }
            org_array['page'] = org_chat.page;
            org_array['pages'] = org_chat.pages; 
            org_array['total'] = org_chat.total;
            org_array['limit'] = org_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: org_array,
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
    @Post('organization-chat')
    async organizationChat(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = req.tokenUser;
            let user_id = user.id;
            let org_id = user.org_id;
            let org_array = Object.create(null);
            let where = `ch_chat.org_id= '${postData?.org_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 `;
            if (user.role_id == appConstant.ROLE.WCH) {
                let usersdata = await this.chatHelperService.checkAndGetAssignment(user.id, 'users', req) || []; 
                usersdata.push(user.id);
                where += ` AND (ch_chat.user_id IN (${usersdata}) OR ch_chat.sender_id IN(${usersdata})) `;            
            }
            if(postData?.unread){
                where += ` AND ch_chat.id NOT IN (
                    SELECT id FROM ch_chat WHERE  
                    (
                        read_by REGEXP '^${user_id},' 
                        OR read_by REGEXP ',${user_id}$' 
                        OR read_by = ${user_id} 
                        OR read_by REGEXP ',${user_id},'
                    ) AND status !=2
                )`;
            } 
            let org_chat = await this.chatService.PaginateListRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.text','ch_chat.reactions','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {orderBy: 'id', order: 'DESC', page: postData.page, limit: postData.limit}
            );
            if (org_chat && org_chat?.list.length) {
                // Ordering for org_admin and champion role.    (false)
                org_array = await this.chatHelperService.process_org_chat(user, org_chat?.list, org_array, false,req.lang);
                org_array = {list: org_array['chat']};
            }
            else{
                org_array['list'] = [];
            }
            org_array['page'] = org_chat.page;
            org_array['pages'] = org_chat.pages; 
            org_array['total'] = org_chat.total;
            org_array['limit'] = org_chat.limit; 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: org_array,
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
    @Post('mark-read')
    async markRead(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user_id = req.tokenUser?.id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let recordDetails = await this.chatService.listRecord(['ch_chat.id','ch_chat.read_by'],`ch_chat.id in(${postData?.id}) AND ch_chat.status !=2`);
            if (recordDetails.length == 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let read_by;
            for(let item of recordDetails){
                read_by = await this.chatHelperService.read_by(item?.read_by, user_id);
                await this.chatService.update({id: item['id']},{read_by});
                this.activityLogService.create(item, {read_by}, tableConstant.CHALLENGE.TBL_CH_CHAT, req.tokenUser?.id, 'update');
            }
            
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
