import {IsNotEmpty, IsNumber} from 'class-validator';
export class DeleteCoachNotesInputs {
    @IsNumber()
    @IsNotEmpty()
    id: number;

    @IsNumber()
    @IsNotEmpty()
    user_id: number;
}