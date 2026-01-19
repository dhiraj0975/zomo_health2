import { Allow, IsNumber, IsOptional, IsString } from 'class-validator';
export class CreateCommunicationTemplateTextsInput {
    @IsNumber()
    @IsOptional()
    @Allow() id: number;
    @IsNumber()
    @IsOptional()
    @Allow() org_id: number;
    @IsNumber()
    @IsOptional()
    @Allow() type: number;
    @IsString()
    @IsOptional()
    @Allow() text: string;
    @IsString()
    @IsOptional()
    @Allow() new_text: string;
    @IsNumber()
    @IsOptional()
    @Allow() status: number;
}
