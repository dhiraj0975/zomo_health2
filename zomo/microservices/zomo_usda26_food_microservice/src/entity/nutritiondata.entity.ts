import { BaseEntity, PrimaryColumn, Entity, Column } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_NUT_DATA })
export class NutritionDataEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 5 })
    NDB_No: string;
    @PrimaryColumn({ type: 'varchar', length: 3 })
    Nutr_No: string;
    @Column({ type: 'decimal', precision: 13, scale: 3 })
    Nutr_Val: number;
    @Column({ type: 'decimal', precision: 10, scale: 0 })
    Num_Data_Ptr: number;
    @Column({ type: 'decimal', precision: 11, scale: 3, nullable: true })
    Std_Error: number;
    @Column({ type: 'varchar', length: 2 })
    Src_Cd: string;
    @Column({ type: 'varchar', length: 4, nullable: true })
    Deriv_cd: string;
    @Column({ type: 'varchar', length: 5, nullable: true })
    Ref_NDB_No: string;
    @Column({ type: 'varchar', length: 1, nullable: true })
    Add_Nutr_Mark: string;
    @Column({ type: 'int' })
    Num_Studies: number;
    @Column({ type: 'decimal', precision: 13, scale: 3, nullable: true })
    Min: number;
    @Column({ type: 'decimal', precision: 13, scale: 3, nullable: true })
    Max: number;
    @Column({ type: 'int', nullable: true })
    DF: number;
    @Column({ type: 'decimal', precision: 13, scale: 3, nullable: true })
    Low_EB: number;
    @Column({ type: 'decimal', precision: 13, scale: 3, nullable: true })
    Up_EB: number;
    @Column({ type: 'varchar', length: 10, nullable: true })
    Stat_cmd: string;
    @Column({ type: 'varchar', length: 10, nullable: true })
    AddMod_Date: string;
    @Column({ type: 'varchar', length: 1, nullable: true })
    CC: string;
}
