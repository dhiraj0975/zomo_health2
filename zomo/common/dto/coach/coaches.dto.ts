import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto, CompanySettingsDto, DepartmentsDto, LocationsDto } from '../company';
import { UserDto } from '../user';
export class CoachesDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() coach_manager_id: number;
    @Expose() location: number;
    @Expose() department: number;
    @Expose() state: string;
    @Expose() city: string;
    @Expose() is_global: number;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                company_name: value.company_name,
                code: value.code,
                city: value.city,
                state: value.state,
                country: value.country,
                company_type: value.company_type,
            };
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    coach_manager: UserDto;
    @Expose()
    @Type(() => CompanySettingsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                plan_order: value.plan_order
            };
            return value;
        }
        else {
            return null
        }
    })
    company_setting: CompanySettingsDto;
    @Expose()
    @Type(() => DepartmentsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                dept_name: value.dept_name
            };
        }
        else {
            return null
        }
    })
    departments: DepartmentsDto;
    @Expose()
    @Type(() => LocationsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                location_name: value.location_name
            };
        }
        else {
            return null
        }
    })
    locations: LocationsDto;
}
