import { Allow } from 'class-validator';
export class DeleteCategoriesInput {
    @Allow() id: number;
}
