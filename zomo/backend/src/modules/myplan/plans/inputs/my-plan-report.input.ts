import {IsArray, IsDateString, IsDefined, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
import {System_Type} from "@common-constants";

export class myPlanReportInput {
    @IsNumber()
    @IsNotEmpty()
    org_id: number;

    @IsNumber()
    @IsNotEmpty()
    user_role: number;

    @IsString()
    @IsNotEmpty()
    membership_code: string;

    @IsDateString()
    @IsOptional()
    start_date_range?: string;

    @IsDateString()
    @IsOptional()
    end_date_range?: string;

    @IsDateString()
    @IsOptional()
    request_date?: string;

    @IsNotEmpty({ message: 'camp id is required' })
    camp_id: string;

    @IsNumber()
    @IsOptional()
    user_id: number;

    @IsString()
    @IsOptional()
    condition?: string;

    @IsString()
    @IsOptional()
    report_type?: string;

    @IsNumber()
    @IsOptional()
    engagement_report?: number;

    @IsNumber()
    @IsOptional()
    status?: number;

    @IsString()
    @IsOptional()
    system_type?: System_Type;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    department?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    country?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    city?: string;
}
