import { Allow } from 'class-validator';
export class CreateCommunicationEmailConfigInput {
    @Allow() id: number;
    @Allow() first_name: string;
    @Allow() last_name: string;
    @Allow() email: string;
    @Allow() source: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
