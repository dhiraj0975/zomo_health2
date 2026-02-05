import { appConstant, CommonArrayService, CommonFileService, CommonService, GroupsDto, GroupsEntity, tableConstant } from '@common-constants';
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
import { BrokerService } from 'src/modules/broker/broker.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { FindOptionsSelect, FindOptionsWhere, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateGroupsInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    PaginateWithChallengeInput,
    UpdateGroupsInput
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { GroupsService } from './groups.service';
import { ListGroupsInput } from './input/listgroups.input';
const path = require('path');
@Controller('challenge/groups')
@UseGuards(TokenGuard, RoleGuard)
export class GroupsController {
    constructor(
        private readonly groupsService: GroupsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
        private readonly brokerService: BrokerService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let user = Object.create(req.tokenUser)
            let roleId = user.role_id;
            let userId = user.id;
            // check for broker admin, broker, regional admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN,appConstant.ROLE.BROKER,appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.ORGADMIN == req.tokenUser?.role_id || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id 
                || appConstant.ROLE.WCH == req.tokenUser?.role_id || appConstant.ROLE.BROKERADMIN == req.tokenUser?.role_id || appConstant.ROLE.BROKER == req.tokenUser?.role_id || appConstant.ROLE.REGIONALADMIN == req.tokenUser?.role_id) ? `group.status != 2` : `group.status = 1`;
            if (postData?.schedule_id) {
                where += ` AND group.schedule_id = ${postData?.schedule_id}`;
            }
            if (postData?.org_id) {
                where += ` AND group.org_id = ${postData?.org_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'group.name');
            }
            const resultedData = await this.groupsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(GroupsDto, resultedData['list'], req.lang)
            );
            if(![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER, appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)){
                await Promise.all(resultedData['list'].map(async (ele) => {
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`group_name_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                        ele.name = (customName == '' || customName == `group_name_${ele.schedule_id}_${ele['id']}`) ? ele['name'] : customName;
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
    @UseInterceptors(
        FileInterceptor("logo", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateGroupsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.schedule_id || !postData?.org_id) {
                if (file && file.filename && file.fieldname === 'logo') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser)
            let roleId = user.role_id;
            let userId = user.id;
            // check for broker admin, broker, regional admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    if (file && file.filename && file.fieldname === 'logo') {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            postData['logo'] = postData['logo'] ? postData['logo'] : file?.filename ?? ' ';
            postData['status'] = postData?.status ?? 1;
            const recordDetails = await this.groupsService.findOne({
                name: postData?.name, schedule_id: postData?.schedule_id, status: Not(2)
            });
            if (recordDetails) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'Group name already exists.')));
            }
            const group = await this.groupsService.save({...postData});
            let dynamicData = Object.create(null);
            if(postData?.name && group){
                let title = `group_name_${group['schedule_id']}_${group['id']}`
                dynamicData[`${title}`]= postData?.name;
                await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id,dynamicData,'Edit','MyChallenges',group['schedule_id']);
            }
            if (file && file.fieldname === 'custom_logo' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/schedulech/${postData['schedule_id']}/group/scchagroupl_'${this.commonService.generateMD5(group['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                await this.groupsService.update({ id: group['id']},{custom_logo: filename});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Group has been successfully saved.')
            });
        } catch (error) {
            if (file && file.fieldname === 'logo' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
        FileInterceptor("logo", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateGroupsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                if (file && file.filename && file.fieldname === 'logo') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.groupsService.findOne({
                id: postData?.id, schedule_id: postData?.schedule_id, status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if(postData?.name && postData?.name !== recordDetails.name){
                const recordDetails = await this.groupsService.findOne({
                    name: postData?.name, schedule_id: postData?.schedule_id, status: Not(2)
                });
                if (recordDetails) {
                    throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'Group name already exists.')))
                }
            }
            let dynamicData = Object.create(null);
            if(postData?.name){
                let title = `group_name_${recordDetails.schedule_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.name;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id,dynamicData,'Edit','MyChallenges',recordDetails['schedule_id']);
            if (file && file.fieldname === 'logo' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `challenge/schedulech/${postData['schedule_id']}/group/scchagroupl_'${this.commonService.generateMD5(postData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['logo'] = file.filename;
            }
            await this.groupsService.update({ id: postData?.id, schedule_id: postData?.schedule_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_GROUPS, req.tokenUser?.id);
            let message;
            if(Object.keys(postData).length && postData?.hasOwnProperty('status')){
                if(postData?.status == 1) {
                    message = 'Group activated successfully.'; 
                }
                else {
                    message = 'Group deactivated successfully.'; 
                }
            } 
            else{
                message =  'Group has been successfully saved.';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, message)
            });
        } catch (error) {
            if (file && file.fieldname === 'logo' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.groupsService.findOne({
                id: postData?.id, schedule_id: postData?.schedule_id, status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.groupsService.update({id: postData?.id, schedule_id: postData?.schedule_id},{status: 2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_GROUPS, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Group remove succesfully.'),
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneChallengeInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.groupsService.findOne({id: postData?.id, schedule_id: postData?.schedule_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(GroupsDto, resultedData, req.lang)
            );
            if(resultedData.name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`group_name_${resultedData.schedule_id}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData.org_id}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.name = (customName == '' || customName == `group_name_${resultedData.schedule_id}_${resultedData['id']}`) ? resultedData['name'] : customName;
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListGroupsInput){
        try {
            if (postData?.type && postData?.type?.toLowerCase() == 'report') {
                if (!postData?.org_id || !postData?.schedule_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            let where: FindOptionsWhere<GroupsEntity> = { status: 1 };    
            if (postData?.schedule_id) {
                where['schedule_id'] = postData?.schedule_id;
            }
            if (postData?.org_id) {
                where['org_id'] = postData?.org_id;
            }
            let fields: FindOptionsSelect<GroupsEntity> = {
                id: true,
                name: true,
                logo: true,
                schedule_id: true,
                org_id: true,
                created_date: true,
                status: true,
            }
            if(postData?.type && postData?.type?.toLowerCase() == 'report'){
                fields = { id: true, name: true }
            }
            let result = await this.groupsService.listRecord(where, null, fields);
            result = <any>(
                await this.commonArrayService.formatToDto(GroupsDto, result, req.lang)
            );
            await Promise.all(result.map(async (ele) => {
                if(ele.name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`group_name_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.name = (customName == '' || customName == `group_name_${ele.schedule_id}_${ele['id']}`) ? ele['name'] : customName;
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
}