import { IsNotEmpty, IsNumber } from 'class-validator';

export class requestDeleteInput {
    @IsNumber()
    @IsNotEmpty()
    id: number;

    @IsNumber()
    @IsNotEmpty()
    org_id: number;
}
