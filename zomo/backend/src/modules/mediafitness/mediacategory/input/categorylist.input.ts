import { Allow } from 'class-validator';
export class CategoryListInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() layout_type: string;
    @Allow() post: number;
}
