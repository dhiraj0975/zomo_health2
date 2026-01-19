import {IsNotEmpty, IsNumber, IsOptional} from 'class-validator';
export class DownloadTemplateInput {
    @IsNumber()
    @IsNotEmpty()
    schedule_id: number;

    @IsNumber()
    @IsOptional()
    org_id: number;
}