import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
export class undoRequestDataInput {
    @IsString()
    @IsNotEmpty()
    hash: string;

    @IsNumber()
    @IsNotEmpty()
    org_id: number;
}
