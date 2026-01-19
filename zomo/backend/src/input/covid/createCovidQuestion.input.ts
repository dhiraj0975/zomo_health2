import {Allow} from "class-validator";
export class CreateCovidQuestionInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() title: string;
    @Allow() status: number;
}
