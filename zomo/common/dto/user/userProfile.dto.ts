import { Expose, Transform, Type } from 'class-transformer';
import { Gender } from '../../enum';
import { CompaniesDto, DepartmentsDto, LocationsDto } from '../company';
import { UserSettingsDto } from './userSettings.dto';
const S3_URL =  process.env.S3_URL_PROD
export class UserProfileDto {   
    @Expose() id: number;
    @Expose() code: string;
    @Expose() role_id: number;
    @Expose() first_name: string;
    @Expose() middle_name: string;
    @Expose() last_name: string;
    @Expose() full_name?: string;
    @Expose() username: string;
    @Expose() email: string;
    @Expose() p_email: string;
    @Expose() employeeid: string;
    @Expose() securitycode: string;
    @Expose() timezone: string;
    @Expose() docpassword: string;
    @Expose() ssoIdentifier: string;
    @Expose() activation_key: string;
    @Expose() is_camp_eligible: number;
    @Expose() on_insurance_plan: string;
    @Expose() insurance_plan_name: string;
    @Expose() department_id: number;
    @Expose() location: number;
    @Expose() physiciantype_id: number;
    @Expose() pname: string;
    @Expose() companytype_id: number;
    @Expose() org_id: number;
    @Expose() membership_code: string;
    @Expose() entered_code: string;
    @Expose() num_login: number;
    @Expose() user_type: number;
    @Expose() on_current_census: string;
    @Expose() relationship_id: string;
    @Expose() status: number;
    // @Expose() refresh_token: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    dob: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => 
        (Object.keys(Gender).find(key => Gender[key] === value)), {
        toClassOnly: true,
    })
    gender: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('profileimages') ? S3_URL + value : ''), {
        toClassOnly: true,
    })
    profile_image: string;
    @Expose()
    date_of_hire: string;
    @Expose()
    @Type(() => Number)
    @Transform(({ value }) => (value ? value.toString() : null), {
        toClassOnly: true,
    })
    last_login: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => UserSettingsDto)
    @Transform(({ value }) => (value ? value : null), {
        toClassOnly: true,
    })
    settings: UserSettingsDto;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                name: value.company_name,
                code: value.code,
                company_logo: value.company_logo,
                company_type: value.company_type
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => DepartmentsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                name: value.dept_name,
            };
        }
        else {
            return null
        }
    })
    department: DepartmentsDto;
    @Expose()
    @Type(() => LocationsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                location_name: value.location_name,
                lname: value.lname,
                zip: value.zip,
            };
        }
        else {
            return null
        }
    })
    Location: LocationsDto;
}
