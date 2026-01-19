export interface hraDetailReportInterface {
    org_id: number[];
    department_ids: number[];
    location_ids: number[];
    search_str: string;
    from_date: string;
    to_date: string;
    terminated_users: number;
    result_type: number;
    page: number;
    limit: number;
    physician_entered: number;
    source_option_physician: number[];
    user_entered: number;
    source_option_user: number[];
    admin_entered: number;
    display_type: number;
}


