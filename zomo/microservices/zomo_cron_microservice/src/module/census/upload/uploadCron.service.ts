import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { In } from 'typeorm';
import { CommunicationTemplateTextsService } from '../../communication/templatetexts/communicationtemplatetexts.service';
import { CompanyService } from '../../company/company.service';
import { ImportUserRequestService } from '../../user/importuserrequest/importuserrequest.service';
import { CronCommonService } from 'src/common';
const S3_URL = process.env.S3_URL_PROD;
const path = require('path');

@Injectable()
export class UploadCronService {
    constructor(
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly cronCommonService: CronCommonService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly communicationTemplateTextsService: CommunicationTemplateTextsService,
    ) {}
    async importUserProcessUpload(postData: any) {
        try {
            let recordDetails: any,
                createData: any = {},
                updatedData: any = {},
                echoTime = '',
                file_error = '';
            const startTime = new Date().getTime();
            if (postData?.id) {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        hash: postData?.id,
                        status: '0',
                        flage: '3',
                        requeststep: '3',
                        source_type: '2',
                    },
                    null,
                    [
                        'hash',
                        'org_id',
                        'mapped_header',
                        'origional_file',
                        'id',
                        'census_upload_type',
                        'reset_password',
                        'email',
                        'user_id',
                        'user_notify',
                        'cuser_notify',
                    ],
                );
            } else {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        status: '0',
                        flage: '3',
                        requeststep: '3',
                        source_type: '1',
                    },
                    { request_date: 'ASC' },
                    [
                        'hash',
                        'org_id',
                        'mapped_header',
                        'origional_file',
                        'id',
                        'census_upload_type',
                        'reset_password',
                        'email',
                        'user_id',
                        'user_notify',
                        'cuser_notify',
                    ],
                );
            }
            if (!recordDetails) {
                throw new Error('ERR_RECORD_NOT_FOUND');
            }
            const directory = `userimport/${recordDetails?.org_id}/${recordDetails?.id}`;
            const companyId = recordDetails?.org_id;
            const companyDetails = await this.companyService.findOne({
                id: recordDetails?.org_id,
                deleted: 0,
                status: 1,
            });
            echoTime = 'Upload\n';
            echoTime += `First ${(new Date().getTime() - startTime) / 1000}\n`;
            await this.importUserRequestService.update(
                { id: recordDetails?.id },
                { status: '0', flage: '4' },
            );
            if (file_error !== '') {
                await this.importUserRequestService.update(
                    { id: recordDetails?.id },
                    { status: '1', file_error: file_error },
                );
            } else {
                await this.importUserRequestService.update(
                    { id: recordDetails?.id },
                    {
                        requeststep: '5',
                        flage: '5',
                        status: '1',
                        file_error: file_error,
                    },
                );
            }
            echoTime += `Second ${(new Date().getTime() - startTime) / 1000}\n`;
            /* Templete Data Get */
            let Templatetextup =
                await this.communicationTemplateTextsService.findOne({
                    org_id: In([companyId, 0]),
                    type: 21,
                });
            if (Templatetextup) {
                Templatetextup['new_text'] =
                    (await this.cronCommonService.onmapUrlContent(
                        Templatetextup?.['new_text'],
                        'mailTemplate',
                    )) || Templatetextup?.['text'];
            }
            let Templatetextem =
                await this.communicationTemplateTextsService.findOne({
                    org_id: In([companyId, 0]),
                    type: 1,
                });
            if (Templatetextem) {
                Templatetextem['new_text'] =
                    (await this.cronCommonService.onmapUrlContent(
                        Templatetextem?.['new_text'],
                        'mailTemplate',
                    )) || Templatetextem?.['text'];
            }
            let Templatetextre =
                await this.communicationTemplateTextsService.findOne({
                    org_id: In([companyId, 0]),
                    type: 26,
                });
            if (Templatetextre) {
                Templatetextre['new_text'] =
                    (await this.cronCommonService.onmapUrlContent(
                        Templatetextre?.['new_text'],
                        'mailTemplate',
                    )) || Templatetextre?.['text'];
            }
            /* Templete Data Get */
            if (
                recordDetails?.email != '' &&
                this.commonFileService.userSheetValidation(
                    recordDetails?.email,
                    'email',
                )
            ) {
                let emailtext =
                    'Your census is uploaded successfully. Check imported users, rejected users and updated user sheet at census request tab for that  please login to your organization admin user and click on the ';
                let emailDetails = {
                    receiver: recordDetails?.email,
                    subject: 'Your Import User Request Completed.',
                    template:
                        Templatetextre?.['new_text'] ||
                        Templatetextre?.['text'],
                    content: {
                        type: 26,
                        emailtext: emailtext,
                        orgAdminName: 'Sir/Madam',
                        url: 'import_user_request',
                    },
                };
                const response = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'send_email' },
                        emailDetails,
                    ),
                );
            }
            echoTime += `Third ${(new Date().getTime() - startTime) / 1000}\n`;
            if (
                recordDetails?.user_notify == 1 ||
                recordDetails?.cuser_notify == 1
            ) {
                const updated_fileName: string = `Updated_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                let file_updateData = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'check_file' },
                        {
                            prefix: `${directory}/${updated_fileName}`,
                            userBucket: 'private',
                        },
                    ),
                );
                if (file_updateData) {
                    let updateFileRead = await lastValueFrom(
                        this.commonMicroservice.send(
                            { cmd: 'get_file' },
                            {
                                path: `${directory}/${updated_fileName}`,
                                userBucket: 'private',
                            },
                        ),
                    );
                    let updData = Buffer.from(
                        updateFileRead.Body,
                        'base64',
                    ).toString('utf-8');
                    updatedData = JSON.parse(updData);
                    if (
                        recordDetails?.user_notify == 1 &&
                        updatedData.length > 0
                    ) {
                        let update_users = updatedData
                            .map((item: any) => item.email)
                            .filter((email: any) =>
                                this.commonFileService.userSheetValidation(
                                    email,
                                    'email',
                                ),
                            );
                        for (let user of update_users) {
                            let emailDetails = {
                                receiver: user.email,
                                subject: 'Your Account has been updated.',
                                template:
                                    Templatetextup?.['new_text'] ||
                                    Templatetextup?.['text'],
                                content: {
                                    'Company Name': companyDetails.company_name,
                                    'First Name': recordDetails.first_name,
                                    type: 21,
                                },
                            };
                            const response = await lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'send_email' },
                                    emailDetails,
                                ),
                            );
                        }
                    }
                }
                const create_fileName: string = `Created_Records_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
                let file_createData = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'check_file' },
                        {
                            prefix: `${directory}/${create_fileName}`,
                            userBucket: 'private',
                        },
                    ),
                );
                if (file_createData) {
                    let createFileRead = await lastValueFrom(
                        this.commonMicroservice.send(
                            { cmd: 'get_file' },
                            {
                                path: `${directory}/${create_fileName}`,
                                userBucket: 'private',
                            },
                        ),
                    );
                    let creData = Buffer.from(
                        createFileRead.Body,
                        'base64',
                    ).toString('utf-8');
                    createData = JSON.parse(creData);
                    if (
                        recordDetails?.cuser_notify == 1 &&
                        createData.length > 0
                    ) {
                        let attachemnt = [];
                        companyDetails.companyMeta.emailattachment =
                            companyDetails?.companyMeta?.emailattachment
                                ? JSON.parse(
                                      companyDetails.companyMeta
                                          .emailattachment,
                                  )
                                : [];
                        if (
                            companyDetails.companyMeta.emailattachment &&
                            companyDetails.companyMeta.emailattachment.length
                        ) {
                            for (let ele of companyDetails.companyMeta
                                .emailattachment) {
                                let file = ele.includes(
                                    S3_URL.replace(
                                        process.env.AWS_BUCKET_PUBLIC_PROD,
                                        process.env.AWS_BUCKET_PRIVATE_PROD,
                                    ),
                                )
                                    ? ele.replace(
                                          S3_URL.replace(
                                              process.env
                                                  .AWS_BUCKET_PUBLIC_PROD,
                                              process.env
                                                  .AWS_BUCKET_PRIVATE_PROD,
                                          ),
                                          '',
                                      )
                                    : ele;
                                let fileData = await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'get_file' },
                                        { path: ele, userBucket: 'private' },
                                    ),
                                );
                                if (fileData) {
                                    let filename =
                                        file.split('/')[
                                            file.split('/').length - 1
                                        ];
                                    const directory = `${appConstant.COMPANY_EMAIL_ATTACHMENT}/${companyDetails.id}`;
                                    let filePath = path.join(
                                        directory,
                                        filename,
                                    );
                                    let filePathh = path.join(`${directory}`);
                                    let writeFile =
                                        await this.commonFileService.writePDFFile(
                                            filePathh,
                                            fileData.Body,
                                            filename,
                                        );
                                    if (writeFile?.status == 'success') {
                                        attachemnt.push({
                                            filename: filename,
                                            path: path.resolve(filePath),
                                        });
                                    }
                                }
                            }
                        }
                        let pass_text = '';
                        let comPrefix =
                            companyDetails?.company_settings
                                ?.pre_first_login_by ?? '';
                        pass_text = this.commonService.admin_mail_data(
                            companyDetails?.company_settings?.first_login_by,
                            comPrefix,
                        );
                        for (let user of createData) {
                            if (
                                user?.['Email'] &&
                                this.commonFileService.userSheetValidation(
                                    user?.['Email'],
                                    'email',
                                )
                            ) {
                                let emailDetails = {
                                    receiver: user?.['Email'],
                                    subject:
                                        'Welcome to ZomoHealth: New Account Created',
                                    content: {
                                        Username: user?.['User Name'],
                                        Password: pass_text,
                                        'Company Name':
                                            companyDetails.company_name,
                                        'First Name': user?.['First Name'],
                                        type: 1,
                                        'Company Text':
                                            companyDetails.companyMeta
                                                .custom_text,
                                    },
                                    template:
                                        Templatetextem?.['new_text'] ||
                                        Templatetextem?.['text'],
                                    attachment: attachemnt,
                                };
                                const response = await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'send_email' },
                                        emailDetails,
                                    ),
                                );
                            }
                        }
                    }
                }
            }
            echoTime += `Four ${(new Date().getTime() - startTime) / 1000}\n`;
            this.commonFileService.writeFile(
                `${directory}`,
                echoTime,
                'time.txt',
            );
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: path.resolve(`${directory}/time.txt`),
                        filename: `${directory}/time.txt`,
                        userBucket: 'private',
                    },
                ),
            );
            if (recordDetails?.census_upload_type == 1) {
                return {
                    id: recordDetails?.hash,
                    next_step: 'terminate-user-process',
                };
            }
            return true;
        } catch (error) {
            return false;
        }
    }
}
