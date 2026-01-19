import { Transform, Type, Expose } from 'class-transformer';
export class WellBeingTagDto {
    @Expose() id: number;
    @Expose() name: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
