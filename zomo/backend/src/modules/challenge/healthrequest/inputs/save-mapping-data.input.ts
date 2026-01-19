import {IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
export class saveMappingDataInput {
    @IsString()
    @IsNotEmpty()
    hash: string;

    @IsNumber()
    @IsOptional()
    org_id?: number;

    @IsNumber()
    @IsOptional()
    user_id?: number;

    @IsString()
    @IsNotEmpty()
    mapped_header?: string;
}
