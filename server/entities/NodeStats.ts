import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

@Entity("node_stats")
@Index(["userId"], { unique: true })
export class NodeStats {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "boolean", default: false })
  isActive!: boolean;

  @Column({ type: "bigint", default: 0 })
  uptime!: number;

  @Column({ type: "decimal", precision: 15, scale: 8, default: 0 })
  hashRate!: number;

  @Column({ type: "decimal", precision: 15, scale: 8, default: 0 })
  dailyEarnings!: number;

  @Column({ type: "decimal", precision: 15, scale: 8, default: 0 })
  totalEarnings!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 100 })
  efficiency!: number;

  @Column({ type: "bigint", nullable: true })
  startTime!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @Column({ type: "uuid", unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
}