import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { UserEpochStats } from "./UserEpochStats";

@Entity("epochs")
@Index(["epochNumber"], { unique: true })
@Index(["isActive"])
export class Epoch {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "integer", unique: true })
  epochNumber!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "timestamp" })
  startDate!: Date;

  @Column({ type: "timestamp" })
  endDate!: Date;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 1.0 })
  rewardsMultiplier!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => UserEpochStats, (userEpochStats) => userEpochStats.epoch)
  userStats!: UserEpochStats[];

  // Computed properties
  get daysRemaining(): number {
    const now = new Date();
    const end = new Date(this.endDate);
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  get progressPercentage(): number {
    const now = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }
}