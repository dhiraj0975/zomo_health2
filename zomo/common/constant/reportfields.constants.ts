const S3_URL =  process.env.S3_URL_PROD;
export const commonFields : Record<string, string> = {
  USER_CODE: "USER CODE",
  DEPARTMENT: "DEPARTMENT",
  RELATIONSHIP_ID: "RELATIONSHIP ID",
  USERNAME: "USERNAME",
  FIRST_NAME: "FIRST NAME",
  MIDDLE_NAME: "MIDDLE NAME",
  LAST_NAME: "LAST NAME",
  JOB_TITLE: "JOB TITLE",
  GENDER: "GENDER",
  BIRTH_DATE: "BIRTH DATE",
  DATE_OF_HIRE: "DATE OF HIRE",
  ON_HEALTH_PLAN: "ON HEALTH PLAN",
  HEALTH_PLAN_NAME: "HEALTH PLAN NAME",
  EMAIL: "EMAIL",
  LOCATION: "LOCATION",
  USER_TYPE: "USER TYPE",
  EVENT_TITLE: "Event Title",
  DATE_REGISTERED: "Date Registered",
  TIME_REGISTERED_START: "Time Registered- Start",
  TIME_REGISTERED_END: "Time Registered- End",
  EVENT_TIME_ZONE: "Event Time Zone",
  USER_TIME_ZONE: "User Time Zone",
  ATTENDED: "ATTENDED",
  CANCELLED: "Cancelled",
  PREFERRED_LANGUAGE: "Preferred Language",
  ORGANIZATION: "ORGANIZATION",
  EMPLOYEE_ID: "EMPLOYEE ID",
  EXT: "Ext.",
  EVENT_PHONE_NUMBER: "Event Phone Number"
};

const baseOrder: Record<string, string>[] = [
  { USER_CODE: commonFields.USER_CODE },
  { DEPARTMENT: commonFields.DEPARTMENT },
  { RELATIONSHIP_ID: commonFields.RELATIONSHIP_ID },
  { USERNAME: commonFields.USERNAME },
  { FIRST_NAME: commonFields.FIRST_NAME },
  { MIDDLE_NAME: commonFields.MIDDLE_NAME },
  { LAST_NAME: commonFields.LAST_NAME },
  { JOB_TITLE: commonFields.JOB_TITLE },
  { GENDER: commonFields.GENDER },
  { BIRTH_DATE: commonFields.BIRTH_DATE },
  { DATE_OF_HIRE: commonFields.DATE_OF_HIRE },
  { ON_HEALTH_PLAN: commonFields.ON_HEALTH_PLAN },
  { HEALTH_PLAN_NAME: commonFields.HEALTH_PLAN_NAME },
  { EMAIL: commonFields.EMAIL },
  { LOCATION: commonFields.LOCATION },
  { USER_TYPE: commonFields.USER_TYPE },
  { EVENT_TITLE: commonFields.EVENT_TITLE },
  { DATE_REGISTERED: commonFields.DATE_REGISTERED },
  { TIME_REGISTERED_START: commonFields.TIME_REGISTERED_START },
  { TIME_REGISTERED_END: commonFields.TIME_REGISTERED_END },
  { EVENT_TIME_ZONE: commonFields.EVENT_TIME_ZONE },
  { USER_TIME_ZONE: commonFields.USER_TIME_ZONE },
  { ATTENDED: commonFields.ATTENDED },
  { CANCELLED: commonFields.CANCELLED },
  { PREFERRED_LANGUAGE: commonFields.PREFERRED_LANGUAGE }
];


const insertAt = <T>(arr: T[], index: number, items: T[]): T[] => {
  let copy = Array.isArray(arr) ? [...arr] : Object.entries(arr).map(([key, value]) => ({ [key]: value }));
  copy.splice(index, 0, ...items);
  return Object.assign({}, ...copy);
};

const addOrganization = (fields: typeof baseOrder) => insertAt(fields, 1, [{ ORGANIZATION: commonFields.ORGANIZATION }]);

const addEmployeeId = (fields: typeof baseOrder) => insertAt(fields, 9, [{ EMPLOYEE_ID: commonFields.EMPLOYEE_ID }]);

const addEventContact = (fields: typeof baseOrder) =>
  insertAt(
    fields,
    17,
    [
        { EXT: commonFields.EXT },
        { EVENT_PHONE_NUMBER: commonFields.EVENT_PHONE_NUMBER }
    ]
  );

export const reportFieldsConstant = {
    ReportIncDefaultFields: {
        'User_CODE': "USER CODE",
        'ORGANIZATION': "ORGANIZATION",
        'DEPARTMENT': "DEPARTMENT",
        'RELATIONSHIP_ID': "RELATIONSHIP ID",
        'USERNAME': "USERNAME",
        'FIRST_NAME': "FIRST NAME",
        'MIDDLE_NAME': "MIDDLE NAME",
        'LAST_NAME': "LAST NAME",
        'JOB_TITLE': "JOB TITLE",
        'EMPLOYEE_ID': "EMPLOYEE ID",
        'GENDER': "GENDER",
        'BIRTH_DATE': "BIRTH DATE",
        'DATE_OF_HIRE': "DATE OF HIRE",
        'ON_HEALTH_PLAN': "ON HEALTH PLAN",
        'HEALTH_PLAN_NAME': "HEALTH PLAN NAME",
        'EMAIL': "EMAIL",
        'WORK_PHONE_NUMBER': "WORK PHONE NUMBER",
        'WORK_PHONE_EXTENSION': "WORK PHONE EXTENSION",
        'LOCATION': "LOCATION",
        'WORK_ADDRESS1': "WORK ADDRESS1",
        'WORK_ADDRESS2': "WORK ADDRESS2",
        'WORK_CITY': "WORK CITY",
        'WORK_STATE/PROVINCE': "WORK STATE/PROVINCE",
        'WORK_ZIP/POSTAL_CODE': "WORK ZIP/POSTAL CODE",
        'WORK_COUNTRY': "WORK COUNTRY",
        'HOME_PHONE_NUMBER': "HOME PHONE NUMBER",
        'MOBILE_PHONE_NUMBER': "MOBILE PHONE NUMBER",
        'HOME_ADDRESS1': "HOME ADDRESS1",
        'HOME_ADDRESS2': "HOME ADDRESS2",
        'HOME_CITY': "HOME CITY",
        'HOME_STATE/PROVINCE': "HOME STATE/PROVINCE",
        'HOME_ZIP/POSTAL_CODE': "HOME ZIP/POSTAL CODE",
        'HOME_COUNTRY': "HOME COUNTRY",
        'USER_TYPE': "USER TYPE"
    },
    ReportMypDefaultFields_TYPE2: {
        "ORGANIZATION": "ORGANIZATION",
        "DEPARTMENT": "DEPARTMENT",
        "RELATIONSHIP_ID": "RELATIONSHIP ID",
        "USERNAME": "USERNAME",
        "FIRST_NAME": "FIRST NAME",
        "MIDDLE_NAME": "MIDDLE NAME",
        "LAST_NAME": "LAST NAME",
        "JOB_TITLE": "JOB TITLE",
        "SOCIAL_SECURITY_NUMBER": "SOCIAL SECURITY NUMBER",
        "EMPLOYEE_ID": "EMPLOYEE ID",
        "GENDER": "GENDER",
        "BIRTH_DATE": "BIRTH DATE",
        "DATE_OF_HIRE": "DATE OF HIRE",
        "ON_HEALTH_PLAN": "ON HEALTH PLAN",
        "HEALTH_PLAN_NAME": "HEALTH PLAN NAME",
        "EMAIL": "EMAIL",
        "WORK_PHONE_NUMBER": "WORK PHONE NUMBER",
        "WORK_PHONE_EXTENSION": "WORK PHONE EXTENSION",
        "LOCATION": "LOCATION",
        "WORK_ADDRESS1": "WORK ADDRESS1",
        "WORK_ADDRESS2": "WORK ADDRESS2",
        "WORK_CITY": "WORK CITY",
        "WORK_STATE/PROVINCE": "WORK STATE/PROVINCE",
        "WORK_ZIP/POSTAL_CODE": "WORK ZIP/POSTAL CODE",
        "WORK_COUNTRY": "WORK COUNTRY",
        "HOME_PHONE_NUMBER": "HOME PHONE NUMBER",
        "MOBILE_PHONE_NUMBER": "MOBILE PHONE NUMBER",
        "HOME_ADDRESS1": "HOME ADDRESS1",
        "HOME_ADDRESS2": "HOME ADDRESS2",
        "HOME_CITY": "HOME CITY",
        "HOME_STATE/PROVINCE": "HOME STATE/PROVINCE",
        "HOME_ZIP/POSTAL_CODE": "HOME ZIP/POSTAL CODE",
        "HOME_COUNTRY": "HOME COUNTRY",
        "User_CODE": "USER CODE",
        "ELIGIBLE_FOR_CAMPAIGN": "ELIGIBLE FOR CAMPAIGN"
    },
    ReportChallengeDefaultFields_TYPE3: {
        "USER_CODE": "USER CODE",
        "ORGANIZATION": "ORGANIZATION",
        "DEPARTMENT": "DEPARTMENT",
        "RELATIONSHIP_ID": "RELATIONSHIP ID",
        "USERNAME": "USERNAME",
        "FIRST_NAME": "FIRST NAME",
        "MIDDLE_NAME": "MIDDLE NAME",
        "LAST_NAME": "LAST NAME",
        "JOB_TITLE": "JOB TITLE",
        "EMPLOYEE_ID": "EMPLOYEE ID",
        "GENDER": "GENDER",
        "BIRTH_DATE": "BIRTH DATE",
        "DATE_OF_HIRE": "DATE OF HIRE",
        "ON_HEALTH_PLAN": "ON HEALTH PLAN",
        "HEALTH_PLAN_NAME": "HEALTH PLAN NAME",
        "EMAIL": "EMAIL",
        "WORK_PHONE_NUMBER": "WORK PHONE NUMBER",
        "WORK_PHONE_EXTENSION": "WORK PHONE EXTENSION",
        "LOCATION": "LOCATION",
        "WORK_ADDRESS1": "WORK ADDRESS1",
        "WORK_ADDRESS2": "WORK ADDRESS2",
        "WORK_CITY": "WORK CITY",
        "WORK_STATE_PROVINCE": "WORK STATE/PROVINCE",
        "WORK_ZIP_POSTAL_CODE": "WORK ZIP/POSTAL CODE",
        "WORK_COUNTRY": "WORK COUNTRY",
        "HOME_PHONE_NUMBER": "HOME PHONE NUMBER",
        "MOBILE_PHONE_NUMBER": "MOBILE PHONE NUMBER",
        "HOME_ADDRESS1": "HOME ADDRESS1",
        "HOME_ADDRESS2": "HOME ADDRESS2",
        "HOME_CITY": "HOME CITY",
        "HOME_STATE_PROVINCE": "HOME STATE/PROVINCE",
        "HOME_ZIP_POSTAL_CODE": "HOME ZIP/POSTAL CODE",
        "HOME_COUNTRY": "HOME COUNTRY",
        "USER_TYPE": "USER TYPE"
    },
    ReportChallengeDefaultFields_TYPE4: {
        "USER_CODE": "USER CODE",
        "ORGANIZATION": "ORGANIZATION",
        "DEPARTMENT": "DEPARTMENT",
        "FIRST_NAME": "FIRST NAME",
        "MIDDLE_NAME": "MIDDLE NAME",
        "LAST_NAME": "LAST NAME",
        "ROLE_TYPE": "ROLE TYPE",
        "JOB_TITLE": "JOB TITLE",
        "ON_HEALTH_PLAN": "ON HEALTH PLAN",
        "HEALTH_PLAN_NAME": "HEALTH PLAN NAME",
        "DATE_OF_HIRE": "DATE OF HIRE",
        "EMAIL": "EMAIL",
        "WORK_PHONE_NUMBER": "WORK PHONE NUMBER",
        "HOME_PHONE_NUMBER": "HOME PHONE NUMBER",
        "LOCATION": "LOCATION",
        "WORK_ADDRESS1": "WORK ADDRESS1",
        "WORK_ADDRESS2": "WORK ADDRESS2",
        "WORK_CITY": "WORK CITY",
        "WORK_STATE_PROVINCE": "WORK STATE/PROVINCE",
        "WORK_ZIP_POSTAL_CODE": "WORK ZIP/POSTAL CODE",
        "WORK_COUNTRY": "WORK COUNTRY"
    },
    ReportUserDefaultFields: {
        "USER_CODE": "USER CODE",
        "EMPLOYEE_ID": "EMPLOYEE ID",
        "FIRST_NAME": "FIRST NAME",
        "LAST_NAME": "LAST NAME",
        "EMAIL": "EMAIL"
    },
    ReportChaDefaultFields: {
        "User_CODE": "USER CODE",
        "DEPARTMENT": "DEPARTMENT",
        "RELATIONSHIP_ID": "RELATIONSHIP ID",
        "USERNAME": "USERNAME",
        "FIRST_NAME": "FIRST NAME",
        "MIDDLE_NAME": "MIDDLE NAME",
        "LAST_NAME": "LAST NAME",
        "JOB_TITLE": "JOB TITLE",
        "EMPLOYEE_ID": "EMPLOYEE ID",
        "GENDER": "GENDER",
        "BIRTH_DATE": "BIRTH DATE",
        "DATE_OF_HIRE": "DATE OF HIRE",
        "ON_HEALTH_PLAN": "ON HEALTH PLAN",
        "HEALTH_PLAN_NAME": "HEALTH PLAN NAME",
        "EMAIL": "EMAIL",
        "LOCATION": "LOCATION",
        "USER_TYPE": "USER TYPE"
    },
    ReportChaDefaultFields_TYEPE12: {
        "User_CODE": "USER CODE",
        "ORGANIZATION": "ORGANIZATION",
        "DEPARTMENT": "DEPARTMENT",
        "FIRST_NAME": "FIRST NAME",
        "MIDDLE_NAME": "MIDDLE NAME",
        "LAST_NAME": "LAST NAME",
        "ROLE_TYPE": "ROLE TYPE",
        "JOB_TITLE": "JOB TITLE",
        "ON_HEALTH_PLAN": "ON HEALTH PLAN",
        "HEALTH_PLAN_NAME": "HEALTH PLAN NAME",
        "DATE_OF_HIRE": "DATE OF HIRE",
        "EMAIL": "EMAIL",
        "WORK_PHONE_NUMBER": "WORK PHONE NUMBER",
        "HOME_PHONE_NUMBER": "HOME PHONE NUMBER",
        "LOCATION": "LOCATION",
        "WORK_ADDRESS1": "WORK ADDRESS1",
        "WORK_ADDRESS2": "WORK ADDRESS2",
        "WORK_CITY": "WORK CITY",
        "WORK_STATE/PROVINCE": "WORK STATE/PROVINCE",
        "WORK_ZIP/POSTAL_CODE": "WORK ZIP/POSTAL CODE",
        "WORK_COUNTRY": "WORK COUNTRY"
    },
    ReportChaDefaultFields_TYEPE16: {
        "EMPLOYEE_ID": "UID-ALT",
        "RELATIONSHIP": "RELATIONSHIP",
        "BIRTH_DATE": "BIRTH DATE",
        "GENDER": "GENDER",
        "DATE_OF_HIRE": "DATE OF HIRE"
    },
    PreDataFields: {
        0: {
            "USER_CODE": "USER CODE",
            "EMPLOYEE_ID": "EMPLOYEE ID",
            "FIRST_NAME": "FIRST NAME",
            "LAST_NAME": "LAST NAME",
            "EMAIL": "EMAIL"
        },
        1: {
            'User_CODE': 'USER CODE',
            'ORGANIZATION': 'ORGANIZATION',
            'DEPARTMENT': 'DEPARTMENT',
            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
            'USERNAME': 'USERNAME',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'JOB_TITLE': 'JOB TITLE',
            'EMPLOYEE_ID': 'EMPLOYEE ID',
            'GENDER': 'GENDER',
            'BIRTH_DATE': 'BIRTH DATE',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'EMAIL': 'EMAIL',
            'WORK_PHONE_NUMBER': 'WORK PHONE NUMBER',
            'WORK_PHONE_EXTENSION': 'WORK PHONE EXTENSION',
            'LOCATION': 'LOCATION',
            'WORK_ADDRESS1': 'WORK ADDRESS1',
            'WORK_ADDRESS2': 'WORK ADDRESS2',
            'WORK_CITY': 'WORK CITY',
            'WORK_STATE/PROVINCE': 'WORK STATE/PROVINCE',
            'WORK_ZIP/POSTAL_CODE': 'WORK ZIP/POSTAL CODE',
            'WORK_COUNTRY': 'WORK COUNTRY',
            'HOME_PHONE_NUMBER': 'HOME PHONE NUMBER',
            'MOBILE_PHONE_NUMBER': 'MOBILE PHONE NUMBER',
            'HOME_ADDRESS1': 'HOME ADDRESS1',
            'HOME_ADDRESS2': 'HOME ADDRESS2',
            'HOME_CITY': 'HOME CITY',
            'HOME_STATE/PROVINCE': 'HOME STATE/PROVINCE',
            'HOME_ZIP/POSTAL_CODE': 'HOME ZIP/POSTAL CODE',
            'HOME_COUNTRY': 'HOME COUNTRY',
            'USER_TYPE': 'USER TYPE',
        },
        2: {
            'ORGANIZATION': 'ORGANIZATION',
            'DEPARTMENT': 'DEPARTMENT',
            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
            'USERNAME': 'USERNAME',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'JOB_TITLE': 'JOB TITLE',
            'SOCIAL_SECURITY_NUMBER': 'SOCIAL SECURITY NUMBER',
            'EMPLOYEE_ID': 'EMPLOYEE ID',
            'GENDER': 'GENDER',
            'BIRTH_DATE': 'BIRTH DATE',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'EMAIL': 'EMAIL',
            'WORK_PHONE_NUMBER': 'WORK PHONE NUMBER',
            'WORK_PHONE_EXTENSION': 'WORK PHONE EXTENSION',
            'LOCATION': 'LOCATION',
            'WORK_ADDRESS1': 'WORK ADDRESS1',
            'WORK_ADDRESS2': 'WORK ADDRESS2',
            'WORK_CITY': 'WORK CITY',
            'WORK_STATE/PROVINCE': 'WORK STATE/PROVINCE',
            'WORK_ZIP/POSTAL_CODE': 'WORK ZIP/POSTAL CODE',
            'WORK_COUNTRY': 'WORK COUNTRY',
            'HOME_PHONE_NUMBER': 'HOME PHONE NUMBER',
            'MOBILE_PHONE_NUMBER': 'MOBILE PHONE NUMBER',
            'HOME_ADDRESS1': 'HOME ADDRESS1',
            'HOME_ADDRESS2': 'HOME ADDRESS2',
            'HOME_CITY': 'HOME CITY',
            'HOME_STATE/PROVINCE': 'HOME STATE/PROVINCE',
            'HOME_ZIP/POSTAL_CODE': 'HOME ZIP/POSTAL CODE',
            'HOME_COUNTRY': 'HOME COUNTRY',
            'User_CODE': 'USER CODE',
            'ELIGIBLE_FOR_CAMPAIGN': 'ELIGIBLE FOR CAMPAIGN',
        },
        3: {
            'ORGANIZATION': 'ORGANIZATION',
            'User_CODE': 'USER CODE',
            'DEPARTMENT': 'DEPARTMENT',
            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'JOB_TITLE': 'JOB TITLE',
            'GENDER': 'GENDER',
            'BIRTH_DATE': 'BIRTH DATE',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'EMAIL': 'EMAIL',
            'LOCATION': 'LOCATION',
            'USER_TYPE': 'USER TYPE',
        },
        4: {
            'User_CODE': 'USER CODE',
            'ORGANIZATION': 'ORGANIZATION',
            'DEPARTMENT': 'DEPARTMENT',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'ROLE_TYPE': 'ROLE TYPE',
            'JOB_TITLE': 'JOB TITLE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'EMAIL': 'EMAIL',
            'WORK_PHONE_NUMBER': 'WORK PHONE NUMBER',
            'HOME_PHONE_NUMBER': 'HOME PHONE NUMBER',
            'LOCATION': 'LOCATION',
            'WORK_ADDRESS1': 'WORK ADDRESS1',
            'WORK_ADDRESS2': 'WORK ADDRESS2',
            'WORK_CITY': 'WORK CITY',
            'WORK_STATE/PROVINCE': 'WORK STATE/PROVINCE',
            'WORK_ZIP/POSTAL_CODE': 'WORK ZIP/POSTAL CODE',
            'WORK_COUNTRY': 'WORK COUNTRY',
        },
        8: {
            'USER_CODE': 'USER CODE',
            'DEPARTMENT': 'DEPARTMENT',
            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
            'USERNAME': 'USERNAME',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'JOB_TITLE': 'JOB TITLE',
            'EMPLOYEE_ID': 'EMPLOYEE ID',
            'GENDER': 'GENDER',
            'BIRTH_DATE': 'BIRTH DATE',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'EMAIL': 'EMAIL',
            'LOCATION': 'LOCATION',
            'USER_TYPE': 'USER TYPE',
            'EVENT_TITLE': 'Event Title',
            'DATE_REGISTERED': 'Date Registered',
        },
        10: {
            'User_CODE': 'USER CODE',
            'DEPARTMENT': 'DEPARTMENT',
            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
            'USERNAME': 'USERNAME',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'JOB_TITLE': 'JOB TITLE',
            'GENDER': 'GENDER',
            'BIRTH_DATE': 'BIRTH DATE',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'EMAIL': 'EMAIL',
            'LOCATION': 'LOCATION',
            'USER_TYPE': 'USER TYPE',
        },
        11: {
            'User_CODE': 'USER CODE',
            'DEPARTMENT': 'DEPARTMENT',
            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'JOB_TITLE': 'JOB TITLE',
            'GENDER': 'GENDER',
            'BIRTH_DATE': 'BIRTH DATE',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'EMAIL': 'EMAIL',
            'LOCATION': 'LOCATION',
            'USER_TYPE': 'USER TYPE',
        },
        12: {
            'User_CODE': 'USER CODE',
            'ORGANIZATION': 'ORGANIZATION',
            'DEPARTMENT': 'DEPARTMENT',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'ROLE_TYPE': 'ROLE TYPE',
            'JOB_TITLE': 'JOB TITLE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'EMAIL': 'EMAIL',
            'WORK_PHONE_NUMBER': 'WORK PHONE NUMBER',
            'HOME_PHONE_NUMBER': 'HOME PHONE NUMBER',
            'LOCATION': 'LOCATION',
            'WORK_ADDRESS1': 'WORK ADDRESS1',
            'WORK_ADDRESS2': 'WORK ADDRESS2',
            'WORK_CITY': 'WORK CITY',
            'WORK_STATE/PROVINCE': 'WORK STATE/PROVINCE',
            'WORK_ZIP/POSTAL_CODE': 'WORK ZIP/POSTAL CODE',
            'WORK_COUNTRY': 'WORK COUNTRY',
        },
        15: {
            'USER_CODE': 'USER CODE',
            'DEPARTMENT': 'DEPARTMENT',
            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
            'USERNAME': 'USERNAME',
            'FIRST_NAME': 'FIRST NAME',
            'MIDDLE_NAME': 'MIDDLE NAME',
            'LAST_NAME': 'LAST NAME',
            'JOB_TITLE': 'JOB TITLE',
            'EMPLOYEE_ID': 'EMPLOYEE ID',
            'GENDER': 'GENDER',
            'BIRTH_DATE': 'BIRTH DATE',
            'DATE_OF_HIRE': 'DATE OF HIRE',
            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
            'EMAIL': 'EMAIL',
            'LOCATION': 'LOCATION',
            'USER_TYPE': 'USER TYPE',
        },
        16: {
            EMPLOYEE_ID: "UID-ALT",
            RELATIONSHIP: "RELATIONSHIP",
            BIRTH_DATE: "BIRTH DATE",
            GENDER: "GENDER",
            DATE_OF_HIRE: "DATE OF HIRE"
        }
    },
    ReportEventAdminFields: addEmployeeId(addOrganization(baseOrder)),
    ReportEventChampionFields: addEventContact(addOrganization(baseOrder)),
    ReportEventOrgAdminFields: addEventContact(addEmployeeId(addOrganization(baseOrder))),
    ReportEventCoachFields: addEventContact(addEmployeeId(addOrganization(baseOrder))),
    ReportEventGlobalCoachFields: addEventContact(addEmployeeId(addOrganization(baseOrder))),
    ReportEventBrokerFields: addEventContact(addEmployeeId(addOrganization(baseOrder))),
    ReportEventBrokerAdminFields: addEventContact(addEmployeeId(addOrganization(baseOrder))),
    ReportEventRegionalAdminFields: addEventContact(addEmployeeId(addOrganization(baseOrder))),
    AnnualReportFieldForPPT: {
        "presentationTitle": "ZomoHealth Annual Report ",
        "company_name": "CohnReznick",
        "reportYear": 2025,
        "footerLogo": `${S3_URL}templateimages/common/annual_report/zomo_logo.png`,
        "footerLogoDark": `${S3_URL}templateimages/common/annual_report/zomo_logo_dark.png`,
        "slides": [
            {
                "slideType": "title",
                "data": {
                    "clientName": "CohnReznick",
                    "reportTitle": " Engagement and Health Summary",
                    "logoImagePath": `${S3_URL}companylogos/1213/comimg_33ceb07bf4eeb3da587e268d663aba1a.png`,
                    "backgroundImagePath": `${S3_URL}templateimages/common/annual_report/picture1.png`,
                    "siteLogo": `${S3_URL}templateimages/common/annual_report/zomo_logo_dark.png`,
                }
            },
            {
                "slideType": "sectionBreak",
                "data": {
                    "year": 2026,
                    "title": "Engagement",
                    "imagePath": `${S3_URL}templateimages/common/annual_report/picture2.png`
                }
            },
            {
                "slideType": "engagementSummary",
                "data": {
                    "title": "Program Engagement",
                    "subtitle": "(Combined)",
                    "backgroundImagePath": `${S3_URL}templateimages/common/annual_report/picture5.png`,
                    "table": {
                        "headers": ["Wellness Activity", "Completed (#)", "Completed (%)"],
                        "rows": []
                    }
                }
            },
            {
                "slideType": "engagementSummary",
                "data": {
                    "title": "Program Engagement",
                    "subtitle": "(Combined)",
                    "backgroundImagePath": `${S3_URL}templateimages/common/annual_report/picture5.png`,
                    "table": {
                        "headers": ["Wellness  Rewards", "Completed (#)", "Completed (%)"],
                        "rows": []
                    }
                }
            },
            {
                "slideType": "engagementSummary",
                "data": {
                    "title": "Program Engagement",
                    "subtitle": "(Employee only)",
                    "backgroundImagePath": `${S3_URL}templateimages/common/annual_report/picture5.png`,
                    "table": {
                        "headers": ["Wellness Activity", "Completed (#)", "Completed (%)"],
                        "rows": []
                    }
                }
            },
            {
                "slideType": "engagementSummary",
                "data": {
                    "title": "Program Engagement",
                    "subtitle": "(Employee only)",
                    "backgroundImagePath": `${S3_URL}templateimages/common/annual_report/picture5.png`,
                    "table": {
                        "headers": ["Wellness Rewards", "Completed (#)", "Completed (%)"],
                        "rows": []
                    }
                }
            },
            {
            "slideType": "historicalTable",
            "data": {
                    "title": "Program Engagement",
                    "subtitle": "(Combined)",
                    "backgroundImagePath": `${S3_URL}templateimages/common/annual_report/picture5.png`,
                    "table": {
                        "headers": ["Wellness Activity"],
                        "rows": [
                            {"values":["Eligible Employees",]},
                            {"values":["Logged In To Zomo Health",]},
                            {"values":["Physician Affidavit / Biometric Screening",]},
                            {"values":["HRA",]},
                            {"values":["Tobacco Affidavit",]},
                            {"values":["Wellness Credit",],"color": "#239884"}
                        ]
                    }
                }
            },
            {
            "slideType": "historicalTable",
            "data": {
                    "title": "Program Engagement",
                    "subtitle": "(Employee only)",
                    "backgroundImagePath": `${S3_URL}templateimages/common/annual_report/picture5.png`,
                    "table": {
                        "headers": ["Wellness Activity"],
                        "rows": [
                            {"values":["Eligible Employees",]},
                            {"values":["Logged In To Zomo Health",]},
                            {"values":["Physician Affidavit / Biometric Screening",]},
                            {"values":["HRA",]},
                            {"values":["Tobacco Affidavit",]},
                            {"values":["Wellness Credit",],"color": "#239884"}
                        ]
                    }
                }
            },
            {
                "slideType": "varianceTable",
                "data": {
                    "title": "Program Engagement Variance",
                    "subtitle": "(Combined)",
                    "graphLogo": `${S3_URL}templateimages/common/annual_report/graphlogo.png`,
                    "graphText": `Data above refers to number of active users at program deadline`,
                    "table": {
                        "headers": ["Wellness Activity", "Difference from Last Year to this Year (#)", "Difference from year 1 to Current Year (#)", "Difference from year 2 to Current Year (#)"],
                        "rows": []
                    }
                }
            },
            {
                "slideType": "varianceTable",
                "data": {
                    "title": "Program Engagement Variance",
                    "subtitle": "(Employee only) ",
                    "graphLogo": `${S3_URL}templateimages/common/annual_report/graphlogo.png`,
                    "graphText": `Data above refers to number of active users at program deadline`,
                    "table": {
                        "headers": ["Wellness Activity", "Difference from Last Year to this Year (#)", "Difference from year 1 to Current Year (#)", "Difference from year 2 to Current Year (#)"],
                        "rows": []
                    }
                }
            },
            {
                "slideType": "sectionBreak",
                "data": {
                    "year": 2026,
                    "title": "Biometric Results ",
                    "imagePath": `${S3_URL}templateimages/common/annual_report/picture3.png`
                }
            },
            {
                "slideType": "multiYearAverageTable",
                "data": {
                    "title": "Biometric Averages Comparison",
                    "graphLogo": `${S3_URL}templateimages/common/annual_report/graphlogo.png`,
                    "graphText": `Data includes all users, not cohort data | Date range for 2020-2023 is program year December 1 - November 30, excludes terminated users`,
                    "table": {
                        "headers": ["Biometric Category",],
                        "rows": []
                    },
                }
            },
            {
                "slideType": "stackedBarChart",
                "data": {
                    "title": "Biometric Risk Stratification",
                    "userCount": 1293,
                    "userLogo": `${S3_URL}templateimages/common/annual_report/user.png`,
                    "categories": ["LDL","HDL","TRIGLYCERIDES","TOTAL CHOLESTEROL","BP DIASTOLIC","BP SYSTOLIC","A1C","FASTING BLOOD GLUCOSE","NF BLOOD GLUCOSE","BMI"],
                    "low":      ["0","0","0","0","0","0","0","0","0","0"],
                    "moderate": ["0","0","0","0","0","0","0","0","0","0"],
                    "high":     ["0","0","0","0","0","0","0","0","0","0"],
                    "very high":     ["0","0","0","0","0","0","0","0","0","0"],
                    "iconPath": `${S3_URL}templateimages/common/annual_report/zomo_logo_dark.png`
                }
            },
            {
                "slideType": "riskUserTable",
                "data": {
                    "title": "Number Of Users With High Risk Factors ",
                    "userCount": 1293,
                    "userLogo": `${S3_URL}templateimages/common/annual_report/user.png`,
                    "riskFactorsList": [
                        "TC > 200 mg/DL ",
                        "Known Diabetes ",
                        "SBP > 140 mmHg ",
                        "DBP > 90 mmHg ",
                        "Current Smoker ",
                        "BMI > 30 ",
                        "Age > 45 "
                    ],
                    "riskDistribution": {
                        '2024': [66, 150, 178, 123, 106],
                        '2023': [75, 145, 185, 115, 95],
                        '2022': [82, 160, 170, 128, 101]
                    },            
                }
            },
            {
                "slideType": "sectionBreak",
                "data": {
                    "year": 2026,
                    "title": "HRA Results ",
                    "imagePath": `${S3_URL}templateimages/common/annual_report/picture4.png`
                }
            },
            {
                "slideType": "hraSummary",
                "data": {
                    "title": "HRA Summary Results",
                    "userCount": 1293,
                    "userLogo": `${S3_URL}templateimages/common/annual_report/user.png`,
                    "headers": ["Category ", "Doing Great (Low Risk) ", "Almost There (Medium Risk) ", "We Can Help (High Risk) "],
                    "rows": ["0","0","0","0"]
                }
            },
            {
                "slideType": "hraResultChart",
                "data": {
                    "title": "HRA Results",
                    "userCount": 1293,
                    "userLogo": `${S3_URL}templateimages/common/annual_report/user.png`,
                    "categories": ["Setting  Disable"],
                    "low":      ["0"],
                    "medium": ["0"],
                    "high":     ["0"],
                    "iconPath": `${S3_URL}templateimages/common/annual_report/zomo_logo_dark.png`
                }
            },
            {
                "slideType": "contact",
                "data": {
                    "title": "Questions & Comments? ",
                    "address": "1700 Post Oak Boulevard, Suite 600 Houston, TX 77056",
                    "phone": "1-877-378-8880 ",
                    "email": "info@zomohealth.com ",
                    "website": "zomohealth.com ",
                    "siteLogo": `${S3_URL}templateimages/common/annual_report/zomo_logo.png`,
                    "backgroundImagePath": `${S3_URL}templateimages/common/annual_report/picture1.png`,
                }
            },
        ]
        },
        ScreeningResult : {
                    0: 0,
                    1: 0,
                    2: 0,
                    3: 0,
                    '4 +': 0
                },
        ScreeningBiometricResult : {
            'BMI': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'NF BLOOD GLUCOSE': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'FASTING BLOOD GLUCOSE': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'A1C': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'BP SYSTOLIC': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'BP DIASTOLIC': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'TOTAL CHOLESTEROL': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'TRIGLYCERIDES': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'HDL': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
            'LDL': {
                low: 0,
                medium: 0,
                high: 0,
                very_high: 0
            },
        }
};