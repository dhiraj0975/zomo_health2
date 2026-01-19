import { IsNotEmpty, IsNumber } from 'class-validator';
export class GetOneRequestDataInput {
    @IsNumber()
    @IsNotEmpty()
    id: number;

    @IsNumber()
    @IsNotEmpty()
    user_id: number;
}
