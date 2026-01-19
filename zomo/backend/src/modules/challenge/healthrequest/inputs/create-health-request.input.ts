import {IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
export class CreateHealthRequestInput {
    @IsNumber()
    @IsNotEmpty()
    org_id: number;

    @IsNumber()
    @IsNotEmpty()
    schedule_id: number;

    @IsNumber()
    @IsOptional()
    user_id?: number;

    @IsString()
    @IsOptional()
    origional_file?: string;
}