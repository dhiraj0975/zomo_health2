import { Allow } from 'class-validator';
export class CreateQuizSectionsInput {
    @Allow() quiz_id: number;
    @Allow() name: string;
    @Allow() description: string;
}
