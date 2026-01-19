import { Expose } from 'class-transformer';
export class TimezoneDto {
    @Expose() id: number;
    @Expose() timezone_name: string;
    @Expose() timezone_desc: string;
    @Expose() timezone_value: string;
    @Expose() alias: string;
    @Expose() status: number;
}
