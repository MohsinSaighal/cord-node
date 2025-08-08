import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
  PrimaryColumn,
} from "typeorm";
import { Task } from "./Task";
import { UserEpochStats } from "./UserEpochStats";
import { ReferralData } from "./ReferralData";
import { UserTask } from "./UserTask";
import { MiningSession } from "./MiningSession";
import { UserSettings } from "./UserSettings";

@Entity("users")
@Index(["username"], { unique: true })
@Index(["referralCode"], { unique: true })
export class User {
  @PrimaryColumn({type:"varchar", length: 36})
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  username!: string;

  @Column({ type: "varchar", length: 10 })
  discriminator!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  avatar!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  accountAge!: number;

  @Column({ type: "timestamp" })
  joinDate!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 1.0 })
  multiplier!: number;

  @Column({ type: "boolean", default: false })
  compensationClaimed!: boolean;

  @Column({ type: "boolean", default: false })
  hasBadgeOfHonor!: boolean;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  totalEarned!: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  currentBalance!: number;

  @Column({ type: "boolean", default: false })
  isNodeActive!: boolean;

  @Column({ type: "integer", default: 0 })
  tasksCompleted!: number;

  @Column({ type: "integer", default: 0 })
  rank!: number;

  @Column({ type: "bigint", nullable: true })
  nodeStartTime!: number;

  @Column({ type: "bigint", default: () => "EXTRACT(epoch FROM NOW()) * 1000" })
  lastLoginTime!: number;

  @Column({ type: "boolean", default: false })
  dailyCheckInClaimed!: boolean;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  weeklyEarnings!: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  monthlyEarnings!: number;

  @Column({ type: "varchar", length: 50, nullable: true, unique: true })
  referralCode!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  referredBy!: string;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  referralEarnings!: number;

  @Column({ type: "integer", default: 0 })
  totalReferrals!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  currentEpochId!: string;

  @Column({ type: "bigint", nullable: true })
  epochJoinDate!: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  totalEpochEarnings!: number;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  lastSavedBalance!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations - Tasks are global, user progress tracked in UserTask

  @OneToMany(() => UserTask, (userTask) => userTask.user)
  userTasks!: UserTask[];

  @OneToMany(() => MiningSession, (session) => session.user)
  miningSessions!: MiningSession[];

  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings!: UserSettings;

  @OneToMany(() => UserEpochStats, (epochStats) => epochStats.user)
  epochStats!: UserEpochStats[];

  @OneToMany(() => ReferralData, (referral) => referral.referrer)
  referrals!: ReferralData[];
}