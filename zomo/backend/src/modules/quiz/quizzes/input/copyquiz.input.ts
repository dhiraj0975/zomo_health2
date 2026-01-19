import { Allow } from 'class-validator';
export class CopyQuizInput {
    @Allow() id: number;
    @Allow() quiz_id: number;
    @Allow() webinar_id: number;
}
