import { CommonDateService, CommonHealthService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { UrlManageService } from 'src/modules/common';
import { InterlinksService } from "src/modules/company/interlinks/interlinks.service";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from "src/modules/translation/translation.service";
import { BingoWeekLabelsService } from "../../bingoweeklabels/bingoweeklabels.service";
import { CardsService } from "../../cards/cards.service";
import { SquareUsersService } from "../../squareusers/squareusers.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class BingoChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly cardsService: CardsService,
        private readonly bingoWeekLabelsService: BingoWeekLabelsService,
        private readonly squareUsersService: SquareUsersService,
        private readonly interlinksService: InterlinksService,
        private readonly activityLogService: ActivityLogService,
        private readonly urlManageService: UrlManageService,

    ) {}

    async bingoWeekChallenge(schedule: any, req: Request, show_type = 1) {
        try {         
            let result = {};
            let user = req.tokenUser;
            let square_complete_limit = schedule['sc']['square_complete_limit'];
            const diffInDays = this.commonDateService.getTodayDate(schedule.sc.end_date).diff(this.commonDateService.getTodayDate(schedule.sc.start_date), 'days');
            const diffweek = Math.ceil((diffInDays + 1) / 7);
            let weekstartdate = this.commonDateService.getTodayDate(schedule.sc.start_date);
            let current_datetime = moment.tz(this.commonDateService.getTodayDate(), user['timeZone']).format('YYYY-MM-DD HH:mm:ss');
            const weeksArray = [];
            const completedCard = [];
            let cards = await this.cardsService.listRecord({org_id: schedule['sc']['org_id'], schedule_id: schedule['sc']['id'], status: 1},{ order_no: 'ASC'});
            let squareusers: any = await this.squareUsersService.listRecord({user_id: user.id, schedule_id: schedule['sc']['id'], verified_status: 1, status: 1},null,'squareuser.square_id');
            let allsquare: any = await this.squareUsersService.listRecord({user_id: user.id, schedule_id: schedule['sc']['id'], status: 1});
            let internalLinkData: any = await this.interlinksService.listRecord({status: 1},{ 'id': 'ASC'}, ['id','linktitle','plugin','controller','action','newlink']);
            allsquare = allsquare.map(v => {
                if (v && v['user']) {
                    v['user']['name'] = v['user']['first_name'] + ' ' + v['user']['last_name']; 
                    if(v['user']['profile_image'] && v['user']['profile_image']?.includes('profileimages')){
                        v['user']['profile_image'] = S3_URL + v['user']['profile_image'];
                    }
                    else{
                        v['user']['profile_image'] = '';
                    }
                }
                if (v && v['verified_user']) {
                    v['verified_user']['name'] = v['verified_user']['first_name'] + ' ' + v['verified_user']['last_name']; 
                    if(v['verified_user']['profile_image'] && v['verified_user']['profile_image']?.includes('profileimages')){
                        v['verified_user']['profile_image'] = S3_URL + v['verified_user']['profile_image'];
                    }
                    else{
                        v['verified_user']['profile_image'] = '';
                    }
                }
                
                return v;
            });
            await Promise.all(cards?.map(async ele =>{
                if(ele['square'] && ele['square'].length){
                    for (let squareData of ele['square']){
                        if(squareData['logo'] && squareData['logo']?.includes('square')){
                            squareData['logo'] = S3_URL + squareData['logo'];
                        }
                        if(squareData.name){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`square_name_${squareData.schedule_id}_${squareData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${squareData.org_id}/${squareData.schedule_id}`,`dynamic`);
                            squareData.name = (customName == '' || customName == `square_name_${squareData.schedule_id}_${squareData['id']}`) ? squareData['name'] : customName;
                        }
                        if(squareData.description){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`square_description_${squareData.schedule_id}_${squareData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${squareData.org_id}/${squareData.schedule_id}`,`dynamic`);
                            squareData.description = (customName == '' || customName == `square_description_${squareData.schedule_id}_${squareData['id']}`) ? squareData['description'] : customName;
                        }
                    }
                }
            }));
            result['allsquareuser']= JSON.parse(JSON.stringify(allsquare));
            allsquare = allsquare.reduce((acc, item) => {
                const id = item.id;
                const cardId = item.card_id;
                if(!acc[cardId]){
                    acc[cardId] = Object.create(null);
                }
                acc[cardId][id] = item;
                return acc;
            }, {});
            squareusers = squareusers.reduce((acc, item) => {
            const squareId = item.square_id;
            const cardId = item.card_id;
            if(!acc[cardId]){
                acc[cardId] = Object.create(null);
            }
            acc[cardId][squareId] = item;
            return acc;
        }, {});
        
        result['yardfrequency'] = schedule['sc']['yardfrequency'];
        let yardfrequency = schedule['sc']['yardfrequency'];
        let yard = schedule['sc']['yard'];
        const cardsremove = structuredClone(cards);
        for (let i = 0; i < diffweek; i++) {
            let tempweekdata = {
                name : 'Week ' + (i+1),
                status: 0,
                id: i + 1,
                start_date: weekstartdate.format('YYYY-MM-DD')
                };
            
            let weekenddate = weekstartdate.clone().add(6, 'days');
            tempweekdata['end_date'] = weekstartdate.clone().add(6, 'days').format('YYYY-MM-DD');
            if (weekenddate.isAfter(this.commonDateService.getTodayDate(schedule['sc']['end_date']))) { 
                weekenddate = this.commonDateService.getTodayDate(schedule['sc']['end_date']);
                tempweekdata['end_date'] = this.commonDateService.getTodayDate(schedule['sc']['end_date']).format('YYYY-MM-DD');
            }
            
            const today = moment().format('YYYY-MM-DD');
            
            if (moment(today).isBetween(moment(weekstartdate), moment(weekenddate), null, '[]')) {
                tempweekdata.status = 1;
            } else if (moment(today).isSameOrAfter(moment(weekstartdate))) {
                tempweekdata.status = 2;
            }
            weekstartdate = moment(weekenddate).add(1, 'days');
            
            if ((i + 1) === diffweek) {
                for(let cardsremovedata of cardsremove) {
                if (cardsremovedata && allsquare[cardsremovedata.id]) {
                    cardsremovedata['allsquares'] = Object.values(allsquare[cardsremovedata.id]);
                    if (squareusers[cardsremovedata.id]) {
                        cardsremovedata['squareusers'] = Object.values(squareusers[cardsremovedata.id]);
                        if (cardsremovedata['squareusers'].length >= square_complete_limit) {
                        cardsremovedata.status = 2;
                        }
                    }
                }
                if (!tempweekdata['carddata']) {
                    tempweekdata['carddata'] = [];
                }
                tempweekdata['carddata'].push(cardsremovedata);
                if (cardsremovedata.status === 2) {
                    completedCard.push(cardsremovedata);
                }
                };
            } else {
                if (cards[i]) {
                if (allsquare[cards[i].id]) {
                    cards[i]['allsquares'] = Object.values(allsquare[cards[i].id]);
                    if (squareusers[cards[i].id]) {
                        cards[i]['squareusers'] = Object.values(squareusers[cards[i].id]);
                        if (cards[i]['squareusers'].length >= square_complete_limit) {
                            cards[i].status = 2;
                        }
                    }
                }
                if (!tempweekdata['carddata']) {
                    tempweekdata['carddata'] = [];
                }
                tempweekdata['carddata'].push(cards[i]);
                if (cards[i].status === 2) {
                    completedCard.push(cards[i]);
                }
                cardsremove.splice(0, 1);
                }
            }
            
            weeksArray.push(tempweekdata);
        }
        if (this.commonDateService.getTodayDate(current_datetime).isBefore(schedule['sc']['start_date'])) {
            weeksArray[0].pre = 1;
        }

        /* Last Week Grase Day */
            const lastWeekIndex = weeksArray.length - 1;
            const lastWeekItem = weeksArray[lastWeekIndex];
            const prevWeekItem = weeksArray[lastWeekIndex - 1];
            const start = await this.commonDateService.DateTimeFormat(lastWeekItem.start_date);
            const end = await this.commonDateService.DateTimeFormat(lastWeekItem.end_date);
            const days = end.diff(start, 'days') + 1;
            let removeDay = 0;
            if (schedule['sc']['last_week_grows_day'] !== '' && schedule['sc']['last_week_grows_day'] !== 0 && days <= Number(schedule['sc']['last_week_grows_day'])) {
                removeDay = Number(schedule['sc']['last_week_grows_day']);
            }
            if (removeDay > 0) {
                    const prevEndDate = await this.commonDateService.DateTimeFormat(prevWeekItem.end_date);
                    const newEndDate = prevEndDate.add(days, 'days').format('YYYY-MM-DD');
                    weeksArray[lastWeekIndex - 1].end_date = newEndDate;
                    if (lastWeekItem.carddata && lastWeekItem.carddata.length > 0) {
                        weeksArray[lastWeekIndex - 1].carddata = [
                        ...(weeksArray[lastWeekIndex - 1].carddata || []),
                        ...lastWeekItem.carddata,
                    ];
                }
                weeksArray.splice(lastWeekIndex, 1);
            }
        /* Last Week Grase Day */

        for (const cards of weeksArray) {
            if(cards.carddata){
                for (const squares of cards.carddata) {
                    if(squares?.square.length){
                        for (let square of squares.square) {
                            if(square.name){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`square_name_${square.schedule_id}_${square['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${square.org_id}/${square.schedule_id}`,`dynamic`);
                                square.name = (customName == '' || customName == `square_name_${square.schedule_id}_${square['id']}`) ? square['name'] : customName;
                            }
                            if(square.description){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`square_description_${square.schedule_id}_${square['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${square.org_id}/${square.schedule_id}`,`dynamic`);
                                square.description = (customName == '' || customName == `square_description_${square.schedule_id}_${square['id']}`) ? square['description'] : customName;
                            }
                            if (squareusers[square['card_id']] && squareusers[square['card_id']][square['id']]) {
                                square['square_status'] = 2;
                                square['copletedDate'] = await this.commonDateService.DateTimeFormat(squareusers[square['card_id']][square['id']]['created_date'], 'YYYY-MM-DD HH:mm:ss');
                                square['copletedDateTS'] = await this.commonDateService.DateTimeFormat(squareusers[square['card_id']][square['id']]['created_date'], 'timestamp');
                            }else {
                                if (allsquare[square['card_id']] && Object.values(allsquare[square['card_id']]).find(ele=> ele['square_id'] == square['id'])) {
                                    square['square_status'] = 1;
                                    square['VerificationUsers'] = Object.values(allsquare[square['card_id']]);
                                } else {
                                    square['square_status'] = 0;
                                }
                            }
                            if (square['link_id'] && square['link_id'] != '' && square['link_type'] && square['link_type'] == 1) {
                                square['link'] = 'https://' + process.env.DOMAIN;
                                let path = await this.commonDateService.manageAllURL('g_internal_link', { 'inLinkId': square['link_id']}, internalLinkData);
                                square['link'] = 'https://' + process.env.DOMAIN + '/' + path;
                            }
                            if(square['link'] && square['link'] != ''){
                                let newLinkPath = await this.urlManageService.onmapUrl(square['link']);
                                square['link'] = decodeURIComponent(newLinkPath);
                            }
                        }
                    }
                }
            }
        }
        let weeklabels: any = await this.bingoWeekLabelsService.listRecord({schedule_id: schedule['sc']['id'], status: 1})
        await Promise.all(weeklabels.map(async (ele) => {
            if(ele.week_custom_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`bingoweek_labels_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele['scheduleChallenge'].org_id}/${ele.schedule_id}`,`dynamic`);
                ele.week_custom_name = (customName == '' || customName == `bingoweek_labels_${ele.schedule_id}_${ele['id']}`) ? ele['week_custom_name'] : customName;
            }
        }));
        weeklabels = weeklabels.reduce((acc, item) => {
            const { week_no, week_custom_name } = item;
            acc[week_no] = week_custom_name;
            return acc;
        }, {});
            for(let week of weeksArray){
                week['name'] = weeklabels[week.id] || week['name'];
                if(week.start_date && week.end_date){
                    week.date = `${week['name']}: ` +this.commonDateService.getTodayDate(week.start_date).format('MM/DD') + '-' + this.commonDateService.getTodayDate(week.end_date).format('MM/DD');
                }
                if(week.carddata && week.carddata.length){
                    for(let card of week.carddata){
                        if(card.name){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`card_name_${card.schedule_id}_${card['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${card.org_id}/${card.schedule_id}`,`dynamic`);
                            card.name = (customName == '' || customName == `card_name_${card.schedule_id}_${card['id']}`) ? card['name'] : customName;
                        }
                        if(card.description){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`card_description_${card.schedule_id}_${card['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${card.org_id}/${card.schedule_id}`,`dynamic`);
                            card.description = (customName == '' || customName == `card_description_${card.schedule_id}_${card['id']}`) ? card['description'] : customName;
                        }
                        if(card.square){
                            card.square = card?.square?.sort((a, b) => a['order_no'] - b['order_no']);
                        }

                        if(show_type == 2){
                            const completed = card?.square.filter(item => parseFloat(item.square_status) === 2);
                            const notCompleted = card?.square.filter(item => parseFloat(item.square_status) === 0 || parseFloat(item.square_status) === 1);
                            const sortedCompleted = completed.sort((a, b) => a.copletedDateTS - b.copletedDateTS);
                            let results: any[] = [];
                            if (notCompleted.length >= 10) {
                                results = [...notCompleted.slice(0, 10)];
                            }else if (notCompleted.length === 9) {
                                const lastCompleted = sortedCompleted.slice(-1); // last 1
                                results = [...notCompleted, ...lastCompleted];
                            }else if (notCompleted.length === 8) {
                                const lastCompleted = sortedCompleted.slice(-2); // last 1
                                results = [...notCompleted, ...lastCompleted];
                            }else if (notCompleted.length === 7) {
                                const lastCompleted = sortedCompleted.slice(-3); // last 1
                                results = [...notCompleted, ...lastCompleted];
                            } else if (notCompleted.length === 6) {
                                const lastTwoCompleted = sortedCompleted.slice(-4);
                                results = [...notCompleted, ...lastTwoCompleted];
                            }  else if (notCompleted.length === 5) {
                                const lastTwoCompleted = sortedCompleted.slice(-5);
                                results = [...notCompleted, ...lastTwoCompleted];
                            }  else if (notCompleted.length === 4) {
                                const lastTwoCompleted = sortedCompleted.slice(-6);
                                results = [...notCompleted, ...lastTwoCompleted];
                            }  else if (notCompleted.length === 3) {
                                const lastTwoCompleted = sortedCompleted.slice(-7);
                                results = [...notCompleted, ...lastTwoCompleted];
                            }  else if (notCompleted.length === 2) {
                                const lastTwoCompleted = sortedCompleted.slice(-8);
                                results = [...notCompleted, ...lastTwoCompleted];
                            }  else if (notCompleted.length === 1) {
                                const lastTwoCompleted = sortedCompleted.slice(-9);
                                results = [...notCompleted, ...lastTwoCompleted];
                            } else {
                                results = [...sortedCompleted.slice(-10)];
                            }
                            
                            const sortedById = results.sort((a, b) => a.order_no - b.order_no);
                            card.square = results;
                        }
                    }
                }
            }
            for(let card of completedCard){
                if(card.name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`card_name_${card.schedule_id}_${card['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${card.org_id}/${card.schedule_id}`,`dynamic`);
                    card.name = (customName == '' || customName == `card_name_${card.schedule_id}_${card['id']}`) ? card['name'] : customName;
                }
                if(card.description){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`card_description_${card.schedule_id}_${card['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${card.org_id}/${card.schedule_id}`,`dynamic`);
                    card.description = (customName == '' || customName == `card_description_${card.schedule_id}_${card['id']}`) ? card['description'] : customName;
                }
                if(card.square){
                    card.square = card?.square?.sort((a, b) => a['order_no'] - b['order_no']);
                }
            }
            result['weeklabels']= weeklabels;
            result['weekinfo']= weeksArray;
            result['completedcard'] = completedCard;
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async bingoChallenge(schedule: any, req: Request, show_type = 1) {
        try {         
            let result = {};
            let user = req.tokenUser;
            let card_week_relation = schedule['sc']['card_week_relation'];
            let totaldays = schedule['challengeDetails']['totaldays'];
            let currentweek='week_0'; 
            let weeks = 0;
            let weekstatus = 0;
            let weeksarray = [];
            const compCurrentDate = moment.tz(this.commonDateService.getTodayDate(), user['timeZone']).format('YYYY-MM-DD HH:mm:ss');
            const checkEndDate = this.commonDateService.getTodayDate(schedule.sc.end_date).format('YYYY-MM-DD');
            
            let weeklabels: any = await this.bingoWeekLabelsService.listRecord({schedule_id: schedule['sc']['id'], status: 1})
            await Promise.all(weeklabels.map(async (ele) => {
                if(ele.week_custom_name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`bingoweek_labels_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele['scheduleChallenge'].org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.week_custom_name = (customName == '' || customName == `bingoweek_labels_${ele.schedule_id}_${ele['id']}`) ? ele['week_custom_name'] : customName;
                }
            }));
            weeklabels = weeklabels.reduce((result, item) => {
                const weekNo = item.week_no;
                const weekCustomName = item.week_custom_name;
                result[weekNo] = weekCustomName;
                return result;
            }, {});

            
            const yardfrequency = schedule['sc']['yardfrequency'].trim();
            const yard = schedule['sc']['yard'];
            let internalLinkData: any = await this.interlinksService.listRecord({status: 1},{ 'id': 'ASC'}, ['id','linktitle','plugin','controller','action','newlink']);
            result['yardfrequency'] = yardfrequency;
            result['yard'] = yard;
            for (let i = 1; i < totaldays; i++) {
                if (i === 1 || (i % 7 === 0)) {
                    weeks++;
                    const weekKey = 'Week ' + weeks;
                    if (i === 1) {
                        weeksarray[weekKey] = {
                            start_date: moment(schedule.sc.start_date).format('YYYY-MM-DD')
                        };
                    } else {
                        const previousWeekEndDate = moment(weeksarray['Week ' + (weeks - 1)].end_date);
                        weeksarray[weekKey] = {
                            start_date: previousWeekEndDate.add(1, 'days').format('YYYY-MM-DD')
                        };
                    }
                    weeksarray[weekKey].id = weeks;
                    weeksarray[weekKey].name = weekKey;
                    weeksarray[weekKey].end_date = moment(weeksarray[weekKey].start_date).day('Saturday').format('YYYY-MM-DD');
                
                    if (moment(checkEndDate).isBetween(weeksarray[weekKey].start_date, weeksarray[weekKey].end_date, null, '[]')) {
                        weeksarray[weekKey].end_date = checkEndDate;
                    }
                    weeksarray[weekKey].weekstatus = weekstatus;

                    if(weeklabels[weeks]){
                        weeksarray[weekKey].name = weeklabels[weeks];
                    }
                    if (moment(compCurrentDate).isBetween(weeksarray[weekKey].start_date, weeksarray[weekKey].end_date, null, '[]')) {
                        currentweek = 'week_' + weeks;
                        weekstatus = 1;
                        weeksarray[weekKey].weekstatus = weekstatus;
                    }
                }
            }
            
            let square_complete_limit = schedule['sc']['square_complete_limit'];
            result['currentweek']=currentweek;
            result['weekinfo']= Object.values(weeksarray);
            result['weekinfo']= result['weekinfo'].sort((a, b) => a['id'] - b['id']);

            let cards = await this.cardsService.listRecord({org_id: schedule['sc']['org_id'], schedule_id: schedule['sc']['id'], status: 1},{ order_no: 'ASC'});
            const completedCard = [];
            const currentCard = [];
            let allSquare = [];
            let tempSquare = [];
            let cardCategory = 0;
            let index = 0;
            await Promise.all(cards?.map(async ele =>{
                if(ele.name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`card_name_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.name = (customName == '' || customName == `card_name_${ele.schedule_id}_${ele['id']}`) ? ele['name'] : customName;
                }
                if(ele.description){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`card_description_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.description = (customName == '' || customName == `card_description_${ele.schedule_id}_${ele['id']}`) ? ele['description'] : customName;
                }
                if(ele['square'] && ele['square'].length){
                    for (let squareData of ele['square']){
                        if(squareData.name){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`square_name_${squareData.schedule_id}_${squareData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${squareData.org_id}/${squareData.schedule_id}`,`dynamic`);
                            squareData.name = (customName == '' || customName == `square_name_${squareData.schedule_id}_${squareData['id']}`) ? squareData['name'] : customName;
                        }
                        if(squareData.description){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`square_description_${squareData.schedule_id}_${squareData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${squareData.org_id}/${squareData.schedule_id}`,`dynamic`);
                            squareData.description = (customName == '' || customName == `square_description_${squareData.schedule_id}_${squareData['id']}`) ? squareData['description'] : customName;
                        }
                        if(squareData['logo'] && squareData['logo']?.includes('square')){
                            squareData['logo'] = S3_URL + squareData['logo'];
                        }
                        if (squareData['link_id'] && squareData['link_id'] != '' && squareData['link_type'] && squareData['link_type'] == 1) {
                            squareData['link'] = 'https://' + process.env.DOMAIN;
                            let path = await this.commonDateService.manageAllURL('g_internal_link', { 'inLinkId': squareData['link_id'] }, internalLinkData);
                            squareData['link'] = 'https://' + process.env.DOMAIN + '/' + path;
                        }
                        if (squareData['link'] && squareData['link'] != '') {
                            let newLinkPath = await this.urlManageService.onmapUrl(squareData['link']);
                            squareData['link'] = decodeURIComponent(newLinkPath);
                        }
                    }
                }
            }));
            for (const card of cards) {
                let squareUsers: any = await this.squareUsersService.listRecord({user_id: user.id, card_id: card['id'],schedule_id: schedule['sc']['id'], verified_status: 1},null,'squareuser.square_id');
                tempSquare = await this.squareUsersService.listRecord({user_id: user.id, card_id: card['id'],schedule_id: schedule['sc']['id'], status: 1},null);
                
                squareUsers = squareUsers.map(v => {
                    v.user.name = v.user.first_name + ' ' + v.user.last_name;
                    if(v['user']['profile_image'] && v['user']['profile_image']?.includes('profileimages')){
                    v['user']['profile_image'] = S3_URL + v['user']['profile_image'];
                    }
                    else{
                        v['user']['profile_image'] = '';
                    }
                    delete v.user.first_name;
                    delete v.user.last_name;
                    v.verified_user.name = v.verified_user.first_name + ' ' + v.verified_user.last_name;
                    if(v['verified_user']['profile_image'] && v['verified_user']['profile_image']?.includes('profileimages')){
                    v['verified_user']['profile_image'] = S3_URL + v['verified_user']['profile_image'];
                    }
                    else{
                        v['verified_user']['profile_image'] = '';
                    }
                    delete v.verified_user.first_name;
                    delete v.verified_user.last_name;
                    return v;
                });
                tempSquare = tempSquare.map(v => {
                    v.user.name = v.user.first_name + ' ' + v.user.last_name;
                    if(v['user']['profile_image'] && v['user']['profile_image']?.includes('profileimages')){
                        v['user']['profile_image'] = S3_URL + v['user']['profile_image'];
                    }else{
                        v['user']['profile_image'] = '';
                    }
                    delete v.user.first_name;
                    delete v.user.last_name;
                    v.verified_user.name = v.verified_user.first_name + ' ' + v.verified_user.last_name;
                    if(v['verified_user']['profile_image'] && v['verified_user']['profile_image']?.includes('profileimages')){
                        v['verified_user']['profile_image'] = S3_URL + v['verified_user']['profile_image'];
                    }else{
                        v['verified_user']['profile_image'] = '';
                    }
                    delete v.verified_user.first_name;
                    delete v.verified_user.last_name;
                    return v;
                });
                
                allSquare = [...allSquare,...tempSquare];
                
                if ((square_complete_limit !== 0 && squareUsers.length >= square_complete_limit) || (square_complete_limit === 0 && squareUsers.length >= card['square'].length)) {
                    cards[index].status = 2;
                    completedCard.push(card);
                }
                
                if ((card_week_relation === 0 && (!cards[index].status || cards[index].status == 1) && cardCategory === 0) || 
                    (card_week_relation === 1)) {
                    cards[index].status = cardCategory = 1;
                
                    const squareUsersMap = squareUsers.reduce((acc, user) => {
                    acc[user.square_id] = user;
                    return acc;
                    }, {});
                    
                    const allSquaresMap = tempSquare.reduce((acc, user) => {
                        acc[user.id] = user;
                        return acc;
                    }, {});
                
                    for (const [skey, square] of Object.entries(card['square'])) {
                        if (squareUsersMap[square['id']]) {
                            cards[index]['square'][skey].square_status = 2;
                        } else {
                            if (allSquaresMap && Object.values(allSquaresMap).find(ele => ele['square_id'] == square['id'])) {
                                cards[index]['square'][skey].square_status = 1;
                                cards[index]['square'][skey].VerificationUsers = allSquaresMap[square['id']];
                            } else {
                                cards[index]['square'][skey].square_status = 0;
                            }
                        }
                    }
                
                    if(show_type == 2){
                        const completed = cards[index]?.['square'].filter(item => parseFloat(item.square_status) === 2);
                        const notCompleted = cards[index]?.['square'].filter(item => parseFloat(item.square_status) === 0 || parseFloat(item.square_status) === 1);
                
                        let results: any[] = [];
                        if (notCompleted.length >= 10) {
                            results = [...notCompleted.slice(0, 10)];
                        }else if (notCompleted.length === 9) {
                            const lastCompleted = completed.slice(-1); // last 1
                            results = [...notCompleted, ...lastCompleted];
                        }else if (notCompleted.length === 8) {
                            const lastCompleted = completed.slice(-2); // last 1
                            results = [...notCompleted, ...lastCompleted];
                        }else if (notCompleted.length === 7) {
                            const lastCompleted = completed.slice(-3); // last 1
                            results = [...notCompleted, ...lastCompleted];
                        } else if (notCompleted.length === 6) {
                            const lastTwoCompleted = completed.slice(-4);
                            results = [...notCompleted, ...lastTwoCompleted];
                        }  else if (notCompleted.length === 5) {
                            const lastTwoCompleted = completed.slice(-5);
                            results = [...notCompleted, ...lastTwoCompleted];
                        }  else if (notCompleted.length === 4) {
                            const lastTwoCompleted = completed.slice(-6);
                            results = [...notCompleted, ...lastTwoCompleted];
                        }  else if (notCompleted.length === 3) {
                            const lastTwoCompleted = completed.slice(-7);
                            results = [...notCompleted, ...lastTwoCompleted];
                        }  else if (notCompleted.length === 2) {
                            const lastTwoCompleted = completed.slice(-8);
                            results = [...notCompleted, ...lastTwoCompleted];
                        }  else if (notCompleted.length === 1) {
                            const lastTwoCompleted = completed.slice(-9);
                            results = [...notCompleted, ...lastTwoCompleted];
                        } else {
                            results = [...completed.slice(-10)];
                        }
                        
                        const sortedById = results.sort((a, b) => a.order_no - b.order_no);
                        cards[index]['square'] = sortedById;
                    }
                    currentCard.push(cards[index]);
                } else {
                    delete cards[index];
                }
                index++;
            }
        
       
            for(let card of currentCard){
            if(card.square){
                card.square = card?.square?.sort((a, b) => a['order_no'] - b['order_no']);
            }
            }
            for(let card of completedCard){
            if(card.square){
                card.square = card?.square?.sort((a, b) => a['order_no'] - b['order_no']);
            }
            }
            result['weeklabels']= weeklabels;
            result['cards']= currentCard;
            result['completedcard']=completedCard;
            result['allsquareuser']=allSquare;
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}