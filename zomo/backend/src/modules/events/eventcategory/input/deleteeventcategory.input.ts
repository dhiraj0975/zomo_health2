import { Allow } from 'class-validator';
export class DeleteEventCategoryInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
}
