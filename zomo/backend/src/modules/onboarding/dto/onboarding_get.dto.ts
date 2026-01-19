import {IsString, IsOptional, IsIn, IsNumber} from 'class-validator';
import { OnboardInterface } from 'src/interface';
import {Transform} from "class-transformer";

export class OnboardingGetDto {
    @IsOptional()
    @IsString()
    step?: string;

    @IsOptional()
    @IsNumber({}, { message: 'Sub step must be a number' })
    @Transform(({ value }) => value === '' ? undefined : Number(value))
    @IsIn([0, 1])
    substep?: number;

    @IsOptional()
    @IsString()
    postcode?: string;

    @IsOptional()
    user?: OnboardInterface;
}