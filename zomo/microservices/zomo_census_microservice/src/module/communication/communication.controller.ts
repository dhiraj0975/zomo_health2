import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    CommonService,
} from '@common-constants';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { Controller, Inject } from '@nestjs/common';
import { CommunicationTemplateTextsService } from './communicationtemplatetexts.service';
import { ImportUserRequestService } from '../importuserrequest/importuserrequest.service';
import { CompanyService } from '../companies/company.service';
import { CensusCommonService } from '../../common';
import { In } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import * as path from 'node:path';
@Controller('communication')
export class CommunicationController {
    constructor(
        private readonly communicationTemplateTextsService: CommunicationTemplateTextsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly censusCommonService: CensusCommonService,
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly commonFileService: CommonFileService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}
    @MessagePattern({ cmd: 'import-user-process-email' })
    async importUserProcessEmail(postData: any) {
        const startTime = Date.now();

        try {
            const BATCH_SIZE = 100;
            const CONCURRENT_LIMIT = 10;

            const { recordDetails, backupDirectory } =
                await this.censusCommonService.fetchAndValidateRecord(
                    postData,
                    '8',
                    '8',
                );

            const hashId = recordDetails.hash;
            const orgId = recordDetails.org_id;

            await this.censusCommonService.updateRecordProgress(hashId, {
                flage: '9',
            });

            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'Start System Process Communication Mail',
                startTime,
            );

            const [companyDetails, templUpd, templEm, templRe] =
                await Promise.all([
                    this.companyService.findOne({
                        id: orgId,
                        deleted: 0,
                        status: 1,
                    }),
                    this.communicationTemplateTextsService.findOne({
                        org_id: In([orgId, 0]),
                        type: 21,
                    }),
                    this.communicationTemplateTextsService.findOne({
                        org_id: In([orgId, 0]),
                        type: 1,
                    }),
                    this.communicationTemplateTextsService.findOne({
                        org_id: In([orgId, 0]),
                        type: 26,
                    }),
                ]);

            if (templRe) {
                templRe['new_text'] =
                    (await this.onmapUrlContent(
                        templRe?.['new_text'],
                        'mailTemplate',
                    )) || templRe?.['text'];
            }
            if (templEm) {
                templEm['new_text'] =
                    (await this.onmapUrlContent(
                        templEm?.['new_text'],
                        'mailTemplate',
                    )) || templEm?.['text'];
            }
            if (templUpd) {
                templUpd['new_text'] =
                    (await this.onmapUrlContent(
                        templUpd?.['new_text'],
                        'mailTemplate',
                    )) || templUpd?.['text'];
            }

            const updatedData =
                recordDetails.user_notify === 1 && recordDetails.updated_file
                    ? await this.censusCommonService.loadJsonFile(
                          recordDetails.updated_file.replace(
                              /\.[^/.]+$/,
                              '.json',
                          ),
                      )
                    : [];

            const createdData =
                recordDetails.cuser_notify === 1 && recordDetails.created_file
                    ? await this.censusCommonService.loadJsonFile(
                          recordDetails.created_file.replace(
                              /\.[^/.]+$/,
                              '.json',
                          ),
                      )
                    : [];
            if (
                recordDetails.email &&
                this.commonFileService.userSheetValidation(
                    recordDetails.email,
                    'email',
                )
            ) {
                await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'send_email' },
                        {
                            receiver: recordDetails.email,
                            subject: 'Your Import User Request Completed.',
                            template: templRe?.new_text || templRe?.text,
                            content: {
                                type: 26,
                                emailtext:
                                    'Your census is uploaded successfully. Check imported users, rejected users and updated user sheet at census request tab.',
                                orgAdminName: 'Sir/Madam',
                                url: 'import_user_request',
                            },
                        },
                    ),
                );
            }

            const processBatchWithConcurrency = async (
                items: any[],
                processFunc: (item: any) => Promise<any>,
            ) => {
                const results = [];
                for (let i = 0; i < items.length; i += BATCH_SIZE) {
                    const batch = items.slice(i, i + BATCH_SIZE);

                    const batchResults = [];
                    for (let j = 0; j < batch.length; j += CONCURRENT_LIMIT) {
                        const chunk = batch.slice(j, j + CONCURRENT_LIMIT);
                        const chunkResults = await Promise.allSettled(
                            chunk.map(processFunc),
                        );
                        batchResults.push(...chunkResults);
                    }

                    results.push(...batchResults);

                    console.log(
                        `Processed ${Math.min(i + BATCH_SIZE, items.length)} of ${items.length} emails`,
                    );
                }
                return results;
            };

            if (recordDetails.user_notify === 1 && updatedData.length) {
                const validUpdatedUsers = updatedData.filter((u) =>
                    this.commonFileService.userSheetValidation(
                        u['18'],
                        'email',
                    ),
                );

                await processBatchWithConcurrency(validUpdatedUsers, (user) =>
                    lastValueFrom(
                        this.commonMicroservice.send(
                            { cmd: 'send_email' },
                            {
                                receiver: user['18'],
                                subject: 'Your Account has been updated.',
                                template: templUpd?.new_text || templUpd?.text,
                                content: {
                                    'Company Name':
                                        companyDetails?.company_name,
                                    'First Name': user['7'] || '',
                                    type: 21,
                                },
                            },
                        ),
                    ),
                );
            }

            if (recordDetails.cuser_notify === 1 && createdData.length) {
                const emailAttachmentsRaw =
                    companyDetails?.companyMeta?.emailattachment;

                let emailAttachments: string[] = [];

                if (typeof emailAttachmentsRaw === 'string') {
                    try {
                        emailAttachments = JSON.parse(emailAttachmentsRaw);
                    } catch (e) {
                        console.warn(
                            'Failed to parse emailAttachments JSON string:',
                            e,
                        );
                        emailAttachments = [];
                    }
                } else if (Array.isArray(emailAttachmentsRaw)) {
                    emailAttachments = emailAttachmentsRaw;
                } else {
                    console.warn(
                        'emailAttachments is not an array or string:',
                        emailAttachmentsRaw,
                    );
                }

                const attachments: any[] = [];
                await Promise.all(
                    emailAttachments.map(async (filePath: string) => {
                        try {
                            const fileBody = await lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'get_file' },
                                    {
                                        path: filePath,
                                        userBucket: 'private',
                                    },
                                ),
                            );
                            const filename = path.basename(filePath);
                            const dir = `${appConstant.COMPANY_EMAIL_ATTACHMENT}/${orgId}`;
                            await this.commonFileService.writePDFFile(
                                dir,
                                fileBody.Body,
                                filename,
                            );
                            attachments.push({
                                filename,
                                path: path.join(dir, filename),
                            });
                        } catch {
                            // Ignore file fetch/write errors
                        }
                    }),
                );

                const passText = this.commonService.admin_mail_data(
                    companyDetails?.company_settings?.first_login_by,
                    companyDetails?.company_settings?.pre_first_login_by,
                );

                const validCreatedUsers = createdData.filter((u) =>
                    this.commonFileService.userSheetValidation(
                        u['18'],
                        'email',
                    ),
                );

                await processBatchWithConcurrency(validCreatedUsers, (user) =>
                    lastValueFrom(
                        this.commonMicroservice.send(
                            { cmd: 'send_email' },
                            {
                                receiver: user['18'],
                                subject:
                                    'Welcome to ZomoHealth: New Account Created',
                                template: templEm?.new_text || templEm?.text,
                                content: {
                                    Username: user['6'] || '',
                                    Password: passText,
                                    'Company Name':
                                        companyDetails?.company_name,
                                    'First Name': user['7'] || '',
                                    type: 1,
                                    'Company Text':
                                        companyDetails?.companyMeta
                                            ?.custom_text || '',
                                },
                                attachment: attachments,
                            },
                        ),
                    ),
                );
            }

            await this.importUserRequestService.update(
                { hash: hashId },
                {
                    requeststep: '9',
                    status: 1,
                },
            );
            await this.censusCommonService.logElapsedTime(
                backupDirectory,
                'End System Process Communication Mail',
                startTime,
            );
            await this.censusCommonService.uploadFileInBucket(
                backupDirectory + '/time.txt',
            );
            return { id: recordDetails.hash, next_step: 'finish' };
        } catch (error) {
            if (error?.message !== 'ERR_RECORD_NOT_FOUND') {
                console.log('error', error);
                this.censusCommonService.error_log(
                    0,
                    'import-user-process-email',
                    error?.message,
                    error,
                    postData,
                );
            }
            return false;
        }
    }
    async onmapUrlContent(
        content: string | null | undefined,
        type: string = '',
    ): Promise<string> {
        if (!content) return '';
        const userDomain: string = 'https://' + process.env.DOMAIN;
        const domains: string[] = appConstant.DOMAINS_LIST;
        if (type == 'mailTemplate') {
            domains.push('{{IMAGE_BASE_URL}}');
        }
        const pattern = new RegExp(
            '(' +
                domains
                    .map((domain) =>
                        domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
                    )
                    .join('|') +
                ')',
            'gi',
        );
        return content.replace(pattern, userDomain);
    }
}
