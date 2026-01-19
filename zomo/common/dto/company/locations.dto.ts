import { Transform, Type, Expose } from 'class-transformer';
import { CompaniesDto } from './companies.dto';
export class LocationsDto {
    @Expose() id: number;
    @Expose() company_id: number;
    @Expose() code: string;
    @Expose() location_name: string;
    @Expose() lname: string;
    @Expose() address1: string;
    @Expose() address2: string;
    @Expose() city: string;
    @Expose() state: string;
    @Expose() country: string;
    @Expose() zip: string;
    @Expose() is_default: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value?.code,   
                company_name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.company_name && obj.lname) {
                return `${obj.company_name} - ${obj.lname}`;
            } else {
                return null;
            }
        }
    })
    locations_name: string;
}
