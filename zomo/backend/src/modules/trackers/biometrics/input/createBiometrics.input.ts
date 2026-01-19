import { Allow } from 'class-validator';
export class CreateFtBiometricsInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() type: number;
    @Allow() weight: number;
    @Allow() alc: number;
    @Allow() height_ft: string;
    @Allow() height_in: string;
    @Allow() systolic: string;
    @Allow() diastolic: string;
    @Allow() chol_total: string;
    @Allow() hdl: string;
    @Allow() ldl: string;
    @Allow() triglycerides: string;
    @Allow() glucose_type: string;
    @Allow() glucose_time: string;
    @Allow() glucose: string;
    @Allow() medication: string;
    @Allow() source: number;
    @Allow() status: number;
    @Allow() inserted: string;
    @Allow() added_date: string;
}
