import { Allow } from 'class-validator';
export class DeleteQuizSectionsInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
}
