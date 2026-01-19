import { Allow } from 'class-validator';
export class CreateForminstructionsTemplateTextsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() form_type: number;
    @Allow() main_option: number;
    @Allow() type: number;
    @Allow() text: string;
    @Allow() status: number;
    @Allow() order: number;
}
