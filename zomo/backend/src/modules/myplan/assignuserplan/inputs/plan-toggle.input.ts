import {IsNotEmpty, IsNumber} from 'class-validator';
export class planToggleInput {
    @IsNumber()
    @IsNotEmpty()
    plan_id: number;

    @IsNumber()
    @IsNotEmpty()
    user_id: number;

    @IsNumber()
    @IsNotEmpty()
    flag: number;
}