import { Transform, Type, Expose } from 'class-transformer';
export class ClaimCodeDto {
    @Expose() id: number;
    @Expose() diagnosis_code: string;
    @Expose() long_description: string;
    @Expose() short_description: string;
    @Expose() icd_category: string;
    @Expose() chronic_category: string;
    @Expose() pr_chr_health_cond: string;
    @Expose() icd_general_category: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
