import { Allow, IsNumber, IsOptional, IsString } from 'class-validator';
export class EventReportInput  {
    @IsOptional()
    @IsNumber()
    page?:number;
    @IsOptional()
    @IsNumber()
    limit?:number;
    @IsOptional()
    @IsString()
    order_by?:string;
    @IsOptional()
    @IsString()
    order?:string;
    @IsOptional()
    @IsString()
    search_str?:string;
    @IsString()
    org_id?: string;
    @IsNumber()
    event_type?: number;
    @IsOptional()
    @IsString()
    department_id?: string;
    @IsOptional()
    @IsString()
    location_id?: string;
    @IsOptional()
    @IsString()
    event_id?: string;
    @IsString()
    file_type?: string = 'csv';
    @IsNumber()
    result_type?: number = 1;
    @Allow() auto_request?: number;
    @Allow() userDetails?: any;
    @Allow() auto_request_id?: number;
}
