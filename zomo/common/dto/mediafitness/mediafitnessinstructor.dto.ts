import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessInstructorDto {
    @Expose() id: number;
    @Expose() e_id: number;
    @Expose() org_id: number;
    @Expose() first_name: string;
    @Expose() last_name: string;
    @Expose() full_name: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
