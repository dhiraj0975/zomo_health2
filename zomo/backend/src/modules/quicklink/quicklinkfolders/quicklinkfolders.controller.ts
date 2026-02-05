import { appConstant, CommonArrayService, CommonService, QuicklinkfoldersDto, tableConstant } from '@common-constants';
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
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateQuickLinkFoldersInput,
    DeleteQuickLinkFoldersInput,
    GetOneQuickLinkFoldersInput,
    ListQuickLinkFoldersInput,
    PaginateWithCompanyInput,
    UpdateQuickLinkFoldersInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuickLinkService } from '../quicklink/quicklink.service';
import { QuickLinkFolderOrgListsService } from '../quicklinkfolderorglists/quicklinkfolderorglists.service';
import { QuickLinkFoldersService } from './quicklinkfolders.service';
@Controller('quick-link/quick-link-folders')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuickLinkFoldersController {
    constructor(
        private readonly quickLinkFoldersService: QuickLinkFoldersService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly quickLinkFolderOrgListsService: QuickLinkFolderOrgListsService,
        private readonly activityLogService: ActivityLogService,
        private readonly quickLinkService: QuickLinkService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.c_companies_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `folders.status = '1'`;
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id) {
                if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                    let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                    if(resultedData.length > 0){
                        postData.c_companies_id = resultedData.map((e)=>e.org_id).join(',');
                    }
                    else{
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: {
                                list: [],
                                limit: postData?.limit,
                                page: postData?.page,
                                pages: 0,
                                total: 0
                            },
                            message: 'success',
                        });
                    }
                }
                if(postData?.global_folder && postData?.global_folder == 1){
                    where += ` AND orglist.c_companies_id IN(${postData?.c_companies_id}) AND folders.global_folder = 1`;
                }else{
                    where += ` AND folders.c_companies_id = ${postData?.c_companies_id}`;
                }
            }else{
                where += ` AND folders.c_companies_id = ${postData?.c_companies_id}`;
            }
            if (req.tokenUser?.role_id === appConstant.ROLE.WCH) {
            where += ` AND folders.created_by IN (${req.tokenUser?.id}, 1)`;
            }
            if (req.tokenUser?.role_id == appConstant.ROLE.BROKERADMIN) {
                where += ` AND EXISTS (
                    SELECT 1 FROM ${tableConstant.BROKER} b
                    WHERE b.org_id = ql.c_companies_id
                    AND b.broker_admin_id = ${req.tokenUser.id}
                )`;
            }
            if (req.tokenUser?.role_id == appConstant.ROLE.BROKER) {
                where += ` AND EXISTS (
                    SELECT 1 FROM ${tableConstant.BROKER} b
                    WHERE b.org_id = ql.c_companies_id
                    AND b.user_id = ${req.tokenUser.id}
                    AND b.is_global = 1
                )`;
            }
            if (req.tokenUser?.role_id == appConstant.ROLE.REGIONALADMIN) {
                where += ` AND EXISTS (
                    SELECT 1 FROM ${tableConstant.REGION.REGIONS} b
                    WHERE b.org_id = ql.c_companies_id
                    AND b.user_id = ${req.tokenUser.id}
                    AND b.is_global = 2
                )`;
            }
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['folders.folder_name']);
            }
            let resultedData = await this.quickLinkFoldersService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuicklinkfoldersDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.folder_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`folder_name_${ele['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${ele['c_companies_id']}`,`dynamic`);
                        ele.folder_name = (customName == '' || customName == `folder_name_${ele['id']}`) ? ele['folder_name'] : customName;
                        ele.folder_name = await this.quickLinkService.replacePreventionCloudLinks(
                            ele.folder_name
                        );
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuickLinkFoldersInput) {
        try {
            if ((postData?.c_companies_id == undefined || postData?.c_companies_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.healthplanname && Array.isArray(postData?.healthplanname) && postData?.healthplanname.length > 0){
                postData.healthplanname = JSON.stringify(postData?.healthplanname);
            }else{
                postData.healthplanname = '';
            }
            const company_ids = postData?.c_companies_id.split(',');
            if(company_ids.length > 1){
                postData.c_companies_id = '0';
                postData.global_folder = 1;
            }
            const folderData =await this.quickLinkFoldersService.save({...postData});
            let dynamicData = Object.create(null);
            if(postData?.folder_name){
                let title = `folder_name_${folderData['id']}`
                dynamicData[`${title}`]= postData?.folder_name;
            }            
            await this.translatorService.DynamicEngJsonData('QuickLink',postData?.c_companies_id,dynamicData,'Edit','QuickLink');
            if(company_ids.length > 1){
                for(let company of company_ids){
                    await this.quickLinkFolderOrgListsService.save({c_companies_id: company, folder_id: folderData['id'], created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Quicklink Folder Has Been Successfully Saved.'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuickLinkFoldersInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.healthplanname && Array.isArray(postData?.healthplanname) && postData?.healthplanname.length > 0){
                postData.healthplanname = JSON.stringify(postData?.healthplanname);
            }else{
                postData.healthplanname = '';
            }
            let where = { id: postData?.id};
            const recordDetails = await this.quickLinkFoldersService.findOneWithoutJoin(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            const orglist = await this.quickLinkFolderOrgListsService.listRecord(["id","c_companies_id","folder_id","status"],{folder_id: recordDetails['id'], status: 1});
            const company_ids = postData?.c_companies_id.split(',');
            const removedElements = orglist.map((e)=>e.c_companies_id.toString()).filter(element => !company_ids.includes(element));
            const addedElements = company_ids.filter(element => !orglist.map((e)=>e.c_companies_id.toString()).includes(element));
            if(removedElements.length){
                removedElements.map(async(ele)=>{
                    const removed =await this.quickLinkFolderOrgListsService.listRecord(["id","c_companies_id","folder_id","status","created_by","updated_by"],{folder_id: recordDetails['id'], c_companies_id: ele});
                     await this.quickLinkFolderOrgListsService.update({folder_id: recordDetails['id'], c_companies_id: ele}, {status: 2,  updated_by: req.tokenUser?.id});
                     removed?.map((ele)=>this.activityLogService.create(ele, {status: 2,  updated_by: req.tokenUser?.id}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS_ORGLISTS, req.tokenUser?.id))
                });
            }
            if(addedElements.length >= 1){
                addedElements.map(async(ele)=> {
                    await this.quickLinkFolderOrgListsService.save({folder_id: recordDetails['id'], c_companies_id: parseInt(ele), status: 1, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
                    let dynamicData = Object.create(null);
                    if(postData?.folder_name){
                        let title = `folder_name_${recordDetails['id']}`
                        dynamicData[`${title}`]= postData?.folder_name;
                    }            
                    await this.translatorService.DynamicEngJsonData('QuickLink', ele ?? recordDetails.c_companies_id,dynamicData,'Edit','QuickLink');
                });
            }
            if(company_ids.length && recordDetails.c_companies_id.toString() != postData?.c_companies_id){
                postData.c_companies_id= '0';
            }
            if(recordDetails.c_companies_id.toString() == postData?.c_companies_id){
                let dynamicData = Object.create(null);
                if(postData?.folder_name){
                    let title = `folder_name_${recordDetails['id']}`
                    dynamicData[`${title}`]= postData?.folder_name;
                }            
                await this.translatorService.DynamicEngJsonData('QuickLink', postData?.c_companies_id ?? recordDetails.c_companies_id,dynamicData,'Edit','QuickLink'); 
            }
            await this.quickLinkFoldersService.update({ id: postData?.id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Quicklink Folder Has Been Successfully Updated.'
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuickLinkFoldersInput) {
        try {
            if (!postData?.id || (postData?.c_companies_id == undefined || postData?.c_companies_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, c_companies_id: postData?.c_companies_id };
            const recordDetails = await this.quickLinkFoldersService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.quickLinkFoldersService.update({ id: recordDetails.id},{ status: 2, updated_by: req.tokenUser?.id });
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS, req.tokenUser?.id, 'delete');
            await this.quickLinkService.update({folder_id: recordDetails.id},{ status: 2});
            this.activityLogService.create(recordDetails, {status:2,remark:'folder_id'}, tableConstant.QUICK_LINK.TBL_QUICK_LINK, req.tokenUser?.id, 'delete');
            const folders = await this.quickLinkFolderOrgListsService.listRecord(["id","c_companies_id","folder_id","status","created_by","updated_by"],{folder_id: recordDetails['id']});
            await this.quickLinkFolderOrgListsService.update({folder_id: recordDetails['id']},{ status: 2, updated_by: req.tokenUser?.id });
            folders?.map((ele)=>this.activityLogService.create(ele, {status: 2,  updated_by: req.tokenUser?.id}, tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS_ORGLISTS, req.tokenUser?.id))
            if (recordDetails) {
                const titleKey = `folder_name_${recordDetails.id}`;
                const dynamicData = {
                    [titleKey]: titleKey
                };
                await this.translatorService.DynamicEngJsonData(
                    'QuickLink',
                    recordDetails.c_companies_id,
                    dynamicData,
                    'Delete',
                    'QuickLink'
                );
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Quicklink Folder Has Been Successfully Deleted.',
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuickLinkFoldersInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where =  `folders.id = ${postData?.id}`;
            if(postData?.c_companies_id){
                where += ` AND folders.c_companies_id = ${postData?.c_companies_id}`;
            }
            let resultedData = await this.quickLinkFoldersService.findOne(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuicklinkfoldersDto, resultedData, req.lang)
            );
            if(resultedData.folder_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`folder_name_${resultedData['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${resultedData['c_companies_id']}`,`dynamic`);
                resultedData.folder_name = (customName == '' || customName == `folder_name_${resultedData['id']}`) ? resultedData['folder_name'] : customName;
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListQuickLinkFoldersInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (postData?.c_companies_id == undefined || postData?.c_companies_id == null) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let newWhere = `folder.c_companies_id IN(${postData?.c_companies_id})`
            if(postData?.c_companies_id == '' || postData?.c_companies_id.split(',').length > 1){
                newWhere = `folder.c_companies_id IN(0)`
            }
            if (postData?.status) {
                newWhere +=  ` AND folder.status= ${postData?.status}`
            }else{
                newWhere +=  ` AND folder.status != 2`
            }
            if (postData?.search_str) {
                newWhere += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['folder.folder_name','folder.healthplanname']);
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'folder.id';
            let quicklinkfolders:any = await this.quickLinkFoldersService.listRecord(["id","c_companies_id","folder_name","status","healthplanname","usernotonhealthplan","global_folder","created_by","updated_by","created","updated"],newWhere, { [orderBy]: order });
            if(quicklinkfolders && quicklinkfolders.length){
                await Promise.all(quicklinkfolders.map(async (ele)=>{
                    if(ele.folder_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`folder_name_${ele['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${ele['c_companies_id']}`,`dynamic`);
                        ele.folder_name = (customName == '' || customName == `folder_name_${ele['id']}`) ? ele['folder_name'] : customName;
                    }
                }));
            }
            let requestData = postData?.c_companies_id.split(',');
            const getGlobalFolder = quicklinkfolders.reduce((acc, folder) => {
                if(!acc[folder.id]){
                    acc[folder.id] = {};
                }
                acc[folder.id]['id'] = folder.id;
                acc[folder.id]['folder_name'] = folder.folder_name;
                return acc;
            }, {});
            const globalFolderOrgSingleArray = quicklinkfolders.flatMap(folder => 
                folder['orglist'] || []
            );
            const ourSelectedArray = requestData.reduce((acc, orgId) => {
                acc[orgId] = [];
                return acc;
            }, {});
            const addFolderArray = new Set();
            const removeFolderArray = new Set();
            globalFolderOrgSingleArray.forEach(orgValue => {
                removeFolderArray.add(orgValue.folder_id);
                if (requestData.includes(orgValue.c_companies_id.toString())) {
                    if (!ourSelectedArray[orgValue.folder_id]) {
                        ourSelectedArray[orgValue.folder_id] = [];
                    }
                    ourSelectedArray[orgValue.folder_id].push(orgValue.c_companies_id.toString());
                    const remainingOrgs = requestData.filter(
                        orgId => !ourSelectedArray[orgValue.folder_id].includes(orgId)
                    );
                    if (remainingOrgs.length === 0) {
                        addFolderArray.add(orgValue.folder_id);
                        removeFolderArray.delete(orgValue.folder_id);
                    }
                }
            });
            // Final processing
            const finalAddFolderArray = [...new Set(addFolderArray)];
            const finalRemoveFolderArray = [...new Set(removeFolderArray)];
            let finalyAddFolderArray = [];
            if (finalAddFolderArray.length > 0) {
                finalyAddFolderArray = finalAddFolderArray.filter(
                    folderId => !finalRemoveFolderArray.includes(folderId)
                );
            }
            // Remove folders from global folders
            const quicklinkfoldersFiltered = Object.fromEntries(
                Object.entries(getGlobalFolder).filter(
                    ([folderId]) => !finalRemoveFolderArray.includes(Number(folderId))
                )
            );
            quicklinkfolders = Object.values(quicklinkfoldersFiltered);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: quicklinkfolders,
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
}