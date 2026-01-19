import { tableConstant } from "@common-constants";
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { WellBeingCategoryService } from "../wellbeingcategory/wellbeingcategory.service";
import { WellBeingPostService } from "../wellbeingpost/wellbeingpost.service";
const { google } = require('googleapis');
@Controller('emotional-wellbeing')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class WellBeingController {
    constructor(
        private readonly wellbeingCategoryService: WellBeingCategoryService,
        private readonly wellbeingPostService: WellBeingPostService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('copy-data')
    async copyData(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.from_organization || !postData?.to_organization) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { org_id: postData?.from_organization, status: Not(2) };
            let categoryData = await this.wellbeingCategoryService.listRecord(where);
            categoryData = await this.buildTree(categoryData);
            await this.processTree(categoryData, null, postData, req, where);
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
    @Post('sheet-copy-data')
    async sheetCopyData(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.title || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let result = await this.adminSheetCopyData()
            if(result && result.length){
                const where = { org_id: postData?.org_id, status: Not(2) };
                let categoryData = await this.wellbeingCategoryService.save({title: postData?.title ?? 'Journey Videos', org_id: postData?.org_id, description: postData?.title ?? 'Journey Videos', layout_type: 3, created_by: -1, updated_by: -1})
                if(categoryData){
                    let postRecords = await this.wellbeingPostService.listRecord({...where, cat_id: categoryData['id']});
                    for (let Videokey = 0; Videokey < result.length; Videokey++) {
                        let Videoval = result[Videokey]; 
                        let tempdata  = ['maincollections','secondarycategory','provider_name','title','short_desc','language','maincollection','tags','atime','display_area'];
                        Videoval = Videoval.slice(0, 10);
                        Videoval = tempdata.reduce((acc, key, index) => {
                            acc[key] = Videoval[index] || null; 
                            return acc;
                        }, {});
                        if (Object.keys(Videoval).length === 10) {
                            if (Videoval.display_area) {
                                Videoval.display_area = Videoval.display_area.replace("vimeo.com", "player.vimeo.com/video");
                            }
                            const vurl = Videoval.display_area || "";
                            const existingPost = postRecords.find(item => item.display_area === vurl);
                            if (existingPost) {
                                Videoval.id = existingPost.id;
                            } else {
                                Videoval.post_img = `${Videokey + 1}.png`;
                            }
                            Videoval.org_id = postData?.org_id; 
                            Videoval.cat_id = categoryData['id'];
                            Videoval.display_type = 1;
                            Videoval.more_desc = '';
                            Videoval.created_by = Videoval.updated_by = -1;
                            if (Videoval.atime) {
                                let duration = Videoval.atime.split(':');
                                if (duration.length === 3 && parseInt(duration[0]) > 10 && (duration[2] === '00' || duration[2] === '0')) {
                                    duration.pop();
                                    Videoval.atime = duration.join(':');
                                }
                                let durationFormatted = Videoval.atime.replace(/^([\d]{1,2}):([\d]{2})$/, "00:$1:$2");
                                const [hours = 0, minutes = 0, seconds = 0] = durationFormatted.split(':').map(Number);
                                let durationInMinutes = hours * 60 + minutes + seconds / 60;
                                Videoval.atime = Math.round(durationInMinutes) || 1;
                            }
                            Videoval.atime_type = 0;
                            if (Videoval.maincollection === 'none') {
                                delete Videoval.maincollection;
                            }
                            if (Videoval.secondarycategory === 'none') {
                                delete Videoval.secondarycategory;
                            }
                            const saveSuccess = await this.wellbeingPostService.save(Videoval); 
                            if (saveSuccess) {
                                const linpost_id = saveSuccess['id']; 
                                if (linpost_id) {
                                    postRecords.push({ display_area: vurl, id: linpost_id }); 
                                }
                            }
                        }
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Sheet Data copied successfully.',
                });
            }
            else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'Sorry! Sheet in data not found')); 
            }
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
    async adminSheetCopyData(){
        try{
            const auth = new google.auth.JWT(
                {
                    email: process.env.CLIENT_EMAIL,
                    key: process.env.PRIVATE_KEY, 
                    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
                }
            );
            await auth.authorize();
            const sheets = google.sheets({ version: 'v4', auth });
            const spreadsheetId = process.env.SHEETID;
            const range = 'Sheet1';
            let response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });
            if(response.data && response.data.values){
                response = response.data.values;
            }
            return response.slice(1);
        } 
        catch (error) {
            throw new Error('Error fetching data from Google Sheets');
        }
    }
    async buildTree(data) {
        try{
            const map = new Map();
            const tree = [];
            for (const item of data) {
                map.set(item.id, { ...item, children: [] });
            }
            for (const item of data) {
                const node = map.get(item.id);
                if (item.parent_id == null) {
                    tree.push(node);
                } else {
                    const parent = map.get(item.parent_id);
                    if (parent) {
                        parent.children.push(node);
                    }
                }
            }
            return tree;
        }catch(error) {
            throw new Error(error?.message);
        }
    }
    async processTree(nodes, parentId = null, postData, req, where) {
        try {
            for (const node of nodes) {
                const record = JSON.parse(JSON.stringify(node));
                const element = { ...node };
                delete element.id;
                delete element.lft;
                delete element.rght;
                element.parent_id = parentId;
                element.org_id = postData?.to_organization;
                element.created_by = 1;
                element.updated_by = 1;
                const savedData = await this.wellbeingCategoryService.saveNew(element, parentId);
                await this.activityLogService.create(
                    record,
                    savedData,
                    tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY,
                    req.tokenUser?.id,
                    'copy'
                );
                const postRecords = await this.wellbeingPostService.listRecord({
                    ...where,
                    cat_id: record.id
                });
                if (postRecords) {
                    for (const post of postRecords) {
                        const postCopy = JSON.parse(JSON.stringify(post));
                        delete post.id;
                        post.created_by = 1;
                        post.updated_by = 1;
                        post.org_id = postData?.to_organization;
                        post.cat_id = savedData['id'];
                        const savedPost = await this.wellbeingPostService.save(post);
                        await this.activityLogService.create(
                            postCopy,
                            savedPost,
                            tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                            req.tokenUser?.id,
                            'copy'
                        );
                    }
                }
                if (node?.children && node?.children.length > 0) {
                    await this.processTree(
                        node.children,
                        savedData['id'],
                        postData,
                        req,
                        where
                    );
                }
            }
            return true;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}