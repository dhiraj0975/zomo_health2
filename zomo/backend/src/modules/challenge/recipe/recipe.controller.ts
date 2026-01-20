import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, RecipeDto, tableConstant } from '@common-constants';
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
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateRecipeInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    PaginateWithChallengeInput,
    UpdateRecipeInput
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { RecipeService } from './recipe.service';
const path = require('path');
@Controller('challenge/recipe')
@UseGuards(TokenGuard, RoleGuard)
export class RecipeController {
    constructor(
        private readonly recipeService: RecipeService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly brokerService: BrokerService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            let user = Object.create(req.tokenUser);
            let user_id = user.id;
            let org_id = user.org_id;
            let rold_id = user.role_id;
            postData = this.commonService.sanitizePayload(postData);
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            // check for broker admin, broker, regional admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN,appConstant.ROLE.BROKER,appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    rold_id,
                    user_id,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }
            let where = (rold_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `recipe.status != 2` : `recipe.status = 1`;
            if (postData?.schedule_id) {
                where += ` AND recipe.schedule_id = ${postData?.schedule_id}`;
            }
            if(rold_id == 2 || rold_id == 16){
                where += ` AND recipe.user_id = ${user_id} AND recipe.org_id = ${org_id}`;
            }else{
                where += (rold_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `` : ` AND recipe.org_id = ${org_id}`;
            }
            if (postData?.search_str) {
                if(this.commonDateService.isValidDate(postData?.search_str)){
                    where += ` AND (recipe.created BETWEEN '${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 23:59:59')`;
                }
                else {
                  switch (postData?.search_str) {
                    case 'Breakfast':
                        where += " AND recipe.recipe_type = 1 ";
                        break;
                    case 'Lunch':
                        where += " AND recipe.recipe_type = 2 ";
                        break;
                    case 'Dinner':
                        where += " AND recipe.recipe_type = 3 ";
                        break;
                    case 'Appetizer':
                        where += " AND recipe.recipe_type = 4 ";
                        break;
                    case 'Dessert':
                        where += " AND recipe.recipe_type = 5 ";
                        break;
                    case 'Snack':
                        where += " AND recipe.recipe_type = 6 ";
                        break;
                    case 'Drink':
                        where += " AND recipe.recipe_type = 7 ";
                        break;
                    case 'Other':
                        where += " AND recipe.recipe_type = 8 ";
                        break;
                    default:
                        where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['recipe.recipe_name','recipe.recipe_ingredients','user.username','user.code']);
                        break;
                    }
                }
            }
            where += ` AND (user.id IS NOT NULL)`;
            const resultedData = await this.recipeService.paginateList(
                where,
                postData,
            );
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_ACCESS'));
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(RecipeDto, resultedData['list'], req.lang)
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
    @Post('create')
    @UseInterceptors(
        FileInterceptor("recipe_image", {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateRecipeInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.schedule_id || !postData?.org_id || !postData?.user_id || !postData?.recipe_name) {
                if (file && file.filename && file.fieldname === 'recipe_image') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let recipe_name;
            if(postData?.recipe_name){
                recipe_name = this.commonService.generateDynamicSearchQuery(postData?.recipe_name,['recipe.recipe_name']);
            }        
            let where = `recipe.schedule_id = ${postData?.schedule_id} AND recipe.user_id = ${postData?.user_id} AND recipe.org_id = ${postData?.org_id} AND recipe.status != 2${recipe_name}`;           
            const recordDetails = await this.recipeService.findOne(where);
            if (recordDetails) {
                let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Recipe Name Already Taken.`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, errorMsgTrans));
            }
            let recipeResult = await this.recipeService.save({...postData});
            if (file && file.fieldname === 'recipe_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/schedulech/${postData?.schedule_id}/recipe/${recipeResult['id'].toString()}_${this.commonService.generateMD5(req.tokenUser?.id.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                await this.recipeService.update({ id: recipeResult['id']},{recipe_image: filename});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,`Recipe Created Successfully.`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
            });
        } catch (error) {
            if (file && file.fieldname === 'recipe_image' && file.filename) {
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
        FileInterceptor("recipe_image", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateRecipeInput, @UploadedFile() file: Express.Multer.File) {
        try {
            let user = Object.create(req.tokenUser);
            let user_id = user.id;
            let org_id = user.org_id;
            let rold_id = user.role_id;
            if (!postData?.id || !postData?.schedule_id) {
                if (file && file.filename && file.fieldname === 'recipe_image') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `recipe.id = ${postData?.id} AND recipe.schedule_id = ${postData?.schedule_id}`;
            if(rold_id == 2 || rold_id == 16){
                where += ` AND recipe.user_id = ${user_id} AND recipe.org_id = ${org_id}`;
            }else{
                where += (rold_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `` : ` AND recipe.org_id = ${org_id}`;
            }
            const recordDetails = await this.recipeService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_ACCESS'));
            }
            if (file && file.fieldname === 'recipe_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/schedulech/${postData?.schedule_id}/recipe/${recordDetails['id'].toString()}_${this.commonService.generateMD5(req.tokenUser?.id.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                postData['recipe_image'] = filename;
            }
            await this.recipeService.update({ id: postData?.id, schedule_id: postData?.schedule_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_RECIPE, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && file.fieldname === 'recipe_image' && file.filename) {
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
            let user = Object.create(req.tokenUser);
            let user_id = user.id;
            let org_id = user.org_id;
            let rold_id = user.role_id;
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `recipe.id = ${postData?.id} AND recipe.schedule_id = ${postData?.schedule_id}`;
            if(rold_id == 2 || rold_id == 16){
                where += ` AND recipe.user_id = ${user_id} AND recipe.org_id = ${org_id}`;
            }else{
                where += (rold_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `` : ` AND recipe.org_id = ${org_id}`;
            }
            const recordDetails = await this.recipeService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_ACCESS'));
            }
            await this.recipeService.update({id: postData?.id, schedule_id: postData?.schedule_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_RECIPE, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'The Recipe has been deleted.'),
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
            let user = Object.create(req.tokenUser);
            let user_id = user.id;
            let org_id = user.org_id;
            let rold_id = user.role_id;
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `recipe.id = ${postData?.id} AND recipe.schedule_id = ${postData?.schedule_id}`;
            if(rold_id == 2 || rold_id == 16){
                where += ` AND recipe.user_id = ${user_id} AND recipe.org_id = ${org_id}`;
            }else{
                where += (rold_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `` : ` AND recipe.org_id = ${org_id}`;
            }
            let resultedData = await this.recipeService.findOne(where);
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_ACCESS'));
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(RecipeDto, resultedData, req.lang)
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
}