import { Allow, IsNumber, IsOptional, IsString } from 'class-validator';
export class GetOneWithTemplateTextInput {
    @IsNumber()
    @IsOptional()
    @Allow() id: number;
    @IsNumber()
    @IsOptional()
    @Allow() type: number;
    @IsNumber()
    @IsOptional()
    @Allow() org_id: number;
}
