import { appConstant, CommonArrayService, CommonFileService, CommonService, MyPlanBlocksDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateBlocksInput,
    DeleteBlocksInput,
    GetOneBlocksInput,
    ListBlocksInput, PaginateWithCompanyInput,
    UpdateBlocksInput,
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { ActivityService } from "../../activity/activity/activity.service";
import { TranslationService } from "../../translation/translation.service";
import { MyPlanAssignBlockService } from "../assignblock/assignblock.service";
import { FrontService } from "../front/front.service";
import { MyPlanBlocksService } from './blocks.service';
const path = require('path');
@Controller('my-plan/blocks')
@UseGuards(TokenGuard, RoleGuard)
export class MyPlanBlocksController {
    constructor(
        private readonly myPlanBlocksService: MyPlanBlocksService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly frontService: FrontService,
        private readonly activityService: ActivityService,
        private readonly myPlanAssignBlockService: MyPlanAssignBlockService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `blocks.status != '2'`;
            if (postData?.plan_id) {
                where += ` AND blocks.plan_id = ${postData?.plan_id}`;
            }
            if (postData?.search_str) {
                where += ` AND (blocks.name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
            }
            const resultedData = await this.myPlanBlocksService.paginateList(
                ["blocks.id","blocks.order_id","blocks.status","blocks.name","blocks.icon","blocks.plan_id","blocks.description"],
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MyPlanBlocksDto, resultedData['list'], req.lang)
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListBlocksInput) {
        try {
            if (!postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = { plan_id: postData?.plan_id, status: Not('2')};
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.myPlanBlocksService.listRecord(["id","order_id","status","name","icon","plan_id"],where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanBlocksDto, resultedData, req.lang)
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    @UseInterceptors(
        FileInterceptor("icon", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.BLOCKS_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBlocksInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.plan_id || !file || !postData?.name) {
                if (file && file.filename && file.fieldname === 'icon') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const formCheck = await this.myPlanBlocksService.findOne({name: postData?.name.trim(),plan_id: postData?.plan_id},null);
            if (formCheck) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_BLOCK_ALREADY_EXIST"));
            }
            const recordDetails = await this.myPlanBlocksService.findOne({ plan_id: postData?.plan_id, status: Not(2)},{ order_id: 'DESC' });
            postData['order_id'] = recordDetails && recordDetails['order_id'] ? recordDetails['order_id'] + 1 : 1;
            let saveData = await this.myPlanBlocksService.save({...postData});
            if (file && file.fieldname === 'icon' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `myplans/${postData?.plan_id.toString()}/block/${this.commonService.generateMD5(saveData['id'].toString().toString())}myblocksl.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['icon'] = file.filename;
                await this.myPlanBlocksService.update({ id: saveData['id'] },{icon: postData['icon']});
            }
            let blockId = saveData['id'];
            let blockName = postData?.name;
            let assignBlockData = await this.frontService.assignBlockData(['ab.org_id','ab.id','ab.name'],{plan_id: postData?.plan_id,block_id: blockId,status: Not('2')},null,null,'getMany');
            let assignBlockPlan = [];
            let assignBlockOrg = [];
            for (let i = 0; i < assignBlockData.length; i++) {
                if (!assignBlockData[i]['name']) {
                    assignBlockPlan.push({'org_id': assignBlockData[i]['org_id'],'block_id': assignBlockData[i]['id']})
                }
                assignBlockOrg.push(assignBlockData[i]['org_id']);
            }
            /* below based_on not use then remove  based_on,startdate,enddate */
            let assignPlanData = await this.frontService.assignPlanData(['ap.id','ap.org_id','ap.based_on','ap.startdate','ap.enddate'],{plan_id: postData?.plan_id,status: Not('2')},null,null,'getMany');
            let activityData = await this.frontService.activityData(['ac.id','ac.accebility','ac.activity_name'],{activity_name: blockName,category_id: 67,status: Not('2')},null,null,'getMany');
            for (let i: number = 0; i < assignPlanData.length; i++) {
                const assignPlan = JSON.parse(JSON.stringify(assignPlanData[i]));
                const existId = assignBlockPlan.findIndex(e => e.org_id === assignPlan.org_id);
                assignBlockPlan[existId].id = assignPlan?.id;
                const match = activityData.find(activity =>
                    activity.accebility === String(assignPlan.org_id) &&
                    activity.activity_name.trim() === blockName.trim()
                );
                let activityId;
                if (match) {
                    activityId = match.id
                } else {
                    let activityData = {};
                    activityData['category_id'] = '67';
                    activityData['activity_name'] = blockName;
                    activityData['accebility'] = assignPlan.org_id;
                    activityData['activity_display'] = 0;
                    activityData['created_by'] = req?.tokenUser?.id;
                    activityData['status'] = '1';
                    let saveActivityData = await this.activityService.save({ ...activityData });
                    activityId = saveActivityData['id'];
                }
                let blockAssignData: any = {};
                if (assignBlockOrg.includes(assignPlan.org_id)) {
                    const recordDetails = await this.myPlanAssignBlockService.findOne({ plan_id: postData?.plan_id, block_id: blockId, org_id: assignPlan.org_id });
                    blockAssignData['activity_id'] = activityId;
                    await this.myPlanAssignBlockService.update({ plan_id: postData?.plan_id, block_id: blockId, org_id: assignPlan.org_id },{...blockAssignData});
                    this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, req.tokenUser?.id);
                } else {
                    blockAssignData['block_id'] = blockId;
                    blockAssignData['activity_id'] = activityId;
                    blockAssignData['plan_id'] = postData?.plan_id;
                    blockAssignData['org_id'] = assignPlan.org_id;
                    await this.myPlanAssignBlockService.save({...blockAssignData});
                }
            }
            for (let i = 0; i < assignBlockPlan.length; i++) {
                let orgId = assignBlockPlan[i]['org_id'];
                let blockId = assignBlockPlan[i]['block_id'];
                let assignPlanId = assignBlockPlan[i]['id'];
                let dynamicData = Object.create(null);
                if(postData?.name){
                    let blockName = `block_name_${blockId}_${orgId}`
                    dynamicData[`${blockName}`]= postData?.name;
                }
                if(postData?.description){
                    let blockDescription = `block_description_${blockId}_${orgId}`
                    dynamicData[`${blockDescription}`]= postData?.description;
                }
                await this.translatorService.DynamicEngJsonData('MyPlan',orgId,dynamicData,'Add','MyPlan',assignPlanId);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && file.fieldname === 'icon' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
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
        FileInterceptor("icon", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.BLOCKS_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateBlocksInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.plan_id) {
                if (file && file.filename && file.fieldname === 'icon') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (postData?.name) {
                const formCheck = await this.myPlanBlocksService.findOne({name: postData?.name.trim(),plan_id: postData?.plan_id, status: Not('2')},null);
                if (formCheck) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_BLOCK_ALREADY_EXIST"));
                }
            }
            if (file && file.fieldname === 'icon' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `myplans/${postData?.plan_id.toString()}/block/${this.commonService.generateMD5(postData?.id.toString().toString())}myblocksl.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['icon'] = file.filename;
            }
            const recordDetails = await this.myPlanBlocksService.findOne({ id: postData?.id, plan_id: postData?.plan_id });
            await this.myPlanBlocksService.update({ id: postData?.id, plan_id: postData?.plan_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_BLOCKS, req.tokenUser?.id);
            let blockName = postData?.name || recordDetails.name;
            let blockId = postData?.id;
            let assignBlockData = await this.frontService.assignBlockData(['ab.org_id','ab.id','ab.name'],{plan_id: postData?.plan_id,block_id: blockId,status: Not('2')},null,null,'getMany');
            let assignBlockPlan = [];
            let assignBlockOrg = [];
            for (let i = 0; i < assignBlockData.length; i++) {
                if (!assignBlockData[i]['name']) {
                    assignBlockPlan.push({'org_id': assignBlockData[i]['org_id'],'block_id': assignBlockData[i]['id']})
                }
                assignBlockOrg.push(assignBlockData[i]['org_id']);
            }
            /* below based_on not use then remove  based_on,startdate,enddate */
            let assignPlanData = await this.frontService.assignPlanData(['ap.id','ap.org_id','ap.based_on','ap.startdate','ap.enddate'],{plan_id: postData?.plan_id,status: Not('2')},null,null,'getMany');
            let activityData = await this.frontService.activityData(['ac.id','ac.accebility','ac.activity_name'],{activity_name: blockName,category_id: 67,status: Not('2')},null,null,'getMany');
            for (let i: number = 0; i < assignPlanData.length; i++) {
                const assignPlan = JSON.parse(JSON.stringify(assignPlanData[i]));
                const existId = assignBlockPlan.findIndex(e => e.org_id === assignPlan.org_id);
                assignBlockPlan[existId].id = assignPlan?.id;
                const match = activityData.find(activity =>
                    activity.accebility === String(assignPlan.org_id) &&
                    activity.activity_name.trim() === blockName.trim()
                );
                let activityId;
                if (match) {
                    activityId = match.id
                } else {
                    let activityData = {};
                    activityData['category_id'] = '67';
                    activityData['activity_name'] = blockName;
                    activityData['accebility'] = assignPlan.org_id;
                    activityData['activity_display'] = 0;
                    activityData['created_by'] = req?.tokenUser?.id;
                    activityData['status'] = '1';
                    let saveActivityData = await this.activityService.save({ ...activityData });
                    activityId = saveActivityData['id'];
                }
                let blockAssignData: any = {based_on: assignPlan?.based_on};
                if (assignBlockOrg.includes(assignPlan.org_id)) {
                    const recordDetails = await this.myPlanAssignBlockService.findOne({ plan_id: postData?.plan_id, block_id: postData?.id, org_id: assignPlan.org_id });
                    blockAssignData['activity_id'] = activityId;
                    await this.myPlanAssignBlockService.update({ plan_id: postData?.plan_id, block_id: postData?.id, org_id: assignPlan.org_id },{...blockAssignData});
                    this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK, req.tokenUser?.id);
                } else {
                    blockAssignData['block_id'] = blockId;
                    blockAssignData['activity_id'] = activityId;
                    blockAssignData['plan_id'] = postData?.plan_id;
                    blockAssignData['org_id'] = assignPlan.org_id;
                    await this.myPlanAssignBlockService.save({...blockAssignData});
                }
            }
            for (let i = 0; i < assignBlockPlan.length; i++) {
                let orgId = assignBlockPlan[i]['org_id'];
                let blockId = assignBlockPlan[i]['block_id'];
                let assignPlanId = assignBlockPlan[i]['id'];
                let dynamicData = Object.create(null);
                if(postData?.name){
                    let blockName = `block_name_${blockId}_${orgId}`
                    dynamicData[`${blockName}`]= postData?.name;
                }
                if(postData?.description){
                    let blockDescription = `block_description_${blockId}_${orgId}`
                    dynamicData[`${blockDescription}`]= postData?.description;
                }
                await this.translatorService.DynamicEngJsonData('MyPlan',orgId,dynamicData,'Add','MyPlan',assignPlanId);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && file.fieldname === 'icon' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteBlocksInput) {
        try {
            if (!postData?.id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanBlocksService.findOne({
                id: postData?.id,
                plan_id: postData?.plan_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanBlocksService.update({id: postData?.id, plan_id: postData?.plan_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_BLOCKS, req.tokenUser?.id, 'delete');
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneBlocksInput) {
        try {
            if (!postData?.id || !postData?.plan_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.myPlanBlocksService.findOne({id: postData?.id, plan_id: postData?.plan_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanBlocksDto, resultedData, req.lang)
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
    @UseGuards(AccessGuard)
    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (postData?.order.length == 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.myPlanBlocksService.listRecord(["id","order_id"],{ id: In(postData?.order)}, { order_id: 'ASC' });
            const orderArray = postData?.order;
            let answers = resultedData.map(obj => obj.order_id);
            for (let i = 0; i < orderArray.length; i++) {
                await this.myPlanBlocksService.update({id: orderArray[i]},{order_id:answers[i]});
            }
            this.activityLogService.create(resultedData, postData, tableConstant.MY_PLAN.TBL_MP_BLOCKS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ORDER_CHANGE"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
}