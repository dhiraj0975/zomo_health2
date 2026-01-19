import { Expose, Transform, Type } from 'class-transformer';
import { Gender } from '../../enum';
export class AgeGroupDto {
    @Expose() id: number;
    @Expose() group_name: string;
    @Expose() group_min_age: number;
    @Expose() group_max_age: number;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) =>
        (Object.keys(Gender).find(key => Gender[key] === value)), {
        toClassOnly: true,
    })
    gender: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
