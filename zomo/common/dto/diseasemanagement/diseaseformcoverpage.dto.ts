import { Transform, Type, Expose } from 'class-transformer';
export class DiseaseFormCoverPageDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() form_id: number;
    @Expose() coverpage_text: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
