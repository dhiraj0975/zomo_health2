import { appConstant, CommonArrayService, CommonService, CommunicationTemplateTextsDto, CommunicationTemplateTextsEntity, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { FindOptionsWhere, In } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from "@/guard";
import { TranslationService } from "../../translation/translation.service";
import { CommunicationTemplateTextsService } from "./communicationtemplatetexts.service";
import { CreateCommunicationTemplateTextsInput, GetOneWithTemplateTextInput, PaginateWithTemplateTextInput } from './input';
@Controller('communication/template-texts')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CommunicationTemplateTextsController {
    constructor(
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithTemplateTextInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `communication.status !=0 `;
            if(postData?.org_id){
                where +=`AND communication.org_id IN (${postData?.org_id}, 0) `;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'communication.text');
            }
            const resultedData = await this.communicationTemplateTextService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CommunicationTemplateTextsDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneWithTemplateTextInput) {
        try {
            if (!postData?.id && !postData?.type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser);
            let orgId = user?.org_id;
            let where: FindOptionsWhere<CommunicationTemplateTextsEntity> = Object.create(null);
            if (postData?.id) {
                where['id'] = postData.id;
            }
            if (postData?.type) {
                where['type'] = postData.type;
                where['org_id'] = In([orgId, 0]);
            }
            if (postData?.org_id) {
                where['org_id'] = orgId;
            }
            let mailTemplateDetails = await this.communicationTemplateTextService.findOne(where);
            if (!mailTemplateDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            mailTemplateDetails = <any>(
                await this.commonArrayService.formatToDto(CommunicationTemplateTextsDto, mailTemplateDetails, req.lang)
            );
            const templateDefaultWords: { [key: number]: string[] } = {
                1: ["[First Name]", "[Username]", "[Password]", "[Company Text]"],
                2: ["[First Name]", "[Activation Link]", "[Name]"],
                3: ["[First Name]", "[Company Text]", "[Username]", "[[Password]", "[Company Name]"],
                4: [
                    "[First Name]", "[Team Name]", "[Challenge Name]", "[Challenge Start Date]",
                    "[Challenge End Date]", "[Registration Start Date]", "[Registration End Date]",
                    "[Invited User]", "[Company Name]"
                ],
                5: ["[First Name]", "[Username]", "[Password]", "[Company Name]"],
                6: ["[First Name]"],
                7: ["[First Name]", "[Reset Link]", "[Company Name]"],
                8: [
                    "[First Name]", "[Event Name]", "[Event date]", "[Slot Start time]",
                    "[Slot End time]", "[Event Time Zone]", "[Preferred Language]", "[Calendar File Link]"
                ],
                9: ["[First Name]", "[Username]", "[Password]", "[Company Name]"],
                10: [
                    "[First Name]", "[Company Name]", "[Last Name]", "[Username]",
                    "[Password]", "[Email]", "[Company Code]", "[Street Address]", "[State]"
                ],
                11: ["[First Name]"],
                12: ["[First Name]", "[UserName]", "[Password]", "[Company Name]"],
                13: ["[First Name]"],
                14: ["[First Name]"],
                15: ["[First Name]", "[Username]", "[Password]", "[Company Name]"],
                16: ["[First Name]", "[Username]", "[Password]", "[Company Name]"],
                17: [],
                18: ["[First Name]"],
                19: ["[First Name]", "[Username]", "[Password]", "[Company Name]"],
                20: ["[First Name]", "[Username]", "[Company Name]"],
                21: ["[First Name]", "[Company Name]"],
                22: [],
                23: ["[First Name]", "[Company Name]"],
                24: ["[First Name]", "[Company Name]", "[Link]"],
                25: ["[First Name]", "[Username]", "[Password]"],
                26: ["[First Name]"],
                27: ["[User Code]", "[Name]", "[Email]"],
                28: ["[Username]", "[Image]", "[Form]", "[Link]"],
                29: ["[dynamic_text]"],
                30: ["[Username]", "[Image]", "[Form]", "[Link]"],
                31: ["[Username]", "[Image]", "[Form]", "[Link]"],
                32: ["[First Name]", "[Team Name]", "[RACER #1]", "[RACER #2]", "[Company Name]"],
                33: ["[First Name]", "[Team Name]", "[RACER #1]", "[RACER #2]", "[Company Name]"],
                34: ["[First Name]", "[Team Name]", "[RACER #1]", "[RACER #2]", "[Company Name]"],
                35: ["[First Name]", "[Company Name]"],
                40: [],
                41: ["[User Code]", "[Name]", "[Email]", "[dynamic_text]"]
            };
            // Remove extract from new_text and replace with static text.
            mailTemplateDetails['dynamic_text'] = templateDefaultWords[mailTemplateDetails?.type] || [];
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: mailTemplateDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationTemplateTextsInput) {
        try {
            if (
                (postData?.org_id == undefined || postData?.org_id == null) ||
                !postData?.type || !postData?.new_text
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if(!postData.text){
                postData.text = '';
            }
            //Condition for new system mail template Changing Domain Link to {{IMAGE_BASE_URL}}
            if (postData?.new_text && postData.new_text !== '') {
                const domains = appConstant.DOMAINS_LIST;
                const pattern = new RegExp(
                    '(' +
                    domains
                        .map(domain => domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) // Escape special characters
                        .join('|') +
                    ')',
                    'gi'
                );
                postData.new_text = postData.new_text.replace(pattern, '{{IMAGE_BASE_URL}}');
            }
            await this.communicationTemplateTextService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.communicationTemplateTextService.findOne(where);
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
            await this.communicationTemplateTextService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.COMMUNICATION.TBL_COM_TEMPLATE_TEXTS, req.tokenUser?.id, 'delete');
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationTemplateTextsInput) {
        try {
            if (
                 !postData.org_id || !postData.type
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: FindOptionsWhere<CommunicationTemplateTextsEntity> = Object.create(null);
            if(postData?.id){
                where['id'] = postData.id;
            }
            if(postData?.org_id ){
                where['org_id'] = postData.org_id;
                where['type'] = postData.type;
            }
            const recordDetails = await this.communicationTemplateTextService.findOne(where);
            //Condition for new system mail template Changing Domain Link to {{IMAGE_BASE_URL}}
            if (postData?.new_text && postData.new_text !== '') {
                const domains = appConstant.DOMAINS_LIST_ZOMO_HEALTH;   // Use Zomo Health domains for new system
                const pattern = new RegExp(
                    '(' +
                    domains
                        .map(domain => domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) // Escape special characters
                        .join('|') +
                    ')',
                    'gi'
                );
                postData.new_text = postData.new_text.replace(pattern, '{{IMAGE_BASE_URL}}');
            }
            if (!recordDetails) {
                const recordDetails = await this.communicationTemplateTextService.findOne({ org_id: 0, type: postData?.type });
                if (!recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
                }
                postData.text = recordDetails.text;
                await this.communicationTemplateTextService.save(
                    postData
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success',
                });
            }
            postData.text = (recordDetails?.text) ? recordDetails.text : '';
            await this.communicationTemplateTextService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.COMMUNICATION.TBL_COM_TEMPLATE_TEXTS, req.tokenUser?.id);
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
            const where = Object.create(null);
            if(postData?.org_id){
                where['org_id'] = postData.org_id
            }
            if (postData?.type) {
                const typeIds = postData.type
                    .split(',')
                    .map(id => Number(id.trim()))
                    .filter(id => !isNaN(id));
                where['type'] = In(typeIds)
            }
            let resultedData = await this.communicationTemplateTextService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CommunicationTemplateTextsDto, resultedData, req.lang)
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
}