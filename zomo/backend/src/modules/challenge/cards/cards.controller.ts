import { appConstant, CardsDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateCardsInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    PaginateWithChallengeInput,
    UpdateCardsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { SquaresService } from '../squares/squares.service';
import { CardsService } from './cards.service';
@Controller('challenge/cards')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CardsController {
    constructor(
        private readonly cardsService: CardsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly squaresService: SquaresService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = '';
            if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                where = `card.status != 2 AND card.org_id = 0 AND card.schedule_id = 0`; 
            } else if(req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN){
                where = `card.status != 2`; 
            } else {
                where = `card.status = 1`;
            }
            if (postData?.org_id) {
                where += ` AND card.org_id = ${postData?.org_id}`;
            }
            if (postData?.schedule_id) {
                where += ` AND card.schedule_id = ${postData?.schedule_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['card.name','card.description']);
            }
            let resultedData = await this.cardsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CardsDto, resultedData['list'], req.lang)
            );
            if(![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)){
                await Promise.all(resultedData['list'].map(async (ele) => {
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`card_name_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `card_name_${ele.schedule_id}_${ele['id']}`) ? ele['name'] : customeName;
                    }
                    if(ele.description){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`card_description_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                        ele.description = (customeName == '' || customeName == `card_description_${ele.schedule_id}_${ele['id']}`) ? ele['description'] : customeName;
                    }
                }));
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCardsInput) {
        try {
            postData['schedule_id'] = postData?.schedule_id ?? 0;
            postData['org_id'] = postData?.org_id ?? 0;
            if ((postData?.schedule_id == undefined || postData?.schedule_id == null) || (postData?.org_id == undefined || postData?.org_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultedData = await this.cardsService.findOne({name: postData?.name, schedule_id: postData?.schedule_id, org_id: postData?.org_id, status: 1});
            if (resultedData) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'Card name already exists')));
            }
            if([appConstant.ROLE.ORGADMIN , appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)){
                postData['status'] = postData['status'] ?? 1; 
            }
            const recordDetails = await this.cardsService.save({...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `card_name_${postData?.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }            
            if(postData?.description){
                let tilte = `card_description_${postData?.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id,dynamicDatas,'Edit','MyChallenges',postData['schedule_id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Card has been successfully saved.'),
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCardsInput) {
        try {
            if (!postData?.id || (postData?.schedule_id == undefined || postData?.schedule_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.cardsService.findOne({
                id: postData?.id, schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                const alreadyExist = await this.cardsService.findOne({
                    name: postData?.name, schedule_id: recordDetails.schedule_id, org_id: recordDetails.org_id, status: 1
                });
                if (alreadyExist) {
                    throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'Card name already exists')));
                }
                let tilte = `card_name_${recordDetails.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }            
            if(postData?.description){
                let tilte = `card_description_${recordDetails.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',recordDetails.org_id,dynamicDatas,'Edit','MyChallenges',recordDetails['schedule_id']);
            await this.cardsService.update({ id: postData?.id, schedule_id: postData?.schedule_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_CARDS, req.tokenUser?.id);
            let message;
            if(Object.keys(postData).length && postData?.hasOwnProperty('status')){
                // if(postData?.status == 1) {
                //     message = 'Card status change succesfully'; 
                // }
                // else {
                //     message = 'Card status change succesfully'; 
                // }
                message = 'Card status change succesfully'; 
            } 
            else{
                message =  'Card has been successfully saved.';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, message),
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
            if (!postData?.id || (postData?.schedule_id == undefined || postData?.schedule_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.cardsService.findOne(`card.id = ${postData?.id} AND card.schedule_id = ${postData?.schedule_id}`);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.squaresService.update({schedule_id: postData?.schedule_id, card_id: postData?.id},{status:2})
            const squareUser = await this.squaresService.listRecord({schedule_id: postData?.schedule_id, card_id: postData?.id});
            squareUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SQUARES, req.tokenUser?.id, 'delete'));
            await this.cardsService.update({id: postData?.id, schedule_id: postData?.schedule_id},{ status: 2});
            this.activityLogService.create(recordDetails, {name: recordDetails}, tableConstant.CHALLENGE.TBL_CH_CARDS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Card remove succesfully'),
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            if (!postData?.id || (postData?.schedule_id == undefined || postData?.schedule_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id, schedule_id: postData?.schedule_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let resultedData = await this.cardsService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CardsDto, resultedData, req.lang)
            );
            if(resultedData.name){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`card_name_${resultedData.schedule_id}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData.org_id}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.name = (customeName == '' || customeName == `card_name_${resultedData.schedule_id}_${resultedData['id']}`) ? resultedData['name'] : customeName;
            }
            if(resultedData.description){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`card_description_${resultedData.schedule_id}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData.org_id}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.description = (customeName == '' || customeName == `card_description_${resultedData.schedule_id}_${resultedData['id']}`) ? resultedData['description'] : customeName;
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCardsInput){
        try {
            let where: any =  (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER) ? { status: 1, org_id: 0, schedule_id: 0 } : { status: 1 };    
            if(postData?.org_id != undefined || postData?.org_id != null){
                where['org_id'] = postData?.org_id;
            }        
            if(postData?.schedule_id != undefined || postData?.schedule_id != null){
                where['schedule_id'] = postData?.schedule_id;
            }        
            const result = await this.cardsService.listRecord(where);
            await Promise.all(result.map(async (ele) => {
                if(ele.name){
                    let customeName = await this.translatorService.frontendReadTranslation(req.lang,`card_name_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.name = (customeName == '' || customeName == `card_name_${ele.schedule_id}_${ele['id']}`) ? ele['name'] : customeName;
                }
                if(ele.description){
                    let customeName = await this.translatorService.frontendReadTranslation(req.lang,`card_description_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.description = (customeName == '' || customeName == `card_description_${ele.schedule_id}_${ele['id']}`) ? ele['description'] : customeName;
                }
                if(ele['square'] && ele['square'].length){
                    await Promise.all(ele['square'].map(async (square) => {
                        if(square.name){
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang,`square_name_${ele.schedule_id}_${square['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                            square.name = (customeName == '' || customeName == `square_name_${ele.schedule_id}_${square['id']}`) ? square['name'] : customeName;
                        }
                        if(square.description){
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang,`square_description_${ele.schedule_id}_${square['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                            square.description = (customeName == '' || customeName == `square_description_${ele.schedule_id}_${square['id']}`) ? square['description'] : customeName;
                        }
                    }));
                }
            }));
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
    @Put('copy')
    async copy(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCardsInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const card = await this.cardsService.findOne({id: postData?.id});
            if (card) {
                if(req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN){
                    const cardDetails = await this.cardsService.findOne({org_id: card.org_id, schedule_id: card.schedule_id, status: Not(2)},{order_no: 'DESC'});
                    card['order_no'] = cardDetails?.['order_no'] ? cardDetails['order_no'] + 1 : postData?.order_no;
                }
                const cardRecord = JSON.parse(JSON.stringify(card));
                delete card.id;
                card.name = card.name + ' Copy';
                const cardData = await this.cardsService.save({...card});
                this.activityLogService.create(cardRecord, cardData, tableConstant.CHALLENGE.TBL_CH_CARDS, req.tokenUser?.id,'copy');
                if(cardData){
                    for(let square of card['square']){
                        const squareRecord = JSON.parse(JSON.stringify(square));
                        delete square.id;
                        square.card_id = cardData['id'];
                        let squareData = await this.squaresService.save({...square });
                        this.activityLogService.create(squareRecord, squareData, tableConstant.CHALLENGE.TBL_CH_SQUARES, req.tokenUser?.id,'copy');
                    }
                }
            } else {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_COPY_FIELD')).replace('%s', 'Card'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Card copied succesfully'),
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
    @Put('global-copy')
    async globalCopy(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCardsInput) {
        try {
            if (!postData?.id || !postData?.org_id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const cards = await this.cardsService.listRecord({id: In(postData?.id.split(','))});
            for(let card of cards) {
                let cardData;
                let cardRecord;
                let resultedData = await this.cardsService.findOne({name: card.name, schedule_id: postData?.schedule_id, org_id: postData?.org_id});
                if(!resultedData){
                    cardRecord = JSON.parse(JSON.stringify(card));
                    delete card.id;
                    delete card['square'];
                    card.schedule_id  = postData?.schedule_id;
                    card.org_id = postData?.org_id;
                    card.status = 1;
                    cardData = await this.cardsService.save({...card});
                    this.activityLogService.create(cardRecord, JSON.parse(JSON.stringify(cardData)), tableConstant.CHALLENGE.TBL_CH_CARDS, req.tokenUser?.id,'copy');
                }
                if(cardData){
                    for(let square of cardRecord['square']){
                        const squareRecord = JSON.parse(JSON.stringify(square));
                        delete square.id;
                        square.schedule_id = postData?.schedule_id;
                        square.org_id = postData?.org_id;
                        square.card_id = cardData['id'];
                        let squareData = await this.squaresService.save({...square });
                        this.activityLogService.create(squareRecord, squareData, tableConstant.CHALLENGE.TBL_CH_SQUARES, req.tokenUser?.id,'copy');
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Card has been copied successfully.'),
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