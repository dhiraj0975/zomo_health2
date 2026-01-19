import { Allow } from 'class-validator';
export class CreateCommunicationTemplateTextsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() type: number;
    @Allow() text: string;
    @Allow() new_text: string;
    @Allow() status: number;
}
