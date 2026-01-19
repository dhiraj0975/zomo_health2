import { Transform, Type, Expose } from 'class-transformer';
export class SsoToolDto {
    @Expose() id: number;

    @Expose() tool_name: string;

    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        return obj.tool_detail;
    })
    tool_detail: Record<string, string>;

    @Expose() status: string;
}
