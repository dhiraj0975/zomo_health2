import { Allow } from 'class-validator';
export class RequestDeleteInput {
    @Allow() org_id: number;
    @Allow() id: number;
}
