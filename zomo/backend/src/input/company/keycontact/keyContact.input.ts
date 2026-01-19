import { Allow } from 'class-validator';
export class KeyContactInput {
    @Allow() company_id: number;
    @Allow() hr_pri_contact: string;
    @Allow() hr_contact: string;
    @Allow() hr_email: string;
    @Allow() tech_contact: string;
    @Allow() tech_email: string;
    @Allow() tobacco_contact: string;
    @Allow() tobacco_email: string;
}
