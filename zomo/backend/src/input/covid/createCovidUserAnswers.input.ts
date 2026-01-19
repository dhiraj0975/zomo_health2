import {Allow} from "class-validator";
export class CreateCovidUserAnswersInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() question_answers: string;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() are_you_vaccinated: number;
    @Allow() tested_positive_covid: number;
    @Allow() vaccination_type: number;
    @Allow() vecctionationrecord: string;
    @Allow() testpositivecertificate: string;
    @Allow() lastvaccinationdate: string;
    @Allow() lastreportdate: string;
}
