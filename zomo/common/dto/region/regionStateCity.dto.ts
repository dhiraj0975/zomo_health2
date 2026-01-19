import { Transform, Type, Expose } from 'class-transformer';
export class RegionStateCityDto {
    @Expose() id: number;
    @Expose() region_id: number;
    @Expose() state: string;
    @Expose() city: string;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
}
