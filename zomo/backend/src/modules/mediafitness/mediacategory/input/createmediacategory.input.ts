import { Allow } from 'class-validator';
export class CreateMediaCategoryInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() parent_id: number;
    @Allow() lft: number;
    @Allow() rght: number;
    @Allow() layout_type: number;
    @Allow() title: string;
    @Allow() description: string;
    @Allow() img: string;
    @Allow() status: number;
}
