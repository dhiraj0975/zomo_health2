import {AssessmentOptionsDetailsEntity, AssessmentOptionsEntity} from "@common-constants";


export interface ehaDetailReportInterface {
    org_id: number;
    department_ids: number[];
    location_ids: number[];
    from_date: string;
    to_date: string;
    search_str: string;
    terminated_users: number;
    result_type: number;
    page: number;
    limit: number;
}


export interface assessmentOptionsInterface extends AssessmentOptionsEntity {
    assessmentOptionsDetails: AssessmentOptionsDetailsEntity;
}