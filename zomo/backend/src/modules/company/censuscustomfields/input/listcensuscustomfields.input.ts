import { Allow } from 'class-validator';
export class ListCensusCustomFieldsInput {
    @Allow() organization_id: number;
    @Allow() type: string;
    @Allow() order_by: string;
    @Allow() order: string;
}
