import { Allow } from 'class-validator';
export class ListCompanyInput {
    @Allow() type: string;
    @Allow() activeplugin: string;
    @Allow() search_str: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() is_emo_health_asssessments: number | string;
    @Allow() enable_popup: number | string;
}
