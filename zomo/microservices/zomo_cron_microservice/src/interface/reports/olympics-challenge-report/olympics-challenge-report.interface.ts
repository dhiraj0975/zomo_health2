export interface userData {
    users_id: number;
    users_code: string;
    users_role_id: number;
    users_first_name: string;
    users_middle_name: string | null;
    users_last_name: string;
    users_gender: 'm' | 'f' | string;
    users_username: string;
    users_email: string;
    users_dob: string | null;
    users_date_of_hire: string | null;
    users_employeeid: string | null;
    users_insurance_plan_name: string;
    locations_lname: string | null;
    company_company_name: string;
    userSetting_jobtitle: string;
    department_dept_name: string;
    total_minutes: number | null;
    activitycount: number | null;
    user_id: number | null;
    id: number;
    schedule_id: number;
    m_numeric: string | number;
    status: number;
    activity_name: string;
    activity_desc: string;
    colorcode: string;
}
export interface userMap {
    totalWeeks: number,
    completedWeeks: number,
    total_minutes: number,
    activitycount: number,
    latestData: userData
}