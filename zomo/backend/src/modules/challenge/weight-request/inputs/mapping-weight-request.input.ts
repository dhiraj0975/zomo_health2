import { Allow } from 'class-validator';
export class MappingWeightRequestInput {
    @Allow() org_id: number;
    @Allow() id: string;
    @Allow() mapped_header: string;
}
