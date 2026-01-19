import { Expose, Transform, Type } from 'class-transformer';
import { DepartmentsDto, LocationsDto } from '../company';
const S3_URL =  process.env.S3_URL_PROD
export class CovidSettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() title: string;
    @Expose() logo: string;
    @Expose() description: string;
    @Expose() department_string: string;
    @Expose() location_string: string;
    @Expose() need_checkup_text: string;
    @Expose() need_checkup_desc: string;
    @Expose() no_need_checkup_text: string;
    @Expose() no_need_checkup_desc: string;
    @Expose() status: number;
    @Expose() email_added: string;
    @Expose() email_setting: number;
    @Expose() additional_note: string;
    @Expose() symptom_traker_setting: number;
    @Expose() selected_frequency: number;
    @Expose() selected_frequency_time: string;
    @Expose() selectedweekday: string;
    @Expose() show_login_time: number;
    @Expose() is_eligibility: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('covid') ? S3_URL + value : value && value.includes('logo') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    popup_header_image: string;
    @Expose()
    @Type(() => DepartmentsDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){
                element["id"] = element.id;
                element["dept_name"] = element.dept_name;
            }
            return value;
        }
        else {
            return null
        }
    })
    departments: DepartmentsDto;
    @Expose()
    @Type(() => LocationsDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){                
                element['id'] = element.id,
                element['code'] = element.code,
                element['location_name'] = element.location_name,
                element['lname'] = element.lname,
                element['zip'] = element.zip     
            }
            return value;
        }
        else {
            return null
        }
    })
    locations: LocationsDto;
}
