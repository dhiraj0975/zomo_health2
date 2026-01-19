import { Allow } from 'class-validator';
export class DeleteRequestReportsEventsInput {
    @Allow() id: number;
    @Allow() user_id: number;
}
