import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumber,
} from 'class-validator';
import { OnboardInterface } from 'src/interface';

export class UserImportDto {
    step: string;
    origional_file: string;

    @IsOptional()
    user?: OnboardInterface;

    @IsOptional()
    @IsNumber()
    completed?: number;
}
