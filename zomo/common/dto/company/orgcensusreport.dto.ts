import { Expose } from 'class-transformer';
export class OrgCensusReportDto {
    @Expose() id: number;
    @Expose() file: string;
    @Expose() status: number;
    @Expose() flage: number;
    @Expose() report_date: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
