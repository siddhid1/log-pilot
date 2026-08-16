import { LogTimeStamps } from "./log.js";
import { LogMetrics } from "./metrics.js";
import { LogSecurity } from "./security.js";
import { LogTrack } from "./track.js";

export type LogLevel = "info" | "warn" | "error" ;

export interface LoggerConfig{
    apiKey:string;
    appName?:string;
    environment?:string;
}

export interface LogPayload{
    type:LogType
    message:string;
    importance:Importance;
    subsystem:Subsystem;
    operation?:string;
    track?:LogTrack;
    security?:LogSecurity;
    metrics?:LogMetrics;
    service?:string;
    timestamps?:LogTimeStamps;
    ingested_at?:number;
    appName?:string;
    environment?:string;
}






export type LogType =
  | "error"
  | "info"
  | "warning"
  | "debug"
  | "audit"
  | "success"
  | "metric";

export type Importance = "critical" | "high" | "medium" | "low";

export type Subsystem = "db" | "cache" | "queue" | "network";

export type UserRole = "super-admin" | "admin" | "user";

export type AuthStatus = "success" | "failed" | "expired";
