import { FilesService } from '@/modules/datamanagement/files/files.service';
import { appConstant, CommonService } from '@common-constants';
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
import { BrokerService } from 'src/modules/broker/broker.service';
import { CoachesService } from 'src/modules/coach/coaches/coaches.service';
import { DocumentService } from 'src/modules/datamanagement/document/document.service';
import { DataManagersService } from 'src/modules/healthcheckup/datamanagers/datamanagers.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { RoleService } from 'src/modules/master/role/role.service';
import { In } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from '../../translation/translation.service';
import {
    AccessFileInput
} from "./input";
const S3_URL =  process.env.S3_URL_PROD

@Controller('user')
export class AccessFileController {
    constructor(
        private readonly commonService: CommonService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly rolesService: RoleService,
        private readonly dataManagersService: DataManagersService,
        private readonly brokerService: BrokerService,
        private readonly coachesService: CoachesService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly documentService: DocumentService,
        private readonly filesService: FilesService,
    ) { }
    
    @Post('get-file')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async getFile(@Req() req: Request, @Res() res: Response, @Body() postData: AccessFileInput) {
        try {
            if(postData?.type && postData?.type == 'permission'){
                postData.file = `local/data.json`;
            }
            if(postData?.type != 15){
                if (!postData?.file) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING',),);
                }
            }else{
                if (!postData?.item_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING',),);
                }
            }
            const user = Object.create(req.tokenUser);
            let result = {
                file: '',
                extention: ''
            };
            let file = '';
            if(postData?.file){
                file = postData?.file.includes(S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD,process.env.AWS_BUCKET_PRIVATE_PROD)) ? postData?.file.replace((S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD,process.env.AWS_BUCKET_PRIVATE_PROD)),'') : postData?.file;
            }
            let type = postData?.type;
            let org_id = postData?.org_id ?? user.org_id;
            let user_id = postData?.user_id ?? user.id;
            let role_id = postData?.role_id ?? user.role_id;
            const roleData = await this.rolesService.findOne({id: role_id});
            let role_slug = roleData?.alias;
            let fileKey;
            if (type !== undefined && type == 'di') { // 'di' is for Default images
                fileKey = file;
            } else if (type !== undefined && type == '1') { // '1' is for Covid record and certificate
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || (role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE) && user_id == user.id))) {
                    fileKey = file;
                }
            } else if (type !== undefined && type == '2') { // '2' is for Activity Form
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.WCH || (role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE) && user_id == user.id))) {
                    fileKey = file;
                } else if (role_id == appConstant.ROLE.GLOBALDATAMANAGER) {
                    const OrgListIDs = await this.getOrgListData(37, user_id, role_slug, req);
                    if (OrgListIDs.includes(org_id)) {
                        fileKey = file;
                    }
                }
            } else if (type !== undefined && type == '3') { // '3' is for Health Form
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.WCH || (role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE) && user_id == user.id))) {
                    fileKey = file;
                } else if (role_id == appConstant.ROLE.GLOBALDATAMANAGER || role_id == appConstant.ROLE.DATAMANAGER) {
                    const OrgListIDs = await this.getOrgListData(role_id, user_id, role_slug, req);
                    if (OrgListIDs.includes(org_id)) {
                        fileKey = file;
                    }
                }
            } else if (type !== undefined && type == '4') { // '4' is for Reimbursement Form
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.WCH || (role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE) && user_id == user.id))) {
                    fileKey = file;
                } else if (role_id == appConstant.ROLE.GLOBALDATAMANAGER) {
                    const OrgListIDs = await this.getOrgListData(37, user_id, role_slug, req);
                    if (OrgListIDs.includes(org_id)) {
                        fileKey = file;
                    }
                }
            } else if (type !== undefined && type == '5') { // '5' is for Covid Passport
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || (role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE) && user_id == user.id))) {
                    fileKey = file;
                }
            } else if (type !== undefined && type == '6') { // '6' is for Company Welcome User Attachment
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE)) || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.BROKERADMIN || role_id == appConstant.ROLE.BROKER))) {
                    fileKey = file;
                } else if ([7, 22, 23].includes(role_id)) {
                    const OrgListIDs = await this.getOrgListData(role_id, user_id, role_slug, req);
                    if (OrgListIDs.includes(org_id)) {
                        fileKey = file;
                    }
                }
            } else if (type !== undefined && type == '7') { // '7' is for My Plan in On Screen Shot Upload Image
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE))) {
                    fileKey = file;
                } else if (role_id == appConstant.ROLE.GLOBALCOACH) {
                    const OrgListIDs = await this.getOrgListData(19, user_id, role_slug, req);
                    if (OrgListIDs.includes(org_id)) {
                        fileKey = file;
                    }
                }
            } else if (type !== undefined && type == '8') { // '8' is for Import User Files
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE))) {
                    fileKey = file;
                }
            } else if (type !== undefined && type == '9') { // '9' is for Schedule Challenge in Import User Rejected Files
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN))) {
                    fileKey = file;
                }
            } else if (type !== undefined && type == '10') { // '10' is for Schedule Challenge in Import Mile Files
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN))) {
                    fileKey = file;
                }
            } else if (type !== undefined && type == '11') { // '11' is for Health Data Import Files
                if (role_id == appConstant.ROLE.ADMIN) {
                    fileKey = file;
                }
            } else if (type !== undefined && type == '12') { // '12' is for Health Data Import Rejected, Created, and Updated Files
                if (role_id == appConstant.ROLE.ADMIN) {
                    fileKey = file;
                }
            } else if (type !== undefined && type == '13') { // '13' is for Challenge Weight, Export, Rejected, Created, and Updated Files
                if (role_id == appConstant.ROLE.ADMIN) {
                    // if (type[1] == '1') {
                    //     fileKey = file;
                    // } else if (type[1] == '2') {
                    //     fileKey = file;
                    // } else if (type[1] == '3') {
                    //     fileKey = file;
                    // } else if (type[1] == '4') {
                    //     fileKey = file;
                    // }
                    fileKey = file;
                }
            } else if (type !== undefined && type == '14') { // '14' is for Challenge Recipe Image
                if(!file.includes(org_id) || !file.includes('challenge/schedulech')){
                    file = `challenge/schedulech/${postData?.schedule_id}/recipe/` + file;
                }
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || (role_id == appConstant.ROLE.REGISTERED || role_id == appConstant.ROLE.SPOUSE) && user_id == user.id))) {
                    fileKey = file;
                }
            } else if (type !== undefined && type == '15') { // '15' is for Document Download
                if (!org_id || (role_id == appConstant.ROLE.BROKER || role_id == appConstant.ROLE.BROKERADMIN || role_id == appConstant.ROLE.REGIONALADMIN)) {  
                    const checkDocument = await this.documentService.findOne({id: postData?.item_id, status: 1});
                    if (checkDocument) {
                        if(checkDocument?.is_login == 0 || (role_id == appConstant.ROLE.ADMIN || role_id == appConstant.ROLE.BROKER || role_id == appConstant.ROLE.BROKERADMIN || role_id == appConstant.ROLE.REGIONALADMIN)){
                            if (checkDocument) {
                                fileKey = checkDocument?.doc_name || 'notfound';
                            }else{
                                fileKey = 'notfound';
                            }
                        }else{
                            fileKey = 'notfound';
                        }
                    }else{
                        fileKey = 'notfound';
                    }
                }else{
                    let checkDocument = null;
                    if(role_id == appConstant.ROLE.ADMIN){
                        checkDocument = await this.documentService.findOne({id: postData?.item_id, status: 1});
                    }else{
                        checkDocument = await this.documentService.findOne({id: postData?.item_id, status: 1, organization_id: In([org_id, 0])});
                        if(!checkDocument){
                            checkDocument = await this.filesService.findOne({id: postData?.item_id, status: 1});
                        }
                    }
                    if (checkDocument) {
                        fileKey = (checkDocument?.doc_name ? checkDocument?.doc_name : checkDocument?.file_name) || 'notfound';
                    }else{
                        fileKey = 'notfound';
                    }
                }
                file = fileKey;
            }  else if (type !== undefined && type == '16') { // '16' is for Custom point upload incentive
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.WCH))) {
                    fileKey = file;
                } else if ([7, 22, 23, 20].includes(role_id)) {
                    const OrgListIDs = await this.getOrgListData(role_id, user_id, role_slug, req);
                    if (OrgListIDs.includes(org_id)) {
                        fileKey = file;
                    }
                }
            } else if (type !== undefined && type == '17') { // '17' is for Campaign annual report
                if (role_id == appConstant.ROLE.ADMIN || (file.includes(org_id) && (role_id == appConstant.ROLE.ORGADMIN || role_id == appConstant.ROLE.WCH))) {
                    role_id == appConstant.ROLE.WCH
                    fileKey = file;
                }
            }  else if (type !== undefined && type == '18') { // '18' is for Org Census report
                if (role_id == appConstant.ROLE.ADMIN) {
                    file = `reports/censusreport/${postData?.item_id}/` + file;
                    fileKey = file;
                }
            } else if (type !== undefined && type == 'permission') { // 'permission file
                fileKey = file;
            }  else {
                fileKey = 'notfound';
            }
            let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: fileKey ?? file,  userBucket: 'private'}));
            if(fileData){
                result['file'] = file.split('/')[file.split('/').length -1]; 
                result['extention'] = file.split('.')[file.split('.').length -1]; 
                result['ContentType'] = fileData.ContentType; 
                let encrypted = this.commonService.passwordEncrypt(fileData.Body?.type == 'Buffer' ? Buffer.from(fileData.Body.data).toString('base64') : fileData.Body);
                result['encrypted'] = encrypted;  
            }
            if (fileData && type !== undefined && type == 'permission') {   // return permission file data as JSON
                let user= Object.create(req.tokenUser)
                let jsonData = JSON.parse(Buffer.from(fileData.Body, 'base64').toString('utf-8'));
                if (jsonData && jsonData[user.role_id]) {
                    result = jsonData[user.role_id];
                }
            } 
            if(result.file == '' && result.extention == ''){
                result['message'] = 'No file found';
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

    async getOrgListData(role_id: number, user_id: number, role_name: string, req: Request) {
        try{
            let data;
            let condition;
            if(role_id == appConstant.ROLE.GLOBALDATAMANAGER || role_id == appConstant.ROLE.DATAMANAGER){
                condition = '';
                if(role_name != 'globaldatamanager'){
                    condition=`datamanager.user_id = ${user_id}`;
                }else{
                    condition=`company.companytype_id = 3`;
                }
                data = await this.dataManagersService.listRecord(condition,null,['datamanager.id','company.id'])
            }
            else if(role_id == appConstant.ROLE.BROKER){
                data = await this.brokerService.listRecord(`broker.user_id = ${user_id} AND broker.is_global = 1`,null,['broker.id','company.id']);
            }
            else if(role_id == appConstant.ROLE.BROKERADMIN){
                let companycode = req.tokenUser?.membership_code;
                data = await this.brokerService.listRecord(`broker.broker_admin_id = ${user_id}`,null,['broker.id','company.id']);
                let dataBroker = await this.brokerService.listRecord(`user.membership_code = '${companycode}' AND user.role_id = 7`,null,['broker.id','company.id']);
                if(dataBroker && dataBroker.length){
                    data = data.concat(dataBroker);
                }
                let RegionalUsers = await this.brokerService.listRecord(`user.membership_code = '${companycode}' AND user.role_id = 23`,null,['broker.id','company.id']);
                if(RegionalUsers && RegionalUsers.length){
                    data = data.concat(RegionalUsers);
                }
            }
            else if(role_id == appConstant.ROLE.REGIONALADMIN){
                data = await this.brokerService.listRecord(`broker.user_id = ${user_id} AND broker.is_global = 2`,null,['broker.id','company.id']);
            }
            else if(role_id == appConstant.ROLE.GLOBALCOACH || role_id == 20){
                if (role_id == appConstant.ROLE.GLOBALCOACH) {
                    condition = `coach.coach_manager_id = ${user_id}`;
                }
                else if(role_id = 20){
                    condition = `coach.user_id = ${user_id}`;
                }
                data = await this.coachesService.listRecord(condition,null,['coach.id','company.id'],'company.id');
            }
            return data;
        }
        catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }

    @Post('get-public-file')
    async getPublicFile(@Req() req: Request, @Res() res: Response, @Body() postData: AccessFileInput) {
        try {
            if (!postData?.type || !postData?.item_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING',),);
            }
            let result = {
                file: '',
                extention: ''
            };

            let file = '';
            let type = postData?.type;
            let fileKey;
            if (type !== undefined && type == '15') { // '15' is for Document Download
                let checkDocument = null;
                checkDocument = await this.documentService.findOne({id: postData?.item_id, status: 1});
                if (checkDocument) {
                    if(checkDocument?.is_login == 0){
                        fileKey = checkDocument?.doc_name || 'notfound';
                    }else{
                        fileKey = 'notfound';
                    }
                }else{
                    fileKey = 'notfound';
                }
                file = fileKey;
            }  else {
                fileKey = 'notfound';
            }
            let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: fileKey ?? file,  userBucket: 'private'}));
            if(fileData){
                result['file'] = file.split('/')[file.split('/').length -1]; 
                result['extention'] = file.split('.')[file.split('.').length -1]; 
                result['ContentType'] = fileData.ContentType; 
                let encrypted = this.commonService.passwordEncrypt(fileData.Body?.type == 'Buffer' ? Buffer.from(fileData.Body.data).toString('base64') : fileData.Body);
                result['encrypted'] = encrypted;  
            }
            if(result.file == '' && result.extention == ''){
                result['message'] = 'No file found';
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
