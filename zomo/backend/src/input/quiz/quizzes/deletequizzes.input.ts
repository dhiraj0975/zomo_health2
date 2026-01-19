import { Allow } from 'class-validator';
export class DeleteQuizzesInput {
    @Allow() id: number;
    @Allow() cat_id: number;
    @Allow() type: string;
}
