import { Transform, Type, Expose } from 'class-transformer';
import { IsEnum } from "class-validator";
enum isDefault {
    Zero = 0,
    One = 1,
}
export class GlobalAccessDto {
    @Expose() id: number;
    @Expose() alias: string;
    @Expose() detail_description: any;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @IsEnum(isDefault)
    @Expose() status: isDefault;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
