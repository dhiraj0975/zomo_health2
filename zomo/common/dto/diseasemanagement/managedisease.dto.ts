import { Transform, Type, Expose } from 'class-transformer';
import { DiseaseFormDto } from './diseaseform.dto';
import { DiseasesDto } from './diseases.dto';
export class ManageDiseaseDto {
    @Expose() id: number;
    @Expose() disease_id: number;
    @Expose() company_id: number;
    @Expose() disease_form_ids: string;
    @Expose() coverpage_text: string;
    @Expose() instructions_text: string;
    @Expose() status: number;
    @Expose() deleted: number;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    fax_date: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => DiseaseFormDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                title: value.title,
                code: value.code,
            };
        }
    })
    disease_form: DiseaseFormDto;
    @Expose()
    @Type(() => DiseasesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                title: value.title,
                desc: value.desc,
                forms_order: value.forms_order,
            };
        }
        else {
            return null
        }
    })
    disease: DiseasesDto;
}
