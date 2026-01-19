import {
    AfterLoad,
    BaseEntity,
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Gender, YesNo } from '../../enum/enum';
;
const argon2 = require('argon2');
const DateTransformer = {
  to: (value: Date | null) => value,
  from: (value: string | null) => {
    if (!value || value === '0000-00-00') return null;
    return value;
  },
};
@Entity({ name: tableConstant.TBL_USERS })
export class UserEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar', { nullable: false })
    code: string;
    @Column('integer', { nullable: false })
    role_id: number; /*** 1=>Super Admin ***/
    @Column('varchar', { nullable: false })
    first_name: string;
    @Column('varchar', { nullable: true })
    middle_name: string;
    @Column('varchar', { nullable: false })
    last_name: string;
    @Column({
        type: 'enum',
        enum: Gender,
        default: Gender.male,
    })
    gender: Gender;
    @Column('varchar', { nullable: false })
    username: string;
    @Column('varchar', { nullable: false })
    email: string;
    @Column('varchar', { nullable: false })
    p_email: string;
    @Column('date', { nullable: false })
    dob: string;
    @Column('date', { nullable: false, transformer: DateTransformer })
    date_of_hire: Date | null;
    @Column()
    is_camp_eligible: number;
    @Column('varchar', { nullable: false })
    employeeid: string;      // employee_id
    @Column('varchar', { nullable: false })
    securitycode: string;  // security_code
    @Column('varchar', { nullable: false })
    timezone: string;
    @Column('varchar', { nullable: true, default : ''})
    password: string;
    @Column('varchar', { nullable: true, default : null })
    new_password: string;
    @Column('varchar', { nullable: true })
    docpassword: string;  //doc_password
    @Column('varchar', { nullable: false })
    ssoIdentifier: string;
    @Column('text', { nullable: true })
    profile_image: string;
    @Column('varchar', { nullable: false })
    activation_key: string;
    @Column({
        type: 'enum',
        enum: YesNo,
        default: YesNo.NO,
    })
    on_insurance_plan: YesNo;
    @Column('varchar', { nullable: false })
    insurance_plan_name: string;
    @Column('integer', { default: 0 })
    location: number;
    @Column('integer', { nullable: false, default: 0 })
    department_id: number;  // company_type_id
    @Column('integer', { nullable: true })
    physiciantype_id: number;   // can use this name physician_type_id
    @Column('varchar', { nullable: false })
    pname: string;      // can be use as p_name
    @Column('integer', { nullable: false })
    companytype_id: number;  // company_type_id
    @Column('integer', { nullable: false, default: 0 })
    org_id: number;  // company_type_id
    @Column('varchar', { nullable: false })
    membership_code: string;
    @Column('varchar', { nullable: false })
    entered_code: string;
    @Column('integer', { nullable: false, default: 0 })
    num_login: number;
    @Column({ type: 'timestamp', nullable: false})
    last_login: Date;
    @Column('integer', { nullable: false })
    user_type: number;
    @Column('varchar', { nullable: false })
    on_current_census: string;
    @Column('varchar', { nullable: false })
    relationship_id: string;
    @Column('integer', { default: 0 })
    status: number;
    @Column('text', { nullable: true })
    refresh_token: string;
    @Column({ type: 'int' })
    created_by: number;
    @Column({ type: 'int', default: 0 })
    updated_by: number;
    @Column('integer', { nullable: true })
    lastuniqid: number;
    @Column({ type: 'int', default: 1 })
    preferred_lang: number;
    @Column({ type: 'int', default: 0 })
    preferred_login: number;
    @Column()
    is_aro_build: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    @BeforeInsert()
    async lowercaseEmail() {
        if (this.email) {
            this.email = this.email.toLowerCase();
        }
        if (this.p_email) {
            this.p_email = this.p_email.toLowerCase();
        }
    }
    onboarding: number;
    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.new_password && this.new_password !== '' && !this.onboarding) {
            this.new_password = Buffer.from(await argon2.hash(this.new_password)).toString('base64');
        }
        else if (this.onboarding){
            this.new_password = this.new_password;
        } else {
            delete this.new_password;
        }
    }
    @BeforeInsert()
    @BeforeUpdate()
    async codeValue() {
        if (!this.code) {
            this.code = ' ';
        } 
    }
    /*** readonly ***/
    public full_name: string;
    protected code_full_name: string;
    protected user_id: string;
    // protected role: string;
    @AfterLoad()
    getFullName() {
        this.full_name = this.first_name + ' ' + this.last_name;
    }
    
    public age?: number | null;
    @AfterLoad()
    computeAge() {
        if (!this.dob) { this.age = null; return; }
        const dob = new Date(this.dob);
        const today = new Date();
        let age = today.getUTCFullYear() - dob.getUTCFullYear();
        const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
        const dayDiff = today.getUTCDate() - dob.getUTCDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
        this.age = age;
    }
    
    @AfterLoad()
    getFullNameWithCode() {
        this.code_full_name =this.code+' - '+ this.first_name + ' ' + this.last_name;
    }
    @AfterLoad()
    getUserId() {
        this.user_id = this.code;
    }
    // @AfterLoad()
    // getUserRole() {
    //     this.role = Object.keys(appConstant.ROLE).find(key => appConstant.ROLE[key] === this.role_id);
    // }
    @BeforeInsert()
    @BeforeUpdate()
    async formatGender() {
        if (this.gender) {
            const value = this.gender.trim().toLowerCase();
            if (value === 'male' || value === 'm') {
                this.gender = Gender.male;
            } else if (value === 'female' || value === 'f') {
                this.gender = Gender.female;
            } else if (value === 'other' || value === 'o') {
                this.gender = Gender.other;
            } else {
                this.gender = Gender.male;
            }
        }
    }
}
