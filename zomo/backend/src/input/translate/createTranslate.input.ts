import { Allow } from 'class-validator';
export class CreateTranslateInput {
    @Allow() language?: string;
    @Allow() source_lang?: string;
    @Allow() target_lang?: string;
    @Allow() key: string;
    @Allow() value: string;
    @Allow() fileName?: string;
    @Allow() file?: string;
    @Allow() menu: string;
    @Allow() sub_menu: string;
    @Allow() type: string;
    @Allow() org_id: string;
    @Allow() id: string;
    @Allow() filter: string;
    @Allow() sub_id: string;
}
