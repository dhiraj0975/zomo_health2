import { appConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityService } from 'src/modules/activity/activity/activity.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { AgeGroupService } from '../agegroup/agegroup.service';
import { FormInstructionsService } from '../forminstructions/forminstructions.service';
import { AgeActivityService } from './ageactivity.service';
import { CreateAgeActivityInput } from './input';
@Controller('health-checkup/age-activity')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AgeActivityController {
    constructor(
        private readonly AgeActivityService: AgeActivityService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly activityService: ActivityService,
        private readonly formInstructionsService: FormInstructionsService,
        private readonly agegroupService: AgeGroupService,
    ) { }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAgeActivityInput) {
        try {
            if (!postData?.title || !postData?.group_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                let orgId = postData?.org_id;
                if (postData?.accessibility == 0) {
                    postData['org_id'] = 0;
                }
                if(postData?.min_age && postData?.max_age) {
                    postData.max_age = postData?.max_age + 1 ;
                }
                let ageactivity = await this.AgeActivityService.save({ ...postData });
                /* Activity Table Entry */
                postData['activity_name'] = postData?.title;
                postData['category_id'] = 20;
                postData['accebility'] = postData?.org_id ?? 0;
                postData['created_by'] = req.tokenUser?.id;
                let inactivity = await this.activityService.save({ ...postData })
                await this.AgeActivityService.update({ id: ageactivity['id'] }, { age_activity_id: ageactivity['id'], ref_activity_id: inactivity['id'] });
                /* Activity Table Entry */
                let condition = `ageactivity.status = 1`;
                let groupType = await this.agegroupService.listRecord({ status: 1 },['agegroup']);
                let groupTypeTitle = groupType.reduce((acc, item) => {
                    acc[item.id] = item.group_name;
                    return acc;
                }, {}as Record<number, string>); 
                let resultedData = await this.AgeActivityService.listRecord(condition, ['ageactivity']);
                let aas_form_prog = [];
                if (orgId) {
                    let formInstruction = await this.formInstructionsService.findOne({ company_id: orgId, status: Not(5) });
                    aas_form_prog = formInstruction.aas_form_prog.split(',');
                }
                let groupData = resultedData.reduce((acc, item) => {
                    if (![postData?.org_id, 0].includes(item.org_id)) {
                        return acc;
                    }
                    item['selected'] = 0;
                    if (aas_form_prog.includes(item.id.toString())) {
                        item['selected'] = 1;
                    }
                    if (!acc[item.group_type]) {
                        acc[item.group_type] = {
                            group_id: item.group_type,
                            group_type_title: groupTypeTitle[item.group_type],
                            activity_list: []
                        };
                    }
                    acc[item.group_type].activity_list.push(item);
                    return acc;
                }, {});
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: Object.values(groupData),
                    message: 'success'
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAgeActivityInput) {
        try {
            if ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                let condition = `ageactivity.status = 1`;
                let groupType = await this.agegroupService.listRecord({ status: 1 },['agegroup']);
                let groupTypeTitle = groupType.reduce((acc, item) => {
                    acc[item.id] = item.group_name;
                    return acc;
                }, {}as Record<number, string>);                
                let resultedData = await this.AgeActivityService.listRecord(condition, ['ageactivity']);
                let aas_form_prog = [];
                if (postData?.org_id) {
                    let formInstruction = await this.formInstructionsService.findOne({ company_id: postData?.org_id, status: Not(5) });
                    aas_form_prog = formInstruction.aas_form_prog.split(',');
                }
                let groupData = resultedData.reduce((acc, item) => {
                    if (![postData?.org_id, 0].includes(item.org_id)) {
                        return acc;
                    }
                    item['selected'] = 0;
                    if (aas_form_prog.includes(item.id.toString())) {
                        item['selected'] = 1;
                    }
                    if (!acc[item.group_type]) {
                        acc[item.group_type] = {
                            group_id: item.group_type,
                            group_type_title: groupTypeTitle[item.group_type],
                            activity_list: []
                        };
                    }
                    acc[item.group_type].activity_list.push(item);
                    return acc;
                }, {});
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: Object.values(groupData),
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
}