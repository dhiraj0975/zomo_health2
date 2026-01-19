import { Entity, BaseEntity, PrimaryColumn } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_DATA_SRCLN })
export class DataSrcLnEntity extends BaseEntity {
    @PrimaryColumn({
        type: 'varchar',
        length: 5,
    })
    NDB_No: string;
    @PrimaryColumn({
        type: 'varchar',
        length: 3,
    })
    Nutr_No: string;
    @PrimaryColumn({
        type: 'varchar',
        length: 6,
    })
    DataSrc_ID: string;
}
