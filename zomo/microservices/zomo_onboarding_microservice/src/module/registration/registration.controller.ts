import { CommonDateService } from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
    generateJwtToken,
    generateOtp,
    sendOtpEmail,
    updateStepsData,
} from '../../common/commonFunctions';
import { UserService } from '../user/user.service';
import { InterlinksService } from './interlinks.service';
import { OnboardingService } from './onboarding.service';
const argon2 = require('argon2');

@Controller()
export class RegistrationController {
    constructor(
        private readonly userService: UserService,
        private readonly onboardingService: OnboardingService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly commonDateService: CommonDateService,
        private readonly interlinksService: InterlinksService,
    ) {}

    @MessagePattern({ cmd: 'registration' })
    async registration(@Payload() data: any) {
        try {
            const {
                email,
                first_name = '',
                last_name = '',
                password = '',
            } = data;

            if (!email) {
                throw new Error('Email is required');
            }

            const [userExists, onboardUser] = await Promise.all([
                this.userService.checkExists({ email }),
                this.onboardingService.getOne({ email }),
            ]);

            // If user exists and there's no onboarding record, email is already taken
            if (userExists && !onboardUser) {
                throw new Error('Email already exists');
            }

            // Validate required fields if no onboarding exists yet
            if (!onboardUser) {
                const missingFields = [];
                if (!first_name.trim()) missingFields.push('first_name');
                if (!last_name.trim()) missingFields.push('last_name');
                if (!password.trim()) missingFields.push('password');

                if (missingFields.length > 0) {
                    return {
                        success: false,
                        message: `Missing required fields: ${missingFields.join(', ')}`,
                    };
                }
            }

            const otpCode = generateOtp();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
            const submittedData = { first_name, last_name, email };

            // Handle steps_data logic
            let steps_data = {};
            if (onboardUser) {
                steps_data = updateStepsData(
                    onboardUser,
                    'registration',
                    submittedData,
                );
            } else {
                steps_data = {
                    registration: submittedData,
                };
            }

            // Prepare onboarding payload
            const onboardingData: any = {
                email,
                otp_code: otpCode,
                otp_expires_at: otpExpiry,
                otp_verified: 0,
                status: 'pending',
                steps_data,
            };

            // Conditionally include optional fields
            if (first_name) onboardingData.first_name = first_name;
            if (last_name) onboardingData.last_name = last_name;
            if (password) onboardingData.password = password;

            // Create or update onboarding record
            let newOnboarding;
            if (onboardUser) {
                Object.assign(onboardUser, onboardingData);
                newOnboarding =
                    await this.onboardingService.create(onboardUser);
            } else {
                newOnboarding =
                    await this.onboardingService.create(onboardingData);
            }

            // Send OTP email
            await sendOtpEmail(
                this.commonMicroservice,
                email,
                'Your OTP Code',
                `Your OTP code is ${otpCode}. It will expire in 10 minutes.`,
            );

            return {
                success: true,
                message: 'OTP sent successfully',
                data: {
                    id: newOnboarding.id,
                    email,
                    next_step: 'verification',
                },
            };
        } catch (error) {
            console.error('registration error', error);
            return {
                success: false,
                message: error.message || 'Registration failed',
            };
        }
    }

    @MessagePattern({ cmd: 'verification' })
    async verification(@Payload() data: any) {
        try {
            const { email, otp } = data;
            const user = await this.onboardingService.getOne({ email });
            if (!user) throw new Error('User not found');
            if (!user.otp_code || user.otp_code !== otp)
                throw new Error('Invalid OTP');
            if (
                user.otp_expires_at &&
                new Date(user.otp_expires_at) < new Date()
            )
                throw new Error('OTP expired');

            const updatedSteps = updateStepsData(user, 'verification', {
                email,
                otp,
                completed: 1,
            });

            await this.onboardingService.updateRecord(
                { email },
                {
                    otp_code: null,
                    otp_expires_at: null,
                    otp_verified: 1,
                    steps_data: updatedSteps,
                },
            );

            const token = generateJwtToken({
                id: user.id,
                email: user.email,
                tokenType: 'onboarding',
            });

            return {
                success: true,
                message: 'OTP verified successfully',
                data: {
                    id: user.id,
                    email,
                    token,
                    next_step:
                        user.current_step &&
                        user.current_step !== 'registration'
                            ? user.current_step
                            : 'dashboard',
                },
            };
        } catch (error) {
            console.error('verification error', error);
            return {
                success: false,
                message: error.message || 'Verification failed',
            };
        }
    }

    @MessagePattern({ cmd: 'onboarding' })
    async onboarding(@Payload() data: any) {
        try {
            const { user, step } = data;

            const stepsData = user.steps_data;
            if (step === 'onboarding') {
                return {
                    success: true,
                    data: {
                        stepsData,
                    },
                };
            } else if (step === 'dashboard') {
                return {
                    success: true,
                    data: {
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        documentUrl: null,
                        videoUrl: null,
                        programExercises: null,
                    },
                };
            } else if (step === 'dashboardImg') {
                const internalLinkData: any =
                    await this.interlinksService.getAll(
                        { status: 1 },
                        [
                            'id',
                            'linktitle',
                            'plugin',
                            'controller',
                            'action',
                            'newlink',
                        ],
                        { id: 'ASC' },
                    );
                const path = await this.commonDateService.manageAllURL(
                    'g_plugin_link',
                    { pluginName: 'hra' },
                    internalLinkData,
                );
                return {
                    success: true,
                    data: {
                        square_img: 'comn/assets/img/health_new.png',
                        mob_square_img: 'comn/assets/img/app_health_new.png',
                        square_img_link_isin: '1',
                        square_img_link: 'https://' + process.env.DOMAIN + path,
                        square_img_link_id: '6',
                        userBucket: 'public',
                    },
                };
            } else if (step === 'template') {
                return {
                    success: true,
                    data: {
                        link: 'onboard/onboardingTemplate.xlsx',
                        userBucket: 'public',
                    },
                };
            } else if (step === 'email') {
                const validationFile = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'get_file' },
                        {
                            path: stepsData['user']['createdPath'],
                            userBucket: 'private',
                        },
                    ),
                );
                const fileContent = validationFile?.Body
                    ? Buffer.from(validationFile.Body, 'base64').toString(
                          'utf-8',
                      )
                    : null;

                const validationFileData = fileContent
                    ? JSON.parse(fileContent)
                    : [];
                /*let emails = [];
                if (
                    Array.isArray(validationFileData) &&
                    validationFileData.length > 1
                ) {
                    const header = validationFileData[0];
                    const emailIndex = header.indexOf('Email');

                    if (emailIndex !== -1) {
                        emails = validationFileData
                            .slice(1) // skip header row
                            .map((row) => row[emailIndex])
                            .filter((email) => !!email); // filter out empty/null emails
                    }
                }*/
                const emails = Array.isArray(validationFileData)
                    ? validationFileData
                          .filter((entry) => entry?.Email)
                          .map((entry) => entry.Email)
                    : [];

                return {
                    success: true,
                    data: {
                        emails,
                    },
                };
            } else {
                const specificStep = stepsData[step]['data'];
                return {
                    success: true,
                    data: specificStep,
                };
            }
        } catch (error) {
            console.error('onboarding error', error);
            return {
                success: false,
                message: error.message || 'Failed to load onboarding',
            };
        }
    }

    @MessagePattern({ cmd: 'login' })
    async login(@Payload() data: any) {
        try {
            const { email, password = '' } = data;

            if (!email || !password)
                throw new Error('Email and password are required');

            const existingUser = await this.onboardingService.getOne({
                email,
            });
            if (!existingUser) throw new Error('User not found');

            const isMatch = await argon2.verify(
                Buffer.from(existingUser.password, 'base64').toString('ascii'),
                password,
            );
            if (!isMatch) throw new Error('Invalid email or password');

            const otpCode = generateOtp();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

            const submittedData = { email };
            const updatedSteps = updateStepsData(
                existingUser,
                'login',
                submittedData,
            );

            await this.onboardingService.updateRecord(
                { id: existingUser.id },
                {
                    otp_code: otpCode,
                    otp_expires_at: otpExpiry,
                    otp_verified: 0,
                    steps_data: updatedSteps,
                },
            );

            await sendOtpEmail(
                this.commonMicroservice,
                email,
                'Your Login OTP Code',
                `Your OTP code is ${otpCode}. It will expire in 10 minutes.`,
            );

            return {
                success: true,
                message: 'OTP sent successfully',
                data: {
                    id: existingUser.id,
                    email,
                    next_step: 'verification',
                },
            };
        } catch (error) {
            console.error('login error', error);
            return { success: false, message: error.message || 'Login failed' };
        }
    }
}
