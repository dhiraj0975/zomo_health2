import { Allow } from 'class-validator';
export class CreateClaimCodeInput {
    @Allow() id: number;
    @Allow() diagnosis_code: string;
    @Allow() long_description: string;
    @Allow() short_description: string;
    @Allow() icd_category: string;
    @Allow() chronic_category: string;
    @Allow() pr_chr_health_cond: string;
    @Allow() icd_general_category: string;
    @Allow() status: number;
}
