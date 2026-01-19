import { Allow } from 'class-validator';
export class DeleteBlocksInput {
    @Allow() id: number;
    @Allow() plan_id: number;
}
