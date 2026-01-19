import {
    IsNotEmpty, IsOptional,
    IsString,
} from 'class-validator';
import {OnboardInterface, UserInterface} from 'src/interface';

export class VerificationCompanyDto {
    @IsNotEmpty({ message: 'Company name required' })
    @IsString()
    company_name: string;

    @IsOptional()
    user?: OnboardInterface;
}
