import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Gender, YesNo } from '../../enum';
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_USERS_TEMPS })
export class UsersTempsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('text', { nullable: true })
    User_ID: string;
    @Column('text', { nullable: true })
    First_Name: string;
    @Column('text', { nullable: true })
    Middle_Name: string;
    @Column('text', { nullable: true })
    Last_Name: string;
    @Column('text', { nullable: true })
    Social_Security_Number: string;
    @Column('text', { nullable: true })
    Employee_ID: string;
    @Column('text', { nullable: true })
    Organization_ID: string;
    @Column('text', { nullable: true })
    DOB: string;
    @Column('text', { nullable: true })
    date_of_hire: string;
    @Column({
        type: 'enum',
        enum: YesNo,
        default: null,
    })
    on_insurance_plan: YesNo;
    @Column('text', { nullable: true })
    insurance_plan_name: string;
    @Column({
        type: 'enum',
        enum: Gender,
        default: null,
    })
    Gender: Gender;
    @Column('text', { nullable: true })
    Email: string;
    @Column('text', { nullable: true })
    Cell_Phone: string;
    @Column('text', { nullable: true })
    Work_Phone: string;
    @Column('integer', { nullable: true })
    Location_ID: number;
    @Column('text', { nullable: true })
    Location: string;
    @Column('text', { nullable: true })
    Work_Address1: string;
    @Column('text', { nullable: true })
    Work_Address2: string;
    @Column('text', { nullable: true })
    Work_City: string;
    @Column('text', { nullable: true })
    Work_State: string;
    @Column('text', { nullable: true })
    Work_Zip_Code: string;
    @Column('text', { nullable: true })
    Home_Phone: string;
    @Column('text', { nullable: true })
    Job_Title: string;
    @Column('text', { nullable: true })
    Address: string;
    @Column('text', { nullable: true })
    Home_Address2: string;
    @Column('text', { nullable: true })
    City: string;
    @Column('text', { nullable: true })
    State: string;
    @Column('text', { nullable: true })
    Zip: string;
    @Column('text', { nullable: true })
    timezone: string;
    @Column('text', { nullable: true })
    Physician_ID: string;
    @Column('integer', { nullable: true })
    Provider_Type: number;
    @Column('text', { nullable: true })
    Physician_First_Name: string;
    @Column('text', { nullable: true })
    Physician_Last_Name: string;
    @Column('text', { nullable: true })
    Practice_Name: string;
    @Column('text', { nullable: true })
    Physician_Email: string;
    @Column('text', { nullable: true })
    Office_Phone: string;
    @Column('text', { nullable: true })
    Height: string;
    @Column('text', { nullable: true })
    Weight: string;
    @Column('text', { nullable: true })
    BMI: string;
    @Column('text', { nullable: true })
    Blood_Pressure_Systolic: string;
    @Column('text', { nullable: true })
    Blood_Pressure_Diastolic: string;
    @Column('text', { nullable: true })
    Glucose: string;
    @Column('integer', { nullable: true })
    Fasting_Or_Random: number;
    @Column('text', { nullable: true })
    A1C: string;
    @Column('text', { nullable: true })
    Total_Cholesterol: string;
    @Column('text', { nullable: true })
    HDL_Cholesterol: string;
    @Column('text', { nullable: true })
    LDL_Cholesterol: string;
    @Column('text', { nullable: true })
    Triglycerides: string;
    @Column('text', { nullable: true })
    Waist: string;
    @Column('text', { nullable: true })
    Date_PF_Received: string;
    @Column('text', { nullable: true })
    Dentist_ID: string;
    @Column('integer', { nullable: true })
    DProvider_Type: number;
    @Column('text', { nullable: true })
    DPhysician_First_Name: string;
    @Column('text', { nullable: true })
    DPhysician_Last_Name: string;
    @Column('text', { nullable: true })
    DPractice_Name: string;
    @Column('text', { nullable: true })
    DPhysician_Email: string;
    @Column('text', { nullable: true })
    DOffice_Phone: string;
    @Column('text', { nullable: true })
    Date_DF_Received: string;
    @Column('text', { nullable: true })
    Optometrist_ID: string;
    @Column('integer', { nullable: true })
    OProvider_Type: number;
    @Column('text', { nullable: true })
    OPhysician_First_Name: string;
    @Column('text', { nullable: true })
    OPhysician_Last_Name: string;
    @Column('text', { nullable: true })
    OPractice_Name: string;
    @Column('text', { nullable: true })
    OPhysician_Email: string;
    @Column('text', { nullable: true })
    OOffice_Phone: string;
    @Column('text', { nullable: true })
    Date_OVF_Received: string;
}
