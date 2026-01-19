import {IsNotEmpty, IsNumber} from 'class-validator';
export class GetCoachNotesInputs {
    @IsNumber()
    @IsNotEmpty()
    id: number;

    @IsNumber()
    @IsNotEmpty()
    user_id: number;
}