import { Expose } from 'class-transformer';
export class TagsDto {
    @Expose() id: number;
    @Expose() title: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
