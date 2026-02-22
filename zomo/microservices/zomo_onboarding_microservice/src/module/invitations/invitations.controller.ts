import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { processStepUpdate } from '../../common/commonFunctions';
import { OnboardingService } from '../registration/onboarding.service';
import { InvitationsService } from './invitations.service';

interface InvitationData {
    user: any;
    step: string;
    emails?: string[];
    [key: string]: any;
}

@Controller('invitations')
export class InvitationsController {
    constructor(
        private readonly onboardingService: OnboardingService,
        private readonly invitationsService: InvitationsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @MessagePattern({ cmd: 'invitation' })
    async invitation(@Payload() data: InvitationData) {
        try {
            const { user, step, ...stepData } = data;
            const { stepResult } = await processStepUpdate(
                this.onboardingService,
                user.id,
                step,
                stepData,
                {},
            );

            if (stepData?.completed === 1) {
                return {
                    success: true,
                    message: 'Invitation data saved successfully',
                    data: {
                        steps_data: stepResult,
                    },
                };
            }

            let sheetData: Array<Record<string, string>> = [];
            let fileContent: string | null = null;

            const recipientEmails = (stepData.recipient_emails || []).map((e) =>
                e.trim().toLowerCase(),
            );

            // Load and parse sheet file only if needed
            if (stepData?.sendToAll === 1 || recipientEmails.length !== 0) {
                const rawFileResponse = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'get_file' },
                        {
                            path: user?.steps_data?.user?.createdPath,
                            userBucket: 'private',
                        },
                    ),
                );

                fileContent = rawFileResponse?.Body
                    ? Buffer.from(rawFileResponse.Body, 'base64').toString(
                          'utf-8',
                      )
                    : null;

                if (fileContent) {
                    try {
                        sheetData = JSON.parse(fileContent);
                    } catch (err) {
                        console.warn(
                            'Invalid JSON format in uploaded file. Skipping email sending.',
                        );
                    }
                }
            }
            // Determine matched users based on sendToAll flag
            const matchedUsers =
                fileContent && Array.isArray(sheetData)
                    ? stepData?.sendToAll === 1
                        ? sheetData
                        : sheetData.filter((entry) =>
                              recipientEmails.includes(
                                  entry?.Email?.trim().toLowerCase(),
                              ),
                          )
                    : [];

            // Send emails if matched users found
            //console.log('sheetData', sheetData);
            if (matchedUsers.length !== 0) {
                await Promise.allSettled(
                    matchedUsers.map(async (userEntry) => {
                        const {
                            Email,
                            'First Name': firstName,
                            'Middle Name': middleName,
                            'Last Name': lastName,
                        } = userEntry;

                        const fullName = [firstName, middleName, lastName]
                            .filter(Boolean)
                            .join(' ');

                        const context = {
                            first_name: firstName || 'User',
                            company_name: user.company_name,
                            site_url: 'https://zomohealth.com',
                            IMAGE_BASE_URL:
                                'https://' + process.env.DOMAIN ||
                                'https://cdn.zomohealth.com',
                        };

                        try {
                            const html =
                                await this.invitationsService.renderTemplate(
                                    'invitations.template.hbs',
                                    context,
                                );

                            await this.commonMicroservice
                                .send(
                                    { cmd: 'send_email' },
                                    {
                                        receiver: Email,
                                        subject: stepData.subject,
                                        template: html,
                                        attachment: stepData.attachment_local
                                            ? stepData.attachment_local
                                            : [],
                                    },
                                )
                                .toPromise();

                        } catch (error) {
                            console.error(
                                `Failed to send email to ${Email}:`,
                                error.message,
                            );
                        }
                    }),
                );
            }

            return {
                success: true,
                message: 'Invitation data saved successfully',
                data: {
                    steps_data: stepResult,
                    send_users: matchedUsers,
                },
            };
        } catch (error) {
            console.error('Invitation error', error);
            return {
                success: false,
                message: error.message || 'Failed to save Invitation',
            };
        }
    }
}
