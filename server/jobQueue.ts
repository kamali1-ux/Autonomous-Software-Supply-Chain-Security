import { ScanJob } from './types';

export class ScanJobQueue {
  private queue: ScanJob[] = [];
  private maxConcurrency: number = 2;
  private activeWorkers: number = 0;
  private processor: (job: ScanJob) => Promise<void>;

  constructor(maxConcurrency: number = 2, processor: (job: ScanJob) => Promise<void>) {
    this.maxConcurrency = maxConcurrency;
    this.processor = processor;
  }

  public addJob(job: ScanJob): void {
    this.queue.push(job);
    this.scheduleNext();
  }

  public getJobs(): ScanJob[] {
    return [...this.queue];
  }

  public getJob(id: string): ScanJob | undefined {
    return this.queue.find(j => j.id === id);
  }

  public getStats() {
    const queued = this.queue.filter(j => j.status === 'QUEUED').length;
    const running = this.queue.filter(j => j.status === 'RUNNING').length;
    const completed = this.queue.filter(j => j.status === 'COMPLETED').length;
    const failed = this.queue.filter(j => j.status === 'FAILED').length;
    return {
      total: this.queue.length,
      queued,
      running,
      completed,
      failed,
      maxConcurrency: this.maxConcurrency
    };
  }

  public retryJob(id: string): boolean {
    const job = this.queue.find(j => j.id === id);
    if (!job || job.status !== 'FAILED') return false;

    job.status = 'QUEUED';
    job.progress = 0;
    job.errorMessage = undefined;
    job.startedAt = new Date().toISOString();
    job.completedAt = undefined;
    this.scheduleNext();
    return true;
  }

  private scheduleNext(): void {
    if (this.activeWorkers >= this.maxConcurrency) return;

    const nextJob = this.queue.find(j => j.status === 'QUEUED');
    if (!nextJob) return;

    this.activeWorkers++;
    nextJob.status = 'RUNNING';
    nextJob.progress = 10;

    (async () => {
      try {
        await this.processor(nextJob);
        nextJob.status = 'COMPLETED';
        nextJob.progress = 100;
        nextJob.completedAt = new Date().toISOString();
      } catch (err: any) {
        nextJob.status = 'FAILED';
        nextJob.errorMessage = err?.message || 'Scan process encountered an unhandled error';
        nextJob.completedAt = new Date().toISOString();
      } finally {
        this.activeWorkers--;
        this.scheduleNext();
      }
    })();
  }
}
