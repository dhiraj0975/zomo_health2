import {IsArray, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
import {Type} from "class-transformer";

export class engagementComparisonReportInput {
    @IsNumber()
    @IsNotEmpty()
    camp_id: number;

    @IsNumber()
    @IsNotEmpty()
    org_id: number;

    @IsNumber()
    @IsOptional()
    user_type: number;

    @IsString()
    @IsOptional()
    on_insurance_plan: string;

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    @IsNumber({}, { each: true })
    department_ids: number[] = [];

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    @IsNumber({}, { each: true })
    location_ids: number[] = [];

    @IsString()
    @IsOptional()
    date: string;

    @IsNumber()
    @IsOptional()
    terminated_users: number;

    @IsNumber()
    @IsOptional()
    user: any;

}
