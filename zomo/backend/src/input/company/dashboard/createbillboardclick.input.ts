import { Allow } from 'class-validator';
export class CreatebillboardclickInput {
    @Allow() id: number;
    @Allow() type: number;
    @Allow() user_id: number;
    @Allow() ref_id: number;
    @Allow() status: number;
    @Allow() source: number;
    @Allow() created_date: Date;
    @Allow() updated_date: Date;
}
