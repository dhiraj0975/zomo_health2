import { Allow } from 'class-validator';
export class DeleteactivityInput {
    @Allow() id: number;
}