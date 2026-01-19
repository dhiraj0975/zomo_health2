import { Allow } from 'class-validator';
export class GetOneCategoriesInput {
    @Allow() id: number;
}
