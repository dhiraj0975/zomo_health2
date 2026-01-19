import { Allow } from 'class-validator';
export class CreatePhysicianTempInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() first_name: string;
    @Allow() last_name: string;
    @Allow() physiciantype_id: number;
    @Allow() pname: string;
    @Allow() email: string;
    @Allow() wphone: string;
    @Allow() signature: string;
    @Allow() create_account: number;
    @Allow() physician_date: string;
    @Allow() status: number;
}
