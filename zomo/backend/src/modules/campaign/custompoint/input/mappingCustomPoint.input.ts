import { Allow } from 'class-validator';
export class MappingCustomPointInput {
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() id: string;
    @Allow() mapped_header: string;
}
