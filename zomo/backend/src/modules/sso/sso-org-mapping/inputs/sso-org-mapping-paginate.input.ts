import { Allow } from 'class-validator';
import {PaginateInput} from "@/input";
import {Status} from "@common-constants";
export class SsoOrgMappingPaginateInput extends PaginateInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() tool_id: number;
    @Allow() status: number;
    @Allow() saml: any;
    @Allow() field_identifier: any;
}
