import { appConstant, BaseService, CommonArrayService, CommonDateService, MoveMoreParksEntity } from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class MoveMoreParksService extends BaseService<MoveMoreParksEntity> {
    constructor(
        @InjectRepository(MoveMoreParksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMoveMoreParksRepository: Repository<MoveMoreParksEntity>,
        @InjectRepository(MoveMoreParksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMoveMoreParksRepository: Repository<MoveMoreParksEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {
         super(
            readReplicaMoveMoreParksRepository,
            writeReplicaMoveMoreParksRepository,
            'teamMember',
            commonArrayService,
        );
    }

    async GetParkSteps(user_id:any = null, datewise_steps:any = [], start_date:any = null, end_date:any = null, is_set_weekend:any = null, totaldays:any = null, schedule_join_date:any = null, ucurrentdate:any = null){
        try{
            let total_steps = 0;
            let scheduleDate = moment.utc(start_date).subtract(1, 'days').format('YYYY-MM-DD');
            let join_date = await this.commonDateService.DateTimeFormat(schedule_join_date, 'YYYY-MM-DD');
            let today_date = await this.commonDateService.DateTimeFormat(ucurrentdate, 'YYYY-MM-DD');
            if(Object.keys(datewise_steps).length > 0 && datewise_steps.hasOwnProperty(user_id)){
                for(let i = 1; i <=  totaldays;  i++){
                    let current_date = moment.utc(scheduleDate).add(i, 'days').format('YYYY-MM-DD');
                    let currnetDateTimeStemp = await this.commonDateService.DateTimeFormat(current_date, 'timestamp','YYYY-MM-DD');
                    let endDateTimestamp = await this.commonDateService.DateTimeFormat(end_date, 'timestamp','YYYY-MM-DD');
                    let todayDateTimeStamp = await this.commonDateService.DateTimeFormat(today_date, 'timestamp');
                    if(currnetDateTimeStemp <= endDateTimestamp && currnetDateTimeStemp <= todayDateTimeStamp){
                        if ((is_set_weekend == 1 && moment(current_date).isoWeekday() != 6 && moment(current_date).isoWeekday() != 7) || is_set_weekend == 0) { 
                            if(datewise_steps.hasOwnProperty(user_id) && datewise_steps[user_id][current_date]){
                                total_steps += datewise_steps?.[user_id]?.[current_date] ?? 0; 
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
    async GetAllParks(schedule: any, condition:any = null){
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
                    let parkLabel = parks['park_name'];
                    allParks[i]['name'] = parkLabel;
                    allParks[i]['miles'] = parseFloat((parks['steps'] * 0.0004734848484848485).toFixed(1));
                    Rsteps += parks['steps'];
                    allParks[i]['Rsteps'] = Rsteps;
                    let infoButton =  schedule['info_button'];
                    if(infoButton == '') { 
                        infoButton = `Info`;
                    }
                    allParks[i]['info_button'] = infoButton; 
                    allParks[i]['info'] = (parks['info']) ? parks['info'] : "#";   
                    let websiteButton =  schedule['website_button'];
                    if(websiteButton == '') { 
                        websiteButton = `Website`;
                    }
                    allParks[i]['website_button'] = websiteButton; 
                    allParks[i]['website'] = (parks['website']) ? parks['website'] : "#"; 
                    let mapButton = schedule['map_button'];
                    if(mapButton == '') { 
                        mapButton = `Map`;
                    }
                    allParks[i]['map_button'] = mapButton; 
                    allParks[i]['map'] = (parks['map']) ? parks['map'] : "#"; 
                    let imageButton = schedule['image_button'];
                    if(imageButton == '') { 
                        imageButton = `Images`;
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
