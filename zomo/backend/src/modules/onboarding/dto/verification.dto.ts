import {
    IsEmail,
    IsNotEmpty, IsNumber, IsOptional,
    IsString,
} from 'class-validator';

export class VerificationDto {
    step: string;

    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;

    @IsNotEmpty({ message: 'OTP is required' })
    @IsString()
    otp: string;

    @IsOptional()
    @IsNumber()
    completed?: number;
}
