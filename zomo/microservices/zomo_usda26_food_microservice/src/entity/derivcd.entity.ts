import { BaseEntity, PrimaryColumn, Column, Entity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_DERIV_CD })
export class DerivCdEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 4 })
    Deriv_Cd: string;
    @Column({ type: 'varchar', length: 120 })
    Deric_Desc: string;
}
