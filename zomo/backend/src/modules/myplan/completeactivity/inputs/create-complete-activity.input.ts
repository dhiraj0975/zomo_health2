import {IsArray, IsNumber, IsOptional, IsString} from 'class-validator';
export class CreateCompleteActivityInput {
    @IsNumber()
    @IsOptional()
    org_id?: number;

    @IsString()
    @IsOptional()
    user_id?: string;

    @IsString()
    @IsOptional()
    custom_id?: string;

    @IsString()
    @IsOptional()
    activity_id?: string;

    @IsString()
    @IsOptional()
    image?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsNumber()
    @IsOptional()
    created_by?: number;

    @IsNumber()
    @IsOptional()
    source?: number;

    @IsNumber()
    @IsOptional()
    status?: number;

    @IsNumber()
    @IsOptional()
    aftercompletestatus?: number;

    @IsNumber()
    @IsOptional()
    all_user?: number;

    @IsNumber()
    @IsOptional()
    block_id?: number;

    @IsNumber()
    @IsOptional()
    plan_id?: number;

    @IsNumber()
    @IsOptional()
    flag?: number;

    @IsNumber()
    @IsOptional()
    type?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    activity_name?: string[];
}