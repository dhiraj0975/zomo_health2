import { Allow } from 'class-validator';
export class EditExternalLinkUserInput {
    @Allow() id: number;
    @Allow() event_id: number;
    @Allow() user_id: number;
    @Allow() status: number;
}
