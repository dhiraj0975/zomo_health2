import { Allow } from 'class-validator';
export class CreateCommunicationEmailThemeColorInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() newsletterthemecolors: string;
    @Allow() updated_by: number;
}
