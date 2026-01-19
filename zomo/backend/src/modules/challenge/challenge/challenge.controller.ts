import { appConstant, ChallengeDto, CommonArrayService, CommonFileService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res, UploadedFiles,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import {In, Like, Not} from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateChallengeInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    PaginateWithChallengeInput,
    UpdateChallengeInput,
} from "../../../input";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { DaysService } from '../days/days.service';
import { DaysUsersService } from '../daysusers/daysusers.service';
import { FitnessActivityService } from '../fitnessactivity/fitnessactivity.service';
import { FrontService } from "../front/front.service";
import { OrgInvitesService } from '../orginvites/orginvites.service';
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { WeeksService } from '../weeks/weeks.service';
import { WeeksUsersService } from '../weeksusers/weeksusers.service';
import { ChallengeService } from './challenge.service';
const path = require('path');
@Controller('challenge/challenge')
@UseGuards(TokenGuard, RoleGuard)
export class ChallengeController {
    constructor(
        private readonly challengeService: ChallengeService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly weeksService: WeeksService,
        private readonly daysService: DaysService,
        private readonly orgInvitesService: OrgInvitesService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly fitnessActivityService: FitnessActivityService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly activityLogService: ActivityLogService,
        private readonly daysUsersService: DaysUsersService,
        private readonly weeksUsersService: WeeksUsersService,
        private readonly frontService: FrontService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `challenge.status != 2` : `challenge.status = 1`;
            if (postData?.challenge_type) {
                where += ` AND challenge.challenge_type = '${postData?.challenge_type}'`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['challenge.challenge_name','challenge.bio_challenge_type']);   
            }
            const resultedData = await this.challengeService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ChallengeDto, resultedData['list'], req.lang)
            );
            if(![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)){
                if(resultedData['list'] && resultedData['list'].length){
                    await Promise.all(resultedData['list'].map(async (ele)=>{
                        if(ele.challenge_name){
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang,`challenge_name_${ele.id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele.id}`,`dynamic`);
                            if (!customeName.includes('challenge_name_')) {
                                ele.challenge_name = customeName;
                            }
                        }
                        if(ele['ch'] && ele.challenge_desc){
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang,`challenge_desc_${ele.id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele.id}`,`dynamic`);
                            if (!customeName.includes('challenge_desc_')) {
                                ele.challenge_desc = customeName;
                            }
                        }
                    }));
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
    @Post('create')
    @UseInterceptors(
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateChallengeInput, @UploadedFiles() file: Record<string, any>) {
        try {
            if (!postData?.challenge_name || !postData?.challenge_desc) {
                if (file && Object.keys(file).length > 0) {
                    for(let fileData of Object.keys(file)){
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(postData?.challenge_name){
                let alreadyExist = await this.challengeService.listRecord({challenge_name: postData?.challenge_name});
                if(alreadyExist && alreadyExist.length > 0){                       
                    throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Challenge Name'));
                }
            }            
            let weeks = postData?.weeks ? JSON.parse(postData?.weeks) : [];
            let fitness = postData?.fitness ? JSON.parse(postData?.fitness) : [];
            let company_id = postData?.company_id ?? '';
            delete postData?.weeks;
            delete postData?.fitness;
            delete postData?.company_id;
            postData.uid = postData?.uid ?? req.tokenUser?.id;
            const challengeData = await this.challengeService.save({...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.challenge_name){
                let tilte = `challenge_name_${challengeData['id']}`
                dynamicDatas[`${tilte}`]= postData?.challenge_name;
            }
            if(postData?.challenge_desc){
                let tilte = `challenge_desc_${challengeData['id']}`
                dynamicDatas[`${tilte}`]= postData?.challenge_desc;
            }
            
            if(company_id && company_id != '' && challengeData){
                await Promise.all(company_id.split(',').map(async(id)=> await this.orgInvitesService.save({challenge_id: challengeData['id'], org_id: id})));
            }
            if (file && Object.keys(file).length > 0) {
                const imageData = {};
                for(let fileData of Object.keys(file)){
                    if (file[fileData].fieldname == 'icon' || file[fileData].fieldname == 'logo') {
                        const key = file[fileData].fieldname;
                        const prefix = key == 'icon' ? 'challengei' : 'challengel';
                        file[fileData].originalname = this.commonFileService.formatFileName(file[fileData].originalname);
                        file[fileData].filename = `challenge/${challengeData['id'].toString()}/${key}/${prefix}_${this.commonService.generateMD5(challengeData['id'].toString())}.${file[fileData].originalname.split('.')[file[fileData].originalname.split('.').length - 1]}`
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file[fileData].path),  filename: file[fileData].filename}));
                        imageData[key] = file[fileData].filename;
                    }   
                }
            await this.challengeService.update({id: challengeData['id']},{...imageData});
            }
            if(postData?.challenge_type == 'A' || 'H'){
                if(postData?.bio_challenge_type=='Fitness'){
                    for(let fitnes of fitness){
                        fitnes['challenge_id'] = challengeData['id'];
                        fitnes['alphabet'] = fitnes?.alphabet ?? ' ';
                        fitnes['activity_name'] = fitnes?.activity_name ?? ' ';
                        fitnes['suggestion'] = fitnes?.suggestion ?? ' ';
                        let recordDetails = await this.fitnessActivityService.save({...fitnes});
                        let dynamicDatas = Object.create(null);
                        if(fitnes.alphabet && fitnes.alphabet != ' '){
                            let tilte = `fitness_activity_alphabet_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                            dynamicDatas[`${tilte}`]= fitnes.alphabet;
                        }
                        if(fitnes.activity_name){
                            let tilte = `fitness_activity_name_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                            dynamicDatas[`${tilte}`]= fitnes.activity_name;
                        }
                        if(fitnes.suggestion){
                            let tilte = `fitness_activity_suggestion_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                            dynamicDatas[`${tilte}`]= fitnes.suggestion;
                        }
                    }
                }
                if(postData?.bio_challenge_type=='Olympics' || weeks){
                    this.commonService.updateWeeksData(weeks, file.map(e=>e))
                    for(let week of weeks){
                        let days = week.days;
                        delete week.days;
                        const logofile = week?.file?.path;
                        delete week?.file;
                        week['challenge_id'] = challengeData['id'];
                        const weekResult = await this.weeksService.save({ ...week });
                        if(logofile && weekResult){
                            let filename = `challenge/${challengeData['id']}/week/${weekResult['id']}/chweekl_${this.commonService.generateMD5(weekResult['id'].toString())}.${logofile.split(';base64,').pop().split(';')[0].split('/')[1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(logofile),  filename: filename}));
                            await this.weeksService.update({ id: weekResult['id']},{logofile: filename});
                        }
                        if(weekResult){
                            for(let day of days){
                                const logofile = day.file?.path;
                                delete day.file;
                                day['challenge_id'] = challengeData['id'];
                                day['week_id'] = weekResult['id'];
                                const dayData = await this.daysService.save({ ...day });
                                if(logofile && dayData){
                                    let filename = `challenge/${challengeData['id']}/week/${weekResult['id']}/day/chdayl_${this.commonService.generateMD5(dayData['id'].toString())}.${logofile.split(';base64,').pop().split(';')[0].split('/')[1]}`;
                                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(logofile),  filename: filename}));
                                    await this.daysService.update({ id: dayData['id']},{logofile: filename});
                                }
                            }
                        }
                    }

                    let getWeekDatas = await this.weeksService.listRecord({challenge_id: challengeData['id'], status: Not(2)});
                    let allWeekIds = getWeekDatas.map(e=>e.id);
                    let getDayDatas = await this.daysService.listRecord({challenge_id: challengeData['id'], week_id: In(allWeekIds), status: Not(2)});
                    for(let weekData of getWeekDatas){
                        if(weekData?.manual_activity){
                            let tilte = `week_activity_name_${challengeData['id']}_${weekData['id']}`
                            dynamicDatas[`${tilte}`]= weekData?.manual_activity;
                        }
                        if(weekData?.site_activity_desc){
                            let tilte = `week_activity_description_${challengeData['id']}_${weekData['id']}`
                            dynamicDatas[`${tilte}`]= weekData?.site_activity_desc;
                        }
                        if(weekData?.manual_desc){
                            let tilte = `week_description_${challengeData['id']}_${weekData['id']}`
                            dynamicDatas[`${tilte}`]= weekData?.manual_desc;
                        }
                        if(weekData?.tabmanual){
                            let tilte = `week_tabmanual_${challengeData['id']}_${weekData['id']}`
                            dynamicDatas[`${tilte}`]= weekData?.tabmanual;
                        }
                    }
                    for(let dayData of getDayDatas){
                        if(dayData?.manual_activity){
                            let tilte = `week_days_activity_name_${challengeData['id']}_${dayData['id']}`
                            dynamicDatas[`${tilte}`]= dayData?.manual_activity;
                        }
                        if(dayData?.site_activity_desc){
                            let tilte = `week_days_activity_description_${challengeData['id']}_${dayData['id']}`
                            dynamicDatas[`${tilte}`]= dayData?.site_activity_desc;
                        }
                        if(dayData?.manual_desc){
                            let tilte = `week_days_description_${challengeData['id']}_${dayData['id']}`
                            dynamicDatas[`${tilte}`]= dayData?.manual_desc;
                        }
                    }
                }
            }
            if(dynamicDatas && Object.keys(dynamicDatas).length > 0){
                await this.translatorService.DynamicEngJsonData('Challenge','0',dynamicDatas,'Add','MyChallenges',challengeData['id']);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                for(let fileData of Object.keys(file)){
                    await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
                }
            }
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
    @UseInterceptors(
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateChallengeInput, @UploadedFiles() file: Record<string, any>) {
        try {
            if (!postData?.id) {
                if (file && Object.keys(file).length > 0) {
                    for(let fileData of Object.keys(file)){
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData.uid = postData?.uid ?? req.tokenUser?.id;
            const recordDetails = await this.challengeService.findOne({id: postData?.id});
            if (file && Object.keys(file).length > 0) {
                const imageData = {};
                for(let fileData of Object.keys(file)){
                    if (file[fileData].fieldname == 'icon' || file[fileData].fieldname == 'logo') {
                        const key = file[fileData].fieldname;
                        const prefix = key == 'icon' ? 'challengei' : 'challengel';
                        file[fileData].originalname = this.commonFileService.formatFileName(file[fileData].originalname);
                        file[fileData].filename = `challenge/${recordDetails['id'].toString()}/${key}/${prefix}_${this.commonService.generateMD5(recordDetails['id'].toString())}.${file[fileData].originalname.split('.')[file[fileData].originalname.split('.').length - 1]}`
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file[fileData].path),  filename: file[fileData].filename}));
                        imageData[key] = file[fileData].filename;
                    }   
                }
            await this.challengeService.update({id: recordDetails['id']},{...imageData});
            }
            let weeks = postData?.weeks ? JSON.parse(postData?.weeks) : [];
            let fitness = postData?.fitness ? JSON.parse(postData?.fitness) : [];
            delete postData?.weeks;
            delete postData?.fitness;
            if(postData?.bio_challenge_type == 'undefined'){
                delete postData?.bio_challenge_type;
            }
            await this.challengeService.update({ id: recordDetails.id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_CHALLENGE, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.challenge_name){
                let tilte = `challenge_name_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.challenge_name;
            }
            if(postData?.challenge_desc){
                let tilte = `challenge_desc_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.challenge_desc;
            }
            if(fitness){
                for(let element of fitness){
                    element['challenge_id'] = element?.challenge_id ?? recordDetails.id;
                }
                const fitnessactivityList = await this.fitnessActivityService.listRecord({ challenge_id: recordDetails.id, status: Not(2)});
                const filterData = this.commonArrayService.compareArrays(fitnessactivityList, fitness);
                if(filterData?.removed && filterData?.removed.length){
                    await Promise.all(filterData.removed.map(async(ele)=>await this.fitnessActivityService.update({ id: ele.id},{status: 2})));
                }
                if(filterData?.added || filterData?.updated){
                    for(let item of [...filterData.added, ...filterData.updated]){
                        await this.fitnessActivityService.save({ ...item});
                    }
                }
                for(let element of fitness){
                    if(element.alphabet && element.alphabet != ' '){
                        let tilte = `fitness_activity_alphabet_${recordDetails['id']}_${element['id']}`;
                        dynamicDatas[`${tilte}`] = element.alphabet;
                    }
                    if(element.activity_name){
                        let tilte = `fitness_activity_name_${recordDetails['id']}_${element['id']}`;
                        dynamicDatas[`${tilte}`] = element.activity_name;
                    }
                    if(element.suggestion){
                        let tilte = `fitness_activity_suggestion_${recordDetails['id']}_${element['id']}`;
                        dynamicDatas[`${tilte}`] = element.suggestion;
                    }
                }
            }
            if(weeks){
                this.commonService.updateWeeksData(weeks, file.map(e=>e))
                for(let element of weeks){
                    element['challenge_id'] = element?.challenge_id ?? recordDetails.id;
                }
                const weeksList = await this.weeksService.listRecord({ challenge_id: recordDetails.id});
                const filterData = this.commonArrayService.compareArrays(weeksList.map(({ ['logofile']: deletedKey, ...rest }) => rest), weeks, 'id', ['added_date', 'update_date', 'activity']);
                if(filterData?.removed && filterData?.removed.length){
                    await Promise.all(filterData.removed.map(async(ele)=>{
                        await this.weeksService.update({ id: ele.id, challenge_id: recordDetails.id},{status: 2});
                        this.activityLogService.create({id: ele.id, status: 1}, {status: 2}, tableConstant.CHALLENGE.TBL_CH_WEEKS, req.tokenUser?.id, 'delete');
                        let weekUserRecord = await this.weeksUsersService.list({week_id: ele.id, challenge_id: recordDetails.id, activity_id: ele.activity_id});
                        for(let ele of weekUserRecord){
                            await this.weeksUsersService.update({id: ele.id},{status: 2});
                            this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_WEEKS_USERS, req.tokenUser?.id, 'delete');
                        }
                        let dayRecord = await this.daysService.findOne({ week_id: ele.id, challenge_id: recordDetails.id});
                        if(dayRecord){
                            await this.daysService.update({ week_id: ele.id, challenge_id: recordDetails.id},{status: 2});
                            let dayUserRecord = await this.daysUsersService.listRecord({ day_id: dayRecord.id, week_id: ele.id, challenge_id: recordDetails.id});
                            for(let ele of dayUserRecord){
                                await this.daysUsersService.update({id: ele.id},{status: 2});
                                this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_DAYS_USERS, req.tokenUser?.id, 'delete');
                            }
                            this.activityLogService.create(dayRecord, {status: 2}, tableConstant.CHALLENGE.TBL_CH_DAYS, req.tokenUser?.id, 'delete');
                        }
                    }));
                }
                if(filterData?.added || filterData?.updated){
                    for(let week of [...filterData.added, ...filterData.updated]){
                        let days = week.days;
                        let logofile = week?.logofile;
                        delete week?.logofile;
                        for(let element of days){
                            element['challenge_id'] = element?.challenge_id ?? recordDetails.id;
                        }
                        delete week.days;
                        let weekData = await this.weeksService.save({ ...week});
                        if((logofile && weekData) || (weekData && week.file)){
                            let filename;
                            if(week.file) {
                                filename = `challenge/${recordDetails['id']}/week/${weekData['id']}/chweekl_${this.commonService.generateMD5(weekData['id'].toString())}.${week.file.originalname.split('.')[1]}`;
                            }
                            else{
                                filename = `challenge/${recordDetails['id']}/week/${weekData['id']}/chweekl_${this.commonService.generateMD5(weekData['id'].toString())}.${logofile.split(';base64,').pop().split(';')[0].split('/')[1]}`;
                            }
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(logofile || week.file.path),  filename: filename}));
                            await this.weeksService.update({ id: weekData['id']},{logofile: filename});
                        }
                        if(weekData){
                            for(let element of days){
                                element['week_id'] = element?.week_id ?? weekData['id'];
                            }
                            const daysList = await this.daysService.listRecord({week_id: weekData['id'], challenge_id: recordDetails.id});
                            const filterData = this.commonArrayService.compareArrays(daysList.map(({ ['logofile']: deletedKey, ...rest }) => rest), days, 'id', ['added_date', 'update_date', 'activity']);
                            if(filterData?.removed && filterData?.removed.length){
                                await Promise.all(filterData.removed.map(async(ele)=> {
                                    let dayRecord = await this.daysService.findOne({ id: ele.id});
                                    await this.daysService.update({ id: ele.id},{status: 2})
                                    this.activityLogService.create(dayRecord, {status: 2}, tableConstant.CHALLENGE.TBL_CH_DAYS, req.tokenUser?.id, 'delete');
                            }));
                            }
                            if(filterData?.added || filterData?.updated){
                                await Promise.all([...filterData.added, ...filterData.updated].map(async(ele)=>{
                                    const logofile = ele.logofile;
                                    delete ele.logofile;
                                    const dayData = await this.daysService.save({ ...ele});
                                    if((logofile && dayData) || (dayData && ele.file)){
                                        let filename;
                                        if(ele.file) {
                                            filename = `challenge/${recordDetails['id']}/week/${weekData['id']}/day/chdayl_${this.commonService.generateMD5(dayData['id'].toString())}.${ele.file.originalname.split('.')[1]}`;
                                        }
                                        else{
                                            filename = `challenge/${recordDetails['id']}/week/${weekData['id']}/day/chdayl_${this.commonService.generateMD5(dayData['id'].toString())}.${logofile.split(';base64,').pop().split(';')[0].split('/')[1]}`;
                                        }
                                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(logofile || ele.file.path),  filename: filename}));
                                    await this.daysService.update({ id: dayData['id']},{logofile: filename});
                                }
                                }));
                            }
                        } 
                    }
                }

                let getWeekDatas = await this.weeksService.listRecord({challenge_id: recordDetails.id, status: Not(2)});
                let allWeekIds = getWeekDatas.map(e=>e.id);
                let getDayDatas = await this.daysService.listRecord({challenge_id: recordDetails.id, week_id: In(allWeekIds), status: Not(2)});
                for(let weekData of getWeekDatas){
                    if(weekData?.manual_activity){
                        let tilte = `week_activity_name_${recordDetails['id']}_${weekData['id']}`
                        dynamicDatas[`${tilte}`]= weekData?.manual_activity;
                    }
                    if(weekData?.site_activity_desc){
                        let tilte = `week_activity_description_${recordDetails['id']}_${weekData['id']}`
                        dynamicDatas[`${tilte}`]= weekData?.site_activity_desc;
                    }
                    if(weekData?.manual_desc){
                        let tilte = `week_description_${recordDetails['id']}_${weekData['id']}`
                        dynamicDatas[`${tilte}`]= weekData?.manual_desc;
                    }
                    if(weekData?.tabmanual){
                        let tilte = `week_tabmanual_${recordDetails['id']}_${weekData['id']}`
                        dynamicDatas[`${tilte}`]= weekData?.tabmanual;
                    }
                }
                for(let dayData of getDayDatas){
                    if(dayData?.manual_activity){
                        let tilte = `week_days_activity_name_${recordDetails['id']}_${dayData['id']}`
                        dynamicDatas[`${tilte}`]= dayData?.manual_activity;
                    }
                    if(dayData?.site_activity_desc){
                        let tilte = `week_days_activity_description_${recordDetails['id']}_${dayData['id']}`
                        dynamicDatas[`${tilte}`]= dayData?.site_activity_desc;
                    }
                    if(dayData?.manual_desc){
                        let tilte = `week_days_description_${recordDetails['id']}_${dayData['id']}`
                        dynamicDatas[`${tilte}`]= dayData?.manual_desc;
                    }
                }
            }
            if(dynamicDatas && Object.keys(dynamicDatas).length > 0){
                await this.translatorService.DynamicEngJsonData('Challenge','0',dynamicDatas,'Edit','MyChallenges',recordDetails['id']);
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                for(let fileData of Object.keys(file)){
                    await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
                }
            }
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.challengeService.findOne({id: postData?.id});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.challengeService.update({id: postData?.id},{ status: 2});
            this.activityLogService.create({id: postData?.id, status: 1}, {status: 2}, tableConstant.CHALLENGE.TBL_CH_CHALLENGE, req.tokenUser?.id, 'delete');
            await this.scheduleChallengeService.update({challenge_id: postData?.id},{ status: 2});
            let scheduleData = await this.scheduleChallengeService.listRecord(`sc.challenge_id = '${postData?.id}'`);
            scheduleData?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE, req.tokenUser?.id, 'delete'));
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.challengeService.findOne({id: postData?.id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ChallengeDto, resultedData, req.lang)
            );
            if(resultedData['fitness']){
                resultedData['fitness'] = resultedData['fitness'].sort((a, b) => a.id - b.id);
            }
            if(resultedData['weeks']){
                resultedData['weeks'] = resultedData['weeks'].sort((a, b) => a.id - b.id);
                for(let week of resultedData['weeks']){
                    week['days'] = week['days'].sort((a, b) => a.id - b.id);
                }
            }
            if(resultedData.challenge_name){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`challenge_name_${resultedData.id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData.id}`,`dynamic`);
                if (!customeName.includes('challenge_name_')) {
                    resultedData.challenge_name = customeName;
                }
            }
            if(resultedData && resultedData.challenge_desc){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`challenge_desc_${resultedData.id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData.id}`,`dynamic`);
                if (!customeName.includes('challenge_desc_')) {
                    resultedData.challenge_desc = customeName;
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let where: any = {};
            if (postData?.status != undefined || postData?.status != null) {
                where['status'] = postData?.status;
            }
            if (postData?.challenge_type) {
                where['challenge_type'] = postData?.challenge_type;
            }
            if (postData?.org_id) {
                let result: any = await this.frontService.scheduleChallengeDetailsData(['sc.id', 'sc.custom_cname'], `sc.org_id = ${postData?.org_id} AND sc.status !=2 AND ch.status !=2`, {'sc.id': 'ASC'}, [{
                    'join_table': 'sc.ch',
                    'alias': 'ch',
                    'table': tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                    'on_condition': `sc.challenge_id = ch.id`,
                    'join_type': 'inner_one'
                }], 'getMany');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: result,
                    message: 'success',
                });
            }
            let searchCondition: any = {};
            searchCondition.status = In([0, 1]);
            if (postData?.search_str) {
                searchCondition.challenge_name = Like(`%${postData.search_str}%`);
            }
            let result: any = await this.frontService.challengeListRecord(['id', 'challenge_name'], searchCondition, {id: 'ASC'});
            result = <any>(
                await this.commonArrayService.formatToDto(ChallengeDto, result, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (result && result.length) {
                    await Promise.all(result.map(async (ele) => {
                        if (ele.challenge_name) {
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang, `challenge_name_${ele.id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele.id}`, `dynamic`);
                            if (!customeName.includes('challenge_name_')) {
                                ele.challenge_name = customeName;
                            }
                        }
                        if (ele && ele.challenge_desc) {
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang, `challenge_desc_${ele.id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele.id}`, `dynamic`);
                            if (!customeName.includes('challenge_desc_')) {
                                ele.challenge_desc = customeName;
                            }
                        }
                    }));
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
    @UseGuards(AccessGuard)
    @Put('copy')
    async copy(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let returnResponce;
            let challengeId = null
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const challenge = await this.challengeService.findOne({id: postData?.id});
            if (challenge) {
                const challengeData = JSON.parse(JSON.stringify(challenge));
                delete challenge.id;
                delete challenge.added_date;
                challenge.uid = req.tokenUser?.id;
                challenge.challenge_name = 'Copy ' + challenge.challenge_name;
                returnResponce = await this.challengeService.save({...challenge});
                challengeId = returnResponce.id;
                this.activityLogService.create(challengeData, returnResponce, tableConstant.CHALLENGE.TBL_CH_CHALLENGE, req.tokenUser?.id,'copy');
                if(returnResponce){
                    const weekData = await this.weeksService.listRecord({challenge_id: postData?.id},{id: 'ASC'});
                    if(weekData){
                        for(let week of weekData){
                            const week_Data = JSON.parse(JSON.stringify(week));
                            delete week.added_date;
                            delete week.id;
                            week.challenge_id = challengeId;
                            const weekResult = await this.weeksService.save({ ...week });
                            this.activityLogService.create(week_Data, weekResult, tableConstant.CHALLENGE.TBL_CH_WEEKS, req.tokenUser?.id,'copy');
                            if(weekResult){
                                const dayData = await this.daysService.listRecord({week_id: week_Data.id, challenge_id: postData?.id},{id: 'ASC'});
                                if(dayData){
                                    await Promise.all(dayData.map(async(day)=>{
                                        const day_Data = JSON.parse(JSON.stringify(day));
                                        delete day.added_date;
                                        delete day.id;
                                        day.challenge_id = challengeId;
                                        day.week_id = weekResult['id'];
                                        day.completion_status = 1;
                                        let dayResult =await this.daysService.save({ ...day });
                                        this.activityLogService.create(day_Data, dayResult, tableConstant.CHALLENGE.TBL_CH_DAYS, req.tokenUser?.id,'copy');
                                    }));
                                }
                            }
                        }
                    }
                    const fitnessActivityData = await this.fitnessActivityService.listRecord({challenge_id: postData?.id, status: Not(2)});
                    if(fitnessActivityData && fitnessActivityData.length){
                        for(let activity of fitnessActivityData){
                            const activityData = JSON.parse(JSON.stringify(activity));
                            delete activity.added_date;
                            delete activity.id;
                            activity.challenge_id = challengeId;
                            let activityResult = await this.fitnessActivityService.save({ ...activity });
                            this.activityLogService.create(activityData, activityResult, tableConstant.ACTIVITIES.TBL_ACTIVITIES, req.tokenUser?.id,'copy');
                        }
                    }                    
                }
            } else {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_COPY_FIELD')).replace('%s', 'Activity'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {id: challengeId},
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