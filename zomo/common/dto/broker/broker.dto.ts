import { Transform, Type, Expose } from 'class-transformer';
import { UserDto } from '../user';
import { CompaniesDto, DepartmentsDto, LocationsDto } from '../company';
export class BrokerDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() broker_admin_id: number;
    @Expose() location: number;
    @Expose() department: number;
    @Expose() state: string;
    @Expose() city: string;
    @Expose() is_global: number;
    @Expose() region_id: number;
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
                name: value.company_name,
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
    broker_admin: UserDto;
    @Expose()
    @Type(() => LocationsDto)
    Location?: LocationsDto;
    @Expose()
    @Type(() => DepartmentsDto)
    Department?: DepartmentsDto;
}
