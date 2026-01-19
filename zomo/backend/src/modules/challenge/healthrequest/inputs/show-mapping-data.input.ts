import {IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
export class showMappingDataInput {
    @IsString()
    @IsNotEmpty()
    hash: string;

    @IsNumber()
    @IsOptional()
    org_id?: number;

    @IsNumber()
    @IsOptional()
    user_id?: number;

    @IsNumber()
    @IsOptional()
    schedule_id?: number;
}

