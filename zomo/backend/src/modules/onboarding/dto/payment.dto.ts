import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumber, Min, IsEmail, Matches, MinLength,
} from 'class-validator';
import { OnboardInterface } from 'src/interface';

export class PaymentDto {
    step: string;

    @IsOptional()
    @IsNotEmpty({ message: 'Payment method is required' })
    @IsString()
    payment_method: string;

    @IsOptional()
    @IsNotEmpty({ message: 'Amount is required' })
    @IsNumber({}, { message: 'Amount amount must be a number' })
    @Min(1, { message: 'Amount must be a positive number greater than 0' })
    amount: number;

    @IsOptional()
    @IsNotEmpty({ message: 'Billing address should not be empty or blank' })
    @IsString()
    billing_address: string;

    @IsOptional()
    @IsNotEmpty({ message: 'Billing zip should not be empty or blank' })
    @IsString({ message: 'Billing zip must be a string' })
    @MinLength(3, { message: 'Billing zip must be at least 3 characters long' })
    billing_zip: string;

    @IsOptional()
    @IsNotEmpty({
        message: 'Contact email should not be empty or blank',
    })
    @IsEmail({}, { message: 'Invalid contact email address' })
    contact_email?: string;

    @IsOptional()
    @Matches(/^\+?[1-9]\d{9,14}$/, {
        message: 'Contact number must be valid, with 10 to 15 digits in total (including optional country code)',
    })
    contact_number?: string;

    @IsOptional()
    user?: OnboardInterface;

    @IsOptional()
    @IsNumber()
    completed?: number;

    @IsOptional()
    city?: string;

    @IsOptional()
    state?: string;

    @IsOptional()
    country?: string;
}
