import { EventEmitter } from "node:events";

export interface LogLine {
  stepId: string;
  text: string;
  ts: number;
}

class LogBus extends EventEmitter {
  private lines: LogLine[] = [];

  push(stepId: string, text: string) {
    const line: LogLine = { stepId, text: text.trimEnd(), ts: Date.now() };
    this.lines.push(line);
    this.emit("line", line);
  }

  getLines(stepId?: string): LogLine[] {
    if (stepId) return this.lines.filter((l) => l.stepId === stepId);
    return [...this.lines];
  }

  clear() {
    this.lines = [];
  }
}

export const logBus = new LogBus();
