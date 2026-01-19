import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { RegistrationDto } from './dto/registration.dto';
import { LoginDto } from './dto/login.dto';
import { VerificationDto } from './dto/verification.dto';

@Controller('onboarding/user')
export class UserController {
    constructor(
        private readonly activityLogService: ActivityLogService,
        @Inject('ONBOARDING_MICROSERVICE')
        private readonly onboardingMicroservice: ClientProxy,
    ) {}

    private async validateDto<T extends object>(dtoClass: new () => T, data: any): Promise<T> {
        const dtoInstance = plainToInstance(dtoClass, data);
        const errors = await validate(dtoInstance);

        if (errors.length > 0) {
            const message = errors
                .map(e => Object.values(e.constraints || {}).join(', '))
                .join('; ');
            throw new Error(message);
        }

        return dtoInstance;
    }

    private async sendMicroserviceCommand(
        cmd: string,
        postData: any,
        req: Request,
    ) {
        try {
            const data = await lastValueFrom(
                this.onboardingMicroservice.send({ cmd }, postData),
            );

            if (!data?.success) {
                throw new Error(data?.message || 'Microservice failed');
            }

            return data;
        } catch (error) {
            this.activityLogService.error_log(
                req.tokenUser?.id,
                req?.originalUrl,
                error?.message,
                error,
                req,
            );
            throw new HttpException(
                {
                    statusCode: 400,
                    success: 0,
                    error: 1,
                    message: error?.message || 'An unexpected error occurred',
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Helper: Success response
     */
    private successResponse(res: Response, message: string, data: any) {
        return res.status(HttpStatus.OK).json({
            statusCode: 200,
            success: 1,
            error: 0,
            message,
            data,
        });
    }

    @Post('registration')
    async userRegistration(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: RegistrationDto,
    ) {
        postData.step = 'registration';
        postData.completed = 1;

        await this.validateDto(RegistrationDto, postData);
        const data = await this.sendMicroserviceCommand('registration', postData, req);

        return this.successResponse(res, 'USER_REGISTRATION_SUCCESS', data);
    }

    @Post('login')
    async userLogin(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: LoginDto,
    ) {
        postData.step = 'login';
        postData.completed = 1;

        await this.validateDto(LoginDto, postData);
        const data = await this.sendMicroserviceCommand('login', postData, req);

        return this.successResponse(res, 'USER_LOGIN_SUCCESS', data);
    }

    @Post('verification')
    async userVerification(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: VerificationDto,
    ) {
        postData.step = 'verification';
        postData.completed = 1;

        await this.validateDto(VerificationDto, postData);
        const data = await this.sendMicroserviceCommand('verification', postData, req);

        return this.successResponse(res, 'USER_VERIFICATION_SUCCESS', data);
    }
}