import {IsArray, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
import {Type} from "class-transformer";

export class HraDetailReportInput {
    @IsNotEmpty()
    @IsOptional()
    @IsArray()
    @Type(() => Number)
    @IsNumber({}, { each: true })
    org_id: number[] = [];

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
    search_str: string;

    @IsString()
    @IsOptional()
    from_date: string;

    @IsString()
    @IsOptional()
    to_date: string;

    @IsNumber()
    @IsOptional()
    result_type: number;

    @IsNumber()
    @IsOptional()
    page: number;

    @IsNumber()
    @IsOptional()
    limit: number;

    @IsNumber()
    @IsOptional()
    physician_entered: number;

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    @IsNumber({}, { each: true })
    source_option_physician: number[] = [];

    @IsNumber()
    @IsOptional()
    user_entered: number;

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    @IsNumber({}, { each: true })
    source_option_user: number[] = [];

    @IsNumber()
    @IsOptional()
    admin_entered: number;

    @IsNumber()
    @IsOptional()
    display_type: number;
}
