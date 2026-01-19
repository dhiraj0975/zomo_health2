import {Allow, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
export class PaginationRequestInput {
    @IsNumber()
    @IsOptional()
    id?: number;

    @IsNumber()
    @IsOptional()
    org_id?: number;

    @IsNumber()
    @IsOptional()
    schedule_id?: number;

    @IsNumber()
    @IsOptional()
    page?: number;

    @IsNumber()
    @IsOptional()
    limit?: number;

    @IsString()
    @IsOptional()
    order_by?: string;

    @IsString()
    @IsOptional()
    order?: string;

    @IsString()
    @IsOptional()
    search_str?: string;

    @IsString()
    @IsOptional()
    request_date?: string;

    @IsNumber()
    @IsOptional()
    status?: number;
}
