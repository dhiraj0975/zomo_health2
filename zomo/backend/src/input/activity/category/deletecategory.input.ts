import { Allow } from 'class-validator';
export class DeleteCategoryInput {
    @Allow() id: number;
}
