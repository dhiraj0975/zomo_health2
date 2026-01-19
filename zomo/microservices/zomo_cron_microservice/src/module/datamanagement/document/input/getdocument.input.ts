import { Allow } from 'class-validator';
export class GetDocumentInput {
    @Allow() id: number;
    @Allow() organization_id: number;
}
