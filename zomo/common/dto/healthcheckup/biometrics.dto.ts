import {Expose, Transform, Type} from 'class-transformer';
import { UserDto } from '../user';
export class BiometricsDto {
    @Expose()
    id: number;
    @Expose()
    user_id: number;
    @Expose()
    activity_id: string;
    @Expose()
    physician_id: number;
    @Expose()
    gender: string;
    @Expose()
    height: string;
    @Expose()
    weight: string;
    @Expose()
    bmi: string;
    @Expose()
    systolic: string;
    @Expose()
    diastolic: string;
    @Expose()
    blood_glucose: string;
    @Expose()
    test_type: number;
    @Expose()
    alc: string;
    @Expose()
    hdl: string;
    @Expose()
    ldl: string;
    @Expose()
    total_cholesterol: string;
    @Expose()
    triglycerides: string;
    @Expose()
    waist: string;
    @Expose()
    disease_id: string;
    @Expose()
    heightdate: string;
    @Expose()
    weightdate: string;
    @Expose()
    diastolicdate: string;
    @Expose()
    bloodglucosedate: string;
    @Expose()
    a1cdate: string;
    @Expose()
    hdldate: string;
    @Expose()
    ldldate: string;
    @Expose()
    total_cholesteroldate: string;
    @Expose()
    triglyceridedate: string;
    @Expose()
    waistdate: string;
    @Expose()
    co_testing_method: number;
    @Expose()
    co_qualitative_results_check_one: number;
    @Expose()
    co_qualitative_results: string;
    @Expose()
    date_obtain: string;
    @Expose()
    aas_form_prog: string;
    @Expose()
    is_tobacco_user: number;
    @Expose()
    preventative_visit: number;
    @Expose()
    signature: string;
    @Expose()
    is_signed: number;
    @Expose()
    source: number;
    @Expose()
    enter_by: number;
    @Expose()
    status: number;
    @Expose()
    created: string;
    @Expose()
    inserted: string;
    @Expose()
    acl: string;
    @Expose()
    frm: string;
    @Expose()
    user_type: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value?.id,
                code: value?.code,
                first_name: value?.first_name,
                last_name: value?.last_name,
                full_name: value.full_name ?? value?.first_name + ' ' + value?.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    cnt: number;
}
