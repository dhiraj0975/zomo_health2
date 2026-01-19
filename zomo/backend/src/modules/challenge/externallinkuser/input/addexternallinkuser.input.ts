import { Allow } from 'class-validator';
export class AddExternalLinkUserInput {
    @Allow() schedule_id: number;
    @Allow() user_id: number;
    @Allow() status: number;
}
