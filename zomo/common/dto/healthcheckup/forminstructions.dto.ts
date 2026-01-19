import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
export class FormInstructionsDto {
    @Expose() id: number;
    @Expose() company_id: number;
    @Expose()
    pf_start_date: string;
    @Expose()
    pf_end_date: string;
    @Expose()
    pf_fax_date: string;
    @Expose()
    ta_start_date: string;
    @Expose()
    ta_end_date: string;
    @Expose()
    ta_fax_date: string;
    @Expose()
    dvf_start_date: string;
    @Expose()
    dvf_end_date: string;
    @Expose()
    dvf_fax_date: string;
    @Expose()
    ovf_start_date: string;
    @Expose()
    ovf_end_date: string;
    @Expose()
    ovf_fax_date: string;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    fax_date: string;
    @Expose()
    feature_hra_date: string;
    @Expose() reset_date_range: number;
    @Expose() current_tab: number;
    @Expose()
    reset_date: string;
    @Expose()
    feature_fax_date: string;
    @Expose()
    feature_end_date: string;
    @Expose()
    feature_start_date: string;
    @Expose()
    ta_reset_date: string;
    @Expose()
    feture_ta_fax_date: string;
    @Expose()
    feture_ta_end_date: string;
    @Expose()
    feture_ta_start_date: string;
    @Expose()
    ovf_reset_date: string;
    @Expose()
    feture_ovf_fax_date: string;
    @Expose()
    feture_ovf_end_date: string;
    @Expose()
    feture_ovf_start_date: string;
    @Expose()
    dvf_reset_date: string;
    @Expose()
    feture_dvf_faxt_date: string;
    @Expose()
    feture_dvf_end_date: string;
    @Expose()
    feture_dvf_start_date: string;
    @Expose()
    pf_reset_date: string;
    @Expose()
    feture_pf_fax_date: string;
    @Expose()
    feture_pf_end_date: string;
    @Expose()
    feture_pf_start_date: string;
    @Expose() fax_number: string;
    @Expose() program_custom_name: string;
    @Expose() program_selection: string;
    @Expose() date_range: number;
    @Expose() forms_year: number;
    @Expose() yearly_opts: number;
    @Expose() dentures: number;
    @Expose() cover_page: string;
    @Expose() physician_text: string;
    @Expose() before_title: string;
    @Expose() before_age_title: string;
    @Expose() dentists_text: string;
    @Expose() optometrists_text: string;
    @Expose() tobacco_text: string;
    @Expose() tobacco_cessation_text: string;
    @Expose() tobacco_para1: string;
    @Expose() tobacco_form_option: number;
    @Expose() optionalpage: string;
    @Expose() disease_ids: string;
    @Expose() assign_disease_ids: string;
    @Expose() disease_text: string;
    @Expose() disease_instruction_text: string;
    @Expose() disease_coverpage_options: number;
    @Expose() bio_option: number;
    @Expose() prevent_option: number;
    @Expose() bio_data_field: string;
    @Expose() age_gender_title: string;
    @Expose() age_gender_text: string;
    @Expose() aas_form_prog: string;
    @Expose() is_logo: number;
    @Expose() submition_option: string;
    @Expose() dentist_one_text: string;
    @Expose() dentist_two_text : string;
    @Expose() created: string;
    @Expose() updated: string;
    @Expose() status: number;
        @Expose()
        @Type(() => CompaniesDto)
        @Transform(({ value }) => {
            if (value) {
                return {
                    id: value.id,
                    company_name: value.company_name,
                };
            }
            else {
                return null
            }
        })
        company: CompaniesDto;
}
