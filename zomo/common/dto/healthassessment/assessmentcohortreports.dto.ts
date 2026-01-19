import { Transform, Type, Expose } from 'class-transformer';
import { CompaniesDto } from '../company';
export class AssessmentCohortReportsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() year: string;
    @Expose() condition: string;
    @Expose() campaign_id: number;
    @Expose() Campaignactivity: string;
    @Expose() source_ids: string;
    @Expose()
    @Transform(({ value }) => {
        if (!value) return value;
        if (value.startsWith('reports/')) return value;
        return `reports/${value}`;
    },{ toClassOnly: true })
    file: string;
    @Expose() status: number;
    @Expose() flage: number;
    @Expose() reject: number;
    @Expose()
    request_date: string;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                company_name: value.company_name,
                code: value.code,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
}
