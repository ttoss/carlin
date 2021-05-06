export const pipelines = ['main'] as const;

export type Pipelines = typeof pipelines;

export type Pipeline = Pipelines[0];
