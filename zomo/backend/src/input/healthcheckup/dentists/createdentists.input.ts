import { Allow } from 'class-validator';
export class CreateDentistsInput {
    @Allow() userid: number;
    @Allow() activity_id: number;
    @Allow() physician_id: number;
    @Allow() date_completed: string;
    @Allow() signature: string;
    @Allow() is_signed: number;
    @Allow() enter_by: number;
    @Allow() status: number;
}
