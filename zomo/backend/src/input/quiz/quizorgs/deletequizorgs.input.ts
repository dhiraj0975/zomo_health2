import { Allow } from 'class-validator';
export class DeleteQuizOrgInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
}
