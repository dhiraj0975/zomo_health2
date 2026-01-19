import { Allow, IsNumber, IsOptional, IsString } from 'class-validator';
export class WidgetListInput {
    @IsNumber()
    @IsOptional()
    @Allow() id?: number;
    @IsString()
    @IsOptional()
    @Allow() type?: string;
}
