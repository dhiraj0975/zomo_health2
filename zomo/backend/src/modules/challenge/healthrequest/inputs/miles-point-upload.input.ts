import {IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
export class MilesPointUploadInput {
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

    @IsString()
    @IsOptional()
    org_sheet_header?: string;
}