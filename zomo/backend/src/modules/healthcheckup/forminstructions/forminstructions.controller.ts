import { UrlManageService } from '@/modules/common';
import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    CommonService,
    CompaniesDto,
    CompaniesEntity,
    DataManagersDto,
    FormInstructionsDto,
    tableConstant,
    UserFormsDto
} from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import * as moment from 'moment-timezone';
import { lastValueFrom } from 'rxjs';
import { BrokerService } from 'src/modules/broker/broker.service';
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { DiseasesService } from 'src/modules/diseasemanagement/diseases/diseases.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    PaginateWithCompanyInput,
} from '../../../input';
import { IncentiveReportsService } from "../../campaign/incentivereports/incentivereports.service";
import { CommunicationTemplateTextsService } from "../../communication/templatetexts/communicationtemplatetexts.service";
import { ActivePluginService } from "../../company/activeplugins/activeplugin.service";
import { DiseaseFormCoverPageService } from '../../diseasemanagement/formscoverpage/diseaseformcoverpage.service';
import { TranslationService } from "../../translation/translation.service";
import { UserService } from '../../user/user/user.service';
import { AgeActivityService } from '../ageactivity/ageactivity.service';
import { AgeGroupService } from '../agegroup/agegroup.service';
import { AuthorizationsService } from '../authorizations/authorizations.service';
import { DataManagersService } from '../datamanagers/datamanagers.service';
import { FormSendRequestUserService } from '../formsendrequestuser/formsendrequestuser.service';
import { ForminstructionsTemplateTextsService } from '../templatetexts/forminstructionstemplatetexts.service';
import { TobaccoUsesService } from "../tobaccouses/tobaccouses.service";
import { UserFormsService } from '../userforms/userforms.service';
import { FormInstructionsService } from './forminstructions.service';
import { CreateFormInstructionsInput, DeleteFormInstructionsInput, FormListFormInstructionsInput, ListFormInstructionsInput, SendFormInput, UpdateFormInstructionsInput } from './input';
const S3_URL =  process.env.S3_URL_PROD
@Controller('health-checkup/form-instructions')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FormInstructionsController {
    constructor(
        private readonly formInstructionsService: FormInstructionsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
        private readonly forminstructionsTemplateTextsService: ForminstructionsTemplateTextsService,
        private readonly diseaseFormCoverPageService: DiseaseFormCoverPageService,
        private readonly ageActivityService: AgeActivityService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly userService: UserService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly formSendRequestUserService: FormSendRequestUserService,
        private readonly communicationTemplateTextsService: CommunicationTemplateTextsService,
        private readonly activePluginService: ActivePluginService,
        @Inject('CRON_SERVICE') private cronMicroservice: ClientProxy,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly userFormsService: UserFormsService,
        private readonly dataManagersService: DataManagersService,
        private readonly ageGroupService: AgeGroupService,
        private readonly diseaseService: DiseasesService,
        private readonly brokerService: BrokerService,
        private readonly urlManageService: UrlManageService,
        private readonly commonService: CommonService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            let user = Object.create(req.tokenUser);
            let roleId: number = user?.role_id;
            if ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(roleId)) {
                let where: string = `company.deleted = 0 AND company.companytype_id = 3 And activeplugin.id IS NOT NULL `;
                if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == roleId){
                    let resultedData = await this.clientManagerAssignService.listRecord({user_id: user?.id,status: 1},null);
                    if(resultedData.length > 0){
                        where += `AND company.id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
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
                if(appConstant.ROLE.ADMIN == roleId){
                    let activepluginList = await this.activePluginService.listRecord(null, null, ['company_id', 'plugin_name']);                         
                    const companyIds: number[] = []; 
                    activepluginList.forEach(plugin => {
                        const parsed = JSON.parse(plugin.plugin_name);
                        if (parsed && parsed['Healthcheckup']) {
                            companyIds.push(plugin.company_id)                            
                        }
                    });                          
                    if(companyIds){
                        where += ` AND company.id IN (${companyIds.join(',')})`;
                    }                 
                }
                if (postData?.search_str && postData?.filter_by?.toLowerCase() != 'org_type') {
                    let searchField = [];
                    if (postData?.filter_by?.toLowerCase() == 'org_code') {
                        searchField = ['company.id','company.code'];
                    } else {
                        searchField = ['company.company_name','company.company_logo','company.city','company.state','company.country'];
                    }
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, searchField);
                }
                let resultedData = await this.companyService.formpaginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(await this.commonArrayService.formatToDto(CompaniesDto, resultedData['list'], req.lang));
                await Promise.all(resultedData['list'].map(async ele => {
                    if(ele?.forminstructions?.program_custom_name){
                        let programCustomName = JSON.parse(ele.forminstructions.program_custom_name);
                        for (let i = 0; i <= 5; i++) {
                            if(programCustomName[i+1] || programCustomName[i+1] == ''){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`custo_customeLabel_${i}_${ele.id}`, `/LC_MESSAGES/HealthForms/SubmitForm/${ele['id']}`,`dynamic`);
                                programCustomName[i+1] = (customName == '' || customName == `custo_customeLabel_${i}_${ele.id}`) ? programCustomName[i+1] : customName;
                            }
                        }
                        ele.forminstructions.program_custom_name = JSON.stringify(programCustomName);
                    }
                    if(ele?.forminstructions?.tobacco_cessation_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`tobacco_cessation_text_${ele.id}`, `/LC_MESSAGES/Activities/Activities/0/${ele['id']}`,`dynamic`);
                        ele.forminstructions.tobacco_cessation_text = (customName == '' || customName == `tobacco_cessation_text_${ele.id}`) ? ele?.forminstructions['tobacco_cessation_text'] : customName;
                    }
                    if(ele?.forminstructions?.tobacco_para1){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`tobacco_para1_${ele.id}`, `/LC_MESSAGES/Activities/Activities/0/${ele['id']}`,`dynamic`);
                        ele.forminstructions.tobacco_para1 = (customName == '' || customName == `tobacco_para1_${ele.id}`) ? ele?.forminstructions['tobacco_para1'] : customName;
                    }
                    if(ele?.forminstructions?.dentists_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`dentists_text_${ele.id}`, `/LC_MESSAGES/Activities/Activities/${ele['id']}`,`dynamic`);
                        ele.forminstructions.dentists_text = (customName == '' || customName == `dentists_text_${ele.id}`) ? ele?.forminstructions['dentists_text'] : customName;
                    }
                    if(ele?.forminstructions?.optometrists_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`optometrists_text_${ele.id}`, `/LC_MESSAGES/Activities/Activities/${ele['id']}`,`dynamic`);
                        ele.forminstructions.optometrists_text = (customName == '' || customName == `optometrists_text_${ele.id}`) ? ele.forminstructions['optometrists_text'] : customName;
                    }
                    if(ele?.forminstructions?.physician_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`physician_text_${ele.id}`, `/LC_MESSAGES/Activities/Activities/${ele['id']}`,`dynamic`);
                        ele.forminstructions.physician_text = (customName == '' || customName == `physician_text_${ele.id}`) ? ele.forminstructions['physician_text'] : customName;
                    }
                    if(ele?.forminstructions?.age_gender_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_title_${ele.id}`, `/LC_MESSAGES/Activities/Activities/${ele['id']}`,`dynamic`);
                        ele.forminstructions.age_gender_title = (customName == '' || customName == `age_gender_title_${ele.id}`) ? ele?.forminstructions['age_gender_title'] : customName;
                    }
                    if(ele?.forminstructions?.age_gender_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_text_${ele.id}`, `/LC_MESSAGES/Activities/Activities/${ele['id']}`,`dynamic`);
                        ele.forminstructions.age_gender_text = (customName == '' || customName == `age_gender_text_${ele.id}`) ? ele.forminstructions['age_gender_text'] : customName;
                    }
                }));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else if([appConstant.ROLE.DATAMANAGER].includes(roleId)){
                if(postData?.type == 'dataManagerAssignment'){
                    if(postData?.org_id){
                        let assigndmWhere: string = `userforms.org_id = ${postData?.org_id} and userforms.status != 5`
                        let assigndmResultedData = await this.userFormsService.dataManagerPaginateList(
                            assigndmWhere,
                            postData,
                            ['userforms','user','formInstructions','Userformsattachments'],
                            null,
                            [tableConstant.TBL_USERS,tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS,tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS],
                        );         
                        assigndmResultedData['list'] = <any>(
                            await this.commonArrayService.formatToDto(UserFormsDto, assigndmResultedData['list'], req.lang)
                        ); 
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: assigndmResultedData,
                            message: 'success',
                        });
                    }
                    let whereCompany: string = `datamanager.user_id = ${req.tokenUser?.id} AND company.id IS NOT NULL`;  
                    if(postData?.search_str) {
                        whereCompany += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['company.code','company.company_name','company.company_logo','company.city','company.state','company.country']);
                    }
                    let resultedData = await this.dataManagersService.paginateList(whereCompany,postData)
                    resultedData['list'] = <any>(await this.commonArrayService.formatToDto(DataManagersDto, resultedData['list'], req.lang));
                    await Promise.all(resultedData['list'].map(async ele => {
                        let userTimeZone = req.tokenUser?.timezone ? req.tokenUser?.timezone : 'UTC';
                        if (ele?.added_date_copy) {
                            let addedDate = moment.tz(ele.added_date_copy, 'UTC').tz(ele?.user?.timezone).format('YYYY-MM-DD HH:mm:ss');
                            ele.added_date = ele.added_date + ' ' + this.commonDateService.getTodayDate(addedDate).format('HH:mm');
                        }
                    }))
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: resultedData,
                        message: 'success',
                    });
                }
                let datamangerWhere = `datamanager.status != 2 AND company.status != 2 AND datamanager.user_id = ${user.id}`;
                let datamanagerList = await this.dataManagersService.listRecord(datamangerWhere,null,['datamanager.id','company.id','company.company_name'])
                let companyIdList: number[] = datamanagerList.map((item)=>item?.['company']?.id).filter(Boolean) || null;
                let year = postData?.year || moment().year();
                let where: string = `userforms.org_id IN (${companyIdList?.length === 0 ? 'NULL' : companyIdList.join(',')}) AND userforms.status = 1 AND YEAR(userforms.added_date) = ${year}`;
                let order: object = {
                    'userforms.status': 'ASC'
                }
                let resultedData = await this.userFormsService.dataManagerPaginateList(
                    where,
                    postData,
                    [
                        'userforms.id',
                        'userforms.org_id',
                        'userforms.is_history',
                        'userforms.user_id',
                        'userforms.form_id',
                        'userforms.zip_filename',
                        'userforms.decline_reason',
                        'userforms.status',
                        'userforms.popup_status',
                        'userforms.added_date',
                        'userforms.updated_date',
                        'user.first_name',
                        'user.last_name',
                        'user.code',
                        'user.timezone',
                        "CONVERT_TZ(`userforms`.`added_date`,'UTC',CASE WHEN `user`.`timezone` != '' THEN `user`.`timezone` ELSE 'UTC' END) as newadded_date",
                        'formInstructions.id',
                        'formInstructions.program_custom_name'
                    ],
                    order,
                    [tableConstant.TBL_USERS,tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS],
                );
                
                if (Array.isArray(resultedData['list']) && Array.isArray(datamanagerList)) {
                    resultedData['list'] = resultedData['list'].map(item => {
                        const matchingDataManager = datamanagerList.find(dm => dm['company'] && dm['company'].id === item.org_id);
                        return {
                            ...item,
                            company: matchingDataManager ? matchingDataManager['company'] : null
                        };
                    });
                } 
                resultedData['list'] = <any>(await this.commonArrayService.formatToDto(UserFormsDto, resultedData['list'], req.lang));
                await Promise.all(resultedData['list'].map(async ele => {
                    if(ele?.formInstructions?.program_custom_name){
                        let programCustomName = JSON.parse(ele.formInstructions.program_custom_name);
                        for (let i = 0; i <= 5; i++) {
                            if(programCustomName[i+1] ){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`custo_customeLabel_${i}_${ele['org_id']}`, `/LC_MESSAGES/HealthForms/SubmitForm/${ele['org_id']}`,`dynamic`);
                                programCustomName[i+1] = (customName == '' || customName == `custo_customeLabel_${i}_${ele['org_id']}`) ? programCustomName[i+1] : customName;
                            }
                        }
                        ele.formInstructions.program_custom_name = JSON.stringify(programCustomName);
                    }
                    if(ele?.formInstructions?.tobacco_cessation_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`tobacco_cessation_text_${ele.org_id}`, `/LC_MESSAGES/Activities/Activities/${ele['org_id']}`,`dynamic`);
                        ele.formInstructions.tobacco_cessation_text = (customName == '' || customName == `tobacco_cessation_text_${ele.org_id}`) ? ele?.formInstructions['tobacco_cessation_text'] : customName;
                    }
                    if(ele?.formInstructions?.tobacco_para1){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`tobacco_para1_${ele.org_id}`, `/LC_MESSAGES/Activities/Activities/${ele['org_id']}`,`dynamic`);
                        ele.formInstructions.tobacco_para1 = (customName == '' || customName == `tobacco_para1_${ele.org_id}`) ? ele?.formInstructions['tobacco_para1'] : customName;
                    }
                    if(ele?.formInstructions?.dentists_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`dentists_text_${ele.org_id}`, `/LC_MESSAGES/Activities/Activities/${ele['org_id']}`,`dynamic`);
                        ele.formInstructions.dentists_text = (customName == '' || customName == `dentists_text_${ele.org_id}`) ? ele?.formInstructions['dentists_text'] : customName;
                    }
                    if(ele?.formInstructions?.optometrists_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`optometrists_text_${ele.org_id}`, `/LC_MESSAGES/Activities/Activities/${ele['org_id']}`,`dynamic`);
                        ele.formInstructions.optometrists_text = (customName == '' || customName == `optometrists_text_${ele.org_id}`) ? ele.formInstructions['optometrists_text'] : customName;
                    }
                    if(ele?.formInstructions?.physician_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`physician_text_${ele.org_id}`, `/LC_MESSAGES/Activities/Activities/${ele['org_id']}`,`dynamic`);
                        ele.formInstructions.physician_text = (customName == '' || customName == `physician_text_${ele.org_id}`) ? ele.formInstructions['physician_text'] : customName;
                    }
                    if(ele?.formInstructions?.age_gender_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_title_${ele.org_id}`, `/LC_MESSAGES/Activities/Activities/${ele['org_id']}`,`dynamic`);
                        ele.formInstructions.age_gender_title = (customName == '' || customName == `age_gender_title_${ele.org_id}`) ? ele?.formInstructions['age_gender_title'] : customName;
                    }
                    if(ele?.formInstructions?.age_gender_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_text_${ele.org_id}`, `/LC_MESSAGES/Activities/Activities/${ele['org_id']}`,`dynamic`);
                        ele.formInstructions.age_gender_text = (customName == '' || customName == `age_gender_text_${ele.org_id}`) ? ele.formInstructions['age_gender_text'] : customName;
                    }
                    let userTimeZone = req.tokenUser?.timezone ? req.tokenUser?.timezone : 'UTC';
                    if (ele?.['added_date_copy']) {    
                        let addedDate = moment.tz(ele?.['added_date_copy'], 'UTC').tz(ele?.user?.timezone).format('YYYY-MM-DD HH:mm:ss');                    
                        ele.added_date = ele.added_date + ' ' + this.commonDateService.getTodayDate(addedDate).format('HH:mm');
                    }
                }));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFormInstructionsInput) {
        try {
            postData['date_range'] = postData?.date_range ?? 1;
            postData['cover_page'] = postData?.cover_page ?? '';
            postData['physician_text'] = postData?.physician_text ?? '';
            postData['dentists_text'] = postData?.dentists_text ?? '';
            postData['optometrists_text'] = postData?.optometrists_text ?? '';
            postData['tobacco_text'] = postData?.tobacco_text ?? '';
            postData['tobacco_cessation_text'] = postData?.tobacco_cessation_text ?? '';
            postData['tobacco_para1'] = postData?.tobacco_para1 ?? '';
            postData['tobacco_form_option'] = postData?.tobacco_form_option ?? 0;
            postData['optionalpage'] = postData?.optionalpage ?? '';
            postData['disease_ids'] = postData?.disease_ids ?? '';
            postData['assign_disease_ids'] = postData?.assign_disease_ids ?? '';
            postData['disease_text'] = postData?.disease_text ?? '';
            postData['disease_instruction_text'] = postData?.disease_instruction_text ?? '';
            postData['disease_coverpage_options'] = postData?.disease_coverpage_options ?? 0;
            postData['bio_option'] = postData?.bio_option ?? 0;
            postData['age_gender_title'] = postData?.age_gender_title ?? '';
            postData['age_gender_text'] = postData?.age_gender_text ?? '';
            postData['bio_data_field'] = postData?.bio_data_field ?? '';
            postData['aas_form_prog'] = postData?.aas_form_prog ?? '';
            postData['dentures'] = postData?.dentures ?? 0;
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                let resetprefixes = '';
                let field_names = ['start_date', 'end_date', 'fax_date'];
                let prefixes = ['pf_', 'ta_', 'dvf_', 'ovf_'];
                if (postData?.program_fill == 1 && postData?.current_tab == 0 && postData?.date_range == 2) {
                    field_names.forEach(field_name => {
                        if (postData[field_name]) {
                            prefixes.forEach(prefix => {
                                postData[`${prefix}${field_name}`] = postData[field_name];
                            });
                        }
                    });
                }
                if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                    if (postData?.program_fill == 1 && postData?.current_tab == 1 && postData?.reset_date_range == 2) {
                        field_names.push('reset_date');
                        resetprefixes = 'feture_';                        
                        field_names.forEach(field_name => {  
                            let resetDataKey = `${field_name != 'reset_date' ? 'feature_' : ''}${field_name}`;                                                                                                       
                            if (postData[resetDataKey]) {                                                                                                                                          
                                prefixes.forEach(prefix => {                                   
                                    postData[`${field_name != 'reset_date' ? resetprefixes : ''}${prefix}${field_name}`] = postData[resetDataKey];
                                });
                            }
                        });                    
                        postData['feture_dvf_faxt_date'] = postData['feture_dvf_fax_date'];
                        delete postData['feture_dvf_fax_date'];
                    }
                }
                delete postData?.program_fill;
                let tempdata = [];
                if(postData?.form_type){
                    let formType = { 1: 'Physician', 2: 'Dentist', 3: 'Optometrist', 4: 'Tobacco', 5: 'Disease' };
                    let form_type_id = Object.keys(formType).find(key => formType[key] === postData?.form_type);
                    if (postData?.form_type == 'Physician' || postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist' || postData?.form_type == 'Tobacco' || postData?.form_type == 'Disease') {
                        if (postData?.header_text) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 1, type: 1, text: postData?.header_text });
                            delete postData?.header_text;
                        }
                        if (postData?.footer_text) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 5, type: 1, text: postData?.footer_text });
                            delete postData?.footer_text;
                        }
                    }
                    if (postData?.form_type == 'Physician' || postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist' || postData?.form_type == 'Tobacco') {
                        if (postData?.patient_health_information) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 6, type: 1, text: postData?.patient_health_information });
                            delete postData?.patient_health_information;
                        }
                    }
                    if (postData?.form_type == 'Physician' || postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist') {
                        if (postData?.patient_information) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 2, type: 1, text: postData?.patient_information });
                            delete postData?.patient_information;
                        }
                        if (postData?.billing_coding) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 3, type: 1, text: postData?.billing_coding });
                            delete postData?.billing_coding;
                        }
                        if (postData?.privacy_information) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 4, type: 1, text: postData?.privacy_information });
                            delete postData?.privacy_information;
                        }
                        if (postData?.datatransmission) {
                            let datatransmission = JSON.parse(postData?.datatransmission);
                            tempdata = tempdata.concat(datatransmission);
                            delete postData?.datatransmission;
                        }
                    }
                    if (postData?.form_type == 'Physician') {
                        if (postData?.optionalsections) {
                            let optionalsections = JSON.parse(postData?.optionalsections);
                            tempdata = tempdata.concat(optionalsections);
                            delete postData?.optionalsections;
                        }
                        if (postData?.phq_text) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 11, type: 1, text: postData?.phq_text });
                            delete postData?.phq_text;
                        }
                        if (postData?.gad_text) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 12, type: 1, text: postData?.gad_text });
                            delete postData?.gad_text;
                        }
                    }
                    if (postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist' || postData?.form_type == 'Tobacco') {
                        if (postData?.patient_data_form) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 10, type: 1, text: postData?.patient_data_form });
                            delete postData?.patient_data_form;
                        }
                    }
                    if (postData?.form_type == 'Dentist') {
                        if (postData?.dentist_one_text) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 14, type: 1, text: postData?.dentist_one_text });
                            delete postData?.dentist_one_text;
                        }
                        if (postData?.dentist_two_text) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 15, type: 1, text: postData?.dentist_two_text });
                            delete postData?.dentist_two_text;
                        }
                    }
                    if (postData?.form_type == 'Tobacco') {
                        if (postData?.fax_text_date) {
                            tempdata.push({ org_id: postData?.company_id, form_type: form_type_id, main_option: 7, type: 1, text: postData?.fax_text_date });
                            delete postData?.fax_text_date;
                        }
                    }
                    if (postData?.form_type == 'IdentificationCover`') {
                        if (postData?.identification_cover) {
                            tempdata.push({ org_id: postData?.company_id, form_type: 0, main_option: 13, type: 1, text: postData?.identification_cover });
                            delete postData?.identification_cover;
                        }
                    }
                    await this.dynamic_data_save(tempdata, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS_TEMPLATE_TEXTS, req.tokenUser?.id);
                    if (postData?.form_type == 'Disease') {
                        if (postData?.disease_text_org) {
                            let FormsCoverpage = [];
                            FormsCoverpage['coverpage_text'] = postData?.disease_text_org;
                            FormsCoverpage['form_id'] = postData?.form_id;
                            FormsCoverpage['org_id'] = postData?.company_id;
                            let where = { org_id: postData?.company_id, form_id: postData?.form_id };
                            let coverpageupdate = await this.diseaseFormCoverPageService.createUpdate(where, { ...FormsCoverpage });
                            if (coverpageupdate.update == 1) {
                                delete coverpageupdate.update;
                                this.activityLogService.create(coverpageupdate, postData, tableConstant.DISEASE_MANAGEMENT.TBL_DS_COVER_PAGES, req.tokenUser?.id);
                            }
                            delete postData?.disease_text_org;
                            delete postData?.form_id;
                        }
                    }
                    delete postData?.form_type;
                }
                if(postData?.program_custom_name){
                    postData.program_custom_name = JSON.stringify(JSON.parse(postData?.program_custom_name));
                }
                await this.formInstructionsService.save({ ...postData });
                if (postData?.program_custom_name && Object.keys(postData?.program_custom_name).length > 0) {
                    let newCustLbl = {};
                    let tempdefaltdata = {
                        '1': 'Physician Visit Form',
                        '2': 'Dental Visit Form',
                        '3': 'Optometry/ Ophthalmology Visit Form',
                        '4': 'Tobacco Affidavit',
                        '5': 'Biometric Screening Form',
                        '6': 'Age/Gender Preventive Screening Form'
                    };
                    if (postData?.program_custom_name && Object.keys(postData?.program_custom_name).length > 0) {
                        let j = 0;
                        Object.keys(tempdefaltdata).forEach((tkey) => {
                            let values = tempdefaltdata[tkey];
                            newCustLbl[`custo_customeLabel_${j}_${postData?.company_id}`] = values;
                            if (postData?.program_custom_name.hasOwnProperty(tkey)) {
                                if (postData?.program_custom_name[tkey] !== '') {
                                    newCustLbl[`custo_customeLabel_${j}_${postData?.company_id}`] = JSON.parse(postData?.program_custom_name)[tkey];
                                }
                            }
                            j++;
                        });
                    } 
                    else {
                        newCustLbl = {
                            [`custo_customeLabel_0_${postData?.company_id}`]: 'Physician Visit Form',
                            [`custo_customeLabel_1_${postData?.company_id}`]: 'Dental Visit Form',
                            [`custo_customeLabel_2_${postData?.company_id}`]: 'Optometry/ Ophthalmology Visit Form',
                            [`custo_customeLabel_3_${postData?.company_id}`]: 'Tobacco Affidavit',
                            [`custo_customeLabel_4_${postData?.company_id}`]: 'Biometric Screening Form',
                            [`custo_customeLabel_5_${postData?.company_id}`]: 'Age/Gender Preventive Screening Form'
                        };
                    }
                    await this.translatorService.DynamicEngJsonData('HealthForms',postData?.company_id,newCustLbl,'Add','SubmitForm')
                }
                let dynamicDatas = Object.create(null);
                if(postData?.tobacco_cessation_text){
                    let tilte = `tobacco_cessation_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.tobacco_cessation_text;
                }
                if(postData?.tobacco_para1){
                    let tilte = `tobacco_para1_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.tobacco_para1;
                }
                if(postData?.dentists_text){
                    let tilte = `dentists_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.dentists_text;
                }
                if(postData?.optometrists_text){
                    let tilte = `optometrists_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.optometrists_text;
                }
                if(postData?.physician_text){
                    let tilte = `physician_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.physician_text;
                }
                if(postData?.age_gender_title){
                    let tilte = `age_gender_title_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.age_gender_title;
                }
                if(postData?.age_gender_text){
                    let tilte = `age_gender_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.age_gender_text;
                }
                await this.translatorService.DynamicEngJsonData('Activities',postData?.company_id,dynamicDatas,'Edit','Activities');
                let message = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_FORM_INSTRUCTION");
                if(postData?.form_type){
                    message = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_FORM_CUSTOMIZE");
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: message
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateFormInstructionsInput) {
        try {
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.BROKERADMIN].includes(req.tokenUser?.role_id)) {
                const recordDetails = await this.formInstructionsService.findOne({ company_id: postData?.company_id, status: Not(5) });
                let resetprefixes = '';
                let field_names = ['start_date', 'end_date', 'fax_date'];
                let prefixes = ['pf_', 'ta_', 'dvf_', 'ovf_'];
                if (postData?.program_fill == 1 && postData?.current_tab == 0 && postData?.date_range == 2) {
                    field_names.forEach(field_name => {
                        if (postData[field_name]) {
                            prefixes.forEach(prefix => {
                                postData[`${prefix}${field_name}`] = postData[field_name];
                            });
                        }
                    });
                }
                if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                    if (postData?.program_fill == 1 && postData?.current_tab == 1 && postData?.reset_date_range == 2) {
                        field_names.push('reset_date');
                        resetprefixes = 'feture_';                        
                        field_names.forEach(field_name => {  
                            let resetDataKey = `${field_name != 'reset_date' ? 'feature_' : ''}${field_name}`;                                                                                                       
                            if (postData[resetDataKey]) {                                                                                                                                          
                                prefixes.forEach(prefix => {                                   
                                    postData[`${field_name != 'reset_date' ? resetprefixes : ''}${prefix}${field_name}`] = postData[resetDataKey];
                                });
                            }
                        });                    
                        postData['feture_dvf_faxt_date'] = postData['feture_dvf_fax_date'];
                        delete postData['feture_dvf_fax_date'];
                    }
                }
                delete postData?.program_fill;
                let tempdata = [];
                if(postData?.form_type){
                    let formType = { 1: 'Physician', 2: 'Dentist', 3: 'Optometrist', 4: 'Tobacco', 5: 'Disease' };
                    let form_type_id = Object.keys(formType).find(key => formType[key] === postData?.form_type);
                    if (postData?.form_type == 'Physician' || postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist' || postData?.form_type == 'Tobacco' || postData?.form_type == 'Disease') {
                        if (postData?.header_text) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 1, type: 1, text: postData?.header_text });
                            delete postData?.header_text;
                        }
                        if (postData?.footer_text) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 5, type: 1, text: postData?.footer_text });
                            delete postData?.footer_text;
                        }
                    }
                    if (postData?.form_type == 'Physician' || postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist' || postData?.form_type == 'Tobacco') {
                        if (postData?.patient_health_information) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 6, type: 1, text: postData?.patient_health_information });
                            delete postData?.patient_health_information;
                        }
                    }
                    if (postData?.form_type == 'Physician' || postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist') {
                        if (postData?.patient_information) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 2, type: 1, text: postData?.patient_information });
                            delete postData?.patient_information;
                        }
                        if (postData?.billing_coding) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 3, type: 1, text: postData?.billing_coding });
                            delete postData?.billing_coding;
                        }
                        if (postData?.privacy_information) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 4, type: 1, text: postData?.privacy_information });
                            delete postData?.privacy_information;
                        }
                        if (postData?.datatransmission) {
                            let datatransmission = JSON.parse(postData?.datatransmission);
                            tempdata = tempdata.concat(datatransmission);
                            delete postData?.datatransmission;
                        }
                    }
                    if (postData?.form_type == 'Physician') {
                        if (postData?.optionalsections) {
                            let optionalsections = JSON.parse(postData?.optionalsections);
                            tempdata = tempdata.concat(optionalsections);
                            delete postData?.optionalsections;
                        }
                        if (postData?.phq_text) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 11, type: 1, text: postData?.phq_text });
                            delete postData?.phq_text;
                        }
                        if (postData?.gad_text) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 12, type: 1, text: postData?.gad_text });
                            delete postData?.gad_text;
                        }
                    }
                    if (postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist' || postData?.form_type == 'Tobacco') {
                        if (postData?.patient_data_form) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 10, type: 1, text: postData?.patient_data_form });
                            delete postData?.patient_data_form;
                        }
                    }
                    if (postData?.form_type == 'Dentist') {
                        if (postData?.dentist_one_text) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 14, type: 1, text: postData?.dentist_one_text });
                            delete postData?.dentist_one_text;
                        }
                        if (postData?.dentist_two_text) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 15, type: 1, text: postData?.dentist_two_text });
                            delete postData?.dentist_two_text;
                        }
                    }
                    if (postData?.form_type == 'Tobacco') {
                        if (postData?.fax_text_date) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: form_type_id, main_option: 7, type: 1, text: postData?.fax_text_date });
                            delete postData?.fax_text_date;
                        }
                    }
                    if (postData?.form_type == 'IdentificationCover') {
                        if (postData?.identification_cover) {
                            tempdata.push({ org_id: recordDetails.company_id, form_type: 0, main_option: 13, type: 1, text: postData?.identification_cover });
                            delete postData?.identification_cover;
                        }
                    }
                    await this.dynamic_data_save(tempdata, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS_TEMPLATE_TEXTS, req.tokenUser?.id);
                    if (postData?.form_type == 'Disease') {
                        if (postData?.disease_text_org) {
                            let FormsCoverpage = [];
                            FormsCoverpage['coverpage_text'] = postData?.disease_text_org;
                            FormsCoverpage['form_id'] = postData?.form_id;
                            FormsCoverpage['org_id'] = postData?.company_id;
                            let where = { org_id: postData?.company_id, form_id: postData?.form_id };
                            let coverpageupdate = await this.diseaseFormCoverPageService.createUpdate(where, { ...FormsCoverpage });
                            if (coverpageupdate.update == 1) {
                                delete coverpageupdate.update;
                                this.activityLogService.create(coverpageupdate, postData, tableConstant.DISEASE_MANAGEMENT.TBL_DS_COVER_PAGES, req.tokenUser?.id);
                            }
                            delete postData?.disease_text_org;
                            delete postData?.form_id;
                        }
                    }
                    delete postData?.form_type;
                }
                if(postData?.program_custom_name){
                    postData.program_custom_name = JSON.stringify(JSON.parse(postData?.program_custom_name));
                }
                await this.formInstructionsService.update({ company_id: postData?.company_id }, { ...postData });
                if (postData?.program_custom_name && Object.keys(postData?.program_custom_name).length > 0) {
                    let newCustLbl = {};
                    let tempdefaltdata = {
                        '1': 'Physician Visit Form',
                        '2': 'Dental Visit Form',
                        '3': 'Optometry/ Ophthalmology Visit Form',
                        '4': 'Tobacco Affidavit',
                        '5': 'Biometric Screening Form',
                        '6': 'Age/Gender Preventive Screening Form'
                    };
                    if (postData?.program_custom_name && Object.keys(postData?.program_custom_name).length > 0) {
                        let j = 0;
                        Object.keys(tempdefaltdata).forEach((tkey) => {
                            let values = tempdefaltdata[tkey];
                            newCustLbl[`custo_customeLabel_${j}_${postData?.company_id}`] = values;
                            if (postData?.program_custom_name.hasOwnProperty(tkey)) {
                                if (postData?.program_custom_name[tkey] !== '') {
                                    newCustLbl[`custo_customeLabel_${j}_${postData?.company_id}`] = JSON.parse(postData?.program_custom_name)[tkey];
                                }
                            }
                            j++;
                        });
                    } else {
                        newCustLbl = {
                            [`custo_customeLabel_0_${postData?.company_id}`]: 'Physician Visit Form',
                            [`custo_customeLabel_1_${postData?.company_id}`]: 'Dental Visit Form',
                            [`custo_customeLabel_2_${postData?.company_id}`]: 'Optometry/ Ophthalmology Visit Form',
                            [`custo_customeLabel_3_${postData?.company_id}`]: 'Tobacco Affidavit',
                            [`custo_customeLabel_4_${postData?.company_id}`]: 'Biometric Screening Form',
                            [`custo_customeLabel_5_${postData?.company_id}`]: 'Age/Gender Preventive Screening Form'
                        };
                    }
                    await this.translatorService.DynamicEngJsonData('HealthForms',postData?.company_id,newCustLbl,'Add','SubmitForm')
                }
                this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS, req.tokenUser?.id);
                let dynamicDatas = Object.create(null);
                if(postData?.tobacco_cessation_text){
                    let tilte = `tobacco_cessation_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.tobacco_cessation_text;
                }
                if(postData?.tobacco_para1){
                    let tilte = `tobacco_para1_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.tobacco_para1;
                }
                if(postData?.dentists_text){
                    let tilte = `dentists_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.dentists_text;
                }
                if(postData?.optometrists_text){
                    let tilte = `optometrists_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.optometrists_text;
                }
                if(postData?.physician_text){
                    let tilte = `physician_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.physician_text;
                }
                if(postData?.age_gender_title){
                    let tilte = `age_gender_title_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.age_gender_title;
                }
                if(postData?.age_gender_text){
                    let tilte = `age_gender_text_${postData?.company_id}`
                    dynamicDatas[`${tilte}`]= postData?.age_gender_text;
                }
                await this.translatorService.DynamicEngJsonData('Activities',postData?.company_id,dynamicDatas,'Edit','Activities');
                let message = await this.translatorService.frontendReadTranslation(req.lang, "UPDATE_FORM_INSTRUCTION");
                if(postData?.form_type){
                    message = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_FORM_CUSTOMIZE");
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: message
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
    @Post('form-list')
    async formList(@Req() req: Request, @Res() res: Response, @Body() postData: FormListFormInstructionsInput) {
        try {
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const getList = await this.formInstructionsService.findOne({ company_id: postData?.company_id, status: Not(5) });
            if (getList?.program_selection?.trim()?.length >= 1) {
                getList.program_selection = getList.program_selection
                    .split(',')
                    .map(item => item.trim().replace(/s$/i, ''))
                    .filter((value, index, self) => self.indexOf(value) === index)
                    .join(',');
            }
            let resultedData: any[] = [];
            if (getList?.program_selection?.trim()?.length >= 1) {
                getList.program_selection = getList.program_selection
                    .split(',')
                    .map(item => item.trim().replace(/s$/i, ''))
                    .filter((value, index, self) => self.indexOf(value) === index)
                    .join(',');
                const dataArray = getList?.program_selection ? getList?.program_selection?.split(",").map(item => item.trim()).filter(Boolean) : [];
                let programCustomName = {};
                if (getList?.program_custom_name && getList.program_custom_name !== null && getList.program_custom_name !== undefined) {
                    programCustomName = JSON.parse(getList.program_custom_name);
                }
                const defaultProgramCustomName = { ...appConstant.HEALTH_FORM_DEFAULT_DATA };
                await Promise.all(
                    [...Array(6)].map(async (_, i) => {
                        const key = `custo_customeLabel_${i}_${postData?.company_id}`;
                        const translatedProgramCustomName = await this.translatorService.frontendReadTranslation(
                            req.lang,
                            key,
                            `/LC_MESSAGES/HealthForms/SubmitForm/${postData?.company_id}`,
                            "dynamic"
                        );
                        if (translatedProgramCustomName && translatedProgramCustomName !== key) {
                            defaultProgramCustomName[i + 1] = translatedProgramCustomName;
                        } else {
                            defaultProgramCustomName[i + 1] = await this.translatorService.frontendReadTranslation(req.lang, defaultProgramCustomName[i + 1],'/LC_MESSAGES/HealthForms/SubmitForm','static')
                        }
                    })
                );
                resultedData = dataArray.map(id => {
                    return {
                        id,
                        title: defaultProgramCustomName[id] || appConstant.HEALTH_FORM_DEFAULT_DATA[id]
                    };
                });
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListFormInstructionsInput) {
        try {
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.formInstructionsService.listRecord(["company_id", "pf_start_date", "pf_end_date", "pf_fax_date", "ta_start_date", "ta_end_date", "ta_fax_date", "dvf_start_date", "dvf_end_date", "dvf_fax_date", "ovf_start_date", "ovf_end_date", "ovf_fax_date", "start_date", "end_date", "fax_date", "feature_hra_date", "reset_date", "feature_fax_date", "feature_end_date", "feature_start_date", "ta_reset_date", "feture_ta_fax_date", "feture_ta_end_date", "feture_ta_start_date", "ovf_reset_date", "feture_ovf_fax_date", "feture_ovf_end_date", "feture_ovf_start_date", "dvf_reset_date", "feture_dvf_faxt_date", "feture_dvf_end_date", "feture_dvf_start_date", "pf_reset_date", "feture_pf_fax_date", "feture_pf_end_date", "feture_pf_start_date", "physician_text", "dentists_text", "optometrists_text", "tobacco_text", "tobacco_cessation_text", "tobacco_para1", "optionalpage", "disease_text"], { company_id: postData?.company_id, status: Not(5) });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(FormInstructionsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.tobacco_cessation_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`tobacco_cessation_text_${ele.company_id}`, `/LC_MESSAGES/Activities/Activities/${ele['company_id']}`,`dynamic`);
                        ele.tobacco_cessation_text = (customName == '' || customName == `tobacco_cessation_text_${ele.company_id}`) ? ele['tobacco_cessation_text'] : customName;
                    }
                    if(ele.tobacco_para1){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`tobacco_para1_${ele.company_id}`, `/LC_MESSAGES/Activities/Activities/${ele['company_id']}`,`dynamic`);
                        ele.tobacco_para1 = (customName == '' || customName == `tobacco_para1_${ele.company_id}`) ? ele['tobacco_para1'] : customName;
                    }
                    if(ele.dentists_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`dentists_text_${ele.company_id}`, `/LC_MESSAGES/Activities/Activities/${ele['company_id']}`,`dynamic`);
                        ele.dentists_text = (customName == '' || customName == `dentists_text_${ele.company_id}`) ? ele['dentists_text'] : customName;
                    }
                    if(ele.optometrists_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`optometrists_text_${ele.company_id}`, `/LC_MESSAGES/Activities/Activities/${ele['company_id']}`,`dynamic`);
                        ele.optometrists_text = (customName == '' || customName == `optometrists_text_${ele.company_id}`) ? ele['optometrists_text'] : customName;
                    }
                    if(ele.physician_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`physician_text_${ele.company_id}`, `/LC_MESSAGES/Activities/Activities/${ele['company_id']}`,`dynamic`);
                        ele.physician_text = (customName == '' || customName == `physician_text_${ele.company_id}`) ? ele['physician_text'] : customName;
                    }
                    if(ele.age_gender_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_title_${ele.company_id}`, `/LC_MESSAGES/Activities/Activities/${ele['company_id']}`,`dynamic`);
                        ele.age_gender_title = (customName == '' || customName == `age_gender_title_${ele.company_id}`) ? ele['age_gender_title'] : customName;
                    }
                    if(ele.age_gender_text){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_text_${ele.company_id}`, `/LC_MESSAGES/Activities/Activities/${ele['company_id']}`,`dynamic`);
                        ele.age_gender_text = (customName == '' || customName == `age_gender_text_${ele.company_id}`) ? ele['age_gender_text'] : customName;
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteFormInstructionsInput) {
        try {
            if (!postData?.id || !postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.formInstructionsService.findOne({ id: postData?.id, company_id: postData?.company_id, status: Not(5) });
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
            await this.formInstructionsService.update({ id: postData?.id, company_id: postData?.company_id },{status:5});
            this.activityLogService.create(recordDetails, { program_custom_name: recordDetails }, tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS, req.tokenUser?.id, 'delete');
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if ([appConstant.ROLE.REGISTERED].includes(req.tokenUser?.role_id)) {
                postData.user_id = postData?.user_id ?? req.tokenUser?.id;
                postData.company_id = postData?.company_id ?? req.tokenUser?.org_id;
            }
            if (!postData?.id && !postData?.company_id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if ([
                appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.REGISTERED, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,
                appConstant.ROLE.SPOUSE, appConstant.ROLE.WCH, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN,appConstant.ROLE.GLOBALCOACH,appConstant.ROLE.COACH,appConstant.ROLE.DATAMANAGER,
                ].includes(req.tokenUser?.role_id)) 
                {
                if (['Physician', 'Dental', 'Optometrist','Tabacco'].includes(postData?.form_type)) {
                    let message = await this.translatorService.frontendReadTranslation(req.lang, 'please_complete_authorization_form', `/LC_MESSAGES/Activities/Activities`,`static`);
                    if (postData?.form_type === 'Tabacco') {
                        let checkExist: boolean = await this.tobaccoUsesService.checkExists({user_id: postData.user_id,type_of_form: postData?.form_type,status: 1});
                        if (!checkExist) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: message
                            });
                        }
                    } else {
                        let checkExist: boolean = await this.authorizationsService.checkExists({user_id: postData.user_id,type_of_form: postData?.form_type,status: 1});
                        if (!checkExist) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: message
                            });
                        }
                    }

                }
                if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                    let user = Object.create(req.tokenUser)
                    let roleId: number = user.role_id;
                    let userId: number = user.id;
                    const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                        roleId,
                        userId,
                        postData?.company_id,
                    );
                    if (!checkRoleBBR) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                    }
                }
                if([appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)){
                    const user = req.tokenUser; 
                    const userList = await this.userService.usersDataWellness(
                        user,
                        `user.role_id = 12 AND user.membership_code = '${user['membership_code']}' AND user.status =1`
                    );
                    if(!userList || userList.length == 0){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_NO_USER_FOUND'));
                    }
                    if(!userList.some((u) => u.id == user.id)){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_NO_USER_FOUND'));
                    }
                }
                const where = postData?.id ? postData?.company_id ? { id: postData?.id, company_id: postData?.company_id, status: Not(5) } : { id: postData?.id, status: Not(5) } : { company_id: postData?.company_id, status: Not(5) };
                let resultedData = await this.formInstructionsService.findOne(where,null,['forminstructions','company.id','company.company_name'],[tableConstant.COMPANIES.TBL_COMPANY]);
                let forminstruction: any = resultedData;
                if (!resultedData) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: errorMessage,
                    });
                }
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(FormInstructionsDto, resultedData, req.lang)
                );
                if(resultedData?.program_custom_name){
                    let programCustomName = JSON.parse(resultedData.program_custom_name);
                    for (let i = 0; i <= 5; i++) {
                        if(programCustomName[i+1] ){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`custo_customeLabel_${i}_${resultedData['company_id']}`, `/LC_MESSAGES/HealthForms/SubmitForm/${resultedData['company_id']}`,`dynamic`);
                            programCustomName[i+1] = (customName == '' || customName == `custo_customeLabel_${i}_${resultedData['company_id']}`) ? programCustomName[i+1] : customName;
                        }
                    }
                    resultedData.program_custom_name = JSON.stringify(programCustomName);
                }
                if(resultedData.tobacco_cessation_text){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`tobacco_cessation_text_${resultedData.company_id}`, `/LC_MESSAGES/Activities/Activities/${resultedData['company_id']}`,`dynamic`);
                    resultedData.tobacco_cessation_text = (customName == '' || customName == `tobacco_cessation_text_${resultedData.company_id}`) ? resultedData['tobacco_cessation_text'] : customName;
                }
                if(resultedData.tobacco_para1){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`tobacco_para1_${resultedData.company_id}`, `/LC_MESSAGES/Activities/Activities/${resultedData['company_id']}`,`dynamic`);
                    resultedData.tobacco_para1 = (customName == '' || customName == `tobacco_para1_${resultedData.company_id}`) ? resultedData['tobacco_para1'] : customName;
                }
                if(resultedData.dentists_text){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`dentists_text_${resultedData.company_id}`, `/LC_MESSAGES/Activities/Activities/${resultedData['company_id']}`,`dynamic`);
                    resultedData.dentists_text = (customName == '' || customName == `dentists_text_${resultedData.company_id}`) ? resultedData['dentists_text'] : customName;
                }
                if(resultedData.optometrists_text){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`optometrists_text_${resultedData.company_id}`, `/LC_MESSAGES/Activities/Activities/${resultedData['company_id']}`,`dynamic`);
                    resultedData.optometrists_text = (customName == '' || customName == `optometrists_text_${resultedData.company_id}`) ? resultedData['optometrists_text'] : customName;
                }
                if(resultedData.physician_text){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`physician_text_${resultedData.company_id}`, `/LC_MESSAGES/Activities/Activities/${resultedData['company_id']}`,`dynamic`);
                    resultedData.physician_text = (customName == '' || customName == `physician_text_${resultedData.company_id}`) ? resultedData['physician_text'] : customName;
                }
                if(resultedData.age_gender_title){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_title_${resultedData.company_id}`, `/LC_MESSAGES/Activities/Activities/${resultedData['company_id']}`,`dynamic`);
                    resultedData.age_gender_title = (customName == '' || customName == `age_gender_title_${resultedData.company_id}`) ? resultedData['age_gender_title'] : customName;
                }
                if(resultedData.age_gender_text){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_text_${resultedData.company_id}`, `/LC_MESSAGES/Activities/Activities/${resultedData['company_id']}`,`dynamic`);
                    resultedData.age_gender_text = (customName == '' || customName == `age_gender_text_${resultedData.company_id}`) ? resultedData['age_gender_text'] : customName;
                }
                if(!resultedData.tobacco_para1){
                    if(resultedData.company_id){
                        let companyDetails: CompaniesEntity | null = await this.companyService.getOne({ id: resultedData.company_id, status: Not(2) },['id','company_name']);
                        resultedData.tobacco_para1 = `<p>For purposes of this affidavit, ${companyDetails.company_name} defines tobacco use as smoking cigarettes, clove cigarettes, e-cigarettes, cigars or pipes, or using smokeless tobacco products such as chewing tobacco or snuff.</p><p>If it is unreasonably difficult due to a medical condition for you to achieve the standards for the discount under this program (or it is medically inadvisable for you to attempt to meet the requirements of this program), please contact the ${companyDetails.company_name} Human Resources and they will work with you to develop another way to qualify for the discount.</p><p><b>Important: Your tobacco use status will be made available to your employer if you completed this affidavit for incentive qualification purposes. Additional questions can be directed to support@zomohealth.com.</b></p>`;
                    }
                }
                if (postData?.form_type && postData?.form_type != '') {
                    let forminstructionstemplatetexts = await this.formInstructionsService.templetextsRecord({ company_id: resultedData.company_id, status: Not(5) }, null, postData?.form_type);
                    delete forminstructionstemplatetexts["id"];
                    let formType = ['IdentificationCover', 'Physician', 'Dentist', 'Optometrist', 'Tobacco', 'Disease'];
                    if (formType.includes(postData?.form_type)) {
                        const global_dynamic_data = forminstructionstemplatetexts?.[postData?.form_type].filter(item => item.org_id === 0);
                        const company_dynamic_data = forminstructionstemplatetexts?.[postData?.form_type].filter(item => item.org_id == resultedData.company_id);
                        const Dynamic_merge_data = await this.commonHealthService.dynamic_company_global_data_merge(global_dynamic_data, company_dynamic_data, resultedData);
                        resultedData[postData?.form_type] = Dynamic_merge_data;
                    }
                    if (postData?.form_type == 'Physician') {
                        let diseases_list = [];
                        let condition = `ageactivity.status = 1`;
                        let groupType = await this.ageGroupService.listRecord({ status: 1 },['agegroup']);
                        let groupTypeTitle = groupType.reduce((acc, item) => {
                            acc[item.id] = item.group_name;
                            return acc;
                        }, {}as Record<number, string>); 
                        let AgeActivity = await this.ageActivityService.listRecord(condition, ['ageactivity']);
                        let aas_form_prog = resultedData?.aas_form_prog?.split(',') || [];
                        let preventative_care_list = AgeActivity.reduce((acc, item) => {
                            if (![postData?.org_id, 0].includes(item.org_id)) {
                                return acc;
                            }
                            item['selected'] = 0;
                            if (aas_form_prog.includes(item.age_activity_id.toString())) {                                
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
                        resultedData["preventative_care_list"] = Object.values(preventative_care_list);
                        diseases_list = forminstructionstemplatetexts?.["diseases"];
                        let disease_ids = resultedData?.disease_ids?.split(',').map(Number) || [];
                        if (disease_ids.length > 0) {
                            for (let ele of diseases_list) {
                                ele['selected'] = 0;
                                if (disease_ids.includes(ele.id)) {
                                    ele['selected'] = 1;
                                }
                            }
                        }
                        delete forminstructionstemplatetexts["diseases"];
                        resultedData["diseases_list"] = Object.values(diseases_list);
                    }
                    if (postData?.form_type == 'Disease') {
                        let diseases_form_list, coverpages = [];
                        diseases_form_list = forminstructionstemplatetexts?.["diseasesforms"];
                        coverpages = forminstructionstemplatetexts?.["coverpages"];
                        diseases_form_list.forEach((diseaseForm) => {
                            const matchingCoverPage = coverpages.find(
                                (coverpage) => coverpage.form_id === diseaseForm.id
                            );
                            if (matchingCoverPage) {
                                diseaseForm.coverpage_text = matchingCoverPage.coverpage_text;
                            }
                        });
                        delete forminstructionstemplatetexts["diseasesforms"];
                        resultedData["diseases_form_list"] = diseases_form_list;
                    }
                }
                if (postData?.pdf == 1) {
                    if (postData?.user_id) {
                        let downloadFunction, data;
                        var foldername ='';
                        var signup = '';
                        let status = 'open';
                        let user = await this.userService.findOne({ id: postData?.user_id });
                        delete user['settings']['id'];
                        user = { ...user, ...user['settings'] };
                        let company = { ...user['company'], companySetting: user['companysetting'] };
                        delete user['company'], delete user['companysetting'], delete user['settings'], delete user['role'];
                        if (postData?.form_type == 'Physician') {
                            downloadFunction = 'Physician';
                            let physician = resultedData['Physician'];
                            /* Age Group Wise Activity */
                            const dobs = moment(user.dob, "YYYY-MM-DD");
                            const age = moment().diff(dobs, 'years');
                            let whereAG = ` (agegroup.gender IN ('${user.gender}','o') OR agegroup.gender IS NULL) AND agegroup.status = 1 AND (agegroup.group_min_age <= ${age} AND (agegroup.group_max_age >= ${age} OR agegroup.group_max_age = 0) AND (agegroup.group_min_age != 0 OR agegroup.group_max_age != 0))`;
                            let ageGroups = await this.ageGroupService.getAgeGroup(whereAG);
                            let ageGroupIds:any = ageGroups.map(item => item.id);
                            let where = `(ageactivity.gender IN ('${user.gender}','o') OR ageactivity.gender IS NULL) AND ageactivity.status = 1 AND (ageactivity.org_id = ${resultedData.company_id} OR ageactivity.org_id = 0)`;
                            if(ageGroupIds.length > 0){
                                ageGroupIds = ageGroupIds.join(',');
                                where += ` AND ageactivity.group_type in (${ageGroupIds})`;
                            }
                            let AgeActivity= await this.ageActivityService.listRecord(where,['ageactivity']);
                            /* Age Group Wise Activity */                                             
                            physician['preventative_care_list'] = AgeActivity;
                            physician['diseases_list'] = resultedData["diseases_list"].filter((item) => item.selected == 1);
                            forminstruction = { ...forminstruction, Physician: physician };
                            let authorization = await this.authorizationsService.findOne({ user_id: postData?.user_id, type_of_form: 'Physician', status: Not(2) });
                            data = { name: downloadFunction, company: company, user: user, status: status, forminstruction: forminstruction, authorization: authorization, foldername: foldername, signup: signup, stdt: (postData?.startdate || ''), endt: (postData?.enddate || '') };
                        } else if (postData?.form_type == 'Dentist') {
                            downloadFunction = 'Dentist';
                            let dentist = resultedData['Dentist'];
                            forminstruction = { ...forminstruction, Dentist: dentist };
                            let authorizationdvf = await this.authorizationsService.findOne({ user_id: postData?.user_id, type_of_form: 'Dental', status: Not(2) });
                            data = { name: downloadFunction, company: company, user: user, status: status, forminstruction: forminstruction, authorizationdvf: authorizationdvf, foldername: foldername };
                        } else if (postData?.form_type == 'Optometrist') {
                            downloadFunction = 'Optometrist';
                            let optometrist = resultedData['Optometrist'];
                            forminstruction = { ...forminstruction, Optometrist: optometrist };
                            let authorizationovf = await this.authorizationsService.findOne({ user_id: postData?.user_id, type_of_form: 'Optometrist', status: Not(2) });
                            data = { name: downloadFunction, company: company, user: user, status: status, forminstruction: forminstruction, authorizationovf: authorizationovf, foldername: foldername };
                        } else if (postData?.form_type == 'Tobacco') {
                            downloadFunction = 'Tobacco';
                            let tobacco = resultedData['Tobacco'];
                            forminstruction = { ...forminstruction, Tobacco: tobacco };
                            let authorizationta = await this.authorizationsService.findOne({ user_id: postData?.user_id, type_of_form: 'Tabacco', status: Not(2) });
                            data = { name: downloadFunction, company: company, user: user, status: status, forminstruction: forminstruction, authorizationta: authorizationta, foldername: foldername };
                        } else if (postData?.form_type == 'Disease') {
                            downloadFunction = 'Disease';
                        }
                        let pdfFormDownload = await lastValueFrom(this.cronMicroservice.send({ cmd: 'pdf-form-download' }, data));
                        resultedData = pdfFormDownload;
                    } else {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
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
    
    async dynamic_data_save(savedata: any, postData: any, table_name: any, user_id: any) {
        try{
            savedata.map(async (item) => {
                let where = { org_id: item.org_id, form_type: item.form_type, main_option: item.main_option, type: item.type };
                let dynamicDataUpdate = await this.forminstructionsTemplateTextsService.createUpdate(where, { ...item });
                if (dynamicDataUpdate.update == 1) {
                    delete dynamicDataUpdate.update;
                    this.activityLogService.create(dynamicDataUpdate, postData, table_name, user_id);
                }
            });
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    @Post('pdf-preview')
    async pdfPreview(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.company_id || !postData?.form_type || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.formInstructionsService.findOne({ company_id: postData?.company_id, status: Not(5) });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(FormInstructionsDto, resultedData, req.lang)
            );
            let user = await this.userService.findOne({ id: postData?.user_id });
            delete user['settings']['id'];
            user = { ...user, ...user['settings'] };
            let company = { ...user['company'], companySetting: user['companysetting'] };
            delete user['company'], delete user['companysetting'], delete user['settings'], delete user['role'];
            if (postData?.physician_text) {
                resultedData.physician_text = postData?.physician_text;
                delete postData?.physician_text;
            }
            if (postData?.before_title) {
                resultedData.before_title = postData?.before_title;
                delete postData?.before_title;
            }
            if (postData?.before_age_title) {
                resultedData.before_age_title = postData?.before_age_title;
                delete postData?.before_age_title;
            }
            if (postData?.submition_option) {
                resultedData.submition_option = postData?.submition_option;
                delete postData?.submition_option;
            }
            if (postData?.optionalpage) {
                resultedData.optionalpage = postData?.optionalpage;
                delete postData?.optionalpage;
            }
            if (postData?.bio_option) {
                resultedData.bio_option = postData?.bio_option;
                delete postData?.bio_option;
            }
            if (postData?.bio_data_field) {
                resultedData.bio_data_field = postData?.bio_data_field;
                delete postData?.bio_data_field;
            }
            if (postData?.disease_ids) {
                resultedData.disease_ids = postData?.disease_ids;
                delete postData?.disease_ids;
            }
            if (postData?.prevent_option) {
                resultedData.prevent_option = postData?.prevent_option;
                delete postData?.prevent_option;
            }
            if (postData?.age_gender_title) {
                resultedData.age_gender_title = postData?.age_gender_title;
                delete postData?.age_gender_title;
            }
            if (postData?.age_gender_text) {
                resultedData.age_gender_text = postData?.age_gender_text;
                delete postData?.age_gender_text;
            }
            if (postData?.aas_form_prog) {
                resultedData.aas_form_prog = postData?.aas_form_prog;
                delete postData?.aas_form_prog;
            }
            if (postData?.dentures) {
                resultedData.dentures = postData?.dentures;
                delete postData?.dentures;
            }
            if (postData?.dentists_text) {
                resultedData.dentists_text = postData?.dentists_text;
                delete postData?.dentists_text;
            }
            if (postData?.tobacco_cessation_text) {
                resultedData.tobacco_cessation_text = postData?.tobacco_cessation_text;
                delete postData?.tobacco_cessation_text;
            }
            if (postData?.tobacco_para1) {
                resultedData.tobacco_para1 = postData?.tobacco_para1;
                delete postData?.tobacco_para1;
            }
            if (postData?.optometrists_text) {
                resultedData.optometrists_text = postData?.optometrists_text;
                delete postData?.optometrists_text;
            }
            let dynamicdata = {};
            if (postData?.form_type == 'Physician' || postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist' || postData?.form_type == 'Tobacco') {
                dynamicdata['header_text'] = postData?.header_text;
                dynamicdata['footer_text'] = postData?.footer_text;
                dynamicdata['patient_health_information'] = postData?.patient_health_information;
            }
            if (postData?.form_type == 'Physician' || postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist') {
                dynamicdata['patient_information'] = postData?.patient_information;
                dynamicdata['billing_coding'] = postData?.billing_coding;
                dynamicdata['privacy_information'] = postData?.privacy_information;                
                if (postData?.datatransmission) {
                    let datatransmission = JSON.parse(postData?.datatransmission);
                    for (let item of datatransmission) {
                        item.selected = 0;
                        if ((resultedData?.submition_option?.split(',') || []).includes(item.type.toString())) {
                            item.selected = 1;
                        }
                    }
                    dynamicdata['datatransmission'] = datatransmission;
                }
            }
            if (postData?.form_type == 'Physician') {
                let AgeActivity = await this.ageActivityService.listRecord(`ageactivity.status = 1 and org_id in (0,${resultedData.company_id})`, ['ageactivity']);
                dynamicdata['preventative_care_list'] = AgeActivity
                dynamicdata['phq_text'] = postData?.phq_text;
                dynamicdata['gad_text'] = postData?.gad_text;
                if (postData?.optionalsections) {
                    let optionalsections = JSON.parse(postData?.optionalsections);
                    for (let item of optionalsections) {
                        item.selected = 0;
                        if ((resultedData?.optionalpage?.split(',') || []).includes(item.type.toString())) {
                            item.selected = 1;
                        }
                    }
                    dynamicdata['optionalsections'] = optionalsections;
                }
                let diseases_list = [];
                let disease_ids = resultedData?.disease_ids?.split(',').map(Number) || [];
                if (disease_ids.length > 0) {
                    diseases_list = await this.diseaseService.listRecord({ id: In(disease_ids) });
                }                                
                dynamicdata["diseases_list"] = Object.values(diseases_list);
            }
            if (postData?.form_type == 'Dentist' || postData?.form_type == 'Optometrist' || postData?.form_type == 'Tobacco') {
                dynamicdata['patient_data_form'] = postData?.patient_data_form;
            }
            if (postData?.form_type == 'Dentist') {
                dynamicdata['dentist_one_text'] = postData?.dentist_one_text;
                dynamicdata['dentist_two_text'] = postData?.dentist_two_text;
            }
            if (postData?.form_type == 'Tobacco') {
                dynamicdata['fax_text_date'] = postData?.fax_text_date;
            }
            resultedData[postData?.form_type] = dynamicdata;
            delete postData?.company_id, delete postData?.header_text, delete postData?.footer_text, delete postData?.patient_information, delete postData?.billing_coding, delete postData?.privacy_information, delete postData?.patient_health_information, delete postData?.datatransmission, delete postData?.optionalsections, delete postData?.phq_text, delete postData?.gad_text, delete postData?.patient_data_form, delete postData?.dentist_one_text, delete postData?.dentist_two_text, delete postData?.fax_text_date;
            let data;
            let foldername, signup = '';
            let status = 'preview';
            if (postData?.form_type == 'Physician') {
                data = { name: 'Physician', company: company, user: user, status: status, forminstruction: resultedData, authorization: null, foldername: foldername, signup: signup };
            } else if (postData?.form_type == 'Dentist') {
                data = { name: 'Dentist', company: company, user: user, status: status, forminstruction: resultedData, authorizationdvf: null, foldername: foldername };
            } else if (postData?.form_type == 'Optometrist') {
                data = { name: 'Optometrist', company: company, user: user, status: status, forminstruction: resultedData, authorizationovf: null, foldername: foldername };
            } else if (postData?.form_type == 'Tobacco') {
                data = { name: 'Tobacco', company: company, user: user, status: status, forminstruction: resultedData, authorizationta: null, foldername: foldername };
            } else if (postData?.form_type == 'Disease') {
                data = { name: 'Disease' };
            }
            let pdfFormDownload = await lastValueFrom(this.cronMicroservice.send({ cmd: 'pdf-form-download' }, data));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: pdfFormDownload,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            let errorMessage = error?.message;
            if (errorMessage === 'no elements in sequence') {
                errorMessage = 'Microservice Error: The PDF generation service failed to return a response. This usually happens if the service crashes during processing.';
            }
            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    success: 0,
                    error: 1,
                    message: errorMessage,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('send-forms')
    async sendForms(@Req() req: Request, @Res() res: Response, @Body() postData: SendFormInput) {
        try {
            if ([appConstant.ROLE.ORGADMIN , appConstant.ROLE.WCH, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                let user = req.tokenUser;
                const isCheckAll = postData?.check_all == 1;
                const missingParams = !postData?.company_id || !postData?.program_selection;
                const additionalMissing = !isCheckAll && !postData?.selectedids;
                if (missingParams || additionalMissing) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                if([appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)){
                    const userList = await this.userService.usersDataWellness(user, `user.role_id = 12 AND user.membership_code = '${user['membership_code']}' AND user.status =1`);
                    if(!userList || userList.length == 0){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_NO_USER_FOUND'));
                    }
                    if(!userList.some((u) => u.id == user.id)){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_NO_USER_FOUND'));
                    }
                }
                let tokenData = Object.create(req.tokenUser);
                let msg;
                let program_selection: string | string[] = postData?.program_selection?.split(',') || [];
                let selectedids: string | string[] = [];
                if (postData?.selectedids) {
                    selectedids = postData?.selectedids?.split(',') || [];
                }
                let companyId = postData?.company_id;
                let department_id = tokenData.department_id;
                if (postData?.check_all != 1) {
                    if (selectedids && program_selection) {
                        let Templatetext = await this.communicationTemplateTextsService.findOne({ org_id: In([companyId, 0]), type: 15 });
                        Templatetext['new_text'] = await this.urlManageService.onmapUrlContent(Templatetext?.['new_text'],'mailTemplate') || Templatetext?.['text'];
                        selectedids.map(async (userId) => {
                            let data = { userId: userId, program_selection: program_selection, companyId: companyId,  department_id: department_id , Templatetext: Templatetext, type: 'sendForms'};
                            let send_mail = await lastValueFrom(this.cronMicroservice.send({ cmd: 'send_forms_email' }, data));
                        });
                        msg = await this.translatorService.frontendReadTranslation(req.lang, 'EMAIL_SEND_SUCCESS');
                    } else {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'SELECT_PROGRAM_USER'));
                    }
                } else {
                    if (selectedids && program_selection) {
                        let usersList = await this.userService.listRecord(`user.role_id in (2,16) AND user.status = 1 AND user.org_id = ${companyId}`, null, null, ['user.id', 'user.first_name', 'user.last_name', 'user.email', 'user.username']);
                        let requestData = {};
                        requestData['org_id'] = tokenData.org_id;
                        requestData['user_id'] = tokenData.id;
                        requestData['user_role'] = tokenData.role_id;
                        requestData['membership_code'] = tokenData.membership_code;
                        requestData['report_type'] = 'FormSend';
                        requestData['request_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
                        requestData['email'] = tokenData.email;
                        requestData['status'] = '0';
                        requestData['engagement_report'] = tokenData.department_id;
                        requestData['camp_id'] = program_selection.join(',');
                        let incentiveReport = await this.incentiveReportsService.save(requestData);
                        if (incentiveReport) {
                            let incentiveReportId = incentiveReport['id'];
                            const scheduleMailArray = usersList.map((user) => ({
                                user_id: user.id,
                                org_id: tokenData.org_id,
                                name: `${user.first_name} ${user.last_name}`,
                                username: user.username,
                                email: user.email,
                                email_status: 0,
                                status: 0,
                                request_id: incentiveReportId,
                                updated_by: tokenData.id,
                            }));
                            await this.formSendRequestUserService.save(scheduleMailArray);
                        }
                        msg = await this.translatorService.frontendReadTranslation(req.lang, 'EMAIL_SEND_SUCCESS');
                    } else {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'SELECT_PROGRAM_USER'));
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: msg,
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
    @Post('send-forms-file-create')
    async send_forms_file_create() {
        try {
            return await lastValueFrom(this.cronMicroservice.send({ cmd: 'send_forms_file_create' }, {}));
        } catch (error) {
            throw error;
        }
    }
    @Post('send-forms-email-send')
    async send_forms_email_send() {
        try {                 
            return await lastValueFrom(this.cronMicroservice.send({ cmd: 'send_forms_email_send' }, {}));                
        } catch (error) {
            throw error;
        }
    }
}
