import { Allow } from 'class-validator';
export class CreateCategoryInput {
    @Allow() category_name: string;
    @Allow() qty_req: number;
    @Allow() reqby_usr: number;
    @Allow() reqby_spouse: number;
    @Allow() max_freto_earn_point: number;
    @Allow() point_for_each: number;
    @Allow() max_point_per_cham: number;
    @Allow() plugin: string;
    @Allow() controller: string;
    @Allow() action: string;
    @Allow() newlink: string;
    @Allow() description: string;
    @Allow() ext_link: string;
    @Allow() status: number;
}
