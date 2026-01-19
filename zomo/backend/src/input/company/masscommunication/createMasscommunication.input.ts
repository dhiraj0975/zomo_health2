import { Allow } from 'class-validator';
export class CreateCompanyMassCommunicationInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() user_role: number;
    @Allow() membership_code: string;
    @Allow() condition: string;
    @Allow() campaign_id: number;
    @Allow() event_id: number;
    @Allow() department: any;
    @Allow() location: any;
    @Allow() state: string;
    @Allow() city: string;
    @Allow() subject: string;
    @Allow() message: string;
    @Allow() request_date: string;
    @Allow() email: string;
    @Allow() status: number;
    @Allow() flage: number;
}
