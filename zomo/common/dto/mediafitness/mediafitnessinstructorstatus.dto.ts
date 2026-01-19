import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessInstructorStatusDto {
    @Expose() id: number;
    @Expose() i_id: number;
    @Expose() org_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
