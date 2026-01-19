import { Allow } from 'class-validator';
export class CreateDiseasePhysicianFormsInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() physician_id: number;
    @Allow() disease_formid: string;
    @Allow() standard_ids: string;
    @Allow() standard_dates: string;
    @Allow() date_completed: string;
    @Allow() not_recommended: string;
    @Allow() signature: string;
    @Allow() is_signed: number;
    @Allow() status: number;
    @Allow() deleted: number;
}
