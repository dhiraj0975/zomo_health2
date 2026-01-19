import { Allow } from 'class-validator';
export class CopyactivityInput {
    @Allow() id: number;
}