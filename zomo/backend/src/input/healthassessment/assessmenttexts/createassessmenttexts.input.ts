import { Allow } from 'class-validator';
export class CreateAssessmentTextsInput {
    @Allow() id: number;
    @Allow() ass_sec_id: number;
    @Allow() language_id: number;
    @Allow() low_risk: string;
    @Allow() mod_risk: string;
    @Allow() high_risk: string;
    @Allow() very_high_risk: string;
    @Allow() learn_more: string;
    @Allow() status: number;
}
