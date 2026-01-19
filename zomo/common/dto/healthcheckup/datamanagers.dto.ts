import {Expose, Transform, Type} from 'class-transformer';
import { CompaniesDto } from '../company';
import { UserDto } from '../user';
export class DataManagersDto {
    @Expose()
    id: number;
    @Expose()
    org_id: number;
    @Expose()
    user_id: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
    @Expose()
    status: number;
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
}