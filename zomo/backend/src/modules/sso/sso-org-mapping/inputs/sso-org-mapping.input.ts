import { Allow } from 'class-validator';
export class SsoOrgMappingInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() tool_id: number;
    @Allow() saml: any;
    @Allow() field_identifier: any;
}
