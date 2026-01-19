import {IsNotEmpty, IsNumber} from 'class-validator';
export class assignPlanInput {
    @IsNumber()
    @IsNotEmpty()
    user_id: number;
}