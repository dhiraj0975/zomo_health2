import { Allow } from 'class-validator';
export class GetOneBlocksInput {
    @Allow() id: number;
    @Allow() plan_id: number;
}
