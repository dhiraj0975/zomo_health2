import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as readline from 'readline';
import { join, resolve } from 'path';
__dirname = resolve(__dirname);
@Injectable()
export class CsvService {
  async readCsv(filePath: string): Promise<any[]> {
    try{
      const results = <any>[];
      const fullPath = filePath;
      return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(fullPath);
        const rl = readline.createInterface({
          input: readStream,
          crlfDelay: Infinity,
        });
        rl.on('line', (line) => {
          const columns = line.split(',');
          results.push(columns);
        });
        rl.on('close', () => {
          resolve(results);
        });
        rl.on('error', (error) => {
          reject(error);
        });
      });
    }catch(err){
        throw new Error(err.message);
    }
  }
  private async readCsvFile(filePath: string): Promise<string[]> {
    try{
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      return fileContent.split('\n').map(line => line.replace('\r', ''));
    }catch(err){
        throw new Error(err.message);
    }
  }
  async getTotalRecords(filePath: string): Promise<number> {
    try{
      const lines = await this.readCsvFile(filePath);
      return lines.length - 1; // Exclude header line
    }catch(err){
        throw new Error(err.message);
    }
  }
  async getData(page: number, limit: number, filePath: string, header: any): Promise<any[]> {
    try{
      const lines = await this.readCsvFile(filePath);
      const startLine = (page - 1) * limit + 1;
      const endLine = startLine + limit;
      const paginatedLines = lines.slice(startLine, endLine);
      const contactsData = paginatedLines.map(line => line.split(','));
      const headerData = JSON.parse(header);
      const data = contactsData.map(item => 
        headerData.reduce((acc, key, index) => {
            acc[key] = item[index];
            return acc;
        }, {})
      );
      return data;
    }catch(err){
        throw new Error(err.message);
    }
  }
}
