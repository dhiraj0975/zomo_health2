import { Allow } from 'class-validator';
export class CreateAssessmentOptionsDetailsInput {
    @Allow() id: number;
    @Allow() option_id: number;
    @Allow() language_id: number;
    @Allow() option_title: string;
    @Allow() main_option_id: number;
    @Allow() status: number;
}
