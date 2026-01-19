import { Expose } from 'class-transformer';
export class KeyContactsDto {
    @Expose() hr_pri_contact: string;
    @Expose() hr_contact: string;
    @Expose() hr_email: string;
    @Expose() tech_contact: string;
    @Expose() tech_email: string;
    @Expose() tobacco_contact: string;
    @Expose() tobacco_email: string;
    @Expose() created: string;
    @Expose() updated: string;
    @Expose() status: number;
}
