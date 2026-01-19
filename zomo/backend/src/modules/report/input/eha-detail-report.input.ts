import {IsArray, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
import {Type} from "class-transformer";

export class EhaDetailReportInput {
    @IsNumber()
    @IsNotEmpty()
    org_id: number;

    @IsNumber()
    @IsNotEmpty()
    terminated_users: number;

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
    from_date: string;

    @IsString()
    @IsOptional()
    to_date: string;

    @IsString()
    @IsOptional()
    search_str: string;

    @IsNumber()
    @IsOptional()
    result_type: number;

    @IsNumber()
    @IsOptional()
    page: number;

    @IsNumber()
    @IsOptional()
    limit: number;
}
