import { BaseEntity, PrimaryColumn, Column, Entity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_WEIGHT })
export class WeightEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 5 })
    NDB_No: string;
    @PrimaryColumn({ type: 'varchar', length: 2 })
    Seq: string;
    @Column({ type: 'decimal', precision: 8, scale: 3 })
    Amount: number;
    @Column({ type: 'varchar', length: 84 })
    Msre_Desc: string;
    @Column({ type: 'decimal', precision: 8, scale: 1 })
    Gm_Wgt: number;
    @Column({ type: 'int', nullable: true })
    Num_Data_Pts: number;
    @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
    Std_Dev: number;
}
