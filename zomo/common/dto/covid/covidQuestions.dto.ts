import { Transform, Type, Expose } from 'class-transformer';
export class CovidQuestionsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() title: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
