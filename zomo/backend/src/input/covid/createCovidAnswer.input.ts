import {Allow} from "class-validator";
export class CreateCovidAnswerInput {
    @Allow() id: number;
    @Allow() q_id: number;
    @Allow() title: string;
    @Allow() status: number;
}
