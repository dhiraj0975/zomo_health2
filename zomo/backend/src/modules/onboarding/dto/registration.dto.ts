import {
    IsEmail,
    IsNotEmpty, IsNumber,
    IsOptional,
    IsString, Matches,
} from 'class-validator';

export class RegistrationDto {
    step?: string;

    @IsOptional()
    @IsString()
    first_name?: string;

    @IsOptional()
    @IsString()
    last_name?: string;

    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;

    @IsOptional()
    @IsString()
    @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/, {
        message: 'Password must be at least 8 characters long and include one uppercase letter, one digit, and one special character.',
    })
    password?: string;

    @IsOptional()
    @IsNumber()
    completed?: number;
}