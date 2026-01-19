import { Allow } from 'class-validator';
export class RequestDeleteCustomPointInput {
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() id: number;
    @Allow() mapped_header: string;
}
