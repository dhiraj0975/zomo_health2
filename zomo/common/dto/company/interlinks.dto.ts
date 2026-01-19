import { Transform, Type, Expose } from 'class-transformer';
export class InterlinksDto {
    @Expose() id: number;
    @Expose() linktitle: string;
    @Expose() plugin: string;
    @Expose() controller: string;
    @Expose() action: string;
    @Expose() newlink: string;
    @Expose() status: number;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
}
