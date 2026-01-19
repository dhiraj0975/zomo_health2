import { Allow } from 'class-validator';
export class ActivitygetInput {
    @Allow() module_id: number;
    @Allow() organization_id: number;
}
