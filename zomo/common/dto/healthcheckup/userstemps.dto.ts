import { Expose, Transform, Type } from 'class-transformer';
import { Gender, YesNo } from '../../enum';

export class UsersTempsDto {
    @Expose()
    id: number;
    @Expose()
    User_ID: string;
    @Expose()
    First_Name: string;
    @Expose()
    Middle_Name: string;
    @Expose()
    Last_Name: string;
    @Expose()
    Social_Security_Number: string;
    @Expose()
    Employee_ID: string;
    @Expose()
    Organization_ID: string;
    @Expose()
    DOB: string;
    @Expose()
    date_of_hire: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) =>
        (Object.keys(YesNo).find(key => YesNo[key] === value)), {
        toClassOnly: true,
    })
    on_insurance_plan: string;
    @Expose()
    insurance_plan_name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) =>
        (Object.keys(Gender).find(key => Gender[key] === value)), {
        toClassOnly: true,
    })
    Gender: string;
    @Expose()
    Email: string;
    @Expose()
    Cell_Phone: string;
    @Expose()
    Work_Phone: string
    @Expose()
    Location_ID: number;
    @Expose()
    Location: string;
    @Expose()
    Work_Address1: string;
    @Expose()
    Work_Address2: string;
    @Expose()
    Work_City: string;
    @Expose()
    Work_State: string;
    @Expose()
    Work_Zip_Code: string;
    @Expose()
    Home_Phone: string;
    @Expose()
    Job_Title: string;
    @Expose()
    Address: string;
    @Expose()
    Home_Address2: string;
    @Expose()
    City: string;
    @Expose()
    State: string;
    @Expose()
    Zip: string;
    @Expose()
    timezone: string;
    @Expose()
    Physician_ID: string;
    @Expose()
    Provider_Type: number;
    @Expose()
    Physician_First_Name: string;
    @Expose()
    Physician_Last_Name: string;
    @Expose()
    Practice_Name: string;
    @Expose()
    Physician_Email: string;
    @Expose()
    Office_Phone: string;
    @Expose()
    Height: string;
    @Expose()
    Weight: string;
    @Expose()
    BMI: string;
    @Expose()
    Blood_Pressure_Systolic: string;
    @Expose()
    Blood_Pressure_Diastolic: string;
    @Expose()
    Glucose: string;
    @Expose()
    Fasting_Or_Random: number;
    @Expose()
    A1C: string;
    @Expose()
    Total_Cholesterol: string;
    @Expose()
    HDL_Cholesterol: string;
    @Expose()
    LDL_Cholesterol: string;
    @Expose()
    Triglycerides: string;
    @Expose()
    Waist: string;
    @Expose()
    Date_PF_Received: string;
    @Expose()
    Dentist_ID: string;
    @Expose()
    DProvider_Type: number;
    @Expose()
    DPhysician_First_Name: string;
    @Expose()
    DPhysician_Last_Name: string;
    @Expose()
    DPractice_Name: string;
    @Expose()
    DPhysician_Email: string;
    @Expose()
    DOffice_Phone: string;
    @Expose()
    Date_DF_Received: string;
    @Expose()
    Optometrist_ID: string;
    @Expose()
    OProvider_Type: number;
    @Expose()
    OPhysician_First_Name: string;
    @Expose()
    OPhysician_Last_Name: string;
    @Expose()
    OPractice_Name: string;
    @Expose()
    OPhysician_Email: string;
    @Expose()
    OOffice_Phone: string;
    @Expose()
    Date_OVF_Received: string;
}