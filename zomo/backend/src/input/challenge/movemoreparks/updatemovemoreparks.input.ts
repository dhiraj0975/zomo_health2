import { Allow } from 'class-validator';
export class UpdateMoveMoreParksInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() schedule_id: number;
    @Allow() park_name: string;
    @Allow() image: string;
    @Allow() steps: number;
    @Allow() order_by: number;
    @Allow() corner: string;
    @Allow() map: string;
    @Allow() website: string;
    @Allow() info: string;
    @Allow() status: number;
    @Allow() parks: any;
}
