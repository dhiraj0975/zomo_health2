import { Expose } from 'class-transformer';
export class AssessmentTextsDto {
    @Expose() id: number;
    @Expose() ass_sec_id: number;
    @Expose() language_id: number;
    @Expose() low_risk: string;
    @Expose() mod_risk: string;
    @Expose() high_risk: string;
    @Expose() very_high_risk: string;
    @Expose() learn_more: string;
    @Expose() status: number;
}
