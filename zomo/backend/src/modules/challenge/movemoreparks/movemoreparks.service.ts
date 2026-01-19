import { appConstant, CommonDateService, CommonFileService, MoveMoreParksEntity } from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { TranslationService } from "../../translation/translation.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class MoveMoreParksService {
    constructor(
        @InjectRepository(MoveMoreParksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMoveMoreParksRepository: Repository<MoveMoreParksEntity>,
        @InjectRepository(MoveMoreParksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMoveMoreParksRepository: Repository<MoveMoreParksEntity>,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaMoveMoreParksRepository.create(data);
        return await this.writeReplicaMoveMoreParksRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMoveMoreParksRepository.metadata);
        return await this.writeReplicaMoveMoreParksRepository.createQueryBuilder('mmp')
            .update(MoveMoreParksEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMoveMoreParksRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMoveMoreParksRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMoveMoreParksRepository.find({
            where: condition,
            order: orderBy,
        });
    }
    async GetParkSteps(user_id:any = null, datewise_steps:any = [], start_date:any = null, end_date:any = null, is_set_weekend:any = null, totaldays:any = null, schedule_join_date:any = null, ucurrentdate:any = null){
        try{
            let total_steps = 0;
            let scheduleDate = moment.utc(start_date).subtract(1, 'days').format('YYYY-MM-DD');
            let join_date = await this.commonDateService.DateTimeFormat(schedule_join_date, 'YYYY-MM-DD');
            let today_date = await this.commonDateService.DateTimeFormat(ucurrentdate, 'YYYY-MM-DD');
            if(datewise_steps.size > 0 && datewise_steps.has(user_id)){
                for(let i = 1; i <=  totaldays;  i++){
                    let current_date = moment.utc(scheduleDate).add(i, 'days').format('YYYY-MM-DD');
                    let currnetDateTimeStemp = await this.commonDateService.DateTimeFormat(current_date, 'timestamp','YYYY-MM-DD');
                    let endDateTimestamp = await this.commonDateService.DateTimeFormat(end_date, 'timestamp','YYYY-MM-DD');
                    let todayDateTimeStamp = await this.commonDateService.DateTimeFormat(today_date, 'timestamp');
                    if(currnetDateTimeStemp <= endDateTimestamp && currnetDateTimeStemp <= todayDateTimeStamp){
                        if ((is_set_weekend == 1 && moment(current_date).isoWeekday() != 6 && moment(current_date).isoWeekday() != 7) || is_set_weekend == 0) { 
                            if(datewise_steps.has(user_id) && datewise_steps.get(user_id).has(`${current_date}`)){
                                total_steps += datewise_steps.get(user_id).get(`${current_date}`); 
                            }
                        }
                    }
                }
            }
            return total_steps;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async GetAllParks(req: Request, schedule: any, condition:any = null){
        try{
            const allParks = await this.readReplicaMoveMoreParksRepository.createQueryBuilder('mmp')
            .where(condition)
            .orderBy('mmp.order_by', 'ASC')
            .getMany();
            if(allParks){
                let Rsteps = 0;
                let i = 0;
                let schedule_id = schedule['id'];
                let org_id = schedule['org_id'];
                for(let parks of allParks){
                    let park_id = parks['id'];
                    let parkLabel = await this.translatorService.frontendReadTranslation(req.lang,`movemorepark_labels_${schedule_id}_${park_id}`, `/LC_MESSAGES/Challenge/MyChallenges/${org_id}/${schedule_id}`,`dynamic`);
                    parkLabel = (parkLabel == '' || parkLabel == `movemorepark_labels_${schedule_id}_${park_id}`) ? parks['park_name'] : parkLabel;
                    allParks[i]['name'] = parkLabel;
                    allParks[i]['miles'] = parseFloat((parks['steps'] * 0.0004734848484848485).toFixed(1));
                    Rsteps += parks['steps'];
                    allParks[i]['Rsteps'] = Rsteps;
                    let infoButton = await this.translatorService.frontendReadTranslation(req.lang,`custom_info_button_${schedule_id}`, `/LC_MESSAGES/Challenge/MyChallenges/${org_id}/${schedule_id}`,`dynamic`);
                    infoButton = (infoButton == '' || infoButton == `custom_info_button_${schedule_id}`) ? schedule['info_button'] : infoButton;
                    if(infoButton == '') { 
                        infoButton = await this.translatorService.frontendReadTranslation(req.lang,`Info`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                    }
                    allParks[i]['info_button'] = infoButton; 
                    allParks[i]['info'] = (parks['info']) ? parks['info'] : "#";   
                    let websiteButton = await this.translatorService.frontendReadTranslation(req.lang,`custom_website_button_${schedule_id}`, `/LC_MESSAGES/Challenge/MyChallenges/${org_id}/${schedule_id}`,`dynamic`);
                    websiteButton = (websiteButton == '' || websiteButton == `custom_website_button_${schedule_id}`) ? schedule['website_button'] : websiteButton;
                    if(websiteButton == '') { 
                        websiteButton = await this.translatorService.frontendReadTranslation(req.lang,`Website`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                    }
                    allParks[i]['website_button'] = websiteButton; 
                    allParks[i]['website'] = (parks['website']) ? parks['website'] : "#"; 
                    let mapButton = await this.translatorService.frontendReadTranslation(req.lang,`custom_map_button_${schedule_id}`, `/LC_MESSAGES/Challenge/MyChallenges/${org_id}/${schedule_id}`,`dynamic`);
                    mapButton = (mapButton == '' || mapButton == `custom_map_button_${schedule_id}`) ? schedule['map_button'] : mapButton;
                    if(mapButton == '') { 
                        mapButton = await this.translatorService.frontendReadTranslation(req.lang,`Map`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                    }
                    allParks[i]['map_button'] = mapButton; 
                    allParks[i]['map'] = (parks['map']) ? parks['map'] : "#"; 
                    let imageButton = await this.translatorService.frontendReadTranslation(req.lang,`custom_image_button_${schedule_id}`, `/LC_MESSAGES/Challenge/MyChallenges/${org_id}/${schedule_id}`,`dynamic`);
                    imageButton = (imageButton == '' || imageButton == `custom_image_button_${schedule_id}`) ? schedule['image_button'] : imageButton;
                    if(imageButton == '') { 
                        imageButton = await this.translatorService.frontendReadTranslation(req.lang,`Images`, `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                    }
                    allParks[i]['image_button'] = imageButton; 
                    if(parks['corner'] && parks['corner'] != ''){
                        allParks[i]['corner'] = S3_URL+parks['corner'];
                    }
                    let images = parks['image'].split(',');
                    if(!allParks[i]['image_data']){
                        allParks[i]['image_data'] = [];
                    }
                    allParks[i]['normal_image'] = '';
                    for(let image of images){  
                        if(image.trim() != '' && !await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: image}))){
                            allParks[i]['image_data'] = 'NotFound.png';
                            if(allParks[i]?.['normal_image'] == ''){
                                allParks[i]['image'] = 'background-image: url('+S3_URL+'challenge/img/parks/NotFound.png);';
                                allParks[i]['normal_image'] = S3_URL+'challenge/img/parks/NotFound.png';
                            }
                        }else{
                            allParks[i]['image_data'].push(S3_URL+image);
                            if(allParks[i]?.['normal_image'] == ''){
                                allParks[i]['image'] = 'background-image: url('+S3_URL+image+');';
                                allParks[i]['normal_image'] = S3_URL+image;
                            }
                        }
                    }
                    delete(allParks[i]['org_id']);
                    delete(allParks[i]['schedule_id']);
                    delete(allParks[i]['order_by']);
                    delete(allParks[i]['park_name']);
                    delete(allParks[i]['status']);
                    delete(allParks[i]['created']);
                    delete(allParks[i]['updated']);
                    i++;
                }
            }
            return allParks;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}
