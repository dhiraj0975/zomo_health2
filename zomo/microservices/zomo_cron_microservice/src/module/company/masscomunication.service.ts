import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    CompanyMasscommunicationEntity,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { LessThan, Repository } from 'typeorm';
import { CampaignService } from '../campaign/campaign.service';
import { EventService } from '../events/events.service';
import { UserService } from '../user/user.service';
import { CompanyService } from './company.service';
const S3_URL = process.env.S3_URL_PROD;
@Injectable()
export class MassCommunicationService {
    constructor(
        @InjectRepository(
            CompanyMasscommunicationEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaMassCommunicationRepository: Repository<CompanyMasscommunicationEntity>,
        @InjectRepository(
            CompanyMasscommunicationEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaMassCommunicationRepository: Repository<CompanyMasscommunicationEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly userService: UserService,
        private readonly campaignService: CampaignService,
        private readonly eventService: EventService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE') private commonMicroservice: ClientProxy,
    ) {}
    async findOne(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMassCommunicationRepository
            .createQueryBuilder('masscommunication')
            .select(fields)
            .where(condition)
            .orderBy(
                `masscommunication.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getOne();
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any[] = ['masscommunication'],
        limit: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        if (limit) {
            return await this.readReplicaMassCommunicationRepository
                .createQueryBuilder('masscommunication')
                .select(fields)
                .where(condition)
                .orderBy(
                    `masscommunication.${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                )
                .limit(limit)
                .getMany();
        }
        return await this.readReplicaMassCommunicationRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaMassCommunicationRepository.metadata,
        );
        return await this.writeReplicaMassCommunicationRepository
            .createQueryBuilder('masscommunication')
            .update(CompanyMasscommunicationEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async massCommunicationMailRequest() {
        let mailRequestData = await this.listRecord(
            { status: 0, flage: 0 },
            { id: 'ASC' },
            ['masscommunication'],
            3,
        );
        if (mailRequestData.length !== 0) {
            for (const mailRequest of mailRequestData) {
                let id = mailRequest.id;
                let orgId = mailRequest.org_id;
                let userId = mailRequest.user_id;
                let userRole = mailRequest.user_role;
                let userCondition = mailRequest.condition;
                let usersData: any;
                let mailRequestDataUpdate = Object.create(null);
                if (userCondition && userCondition != '') {
                    if (userCondition.includes('User.state')) {
                        userCondition = userCondition.replace(
                            /User\.state/g,
                            'settings.state',
                        );
                    }
                    if (userCondition.includes('User.city')) {
                        userCondition = userCondition.replace(
                            /User\.city/g,
                            'settings.city',
                        );
                    }
                }
                await this.update(
                    {
                        id: LessThan(id),
                        status: 0,
                        flage: 1,
                    },
                    {
                        status: 3,
                    },
                );
                if (userRole == appConstant.ROLE.WCH) {
                    usersData = await this.userService.usersDataWellness(
                        { role_id: userRole, id: userId, org_id: orgId },
                        userCondition,
                    );
                } else {
                    usersData = await this.userService.listUSRecords(
                        userCondition,
                        null,
                        [
                            'User.id',
                            'User.email',
                            'User.first_name',
                            'User.last_name',
                        ],
                    );
                }
                let companyData = await this.companyService.companyFindOne(
                    { id: orgId, status: 1 },
                    ['company_name', 'company_logo'],
                );
                await this.update(
                    {
                        id: id,
                        status: 0,
                        flage: 0,
                    },
                    {
                        flage: 1,
                    },
                );
                if (!usersData && usersData.length == 0) {
                    mailRequestDataUpdate['status'] = 4;
                } else {
                    let campaignID = mailRequest.campaign_id;
                    let eventId = mailRequest.event_id;
                    let campaignData = await this.campaignService.findOne(
                        { id: campaignID, status: 1 },
                        ['campaign_name'],
                    );
                    let EventData = await this.eventService.findOne(
                        { id: eventId, status: 1 },
                        ['event_name'],
                    );
                    for (const user of usersData) {
                        let userId = user.id;
                        let userEmail = user.email;
                        let subject = mailRequest?.subject || '';
                        let content = mailRequest?.message || '';
                        if (content && content.includes('{{IMAGE_BASE_URL}}')) {
                            const userDomain = 'https://' + process.env.DOMAIN;
                            content = content.replace(
                                /{{IMAGE_BASE_URL}}/g,
                                userDomain,
                            );
                        }
                        let Templatetext = Object.create(null);
                        Templatetext['first_name'] = user?.first_name || '';
                        Templatetext['campaign_name'] =
                            campaignData?.campaign_name || '';
                        Templatetext['event_name'] =
                            EventData?.event_name || '';
                        Templatetext['company_name'] =
                            companyData?.company_name || '';
                        Templatetext['company_logo'] = companyData?.company_logo
                            ? `<img src=${S3_URL}companylogos/${orgId}/${companyData?.company_logo} width="200px">`
                            : '';
                        Templatetext['type'] = 44; // mass comunication mail
                        let emaildata = {
                            sender: ``,
                            receiver: userEmail,
                            // receiver: 'smit.p@zomohealth.com',    //testing
                            subject: subject,
                            content: Templatetext,
                            template: content,
                        };
                        await lastValueFrom(
                            this.commonMicroservice.send(
                                { cmd: 'send_email' },
                                emaildata,
                            ),
                        );
                    }
                    mailRequestDataUpdate['status'] = 1;
                }
                let requestedUser = await this.userService.findOne(
                    { id: userId },
                    ['first_name', 'last_name', 'email'],
                );
                let userName = requestedUser?.first_name;
                let userEmail = requestedUser?.email;
                let notifyEmail = mailRequest.email || '';
                if (notifyEmail && notifyEmail == '') {
                    notifyEmail = userEmail;
                }
                mailRequestDataUpdate['id'] = id;
                await this.update(
                    {
                        id: id,
                    },
                    mailRequestDataUpdate,
                );
                let Templatetext = `Your mail request is completed.  Please login to your organization admin user and click on the <a style="text-decoration:none;color:#76B043" href="https://${process.env.DOMAIN}/organization-admin/mass-communication/mass-mail-requests">Statuslink</a> to check status of request.`;
                let emaildata = {
                    sender: ``,
                    receiver: userEmail,
                    // receiver: 'smit.p@zomohealth.com',   //testing
                    subject: 'Mail Request Completed',
                    content: '',
                    template: Templatetext,
                };
                await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'send_email' },
                        emaildata,
                    ),
                );
            }
        }
        return true;
    }
}
