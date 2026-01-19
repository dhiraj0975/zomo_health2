import { Allow } from 'class-validator';
export class DeleteQuizClicksInput {
    @Allow() id: number;
    @Allow() qz_assign_id: number;
}
