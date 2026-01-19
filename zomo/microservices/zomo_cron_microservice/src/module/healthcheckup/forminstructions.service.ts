import {
    AgeActivityEntity,
    appConstant,
    AuthorizationsEntity,
    CampaignActivityEntity,
    CampaignEntity,
    CampaignRewardEntity,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    CommunicationTemplateTextsEntity,
    FormInstructionsEntity,
    FormSendRequestUserEntity,
    IncentiveReportsEntity,
    tableConstant,
    UserEntity,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { lastValueFrom } from 'rxjs';
import { In, IsNull, Not, Repository } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { UserService } from '../user/user.service';
import { DownloadFormsService } from './downloadforms.service';
import { CronCommonService } from 'src/common';
import { QuestionnaireReportInput } from './input/questionnairereport.input';
const moment = require('moment-timezone');
const path = require('path');
@Injectable()
export class FormInstructionsService {
    constructor(
        @InjectRepository(
            FormSendRequestUserEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaFormSendRequestUserRepository: Repository<FormSendRequestUserEntity>,
        @InjectRepository(
            FormSendRequestUserEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaFormSendRequestUserRepository: Repository<FormSendRequestUserEntity>,
        @InjectRepository(
            IncentiveReportsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaIncentiveReportsRepository: Repository<IncentiveReportsEntity>,
        @InjectRepository(
            IncentiveReportsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaIncentiveReportsRepository: Repository<IncentiveReportsEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(UserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(
            CampaignEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCampaignRepository: Repository<CampaignEntity>,
        @InjectRepository(CampaignEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignRepository: Repository<CampaignEntity>,
        @InjectRepository(
            CampaignRewardEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
        @InjectRepository(CampaignRewardEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
        @InjectRepository(
            CampaignActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
        @InjectRepository(
            CampaignActivityEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
        @InjectRepository(
            FormInstructionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        @InjectRepository(
            FormInstructionsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        private readonly downloadFormsService: DownloadFormsService,
        @InjectRepository(
            AgeActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAgeActivityRepository: Repository<AgeActivityEntity>,
        @InjectRepository(AgeActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAgeActivityRepository: Repository<AgeActivityEntity>,
        @InjectRepository(
            AuthorizationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        @InjectRepository(AuthorizationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        @InjectRepository(
            CommunicationTemplateTextsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        @InjectRepository(
            CommunicationTemplateTextsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly cronCommonService: CronCommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonFileService: CommonFileService,
    ) { }
    async updateIncentiveReports() {
        return await this.writeReplicaIncentiveReportsRepository
            .createQueryBuilder()
            .update(IncentiveReportsEntity)
            .set({
                total_download: () => 'total_download + 1',
                status: 0,
            })
            .where({ report_type: 'FormSend' })
            .andWhere('created_date < NOW() - INTERVAL 4 HOUR')
            .andWhere('status = 2')
            .limit(1)
            .execute();
    }
    async send_forms_file_create() {
        try {
            let sqldatasetting = await this.updateIncentiveReports();
            let reportRequest =
                await this.readReplicaIncentiveReportsRepository.findOne({
                    where: { status: 0, report_type: 'FormSend' },
                    order: { request_date: 'ASC' },
                });
            if (reportRequest) {
                await this.writeReplicaIncentiveReportsRepository.update(
                    { id: reportRequest.id },
                    { status: 2 },
                );
                let request_id = reportRequest.id;
                let program_selection = reportRequest.camp_id;
                let membershipcode = reportRequest.membership_code;
                let companyid = reportRequest.org_id;
                let department_id = reportRequest.engagement_report;
                let reportRequestUser =
                    await this.readReplicaFormSendRequestUserRepository.find({
                        where: {
                            status: 0,
                            request_id: request_id,
                            email_status: 0,
                            file: null,
                        },
                        order: { id: 'DESC' },
                    });
                let countRunning = 0;
                const allFileNames = [];
                if (reportRequestUser && reportRequestUser.length > 0) {
                    const requestUserIds = reportRequestUser.map(
                        (user) => user.id,
                    );
                    await this.writeReplicaFormSendRequestUserRepository.update(
                        { id: In(requestUserIds) },
                        { status: 2 },
                    );
                    for (let row of reportRequestUser) {
                        const userid = row.user_id;
                        let fileName = await this.sendEmail(
                            userid,
                            program_selection,
                            companyid,
                            department_id,
                            null,
                            'sendFormsFileCreate',
                        );
                        const fileData = [];
                        if (fileName && fileName.length > 0) {
                            fileName.forEach((element) => {
                                fileData.push(
                                    element.temp_path.replace('\\', '/'),
                                );
                            });
                        }
                        allFileNames.push({
                            id: row.id,
                            file: fileData ? JSON.stringify(fileData) : null,
                            status: 3,
                        });
                        countRunning++;
                    }
                    if (
                        allFileNames.length === reportRequestUser.length &&
                        countRunning === reportRequestUser.length
                    ) {
                        try {
                            await this.writeReplicaFormSendRequestUserRepository.save(
                                allFileNames,
                            );
                            await this.writeReplicaIncentiveReportsRepository.update(
                                { id: reportRequest.id },
                                { status: 3 },
                            );
                            return 'Forms successfully sent.';
                        } catch (error) {
                            await this.writeReplicaIncentiveReportsRepository.update(
                                { id: reportRequest.id },
                                { status: 0 },
                            );
                            throw new Error('Error');
                        }
                    } else {
                        await this.writeReplicaIncentiveReportsRepository.update(
                            { id: reportRequest.id },
                            { status: 0 },
                        );
                        throw new Error('All user file is not generated.');
                    }
                } else {
                    await this.writeReplicaIncentiveReportsRepository.update(
                        { id: reportRequest.id },
                        { status: 0 },
                    );
                    throw new Error('User not found.');
                }
            } else {
                throw new Error('Sorry! Request not found.');
            }
        } catch (error) {
            throw error;
        }
    }
    async sendEmail(
        userId,
        program_selection,
        companyId,
        department_id,
        Templatetext,
        useType = null,
    ) {
        try {
            let user = await this.userService.findOneWithTable(
            //     {
            //     id: userId,
            //     status: 1,
            //     role_id: In([2, 16]),
            // }
            `User.id = ${userId} AND User.status = 1 AND User.role_id IN (2,16)`
        );
            delete user['settings']['id'];
            user = { ...user, ...user['settings'] };
            let company = {
                ...user['company'],
                companySetting: user['companysetting'],
            };
            (delete user['company'],
                delete user['companysetting'],
                delete user['settings'],
                delete user['role']);
            let deptid = department_id;
            let campaign = await this.readReplicaCampaignRepository
                .createQueryBuilder('campaign')
                .where(
                    `campaign.organization_id = ${companyId} AND campaign.status = 1 
                    AND (
                    campaign.department_ids REGEXP '^${deptid},' OR 
                    campaign.department_ids REGEXP ',${deptid}$' OR 
                    campaign.department_ids REGEXP ',${deptid},' OR 
                    campaign.department_ids = ${deptid} OR 
                    campaign.department_ids = '0'
                    )`,
                )
                .orderBy('campaign.end_date', 'DESC')
                .getOne();
            let act_start_date = Object.create(null);
            let act_end_date = Object.create(null);
            if (campaign) {
                let rewards =
                    await this.readReplicaCampaignRewardRepository.find({
                        where: { campaign_id: campaign.id },
                        select: [
                            'id',
                            'campaign_id',
                            'reward_name',
                            'reward_desc',
                        ],
                        order: { order_id: 'ASC' },
                    });
                if (rewards) {
                    for (let rewrd of rewards) {
                        if (rewrd?.hire_date == 1) {
                            let activityId =
                                rewrd?.related_activity?.split(',') || [];
                            let activity =
                                await this.readReplicaCampaignActivityRepository
                                    .createQueryBuilder('campaignactivity')
                                    .leftJoinAndMapOne(
                                        'campaignactivity.activity',
                                        tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                                        'activity',
                                        `campaignactivity.activity_id = activity.id `,
                                    )
                                    .where(
                                        `campaignactivity.status = 1 AND campaignactivity.id IN (${activityId.join(',')})`,
                                    )
                                    .select(['campaignactivity', 'activity'])
                                    .orderBy({
                                        'campaignactivity.required_by_spouse':
                                            'DESC',
                                        'campaignactivity.required_by_user':
                                            'DESC',
                                        'campaignactivity.end_date': 'ASC',
                                        'campaignactivity.cust_name': 'ASC',
                                        'activity.activity_name': 'ASC',
                                    })
                                    .getMany();
                            for (let k = 0; k < activity.length; k++) {
                                let totalDays = 0;
                                const actStartDate = moment(
                                    activity[k].start_date,
                                ).format('YYYY-MM-DD');
                                const actEndDate = moment(
                                    activity[k].end_date,
                                ).format('YYYY-MM-DD');
                                totalDays =
                                    moment(actEndDate).diff(
                                        actStartDate,
                                        'days',
                                    ) + 1;
                                if (
                                    user?.date_of_hire &&
                                    moment(actStartDate).isBefore(
                                        moment(user.date_of_hire),
                                    )
                                ) {
                                    const hireDate = moment(
                                        user.date_of_hire,
                                    ).format('YYYY-MM-DD');
                                    act_start_date[activity[k].activity_id] =
                                        hireDate;
                                    act_end_date[activity[k].activity_id] =
                                        moment(hireDate)
                                            .clone()
                                            .add(totalDays - 1, 'days')
                                            .format('YYYY-MM-DD');
                                } else {
                                    act_start_date[activity[k].activity_id] =
                                        actStartDate;
                                    act_end_date[activity[k].activity_id] =
                                        actEndDate;
                                }
                            }
                        }
                    }
                }
            }
            let downloadFunction, data;
            let signup,
                foldername = '';
            let status = 'EmailPdf';
            let forminstruction: any =
                await this.readReplicaFormInstructionsRepository.findOne({
                    where: { company_id: companyId },
                    order: { id: 'DESC' },
                });
            let files = [];
            if (program_selection.includes('1')) {
                downloadFunction = 'Physician';
                let physician =
                    await this.downloadFormsService.templetextsRecord(
                        companyId,
                        null,
                        'Physician',
                    );
                let AgeActivity = await this.readReplicaAgeActivityRepository
                    .createQueryBuilder('ageactivity')
                    .where(
                        `ageactivity.status = 1 and org_id in (0,${companyId})`,
                    )
                    .select(['ageactivity'])
                    .orderBy(`ageactivity.id`, 'ASC')
                    .getMany();
                physician['preventative_care_list'] = AgeActivity;
                forminstruction = { ...forminstruction, Physician: physician };
                let authorization =
                    await this.readReplicaAuthorizationsRepository.findOne({
                        where: { user_id: userId, type_of_form: 'Physician' },
                        order: { id: 'DESC' },
                    });
                data = {
                    name: downloadFunction,
                    company: company,
                    user: user,
                    status: status,
                    forminstruction: forminstruction,
                    authorization: authorization,
                    foldername: foldername,
                    signup: signup,
                };
                if (act_start_date[2] && act_end_date[2]) {
                    data = {
                        ...data,
                        stdt: act_start_date[2],
                        endt: act_end_date[2],
                    };
                }
                let pdfFormDownload =
                    await this.downloadFormsService.getGeneratepdf(
                        data.company,
                        data.user,
                        data.authorization,
                        data.forminstruction,
                        data.status,
                        data.foldername,
                        data.signup,
                        data?.filefilter,
                        data?.stdt,
                        data?.endt,
                    );
                files.push(pdfFormDownload);
            }
            if (program_selection.includes('2')) {
                downloadFunction = 'Dentist';
                let dentist = await this.downloadFormsService.templetextsRecord(
                    companyId,
                    null,
                    'Dentist',
                );
                forminstruction = { ...forminstruction, Dentist: dentist };
                let authorizationdvf =
                    await this.readReplicaAuthorizationsRepository.findOne({
                        where: { user_id: userId, type_of_form: 'Dental' },
                        order: { id: 'DESC' },
                    });
                data = {
                    name: downloadFunction,
                    company: company,
                    user: user,
                    status: status,
                    forminstruction: forminstruction,
                    authorizationdvf: authorizationdvf,
                    foldername: foldername,
                };
                if (act_start_date[3] && act_end_date[3]) {
                    data = {
                        ...data,
                        stdt: act_start_date[3],
                        endt: act_end_date[3],
                    };
                }
                let pdfFormDownload =
                    await this.downloadFormsService.getGeneratepdf_dvf(
                        data.company,
                        data.user,
                        data.authorizationdvf,
                        data.forminstruction,
                        data.status,
                        data.foldername,
                        data?.filefilter,
                        data?.stdt,
                        data?.endt,
                    );
                files.push(pdfFormDownload);
            }
            if (program_selection.includes('3')) {
                downloadFunction = 'Optometrist';
                let optometrist =
                    await this.downloadFormsService.templetextsRecord(
                        companyId,
                        null,
                        'Optometrist',
                    );
                forminstruction = {
                    ...forminstruction,
                    Optometrist: optometrist,
                };
                let authorizationovf =
                    await this.readReplicaAuthorizationsRepository.findOne({
                        where: { user_id: userId, type_of_form: 'Optometrist' },
                        order: { id: 'DESC' },
                    });
                data = {
                    name: downloadFunction,
                    company: company,
                    user: user,
                    status: status,
                    forminstruction: forminstruction,
                    authorizationovf: authorizationovf,
                    foldername: foldername,
                };
                if (act_start_date[5] && act_end_date[5]) {
                    data = {
                        ...data,
                        stdt: act_start_date[5],
                        endt: act_end_date[5],
                    };
                }
                let pdfFormDownload =
                    await this.downloadFormsService.getGeneratepdf_ovf(
                        data.company,
                        data.user,
                        data.authorizationovf,
                        data.forminstruction,
                        data.status,
                        data.foldername,
                        data?.filefilter,
                        data?.stdt,
                        data?.endt,
                    );
                files.push(pdfFormDownload);
            }
            if (program_selection.includes('4')) {
                downloadFunction = 'Tobacco';
                let tobacco = await this.downloadFormsService.templetextsRecord(
                    companyId,
                    null,
                    'Tobacco',
                );
                forminstruction = { ...forminstruction, Tobacco: tobacco };
                let authorizationta =
                    await this.readReplicaAuthorizationsRepository.findOne({
                        where: { user_id: userId, type_of_form: 'Tabacco' },
                        order: { id: 'DESC' },
                    });
                data = {
                    name: downloadFunction,
                    company: company,
                    user: user,
                    status: status,
                    forminstruction: forminstruction,
                    authorizationta: authorizationta,
                    foldername: foldername,
                };
                if (act_start_date[4] && act_end_date[4]) {
                    data = {
                        ...data,
                        stdt: act_start_date[4],
                        endt: act_end_date[4],
                    };
                } else if (act_start_date[12] && act_end_date[12]) {
                    data = {
                        ...data,
                        stdt: act_start_date[12],
                        endt: act_end_date[12],
                    };
                } else if (act_start_date[13] && act_end_date[13]) {
                    data = {
                        ...data,
                        stdt: act_start_date[13],
                        endt: act_end_date[13],
                    };
                } else if (act_start_date[14] && act_end_date[14]) {
                    data = {
                        ...data,
                        stdt: act_start_date[14],
                        endt: act_end_date[14],
                    };
                }
                let pdfFormDownload =
                    await this.downloadFormsService.getGeneratepdf_ta(
                        data.company,
                        data.user,
                        data.authorizationta,
                        data.forminstruction,
                        data.status,
                        data.foldername,
                        data?.filefilter,
                        data?.stdt,
                        data?.endt,
                    );
                files.push(pdfFormDownload);
            }
            if (useType == 'sendForms') {
                let sendUserFileEmail = await this.sendUserFileEmail(
                    user,
                    company,
                    Templatetext,
                    files,
                );
            }
            if (useType == 'sendFormsFileCreate') {
                return files;
            }
            return 'success';
        } catch (error) {
            return error.message;
        }
    }
    async sendUserFileEmail(user, company, Templatetext, files) {
        try {
            let emailDetails = {
                receiver: user.email,
                subject: 'Welcome to Wellness!',
                template: Templatetext?.['new_text'] || Templatetext?.['text'],
                content: {
                    type: 15,
                    First_Name: user.first_name.toUpperCase(),
                    Company_Name: company.company_name,
                    Username: user.username,
                    Password:
                        'Employee Birthday (MMDDYYYY) If you have logged in before, please use your existing password.',
                },
                attachment: files,
            };
            const response = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'send_email' },
                    emailDetails,
                ),
            );
            return response;
        } catch (err) {
            throw err;
        }
    }
    async send_forms_email_send() {
        try {
            let reportRequestUser =
                await this.readReplicaFormSendRequestUserRepository.find({
                    where: { status: 3, email_status: 0, file: Not(IsNull()) },
                    order: { id: 'DESC' },
                    take: 300,
                });
            if (reportRequestUser) {
                const requestUserIds = reportRequestUser.map((user) => user.id);
                const requestUserMIds = [
                    ...new Set(reportRequestUser.map((user) => user.user_id)),
                ];
                const requestUserCompanyIds = [
                    ...new Set(reportRequestUser.map((user) => user.org_id)),
                ];
                const requestDataIds = [
                    ...new Set(
                        reportRequestUser.map((user) => user.request_id),
                    ),
                ];
                await this.writeReplicaFormSendRequestUserRepository.update(
                    { id: In(requestUserIds) },
                    { email_status: 2 },
                );
                let reportRequest =
                    await this.readReplicaIncentiveReportsRepository.findOne({
                        where: {
                            id: In(requestDataIds),
                            report_type: 'FormSend',
                        },
                        order: { request_date: 'ASC' },
                    });
                requestUserCompanyIds.push(0);
                let companyDetails = await this.companyService.list(
                    { id: In(requestUserCompanyIds) },
                    null,
                    ['company.id', 'company.company_name'],
                );
                let Templatetext =
                    await this.readReplicaCommunicationTemplateTextsRepository.findOne(
                        {
                            where: {
                                org_id: In(requestUserCompanyIds),
                                type: 15,
                            },
                            order: { id: 'DESC' },
                        },
                    );
                if (Templatetext) {
                    Templatetext['new_text'] =
                        (await this.cronCommonService.onmapUrlContent(
                            Templatetext?.['new_text'],
                            'mailTemplate',
                        )) || Templatetext?.['text'];
                }
                let UserDetails = await this.userService.list(
                    { id: In(requestUserMIds) },
                    null,
                    [
                        'user.id',
                        'user.first_name',
                        'user.last_name',
                        'user.email',
                        'user.username',
                    ],
                );
                let updateDataArray = [];
                let updateDataArrayM = [];
                const file_destination = path.resolve(
                    process.cwd(),
                    '../microservices/zomo_cron_microservice/uploads/',
                );
                for (let row of reportRequestUser) {
                    let orgId = row.org_id;
                    let userId = row.user_id;
                    let company = companyDetails.find(
                        (item) => item.id == orgId,
                    );
                    let user = UserDetails.find((item) => item.id == userId);
                    let already_exit_file_array = [];
                    if (row.file) {
                        let files = JSON.parse(row.file);
                        for (let file of files) {
                            const fileName = file.split('/').pop();
                            let file_path = path.join(file_destination, file);
                            if (fs.existsSync(file_path)) {
                                already_exit_file_array.push({
                                    path: file_path,
                                    filename: fileName,
                                });
                            }
                        }
                    }
                    let sendFormsEmailSend = await this.sendUserFileEmail(
                        user,
                        company,
                        Templatetext,
                        already_exit_file_array,
                    );
                    if (!sendFormsEmailSend?.error) {
                        updateDataArray.push({
                            id: row.id,
                            email_status: 1,
                            status: 1,
                            updated_date: moment().format(
                                'YYYY-MM-DD HH:mm:ss',
                            ),
                            response_message: 'Mail successfully sent',
                        });
                    } else {
                        updateDataArray.push({
                            id: row.id,
                            email_status: 3,
                            status: 4,
                            updated_date: moment().format(
                                'YYYY-MM-DD HH:mm:ss',
                            ),
                            response_message: 'Mail not send',
                        });
                    }
                }
                if (updateDataArray && updateDataArray.length > 0) {
                    await this.writeReplicaFormSendRequestUserRepository.save(
                        updateDataArray,
                    );
                }
                for (let request of requestDataIds) {
                    const remailEmail =
                        await this.readReplicaFormSendRequestUserRepository.findOne(
                            {
                                where: {
                                    email_status: In([2, 3]),
                                    status: 3,
                                    request_id: request,
                                },
                            },
                        );
                    if (!remailEmail) {
                        updateDataArrayM.push({
                            id: request,
                            status: 1,
                            updated_date: moment().format(
                                'YYYY-MM-DD HH:mm:ss',
                            ),
                        });
                    }
                }
                if (updateDataArrayM && updateDataArrayM.length > 0) {
                    await this.writeReplicaIncentiveReportsRepository.save(
                        updateDataArrayM,
                    );
                }
                if (
                    (updateDataArray && updateDataArray.length > 0) ||
                    (updateDataArrayM && updateDataArrayM.length > 0)
                ) {
                    return 'Emails successfully sended.';
                }
                return 'Emails not sended';
            } else {
                throw new Error('Sorry! Users not found.');
            }
        } catch (error) {
            throw error;
        }
    }
    async visibleSectionAccordingToProgram(companyid: number) {
        let result = await this.readReplicaFormInstructionsRepository.findOne({
            where: { company_id: companyid },
            order: { id: 'DESC' },
        });
        let programSelections = result?.program_selection
        let count = programSelections?.split(',')?.length
        if (count > 0) {
            return programSelections?.split(',')?.map(s => s.trim());
        }
        return []
    }
    async visibleSectionAccordingToProgramCompany(companyid: number[]) {
        let result = await this.readReplicaFormInstructionsRepository.find({
            where: { company_id: In(companyid) },
            order: { id: 'DESC' },
        });
        let companyWiseVisibleSection = {};
        for (let companyInstruction of result) {
            let programSelections = companyInstruction?.program_selection
            let count = programSelections?.split(',')?.length
            if (count > 0) {
                companyWiseVisibleSection[companyInstruction.company_id] = programSelections?.split(',')?.map(s => s.trim());
            } else {
                companyWiseVisibleSection[companyInstruction.company_id] = [];
            }
        }
        return companyWiseVisibleSection;
    }
    // function for generating questionnaire report
    async generateQuestionnaireReport(postData: QuestionnaireReportInput) {
        try {
            if (!postData?.org_id || postData?.org_id == '' || postData?.org_id == undefined || postData?.org_id == null) {
                throw new Error('A required field is missing. Please check and try again.');
            }
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            let org_id: number[] | number | string | string[];
            let clmNameArr: string[] = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'EMPLOYEE ID', 'GENDER',
                'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE', 'Questionnaire Date',
            ];
            if (autoRequest == 0) {
                org_id = postData?.org_id;
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id;
                }
            }
            let condition = `User.role_id IN (2,16) AND User.status = 1 `;
            if (org_id && org_id != '') {
                let membershipcodeArray = [];
                const orgIdArray = (Array.isArray(org_id) ? org_id : String(org_id).split(','))
                    .map(id => Number(String(id).trim()))
                    .filter(id => !isNaN(id) && id > 0);
                if (orgIdArray.length > 0) {
                    membershipcodeArray = await this.companyService.companyListRecord(
                        ['code'],
                        { id: In(orgIdArray) }
                    );
                }
                if (membershipcodeArray.length === 0) {
                    throw new Error('No organization found');
                }
                condition += ` AND User.membership_code IN ('${membershipcodeArray.map(item => item.code).join("','")}')`;
                let conditionInner = '';
                conditionInner += `q.user_id <> '' AND q.status = 1`;
                if (postData?.start_date && postData?.end_date) {
                    conditionInner += ` AND DATE_FORMAT(q.created,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.start_date) {
                    conditionInner += ` AND DATE_FORMAT(q.created,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.end_date) {
                    conditionInner += ` AND DATE_FORMAT(q.created,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                }
                let paginate = {
                    page: postData?.page || 1,
                    limit: postData?.limit || appConstant.RECORD_PER_PAGE,
                }
                let field: string[] = [
                    'User.role_id AS user_role_id', 'User.new_password AS user_new_password', 'User.last_name AS user_last_name',
                    'User.timezone AS user_timezone', 'User.is_camp_eligible AS user_is_camp_eligible', 'User.department_id AS user_department_id',
                    'User.org_id AS user_org_id', 'User.id AS user_id', 'User.email AS user_email', 'User.on_insurance_plan AS user_on_insurance_plan',
                    'User.gender AS user_gender', 'User.relationship_id AS user_relationship_id', 'User.code AS user_code', 'User.username AS user_username',
                    'User.employeeid AS user_employeeid','User.middle_name AS user_middle_name', 'User.dob AS user_dob', 'User.location AS user_location',
                    'User.date_of_hire AS user_date_of_hire', 'User.first_name AS user_first_name', 'User.insurance_plan_name AS user_insurance_plan_name',
                    'settings.jobtitle AS settings_jobtitle', 'settings.wphone AS settings_wphone', 'settings.hphone AS settings_hphone',
                    'company.company_name AS company_name', 'department.dept_name AS department_name',
                    'Location.lname AS location_name', 'Location.address1 AS location_address1', 'Location.city AS location_city', 'Location.state AS location_state',
                    'Location.zip AS location_zip', 'Location.country AS location_country',
                ]
                if (requestfor === 1) {
                    if (postData?.search_str && postData?.search_str != '') {
                        const search = postData?.search_str.toLowerCase();
                        if (moment(postData?.search_str, 'MM-DD-YYYY', true).isValid()) {
                            condition += ` AND Questionnaireuser.created LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%'`
                        } else {
                            condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR LOWER(company.company_name) LIKE '%${search}%' OR settings.wphone LIKE '%${search}%' OR settings.hphone LIKE '%${search}%')`;
                        }
                    }
                }
                let resultDetails: any = await this.userService.generateTPTHReport('questionnaire', condition, conditionInner, requestfor == 1 ? paginate : null, field);
                if (!resultDetails) {
                    throw new Error('No record found');
                }
                if (resultDetails) {
                    clmNameArr.push(
                        'I am a current San Mateo County or Courts employee?',
                        'I am enrolled in a San Mateo County medical plan?',
                        `I am a dependent covered under another San Mateo County or Courts employee's medical plan?`,
                        'No, = Did not complete 3 Different Wellness Elective Activities',
                        '1=Waived San Mateo County medical insurance and/or not enrolled in San Mateo County medical plan',
                        '0=Did not complete Online Health Assessment',
                    )
                    resultDetails = await this.mapQuestionnaireData(resultDetails, requestfor, clmNameArr);
                    if (requestfor == 2) {
                        resultDetails = await this.questionnaireReportXLSX(resultDetails, clmNameArr);
                    }
                }
                return resultDetails;
            }
            throw new Error('No organization found');
        }
        catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    async mapQuestionnaireData(resultDetails, requestfor: number, clmNameArr: string[] = []) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let healthDataList = resultDetails?.['list'] || [];
            if (Object.keys(healthDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, healthData] of healthDataList.entries()) {
                let tempdatarow = Object.create(null);
                const fullName = `${healthData?.first_name} ${healthData?.last_name}`;
                tempdatarow['firstName'] = healthData?.first_name || '';
                tempdatarow['lastName'] = healthData?.last_name || '';
                tempdatarow['email'] = healthData?.email || '';
                tempdatarow['organization'] = healthData?.company?.company_name || '';
                tempdatarow['fullName'] = fullName;
                tempdatarow['code'] = healthData?.code || '';
                tempdatarow['id'] = healthData?.id || '';
                tempdatarow['wpn'] = healthData?.settings?.wphone || '';
                tempdatarow['hpn'] = healthData?.settings?.hphone || '';
                tempdatarow['questionnaireDate'] = healthData?.['Questionnaireuser']?.['created'] ? this.commonDateService.DateTimeFormat(healthData?.['Questionnaireuser']?.['created'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                tempdatarow['questionnaireId'] = healthData?.['Questionnaireuser']?.['id'] || '';
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, healthData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(healthData, clmNameArr);
                    tempdatainfo['Questionnaire Date'] = healthData['Questionnaireuser']['created'] ? this.commonDateService.DateTimeFormat(healthData['Questionnaireuser']['created'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                    tempdatainfo['I am a current San Mateo County or Courts employee?'] = healthData['Questionnaireuser']['medical_status_one'] || 'No';
                    tempdatainfo['I am enrolled in a San Mateo County medical plan?'] = healthData['Questionnaireuser']['medical_status_two'] || 'No';
                    tempdatainfo[`I am a dependent covered under another San Mateo County or Courts employee's medical plan?`] = healthData['Questionnaireuser']['participation_wp'] || 'No';
                    tempdatainfo['No, = Did not complete 3 Different Wellness Elective Activities'] = healthData['Questionnaireuser']['participation_wp_data'] == 1 ? 'Yes' : 'No';
                    tempdatainfo['1=Waived San Mateo County medical insurance and/or not enrolled in San Mateo County medical plan'] = healthData['Questionnaireuser']['wellness_score_one'] || 'No';
                    tempdatainfo['0=Did not complete Online Health Assessment'] = healthData['Questionnaireuser']['wellness_score_two'] || 'No';
                    tempdatarows.push(tempdatainfo);
                }
                return tempdatarows
            }
            return [];
        }
        return tempdatarows;
    }
    async questionnaireReportXLSX(resultDetails, clmNameArr: string[]): Promise<{ file_data: string, file_name: string, extension: string }> {
        let directory = path.join(appConstant.COMPANY_HEALTH_QUESTIONNAIRE_REPORT);
        let fileName = `Questionnaire_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
        let filePath = path.join(directory, fileName);
        let filePathh = path.join(`${directory}`);
        const finalData = resultDetails.map((item) =>
            clmNameArr.reduce((acc, key) => {
                if (item.hasOwnProperty(key)) {
                    acc[key] = item[key];
                } else {
                    acc[key] = "";
                }
                return acc;
            }, {})
        );
        const jsonString = JSON.stringify(finalData, null, 2);
        let data;
        try {
            let writeFile = await this.commonFileService.writeFile(
                filePathh,
                jsonString,
                fileName,
            );
            if (writeFile?.status == 'success') {
                let excelData: any =
                    await this.commonFileService.createJsonToFile(
                        1,
                        `${filePath}`,
                        'pythonjsontoxlsx.py',
                    );
                if (excelData?.status == 'success') {
                    filePath = `${filePath}`.replace('.json', '.xlsx');
                    if (await this.commonFileService.fileExist(filePath)) {
                        data =
                            await this.commonFileService.FileToBase64(filePath);
                    } else {
                        throw new Error(`File does not exist`);
                    }
                }
            } else {
                throw new Error(`File does not exist`);
            }
        } catch (err) {
            throw new Error(`An error occurred: ${err.message}`);
        }
        fileName = fileName.replace('.json', '');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        filePath = `${filePath}`.replace('.xlsx', '.json');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        return { file_data: data, file_name: fileName, extension: 'xlsx' };
    }
}
