import { Expose, Transform, Type } from 'class-transformer';
export class FitnessActivityDto {
    @Expose() id: number;
    @Expose() challenge_id: number;
    @Expose() alphabet: string;
    @Expose() activity_name: string;
    @Expose() suggestion: string;
    @Expose() status: number;
    @Expose()
    added_date: string;
    @Expose()
    modified_date: string;
}
