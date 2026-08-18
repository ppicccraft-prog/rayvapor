import Papa from 'papaparse';
import { apiFetch } from '../utils/apiFetch';

const cache: Record<string, any> = {};

export const fetchCsvData = async (url: string, options: Papa.ParseConfig = {}): Promise<any> => {
  if (cache[url]) {
    return cache[url];
  }

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}`);
  }
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      ...options,
      complete: (results) => {
        cache[url] = results.data;
        resolve(results.data);
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
};
