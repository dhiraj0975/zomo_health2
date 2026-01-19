import {
    IsNotEmpty, IsNumber, IsOptional,
    IsString,
} from 'class-validator';
import { OnboardInterface } from 'src/interface';

export class AgreementDto {
    step: string;

    @IsOptional()
    @IsNotEmpty({ message: 'CSA signature is required' })
    @IsString()
    csa_signature: string;

    @IsOptional()
    @IsNotEmpty({ message: 'BAA signature is required' })
    @IsString()
    baa_signature: string;

    @IsOptional()
    user?: OnboardInterface;

    @IsOptional()
    @IsNumber()
    completed?: number;
}
