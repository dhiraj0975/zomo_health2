import {Expose, Transform, Type} from 'class-transformer';
export class LanguagesDto {
    @Expose() id: number;
    @Expose() title: string;
    @Expose() native: string;
    @Expose() alias: string;
    @Expose() status: number;
    @Expose() weight: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
