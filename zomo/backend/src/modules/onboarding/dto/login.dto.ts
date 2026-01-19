import {
    IsEmail,
    IsNotEmpty, IsNumber, IsOptional,
    IsString,
} from 'class-validator';

export class LoginDto {
    step: string;

    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;

    @IsNotEmpty({ message: 'Password is required' })
    @IsString()
    password: string;

    @IsOptional()
    @IsNumber()
    completed?: number;
}
