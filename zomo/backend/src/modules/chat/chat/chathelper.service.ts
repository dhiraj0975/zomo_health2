import { CommonDateService } from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from "express";
import { lastValueFrom } from 'rxjs';
import { TeamsService } from 'src/modules/challenge/teams/teams.service';
import { WellnessAssignmentService } from 'src/modules/company/wellnessassignment/wellnessAssignment.service';
import { UserService } from 'src/modules/user/user/user.service';
import { TranslationService } from "../../translation/translation.service";
import { ChatSettingsService } from '../chatsettings/chatsettings.service';
import { ChatService } from './chat.service';
// import moment from 'moment';
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD;

@Injectable()
export class ChatHelperService {
    constructor(
        private readonly chatService: ChatService,
        private readonly translatorService: TranslationService,
        private readonly userService: UserService,
        private readonly chatSettingsService: ChatSettingsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly teamsService: TeamsService,
        private readonly wellnessAssignmentService: WellnessAssignmentService,
        private readonly commonDateService: CommonDateService,
        
    ) {}
    async fetchChat(user: any, req: Request){
        try {
            let user_id = user.id
            let org_id = user.org_id
            let loc_id = user.location
            let dep_id = user.department_id
            let role_id = user.role_id
            let user_array = Object.create(null);
            let dept_array = Object.create(null);
            let loc_array = Object.create(null);
            let team_array = Object.create(null);
            let org_array = Object.create(null);
            let chatWith = Object.create(null);
            let settings = await this.chatSettingsService.findOne({user_id: user_id});
            let where = `(sender.role_id=20 OR user.role_id=20) AND ch_chat.user_id='${user_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 AND ch_chat.id NOT IN (
            SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
            (
                read_by REGEXP '^${user_id},' 
                OR read_by REGEXP ',${user_id}$' 
                OR read_by = ${user_id} 
                OR read_by REGEXP ',${user_id},'
            )
            )`;
            let user_chat = await this.chatService.listRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {id: 'ASC'}
            );
            if(user_chat && user_chat.length){
                user_array = await this.process_user_chat(user,user_chat,user_array);
            }
            if(settings){
                if (settings['chat_with_users'] && settings['chat_with_users'] == 1) {
                    let where = `ch_chat.user_id='${user_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 AND ch_chat.id NOT IN (
                        SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
                        (
                            read_by REGEXP '^${user_id},' 
                            OR read_by REGEXP ',${user_id}$' 
                            OR read_by = ${user_id} 
                            OR read_by REGEXP ',${user_id},'
                        )
                        )`;
                    let user_chat = await this.chatService.listRecord(
                        ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                        where,
                        {id: 'ASC'}
                    );
                    if(user_chat && user_chat.length){
                        user_array = await this.process_user_chat(user,user_chat,user_array);
                    }
                }
                if (settings['chat_with_dept'] && settings['chat_with_dept'] == 1) {
                    if (dep_id != "") {
                        let where = `ch_chat.department_id= '${dep_id}' AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 AND ch_chat.id NOT IN (
                            SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
                            (
                                read_by REGEXP '^${user_id},' 
                                OR read_by REGEXP ',${user_id}$' 
                                OR read_by = ${user_id} 
                                OR read_by REGEXP ',${user_id},'
                            )
                            )`;
                        let dept_chat = await this.chatService.listRecord(
                            ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                            where,
                            {id: 'ASC'}
                        );
                        dept_array = await this.process_dept_chat(user,dept_chat,dept_array);
                    }
                }
                if (settings['chat_with_loc'] && settings['chat_with_loc'] == 1) {
                    if (loc_id != "") {
                        let where = `ch_chat.location_id= '${loc_id}' AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 AND ch_chat.id NOT IN (
                            SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
                            (
                                read_by REGEXP '^${user_id},' 
                                OR read_by REGEXP ',${user_id}$' 
                                OR read_by = ${user_id} 
                                OR read_by REGEXP ',${user_id},'
                            )
                            )`;
                        let loc_chat = await this.chatService.listRecord(
                            ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                            where,
                            {id: 'ASC'}
                        );
                        loc_array = await this.process_loc_chat(user,loc_chat,loc_array);
                    }
                }
                if (settings['chat_with_team'] && settings['chat_with_team'] == 1) {
                        let teams = await this.teamsService.listRecord(`team.org_id = ${org_id} AND team.status = 1 AND team.tname <> ''`,null,['team.id','team.tname']);
                        if (teams && teams.length) {
                            for (let team of teams) {
                                let team_id = team['id'];
                                let teamId = `T${team_id}`;
                                chatWith[teamId] = `With Team - ${team['tname']}`;
                                let where = `ch_chat.team_id= '${team_id}' AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 AND ch_chat.id NOT IN (
                                SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
                                (
                                    read_by REGEXP '^${user_id},' 
                                    OR read_by REGEXP ',${user_id}$' 
                                    OR read_by = ${user_id} 
                                    OR read_by REGEXP ',${user_id},'
                                )
                                )`;
                                let t_chat = await this.chatService.listRecord(
                                    ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                                    where,
                                    {id: 'ASC'}
                                );
                                team_array = await this.process_team_chat(user,t_chat,team_array,team_id);
                            }
                        }
                } 
                else if (settings['chat_own_team'] && settings['chat_own_team'] == 1) {
                        let teams = await this.teamsService.listRecord(`team.org_id = ${org_id} AND team.status = 1 AND team.tname <> '' AND teamMember.user_id = ${user_id}`,null,['team.id','team.tname']);
                        if (teams && teams.length) {
                            for (let team of teams) {
                                let team_id = team['id'];
                                let teamId = `T${team_id}`;
                                chatWith[teamId] = `With Team - ${team['tname']}`;
                                let where = `ch_chat.team_id= '${team_id}' AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 AND ch_chat.id NOT IN (
                                SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
                                (
                                    read_by REGEXP '^${user_id},' 
                                    OR read_by REGEXP ',${user_id}$' 
                                    OR read_by = ${user_id} 
                                    OR read_by REGEXP ',${user_id},'
                                )
                                )`;
                                let t_chat = await this.chatService.listRecord(
                                    ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.reactions','ch_chat.text','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                                    where,
                                    {id: 'ASC'}
                                );
                                team_array = await this.process_team_chat(user,t_chat,team_array,team_id);
                            }
                        }  
                }
            }
            let usersdataNotConsider = '';
            const wellnessData = await this.userService.userChallengeData(user);
            if(wellnessData?.length){
                usersdataNotConsider = ` AND ch_chat.sender_id Not In(${wellnessData.map(ele=>`${ele.id}`)})`;
            }
            where = `ch_chat.org_id= '${org_id}' AND ch_chat.sender_id <> '${user_id}' AND ch_chat.is_private=0 AND ch_chat.status !=2 ${usersdataNotConsider} AND ch_chat.id NOT IN (
                SELECT id FROM ch_chat WHERE ch_chat.is_private=0 AND ch_chat.status !=2 AND 
                (
                    read_by REGEXP '^${user_id},' 
                    OR read_by REGEXP ',${user_id}$' 
                    OR read_by = ${user_id} 
                    OR read_by REGEXP ',${user_id},'
                )
                )`;
            let org_chat = await this.chatService.listRecord(
                ['sender.profile_image','sender.first_name','sender.last_name','sender.id','ch_chat.read_by','ch_chat.added_date','ch_chat.text','ch_chat.reactions','ch_chat.id','user.id','user.profile_image','user.first_name','user.last_name'],
                where,
                {id: 'ASC'}
            );
            if(org_chat && org_chat.length){
                org_array = await this.process_org_chat(user,org_chat,org_array);
            }
            let data = Object.create(null);
            if (user_array && Object.keys(user_array).length) {
                data['user_chat'] = user_array;   
            }
            if (dept_array && Object.keys(dept_array).length) {
                data['dept_chat'] = dept_array;
            }
            if (loc_array && Object.keys(loc_array).length) {
                data['loc_chat'] = loc_array;
            }
            if (team_array && Object.keys(team_array).length) {
                data['team_chat'] = team_array;
            }
            if (org_array && Object.keys(org_array).length) {
                data['org_chat'] = org_array;
            }
            data['chatWith']= chatWith;
            return data;
        }
        catch(error){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async process_user_chat(user, user_chat, user_array, personal = false){
        try{
            let user_id = user.id
            for(let chat of user_chat) {
                let image
                 if (chat['sender'] && chat?.['sender']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['sender']?.['profile_image']}))) {
                    image = S3_URL + chat?.['sender']?.['profile_image'];
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
                let reactions = [];
                if(chat.reactions){
                    reactions = Object.keys(chat.reactions); 
                }
                let ucurrentdate
                let msg_date
                let record_date
                if (timezone && timezone !== "UTC") {
                    // ucurrentdate = moment(chat.added_date).utc().tz(timezone);
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');
                    msg_date = ucurrentdate.format('MMM D, YYYY h:mma');
                } else {
                    // msg_date = moment(chat.added_date).format('MMM D, YYYY h:mma');
                    record_date = moment(chat.added_date).format('YYYY-MM-DD HH:mm:ss');
                    msg_date = this.commonDateService.DateTimeFormat(chat.added_date,'MMM D, YYYY h:mma');
                }
                let sender = chat['sender']?.['id'];
                let user_object = {
                    chat_id : chat.id,
                    image : image,
                    name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                    sender_id: chat?.['sender']?.['id'],
                    date: msg_date,
                    record_date,
                    reactions: reactions,
                    text: chat['text']
                };
                if(chat.team){
                    user_object['team'] = chat.team;
                }
                if(chat.loc){
                    user_object['loc'] = chat.loc;
                }
                if(chat.dept){
                    user_object['dept'] = chat.dept;
                }
                if(personal){
                    let user_key = `chat`
                    if(user_id == sender){
                        if (user_array[user_key] && user_array[user_key].length) {
                            user_object['user'] = 1;
                            user_array[user_key].unshift(user_object);
                        }
                        else{
                            if(!user_array[user_key] || user_array[user_key].length == 0){
                                user_array[user_key] = [];
                            }
                            user_object['user'] = 1;
                            user_array[user_key].push(user_object);
                        }
                    }
                    else{
                        if (user_array[user_key] && user_array[user_key].length) {
                            user_array[user_key].unshift(user_object);
                        }
                        else{
                            if(!user_array[user_key] || user_array[user_key].length == 0){
                                user_array[user_key] = [];
                            }
                            user_array[user_key].push(user_object);
                        }
                    }
                }
                else{
                    let user_key = `R${user_id}S${sender}`
                    if (!user_array[user_key]) {
                        user_array[user_key] = Object.create(null);
                    }
                    if (user_array[user_key]) {
                    if(!user_array[user_key]['chat'] || user_array[user_key]['chat'].length == 0){
                        user_array[user_key]['chat'] = [];
                    }
                    user_array[user_key]['chat'].push(user_object);
                    // need to change this for notify
                    if(!user_array[user_key]['notify'] || user_array[user_key]['notify'].length == 0){
                        user_array[user_key]['notify'] = [];
                    }
                    user_array[user_key]['notify'].push(user_key);
                    }
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
            return user_array;
        }catch(error){
            throw new Error(error.message);
        }
    }
    async process_dept_chat(user, user_chat, dept_array, isUser=true){
        try{
            let user_id = user.id
            for(let chat of user_chat) {
                let image
                 if (chat['sender'] && chat?.['sender']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['sender']?.['profile_image']}))) {
                    image = S3_URL + chat?.['sender']?.['profile_image'];
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
                let reactions = [];
                if(chat.reactions){
                    reactions = Object.keys(chat.reactions); 
                }
                let ucurrentdate
                let msg_date
                let record_date
                if (timezone && timezone !== "UTC") {
                    // ucurrentdate = moment(chat.added_date).utc().tz(timezone);
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');
                    msg_date = ucurrentdate.format('MMM D, YYYY h:mma');
                } else {
                    // msg_date = moment(chat.added_date).format('MMM D, YYYY h:mma');
                    record_date = moment(chat.added_date).format('YYYY-MM-DD HH:mm:ss');
                    msg_date = this.commonDateService.DateTimeFormat(chat.added_date, 'MMM D, YYYY h:mma');
                }
                let sender = chat['sender']?.['id'];
                if(isUser){
                    if (!dept_array['department']) {
                        dept_array['department'] = Object.create(null);
                    }
                    if (dept_array['department']) {
                    if(!dept_array['department']['chat'] || dept_array['department']['chat'].length == 0){
                        dept_array['department']['chat'] = [];
                    }
                    dept_array['department']['chat'].push({
                        chat_id : chat.id,
                        image : image,
                        name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                        sender_id: chat?.['sender']?.['id'],
                        date: msg_date,
                        record_date,
                        reactions: reactions,
                        text: chat['text']
                    });
                    // need to change this for notify
                    if(!dept_array['department']['notify'] || dept_array['department']['notify'].length == 0){
                        dept_array['department']['notify'] = [];
                    }
                    dept_array['department']['notify'].push('department');
                    }
                }
                else{
                    let user_key = `chat`
                    if(!dept_array[user_key] || dept_array[user_key].length == 0){
                        dept_array[user_key] = [];
                    }
                    if(dept_array[user_key].length){
                        dept_array[user_key].unshift({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
                    else{
                        dept_array[user_key].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
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
            return dept_array;
        }catch(error){
            throw new Error(error.message);
        }
    }
    async process_loc_chat(user, user_chat, loc_array, isUser=true){
        try{
            let user_id = user.id
            for(let chat of user_chat) {
                let image
                if (chat?.['sender'] && chat?.['sender']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['sender']?.['profile_image']}))) {
                    image = S3_URL + chat?.['sender']?.['profile_image'];
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
                let reactions = [];
                if(chat.reactions){
                    reactions = Object.keys(chat.reactions); 
                }
                let ucurrentdate
                let msg_date
                let record_date
                if (timezone && timezone !== "UTC") {
                    // ucurrentdate = moment(chat.added_date).utc().tz(timezone);
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');
                    msg_date = ucurrentdate.format('MMM D, YYYY h:mma');
                } else {
                    // msg_date = moment(chat.added_date).format('MMM D, YYYY h:mma');
                    record_date = moment(chat.added_date).format('YYYY-MM-DD HH:mm:ss');
                    msg_date = this.commonDateService.DateTimeFormat(chat.added_date,'MMM D, YYYY h:mma');
                }
                let sender = chat['sender']?.['id'];
                if(isUser){
                    if (!loc_array['location']) {
                        loc_array['location'] = Object.create(null);
                    }
                    if (loc_array['location']) {
                    if(!loc_array['location']['chat'] || loc_array['location']['chat'].length == 0){
                        loc_array['location']['chat'] = [];
                    }
                    loc_array['location']['chat'].push({
                        chat_id : chat.id,
                        image : image,
                        name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                        sender_id: chat?.['sender']?.['id'],
                        date: msg_date,
                        record_date,
                        reactions: reactions,
                        text: chat['text']
                    });
                    // need to change this for notify
                    if(!loc_array['location']['notify'] || loc_array['location']['notify'].length == 0){
                        loc_array['location']['notify'] = [];
                    }
                    loc_array['location']['notify'].push('location');
                    }
                }
                else{
                    let user_key = `chat`
                    if(!loc_array[user_key] || loc_array[user_key].length == 0){
                        loc_array[user_key] = [];
                    }
                    if(loc_array[user_key].length){
                        loc_array[user_key].unshift({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
                    else{
                        loc_array[user_key].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
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
            return loc_array;
        }catch(error){
            throw new Error(error.message);
        }
    }
    async process_org_chat(user, user_chat, org_array, isUser=true, lang?: string){
        try{
            let user_id = user.id
            let monthNames: Record<string, string> = {};
            let timePeriodNames: Record<string, string> = {};
            if (lang && lang !== 'en') {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const timePeriod = ['am','pm'];
                await Promise.all(months.map(async (m) => {
                    monthNames[m] = await this.translatorService.frontendReadTranslation(lang, m, '/LC_MESSAGES/Common/Month', 'static');
                }));
                await Promise.all(timePeriod.map(async (a) => {
                    timePeriodNames[a] = await this.translatorService.frontendReadTranslation(lang, a, '/LC_MESSAGES/Common/Common', 'static');
                }));
            }
            for(let chat of user_chat) {
                let image
                if (chat['sender'] && chat?.['sender']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['sender']?.['profile_image']}))) {
                    image = S3_URL + chat?.['sender']?.['profile_image'];
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
                let reactions = [];
                if(chat.reactions){
                    reactions = Object.keys(chat.reactions); 
                }
                let ucurrentdate
                let msg_date
                let record_date
                /*if (timezone && timezone !== "UTC") {
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');
                    msg_date = ucurrentdate.format('MMM D, YYYY h:mma');
                } else {
                    record_date = moment(chat.added_date).format('YYYY-MM-DD HH:mm:ss');
                    msg_date = this.commonDateService.DateTimeFormat(chat.added_date,'MMM D, YYYY h:mma');
                }*/
                if (timezone && timezone !== "UTC") {
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');

                    let monthShort = this.commonDateService.DateTimeFormat(ucurrentdate, 'MMM');
                    let translatedMonth = (lang && lang !== 'en') ? monthNames[monthShort] : monthShort;

                    let timePeriod = ucurrentdate.format('a');
                    let translatedTimePeriod = (lang && lang !== 'en') ? timePeriodNames[timePeriod] : timePeriod;

                    msg_date = `${translatedMonth} ${ucurrentdate.format('D')}, ${ucurrentdate.format('YYYY')} ${ucurrentdate.format('h')}:${ucurrentdate.format('mm')}${translatedTimePeriod}`;
                } else {
                    record_date = this.commonDateService.DateTimeFormat(chat.added_date, 'YYYY-MM-DD HH:mm:ss');

                    let monthShort = this.commonDateService.DateTimeFormat(chat.added_date, 'MMM');
                    let translatedMonth = (lang && lang !== 'en') ? monthNames[monthShort] : monthShort;

                    let timePeriod = this.commonDateService.DateTimeFormat(chat.added_date, 'a');
                    let translatedTimePeriod = (lang && lang !== 'en') ? timePeriodNames[timePeriod] : timePeriod;

                    msg_date = `${translatedMonth} ${this.commonDateService.DateTimeFormat(chat.added_date, 'D')}, ${this.commonDateService.DateTimeFormat(chat.added_date, 'YYYY')} ${this.commonDateService.DateTimeFormat(chat.added_date, 'h')}:${this.commonDateService.DateTimeFormat(chat.added_date, 'mm')}${translatedTimePeriod}`;
                }
                let sender = chat['sender']?.['id'];
                if(isUser){
                    if (!org_array['organization']) {
                        org_array['organization'] = Object.create(null);
                    }
                    if (org_array['organization']) {
                        if(!org_array['organization']['chat'] || org_array['organization']['chat'].length == 0){
                            org_array['organization']['chat'] = [];
                        }
                        org_array['organization']['chat'].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                        // need to change this for notify
                        if(!org_array['organization']['notify'] || org_array['organization']['notify'].length == 0){
                            org_array['organization']['notify'] = [];
                        }
                        org_array['organization']['notify'].push('organization');
                    }
                }
                else{
                    let user_key = `chat`
                    if(!org_array[user_key] || org_array[user_key].length == 0){
                        org_array[user_key] = [];
                    }
                    if(org_array[user_key].length){
                        org_array[user_key].unshift({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat['sender']?.['first_name']} ${chat['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
                    else{
                        org_array[user_key].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat['sender']?.['first_name']} ${chat['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
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
            return org_array;
        }catch(error){
            throw new Error(error.message);
        }
    }
    async process_team_chat(user, user_chat, team_array, team_id, isUser=true){
        try{
            let user_id = user.id
            for(let chat of user_chat) {
                let image
                 if (chat['sender'] && chat?.['sender']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['sender']?.['profile_image']}))) {
                    image = S3_URL + chat?.['sender']?.['profile_image'];
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
                let reactions = [];
                if(chat.reactions){
                    reactions = Object.keys(chat.reactions); 
                }
                let ucurrentdate
                let msg_date
                let record_date
                if (timezone && timezone !== "UTC") {
                    // ucurrentdate = moment(chat.added_date).utc().tz(timezone);
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');
                    msg_date = ucurrentdate.format('MMM D, YYYY h:mma');
                } else {
                    // msg_date = moment(chat.added_date).format('MMM D, YYYY h:mma');
                    record_date = moment(chat.added_date).format('YYYY-MM-DD HH:mm:ss');
                    msg_date = this.commonDateService.DateTimeFormat(chat.added_date,'MMM D, YYYY h:mma');
                }
                let sender = chat['sender']?.['id'];
                if(isUser){
                    let user_key = `T${team_id}`
                    if (!team_array[user_key]) {
                    team_array[user_key] = Object.create(null);
                    }
                    if (team_array[user_key]) {
                        if(!team_array[user_key]['chat'] || team_array[user_key]['chat'].length == 0){
                            team_array[user_key]['chat'] = [];
                        }
                        team_array[user_key]['chat'].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                        // need to change this for notify
                        if(!team_array[user_key]['notify'] || team_array[user_key]['notify'].length == 0){
                            team_array[user_key]['notify'] = [];
                        }
                        team_array[user_key]['notify'].push(user_key);
                    }
                }
                else{
                    if(!team_array || team_array.length == 0){
                        team_array = [];
                    }
                    if(team_array.length){
                        team_array.unshift({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
                    else{
                        team_array.push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
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
            return team_array;
        }catch(error){
            throw new Error(error.message);
        }
    }
    async process_event_chat(user, user_chat, user_array, isUser=true){
        try{
            let user_id = user.id
            for(let chat of user_chat) {
                let image
                 if (chat['sender'] && chat?.['sender']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['sender']?.['profile_image']}))) {
                    image = S3_URL + chat?.['sender']?.['profile_image'];
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
                let reactions = [];
                if(chat.reactions){
                    reactions = Object.keys(chat.reactions); 
                }
                let ucurrentdate
                let msg_date
                let record_date
                if (timezone && timezone !== "UTC") {
                    // ucurrentdate = moment(chat.added_date).utc().tz(timezone);
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');
                    msg_date = ucurrentdate.format('MMM D, YYYY h:mma');
                } else {
                    // msg_date = moment(chat.added_date).format('MMM D, YYYY h:mma');
                    record_date = moment(chat.added_date).format('YYYY-MM-DD HH:mm:ss');
                    msg_date = this.commonDateService.DateTimeFormat(chat.added_date,'MMM D, YYYY h:mma');
                }
                let sender = chat['sender']?.['id'];
                if(isUser){
                    let user_key = `${chat['event_id']}`
                    if (!user_array[user_key]) {
                        user_array[user_key] = [];
                    }
                    if (user_array[user_key]) {
                        if(!user_array[user_key] || user_array[user_key].length == 0){
                            user_array[user_key] = [];
                        }
                        let object = {
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        };
                        if(user_id == sender){
                            object['user'] = 1;
                        }
                        user_array[user_key].push(object);
                    }
                }
                else{
                    if(!user_array || user_array.length == 0){
                        user_array = [];
                    }
                    let object = {
                        chat_id : chat.id,
                        image : image,
                        name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                        sender_id: chat?.['sender']?.['id'],
                        date: msg_date,
                        record_date,
                        reactions: reactions,
                        text: chat['text']
                    };
                    if(user_array.length){
                        user_array.unshift(object);
                    }
                    else{
                        user_array.push(object);
                    }
                }
                let read_by = chat['read_by'];
                if (read_by != "") {
                    if(read_by.split(',').includes(user_id.toString()) == false){
                        read_by += `,${user_id}`; 
                    }
                } 
                else {
                    read_by = user_id.toString();
                }
                await this.chatService.update({id: chat['id']},{read_by});
            }
            return user_array;
        }catch(error){
            throw new Error(error.message);
        }
    }
    async process_load_event_chat(user, user_chat, support_chat_user){
        try{
            let user_id = user.id
            let send_to;
            for(let chat of user_chat) {
                let image
                 if (chat['sender'] && chat?.['sender']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['sender']?.['profile_image']}))) {
                    image = S3_URL + chat?.['sender']?.['profile_image'];
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
                let reactions = [];
                if(chat.reactions){
                    reactions = Object.keys(chat.reactions); 
                }
                let ucurrentdate
                let msg_date
                let record_date
                if (timezone && timezone !== "UTC") {
                    // ucurrentdate = moment(chat.added_date).utc().tz(timezone);
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');
                    msg_date = ucurrentdate.format('MMM D, YYYY h:mma');
                } 
                else {
                    // msg_date = moment(chat.added_date).format('MMM D, YYYY h:mma');
                    record_date = moment(chat.added_date).format('YYYY-MM-DD HH:mm:ss');
                    msg_date = this.commonDateService.DateTimeFormat(chat.added_date,'MMM D, YYYY h:mma');
                }
                let sender = chat['sender']?.['id'];
                if(sender == user_id){
                    send_to = chat['user_id'];
                    let user_key = `R${user_id}S${send_to}`
                    if (!support_chat_user[user_key]) {
                        support_chat_user[user_key] = Object.create(null);
                    }
                    if (support_chat_user[user_key]) {
                        if(!support_chat_user[user_key]['chat'] || support_chat_user[user_key]['chat'].length == 0){
                            support_chat_user[user_key]['chat'] = [];
                        }
                        support_chat_user[user_key]['chat'].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                    }
                }
                else{
                    let user_key = `R${user_id}S${sender}`
                    if (!support_chat_user[user_key]) {
                        support_chat_user[user_key] = Object.create(null);
                    }
                    if (support_chat_user[user_key]) {
                        if(!support_chat_user[user_key]['chat'] || support_chat_user[user_key]['chat'].length == 0){
                            support_chat_user[user_key]['chat'] = [];
                        }
                        if(!support_chat_user[user_key]['info'] || support_chat_user[user_key]['info'].length == 0){
                            support_chat_user[user_key]['info'] = [];
                        }
                        support_chat_user[user_key]['chat'].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text'],
                        });
                        support_chat_user[user_key]['info'].push({
                            org_id : '',
                            c_type: `user`,
                            send_to: sender,
                            dep_id: '',
                            loc_id: '',
                            team_id: '',
                        });
                    }
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
            let support_chat_user_ID = -1;
            if (support_chat_user['R' + user_id + 'S-1']) {
                support_chat_user = support_chat_user['R' + user_id + 'S-1'];
                support_chat_user_ID = -1;
            } 
            else {
                if (support_chat_user && Object.keys(support_chat_user).length > 0) {
                    if (send_to) {
                    support_chat_user_ID = send_to;
                    } else {
                    support_chat_user_ID = -1;
                    }
                    support_chat_user = Object.values(support_chat_user);
                    support_chat_user = support_chat_user[0];
                } 
                else {
                    support_chat_user_ID = -1;
                }
            }
            return {support_chat_user, support_chat_user_ID};
        }catch(error){
            throw new Error(error.message);
        }
    }
    async checkAndGetAssignment(userID = null, type = null, req: Request) {
        try{
            let assignment = {};
            let usersData: any = await this.wellnessAssignmentService.listRecord(`wellnessAssignment.user_id = ${userID} AND wellnessAssignment.status = 1`);
            if (usersData && usersData.length > 0) {
              if (type !== 'users') {
                for (const user of usersData) {
                  if (user.location !== 0 && user.location !== '') {
                    assignment["location"] = assignment["location"] || [];
                    assignment["location"].push(user.location);
                  }
                  if (user.department !== 0 && user.department !== '') {
                    assignment["department"] = assignment["department"] || [];
                    assignment["department"].push(user.department);
                  }
                  if (user.state !== '') {
                    assignment['state'] = assignment['state'] || [];
                    assignment['state'].push(user.state);
                  }
                  if (user.city !== '') {
                    assignment["city"] = assignment["city"] || [];
                    assignment["city"].push(user.city);
                  }
                  if (user.is_global === 1) {
                    assignment['global'] = 1;
                  }
                }
              } else {
                const org_id = req.tokenUser?.org_id;
                usersData = await this.userService.usersDataWellness({id: userID, role_id: 12, org_id},`user.role_id in(2,16) AND user.status = 1 AND user.org_id = ${org_id}`,'','chat');
                assignment['users'] = usersData.length ? usersData.map(user => user.id) : [];
              }
            }
            if (type === 'All') {
              return assignment;
            } else {
              return assignment[type];
            }
        }catch(error){
            throw new Error(error.message);
        }
    }
    async process_chat(user, user_chat, user_array, chatWith: any= null, settings = null, chatType = 'user', dept_array = null, loc_array = null, team_array = null, org_array = null, default_read = true){
        try{
            let user_id = user.id
            let send_to;
            for(let chat of user_chat.filter(user => user.sender)) {
                let image
                let read_by = chat['read_by'];
                if (chat['sender'] && chat?.['sender']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['sender']?.['profile_image']}))) {
                    image = S3_URL + chat?.['sender']?.['profile_image'];
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
                let reactions = [];
                if(chat.reactions){
                    reactions = Object.keys(chat.reactions); 
                }
                let ucurrentdate
                let msg_date
                let record_date
                if (timezone && timezone !== "UTC") {
                    // ucurrentdate = moment(chat.added_date).utc().tz(timezone);
                    ucurrentdate = this.commonDateService.DateTimeFormat(chat.added_date, 'utcAndTz', '', timezone);
                    record_date = ucurrentdate.format('YYYY-MM-DD HH:mm:ss');
                    msg_date = ucurrentdate.format('MMM D, YYYY h:mma');
                } 
                else {
                    // msg_date = moment(chat.added_date).format('MMM D, YYYY h:mma');
                    record_date = moment(chat.added_date).format('YYYY-MM-DD HH:mm:ss');
                    msg_date = this.commonDateService.DateTimeFormat(chat.added_date,'MMM D, YYYY h:mma');
                }
                let sender = chat['sender']?.['id'];
                if(dept_array != null){
                    if(sender == user_id){
                        send_to = chat['user_id'];
                        if (dept_array) {
                            if(!dept_array['chat'] || dept_array['chat'].length == 0){
                                dept_array['chat'] = [];
                                dept_array['unreadCount'] = 0;
                                dept_array['unreadIds'] = '';
                            }
                            let count = await this.read_by(read_by, user_id, 1);
                            if(count){
                                dept_array['unreadIds'] += dept_array['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                            }
                            dept_array['unreadCount'] += count;
                            dept_array['chat'].push({
                                chat_id : chat.id,
                                image : image,
                                name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                sender_id: chat?.['sender']?.['id'],
                                user_id: user.settings?.['user_id'],
                                c_type: chatType,
                                user: 1,
                                date: msg_date,
                                record_date,
                                reactions: reactions,
                                text: chat['text']
                            });
                        }
                    }
                    else{
                        if(!dept_array['chat'] || dept_array['chat'].length == 0){
                            dept_array['chat'] = [];
                            dept_array['unreadCount'] = 0;
                            dept_array['unreadIds'] = '';
                        }
                        let count = await this.read_by(read_by, user_id, 1);
                        if(count){
                            dept_array['unreadIds'] += dept_array['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                        }
                        dept_array['unreadCount'] += count;
                        dept_array['chat'].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            user_id: user.settings?.['user_id'],
                            c_type: chatType,
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                        if (settings['chat_with_users'] && settings['chat_with_users'] == '1') {
                            let user_key = `R${user_id}S${sender}`
                            if (!user_array[user_key]) {
                                user_array[user_key] = Object.create(null);
                            }
                            if (user_array[user_key]) {
                                if(!user_array[user_key]['chat'] || user_array[user_key]['chat'].length == 0){
                                    user_array[user_key]['chat'] = [];
                                    user_array[user_key]['unreadCount'] = 0;
                                    user_array[user_key]['unreadIds'] = '';
                                }
                                if(!user_array[user_key]['info'] || user_array[user_key]['info'].length == 0){
                                    user_array[user_key]['info'] = [];
                                }
                                // user_array[user_key]['chat'].push({
                                //     chat_id : chat.id,
                                //     image : image,
                                //     name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                //     sender_id: chat?.['sender']?.['id'],
                                //     date: msg_date,
                                //     record_date,
                                //     reactions: reactions,
                                //     text: chat['text'],
                                // });
                                if(chatWith){
                                    if(!chatWith[user_key]){
                                        chatWith[user_key] = {
                                            idType: user_key,
                                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                            image: image,
                                            unreadCount: user_array[user_key]['unreadCount'],
                                            unreadIds: user_array[user_key]['unreadIds']
                                        };
                                    }
                                    else{
                                        chatWith[user_key]['unreadCount'] = user_array[user_key]['unreadCount'];
                                        chatWith[user_key]['unreadIds'] = user_array[user_key]['unreadIds'];
                                    }
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
                else if(loc_array != null){
                    if(sender == user_id){
                        send_to = chat['user_id'];
                        if (loc_array) {
                            if(!loc_array['chat'] || loc_array['chat'].length == 0){
                                loc_array['chat'] = [];
                                loc_array['unreadCount'] = 0;
                                loc_array['unreadIds'] = '';
                            }
                            let count = await this.read_by(read_by, user_id, 1);
                            if(count){
                                loc_array['unreadIds'] += loc_array['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                            }
                            loc_array['unreadCount'] += count;
                            loc_array['chat'].push({
                                chat_id : chat.id,
                                image : image,
                                name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                sender_id: chat?.['sender']?.['id'],
                                user_id: user.settings?.['user_id'],
                                c_type: chatType,
                                user: 1,
                                date: msg_date,
                                record_date,
                                reactions: reactions,
                                text: chat['text']
                            });
                        }
                    }
                    else{
                        if(!loc_array['chat'] || loc_array['chat'].length == 0){
                            loc_array['chat'] = [];
                            loc_array['unreadCount'] = 0;
                            loc_array['unreadIds'] = '';
                        }
                        let count = await this.read_by(read_by, user_id, 1);
                        if(count){
                            loc_array['unreadIds'] += loc_array['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                        }
                        loc_array['unreadCount'] += count;
                        loc_array['chat'].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            user_id: user.settings?.['user_id'],
                            c_type: chatType,
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                        if (settings['chat_with_users'] && settings['chat_with_users'] == '1') {
                            let user_key = `R${user_id}S${sender}`
                            if (!user_array[user_key]) {
                                user_array[user_key] = Object.create(null);
                            }
                            if (user_array[user_key]) {
                                if(!user_array[user_key]['chat'] || user_array[user_key]['chat'].length == 0){
                                    user_array[user_key]['chat'] = [];
                                    user_array[user_key]['unreadCount'] = 0;
                                    user_array[user_key]['unreadIds'] = '';
                                }
                                if(!user_array[user_key]['info'] || user_array[user_key]['info'].length == 0){
                                    user_array[user_key]['info'] = [];
                                }
                                // user_array[user_key]['chat'].push({
                                //     chat_id : chat.id,
                                //     image : image,
                                //     name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                //     sender_id: chat?.['sender']?.['id'],
                                //     date: msg_date,
                                //     record_date,
                                //     reactions: reactions,
                                //     text: chat['text'],
                                // });
                                if(chatWith){
                                    if(!chatWith[user_key]){
                                        chatWith[user_key] = {
                                            idType: user_key,
                                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                            image: image,
                                            unreadCount: user_array[user_key]['unreadCount'],
                                            unreadIds: user_array[user_key]['unreadIds']
                                        };
                                    }
                                    else{
                                        chatWith[user_key]['unreadCount'] = user_array[user_key]['unreadCount'];
                                        chatWith[user_key]['unreadIds'] = user_array[user_key]['unreadIds'];
                                    }
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
                else if(team_array != null){
                    send_to = chat['user_id'];
                    let teamKey = `T${settings.team_id}`;
                    if(!team_array[teamKey] || team_array[teamKey].length == 0){
                        team_array[teamKey] = Object.create(null);
                    }
                    if(sender == user_id){
                        if (team_array) {
                            if(!team_array[teamKey]['chat'] || team_array[teamKey]['chat'].length == 0){
                                team_array[teamKey]['chat'] = [];
                                team_array[teamKey]['unreadCount'] = 0;
                                team_array[teamKey]['unreadIds'] = '';
                            }
                            let count = await this.read_by(read_by, user_id, 1);
                            if(count){
                                team_array[teamKey]['unreadIds'] += team_array[teamKey]['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                            }
                            team_array[teamKey]['unreadCount'] += count;
                            team_array[teamKey]['chat'].push({
                                chat_id : chat.id,
                                image : image,
                                name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                sender_id: chat?.['sender']?.['id'],
                                user_id: user.settings?.['user_id'],
                                c_type: chatType,
                                user: 1,
                                date: msg_date,
                                record_date,
                                reactions: reactions,
                                text: chat['text']
                            });
                        }
                    }
                    else{
                        if(!team_array[teamKey]['chat'] || team_array[teamKey]['chat'].length == 0){
                            team_array[teamKey]['chat'] = [];
                            team_array[teamKey]['unreadCount'] = 0;
                            team_array[teamKey]['unreadIds'] = '';
                        }
                        let count = await this.read_by(read_by, user_id, 1);
                        if(count){
                            team_array[teamKey]['unreadIds'] += team_array[teamKey]['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                        }
                        team_array[teamKey]['unreadCount'] += count;
                        team_array[teamKey]['chat'].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            user_id: user.settings?.['user_id'],
                            c_type: chatType,
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                        // let user_key = `R${user_id}S${sender}`;
                        let user_key = `U${sender ?? user_id}`;
                        if(chatWith){
                            if(!chatWith[user_key]){
                                chatWith[user_key] = {
                                    idType: user_key,
                                    name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                    image: image,
                                    unreadCount: team_array[teamKey]['unreadCount'],
                                    unreadIds: team_array[teamKey]['unreadIds']
                                };
                            }
                            else{
                                chatWith[user_key]['unreadCount'] = team_array[teamKey]['unreadIds'];
                                chatWith[user_key]['unreadIds'] = team_array[teamKey]['unreadIds'];
                            }
                        }
                        if (!user_array[user_key]) {
                            user_array[user_key] = Object.create(null);
                        }
                        if (user_array[user_key]) {
                            if(!user_array[user_key]['chat'] || user_array[user_key]['chat'].length == 0){
                                user_array[user_key]['chat'] = [];
                                user_array[user_key]['unreadCount'] = 0;
                                user_array[user_key]['unreadIds'] = '';
                            }
                            // user_array[user_key]['chat'].push({
                            //     chat_id : chat.id,
                            //     image : image,
                            //     name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            //     sender_id: chat?.['sender']?.['id'],
                            //     date: msg_date,
                            //     record_date,
                            //     reactions: reactions,
                            //     text: chat['text']
                            // });
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
                else if(org_array != null){
                    if(sender == user_id){
                        send_to = chat['user_id'];
                        if (org_array) {
                            if(!org_array['chat'] || org_array['chat'].length == 0){
                                org_array['chat'] = [];
                                org_array['unreadCount'] = 0;
                                org_array['unreadIds'] = '';
                            }
                            let count = await this.read_by(read_by, user_id, 1);
                            if(count){
                                org_array['unreadIds'] += org_array['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                            }
                            org_array['unreadCount'] += count;
                            org_array['chat'].push({
                                chat_id : chat.id,
                                image : image,
                                name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                sender_id: chat?.['sender']?.['id'],
                                user_id: user.settings?.['user_id'],
                                c_type: chatType,
                                user: 1,
                                date: msg_date,
                                record_date,
                                reactions: reactions,
                                text: chat['text']
                            });
                        }
                    }
                    else{
                        if(!org_array['chat'] || org_array['chat'].length == 0){
                            org_array['chat'] = [];
                            org_array['unreadCount'] = 0;
                            org_array['unreadIds'] = '';
                        }
                        let count = await this.read_by(read_by, user_id, 1);
                        if(count){
                            org_array['unreadIds'] += org_array['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                        }
                        org_array['unreadCount'] += count;
                        org_array['chat'].push({
                            chat_id : chat.id,
                            image : image,
                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                            sender_id: chat?.['sender']?.['id'],
                            user_id: user.settings?.['user_id'],
                            c_type: chatType,
                            date: msg_date,
                            record_date,
                            reactions: reactions,
                            text: chat['text']
                        });
                        if (settings['chat_with_users'] && settings['chat_with_users'] == '1') {
                            // let user_key = `R${user_id}S${sender}`
                            let user_key = `U${sender ?? user_id}`
                            if (!user_array[user_key]) {
                                user_array[user_key] = Object.create(null);
                            }
                            if (user_array[user_key]) {
                                if(!user_array[user_key]['chat'] || user_array[user_key]['chat'].length == 0){
                                    user_array[user_key]['chat'] = [];
                                    user_array[user_key]['unreadCount'] = 0;
                                    user_array[user_key]['unreadIds'] = '';
                                }
                                let count = await this.read_by(read_by, user_id, 1);
                                if(count){
                                    user_array[user_key]['unreadIds'] += user_array[user_key]['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                                }
                                user_array[user_key]['unreadCount'] += count;
                                if(!user_array[user_key]['info'] || user_array[user_key]['info'].length == 0){
                                    user_array[user_key]['info'] = [];
                                }
                                // user_array[user_key]['chat'].push({
                                //     chat_id : chat.id,
                                //     image : image,
                                //     name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                //     sender_id: chat?.['sender']?.['id'],
                                //     date: msg_date,
                                //     record_date,
                                //     reactions: reactions,
                                //     text: chat['text'],
                                // });
                                if(chatWith){
                                    if(!chatWith[user_key]){
                                        chatWith[user_key] = {
                                            idType: user_key,
                                            name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                            image: image,
                                            unreadCount: user_array[user_key]['unreadCount'],
                                            unreadIds: user_array[user_key]['unreadIds']
                                        };
                                    }
                                    else{
                                        chatWith[user_key]['unreadCount'] = user_array[user_key]['unreadCount'];
                                        chatWith[user_key]['unreadIds'] = user_array[user_key]['unreadIds'];
                                    }
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
                else{
                    if(sender == user_id){
                        if (chat['user'] && chat?.['user']?.['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: chat?.['user']?.['profile_image']}))) {
                            image = S3_URL + chat?.['user']?.['profile_image'];
                        } else {
                            image = S3_URL + 'comn/img/avatar_0001.png';
                        }
                        send_to = chat['user_id'];
                        // let user_key = `R${user_id}S${send_to}`
                        let user_key = `U${send_to}`
                        if (!user_array[user_key]) {
                            user_array[user_key] = Object.create(null);
                        }
                        if (user_array[user_key]) {
                            if(!user_array[user_key]['chat'] || user_array[user_key]['chat'].length == 0){
                                user_array[user_key]['chat'] = [];
                                user_array[user_key]['unreadCount'] = 0;
                                user_array[user_key]['unreadIds'] = '';
                            }
                            let count = await this.read_by(read_by, user_id, 1);
                            if(count){
                                user_array[user_key]['unreadIds'] += user_array[user_key]['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                            }
                            user_array[user_key]['unreadCount'] += count;
                            user_array[user_key]['chat'].push({
                                chat_id : chat.id,
                                image : image,
                                name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                sender_id: chat?.['sender']?.['id'],
                                // user_id: user.settings?.['user_id'],
                                user_id: chat?.['user']?.['id'],
                                c_type: chatType,
                                user: 1,
                                date: msg_date,
                                record_date,
                                reactions: reactions,
                                text: chat['text']
                            });
                            if(chatWith){
                                if(!chatWith[user_key]){
                                    chatWith[user_key] = {
                                        idType: user_key,
                                        name: `${chat?.['user']?.['first_name']} ${chat?.['user']?.['last_name']}`,
                                        image: image,
                                        unreadCount: user_array[user_key]['unreadCount'],
                                        unreadIds: user_array[user_key]['unreadIds']
                                    };
                                }
                                else{
                                    chatWith[user_key]['unreadCount'] = user_array[user_key]['unreadCount'];
                                    chatWith[user_key]['unreadIds'] = user_array[user_key]['unreadIds'];
                                }
                            }
                        }
                    }
                    else{
                        // let user_key = `R${user_id}S${sender}`
                        let user_key = `U${sender ?? user_id}`
                        if (!user_array[user_key]) {
                            user_array[user_key] = Object.create(null);
                        }
                        if (user_array[user_key]) {
                            if(!user_array[user_key]['chat'] || user_array[user_key]['chat'].length == 0){
                                user_array[user_key]['chat'] = [];
                                user_array[user_key]['unreadCount'] = 0;
                                user_array[user_key]['unreadIds'] = '';
                            }
                            if(!user_array[user_key]['info'] || user_array[user_key]['info'].length == 0){
                                user_array[user_key]['info'] = [];
                            }
                            let count = await this.read_by(read_by, user_id, 1);
                            if(count){
                                user_array[user_key]['unreadIds'] += user_array[user_key]['unreadIds'] == '' ? chat.id?.toString() : ',' + chat.id?.toString();
                            }
                            user_array[user_key]['unreadCount'] += count;
                            user_array[user_key]['chat'].push({
                                chat_id : chat.id,
                                image : image,
                                name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                sender_id: chat?.['sender']?.['id'],
                                // user_id: user.settings?.['user_id'],
                                user_id: chat?.['user']?.['id'],
                                c_type: chatType,
                                date: msg_date,
                                record_date,
                                reactions: reactions,
                                text: chat['text'],
                            });
                            if(chatWith){
                                if(!chatWith[user_key]){
                                    chatWith[user_key] = {
                                        idType: user_key,
                                        name: `${chat?.['sender']?.['first_name']} ${chat?.['sender']?.['last_name']}`,
                                        image: image,
                                        unreadCount: user_array[user_key]['unreadCount'],
                                        unreadIds: user_array[user_key]['unreadIds']
                                    };
                                }
                                else{
                                    chatWith[user_key]['unreadCount'] = user_array[user_key]['unreadCount'];
                                    chatWith[user_key]['unreadIds'] = user_array[user_key]['unreadIds'];
                                }
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
                
                if(default_read){
                    read_by = await this.read_by(read_by, user_id);
                    await this.chatService.update({id: chat['id']},{read_by});
                }
            }
            return {chatWith, user_array, dept_array, loc_array, team_array, org_array};
        }catch(error){
            throw new Error(error.message);
        }
    }
    async read_by(read_by, user_id, return_type = 0){
        let count = 0;
        if (read_by != "") {
            if(read_by.split(',').includes(user_id.toString()) == false){
                read_by += `,${user_id}`; 
                count++;
            }
        } else {
            count++;
            read_by = user_id.toString();
        }
        return return_type ? count : read_by;
    }
}
