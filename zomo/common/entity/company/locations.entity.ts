import {
    BaseEntity, BeforeInsert, BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.COMPANIES.TBL_LOCATION })
export class LocationsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    company_id: number;
    @Column('text', { nullable: true })
    code: string;
    @Column('text', { nullable: true })
    location_name: string;
    @Column('text', { nullable: true })
    lname: string;
    @Column('text', { nullable: true })
    address1: string;
    @Column('text', { nullable: true })
    address2: string;
    @Column('text', { nullable: true })
    city: string;
    @Column('text', { nullable: true })
    state: string;
    @Column('text', { nullable: true })
    country: string;
    @Column('text', { nullable: true })
    zip: string;
    @Column('integer', { nullable: true })
    is_default: number;
    @Column('integer', { nullable: true })
    status: number;
    @Column('integer', { nullable: true })
    deleted: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    @BeforeInsert()
    @BeforeUpdate()
    async generateLocationFullName() {
        this.location_name = "";
        if(this.lname) {
            if(this.location_name === null || this.location_name === undefined || this.location_name === "") {
                this.location_name = this.lname;
            } else {
                this.location_name = this.location_name + ', ' + this.lname;
            }
        }
        if(this.address1) {
            if(this.location_name === null || this.location_name === undefined || this.location_name === "") {
                this.location_name = this.address1;
            } else {
                this.location_name = this.location_name + ', ' + this.address1;
            }
        }
        if(this.address2) {
            if(this.location_name === null || this.location_name === undefined || this.location_name === "") {
                this.location_name = this.address2;
            } else {
                this.location_name = this.location_name + ', ' + this.address2;
            }
        }
        if(this.city) {
            if(this.location_name === null || this.location_name === undefined || this.location_name === "") {
                this.location_name = this.city;
            } else {
                this.location_name = this.location_name + ', ' + this.city;
            }
        }
        if(this.state) {
            if(this.location_name === null || this.location_name === undefined || this.location_name === "") {
                this.location_name = this.state;
            } else {
                this.location_name = this.location_name + ', ' + this.state;
            }
        }
        if(this.zip) {
            if(this.location_name === null || this.location_name === undefined || this.location_name === "") {
                this.location_name = this.zip;
            } else {
                this.location_name = this.location_name + ', ' + this.zip;
            }
        }
        if(this.country) {
            if(this.location_name === null || this.location_name === undefined || this.location_name === "") {
                this.location_name = this.country;
            } else {
                this.location_name = this.location_name + ', ' + this.country;
            }
        }
    }
}
