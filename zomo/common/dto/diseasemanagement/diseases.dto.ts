import { Transform, Type, Expose } from 'class-transformer';
export class DiseasesDto {
    @Expose() id: number;
    @Expose() title: string;
    @Expose() desc: string;
    @Expose() forms_order: string;
    @Expose() weight: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
