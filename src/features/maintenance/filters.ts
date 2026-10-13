import { positiveInteger } from '@/lib/navigation/listParams';
import { categoryLabels, processingLabels, quoteLabels } from './presentation';
import { normalizeTime } from './time';
import type { ListParams } from './types';
export function parseFilters(params: Pick<URLSearchParams,'get'>): ListParams {
  function option<T extends string>(key:string, values:readonly T[]): T | undefined { const value=params.get(key);return values.find(v=>v===value); }
  function time(key:string) {const value=params.get(key);if(!value)return undefined;try{return normalizeTime(value);}catch{return undefined;}}
  return {page:positiveInteger(params.get('page'),1),size:positiveInteger(params.get('size'),20,100),
    status:option('status',['SUBMITTED','COLLECTING','CLOSED'] as const),quoteStatus:option('quoteStatus',Object.keys(quoteLabels) as NonNullable<ListParams['quoteStatus']>[]),
    processingStatus:option('processingStatus',Object.keys(processingLabels) as NonNullable<ListParams['processingStatus']>[]),vendorProcessingStatus:option('vendorProcessingStatus',Object.keys(processingLabels) as NonNullable<ListParams['vendorProcessingStatus']>[]),
    category:option('category',Object.keys(categoryLabels) as NonNullable<ListParams['category']>[]),submittedFrom:time('submittedFrom'),submittedTo:time('submittedTo')};
}
