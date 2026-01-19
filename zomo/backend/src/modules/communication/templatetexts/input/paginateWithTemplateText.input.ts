import { Allow, IsNumber, IsOptional, IsString } from 'class-validator';
export class PaginateWithTemplateTextInput {
    @IsNumber()
    @IsOptional()
    @Allow() page: number;
    @IsNumber()
    @IsOptional()
    @Allow() limit: number;
    @IsString()
    @IsOptional()
    @Allow() order_by: string;
    @IsString()
    @IsOptional()
    @Allow() order: string;
    @IsString()
    @IsOptional()
    @Allow() search_str: string;
    @IsNumber()
    @IsOptional()
    @Allow() org_id: number;
    @IsNumber()
    @IsOptional()
    @Allow() role_id: number;
}
