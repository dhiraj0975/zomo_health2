import { Allow } from 'class-validator';
export class MappingHealthRequestInput {
    @Allow() id: string;
    @Allow() mapped_header: string;
}
