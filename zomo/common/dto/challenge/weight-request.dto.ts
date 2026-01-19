import { Expose } from 'class-transformer';
import {Status} from "../../enum";
export class WeightRequestDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() status: number;
    @Expose() hash: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    original_file: string;
    @Expose()
    rejected_file: string;
    @Expose()
    success_file: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}