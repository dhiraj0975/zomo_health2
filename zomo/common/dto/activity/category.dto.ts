import { Expose } from 'class-transformer';
export class CategoryDto {
    @Expose() id: number;
    @Expose() category_name : string;
    @Expose() qty_req: number;
    @Expose() reqby_usr: number;
    @Expose() reqby_spouse: number;
    @Expose() max_freto_earn_point: number;
    @Expose() point_for_each: number;
    @Expose() max_point_per_cham: number;
    @Expose() orgenization_code: string; //TODO: spelling mistake in column name
    @Expose() description: string;
    @Expose() plugin: string;
    @Expose() controller: string;
    @Expose() action: string;
    @Expose() newlink: string;
    @Expose() ext_link: string;
    @Expose() status: number;
    @Expose() added_date: string;
    @Expose() updated_date: string;
}
