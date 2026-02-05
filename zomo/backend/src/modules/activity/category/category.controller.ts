import { CampaignCategoryService } from '@/modules/campaign/category/campaigncategory.service';
import { CategoryDto, CommonArrayService, CommonFileService, CommonService, tableConstant } from '@common-constants';
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
    CopycategoryInput,
    CreateCategoryInput,
    DeleteCategoryInput,
    HideshowcategoryInput,
    PaginationCategoryInput,
    UpdateCategoryInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { CategoryService } from './category.service';
@Controller('category')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CategoryController {
    constructor(
        private readonly categoryService: CategoryService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly campaignCategoryService: CampaignCategoryService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationCategoryInput) {
        try {
            var where = 'category.status != 2';
            postData = this.commonService.sanitizePayload(postData)
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'category.category_name');
            } else if (postData?.status == '') {
                throw Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_SELECT_VALIDATION')).replace('%s', 'search'));
            }
            if(postData?.status){
                where += `${where.length !== 0 ? ' AND' : ''} (category.status = '${postData?.status}')`;
            }
            const resultedData = await this.categoryService.paginateList(
                ["category.id","category.category_name","category.status"],
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CategoryDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.category_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele['id']}`, `/LC_MESSAGES/Campaign/Category/${ele['id']}`,`dynamic`);
                        ele.category_name = (customName == '' || customName == `category_name_${ele['id']}`) ? ele['category_name'] : customName;
                    }
                    if(ele.description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_description_${ele['id']}`, `/LC_MESSAGES/Campaign/Category/${ele['id']}`,`dynamic`);
                        ele.description = (customName == '' || customName == `category_description_${ele['id']}`) ? ele['description'] : customName;
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
    @Put('hide-show')
    async categoryHideShow(@Req() req: Request, @Res() res: Response, @Body() postData: HideshowcategoryInput) {
        try {
            if (!postData?.id || (postData?.status == undefined || postData?.status == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.categoryService.findOne({ id: postData?.id });
            const resultedData = await this.categoryService.update({ id: postData?.id },{status: postData?.status});
            this.activityLogService.create(recordDetails, {status: postData?.status}, tableConstant.ACTIVITIES.TBL_CATEGORIES, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resultedData.affected,
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
    async copy(@Req() req: Request, @Res() res: Response, @Body() postData: CopycategoryInput) {
        try {
            let returnResponce;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const category = await this.categoryService.findOne({id: postData?.id});
            if (category) {
                const categoryData = JSON.parse(JSON.stringify(category));
                delete category.id;
                category['category_name'] = category.category_name + ' Copy';
                returnResponce = await this.categoryService.save({...category});
                this.activityLogService.create(categoryData, returnResponce, tableConstant.ACTIVITIES.TBL_CATEGORIES, req.tokenUser?.id, 'Copy');
            } else {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_COPY_FIELD')).replace('%s', 'Category'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {id: returnResponce.id},
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCategoryInput) {
        try {
            if (!postData?.category_name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData.category_name = postData?.category_name.trim();
            const categoryCheck = await this.categoryService.findOne({
                category_name: postData?.category_name,
            });
            if (categoryCheck) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Category'));
            }
            let recordDetails = await this.categoryService.save({...postData});
            let dynamicData = Object.create(null);
            if(postData?.category_name){
                let title = `category_name_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.category_name;
            }            
            if(postData?.description){
                let title = `category_description_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('Campaign','',dynamicData,'Edit','Category',recordDetails['id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCategoryInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.category_name){
                postData.category_name = postData?.category_name.trim();
                const categoryCheck = await this.categoryService.findOne({
                    category_name: postData?.category_name,
                });
                if (categoryCheck) {
                    throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Category'));
                }
            }
            const recordDetails = await this.categoryService.findOne({ id: postData?.id });
            let dynamicData = Object.create(null);
            if(postData?.category_name){
                let title = `category_name_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.category_name;
            }            
            if(postData?.description){
                let title = `category_description_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('Campaign','',dynamicData,'Edit','Category',recordDetails['id']);
            const resultedData = await this.categoryService.update({ id: postData?.id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_USERS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resultedData.affected,
                message: 'success'
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteCategoryInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id};
            this.commonFileService.addMembershipCodeCondition(req, where)
            const recordDetails = await this.categoryService.findOne(where);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.categoryService.update(where, { status: 2});
            /* Campaign Category Delete */
                let campCategoryIds = await this.campaignCategoryService.assignCategoryCampaignIds({category_id: postData?.id, status: Not(2)});
                if(campCategoryIds && campCategoryIds.length){
                    await this.campaignCategoryService.update({ id: In(campCategoryIds)},{ status: 2 });
                    const campaignCategory = await this.campaignCategoryService.listRecord({id: In(campCategoryIds)});
                    campaignCategory?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CATEGORY, req.tokenUser?.id, 'category delete'));
                }
            /* Campaign Category Delete */
            this.activityLogService.create(recordDetails, postData, tableConstant.ACTIVITIES.TBL_CATEGORIES, req.tokenUser?.id, 'delete');
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (postData?.status == undefined || postData?.status == null) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let order;
            if (postData?.order_by && postData?.order) {
                order = { [postData?.order_by]: postData?.order };
            }
            delete postData?.order_by, delete postData?.order;            
            let resultedData = await this.categoryService.listRecord(['id', 'category_name', 'qty_req', 'reqby_usr', 'reqby_spouse', 'max_freto_earn_point', 'point_for_each', 'max_point_per_cham', 'orgenization_code', 'description', 'plugin', 'controller', 'action', 'newlink', 'ext_link', 'status'], { ...postData }, order);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CategoryDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.category_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele['id']}`, `/LC_MESSAGES/Campaign/Category/${ele['id']}`,`dynamic`);
                        ele.category_name = (customName == '' || customName == `category_name_${ele['id']}`) ? ele['category_name'] : customName;
                    }
                    if(ele.description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_description_${ele['id']}`, `/LC_MESSAGES/Campaign/Category/${ele['id']}`,`dynamic`);
                        ele.description = (customName == '' || customName == `category_description_${ele['id']}`) ? ele['description'] : customName;
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            this.commonFileService.addMembershipCodeCondition(req, where)
            let recordDetails = await this.categoryService.findOne(where);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(CategoryDto, recordDetails, req.lang)
            );
            if(recordDetails.category_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${recordDetails['id']}`, `/LC_MESSAGES/Campaign/Category/${recordDetails['id']}`,`dynamic`);
                recordDetails.category_name = (customName == '' || customName == `category_name_${recordDetails['id']}`) ? recordDetails['category_name'] : customName;
            }
            if(recordDetails.description){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_description_${recordDetails['id']}`, `/LC_MESSAGES/Campaign/Category/${recordDetails['id']}`,`dynamic`);
                recordDetails.description = (customName == '' || customName == `category_description_${recordDetails['id']}`) ? recordDetails['description'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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
    @Post('check-assign-category')
    async checkAssignCategory(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `campaigncategory.category_id = '${postData?.id}' AND campaigncategory.status != '2'`;
            let recordDetails:any = await this.campaignCategoryService.assignCategoryCampaignPaginate(where, postData, ["campaigncategory.id","campaign.id","campaign.campaign_name","company.company_name"]);
            let is_assign = 0;
            if(recordDetails['list'] && recordDetails['list'].length){
                is_assign = 1;
            }
            recordDetails['is_assign'] = is_assign;
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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
