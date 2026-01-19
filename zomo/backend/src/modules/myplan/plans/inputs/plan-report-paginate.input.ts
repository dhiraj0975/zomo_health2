import {IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';

export class planReportPaginateInput {
    @IsNumber()
    @IsOptional()
    org_id: number;

    @IsNumber()
    @IsOptional()
    role_id?: number;

    @IsNumber()
    @IsOptional()
    page?: number;

    @IsNumber()
    @IsOptional()
    limit?: number;

    @IsString()
    @IsOptional()
    orderBy?: string;

    @IsEnum(['', 'ASC', 'DESC'])
    @IsOptional()
    order?: 'ASC' | 'DESC';

    @IsString()
    @IsOptional()
    searchString?: string;
}
