import {Expose, Transform, Type} from 'class-transformer';
import { CompaniesDto } from '../company';
export class GlobalEventsDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() event_id: number;
    @Expose() orderid: number;
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
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
}
