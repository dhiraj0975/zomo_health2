import { Expose, Transform, Type } from 'class-transformer';
import { Gender } from '../../enum';
export class AgeActivityDto {
    @Expose() id: number;
    @Expose() age_activity_id: number;
    @Expose() title: string;
    @Expose() group_type: number;
    @Expose() min_age: number;
    @Expose() max_age: number;
    @Expose() org_id: number;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose() ref_activity_id: number;
    @Expose() common_activity_id: number;
    @Expose() extrahtmlused: number;
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
