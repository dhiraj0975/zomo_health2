import { Injectable } from '@nestjs/common';
import * as os from 'node:os';
;
const cluster = require('cluster');

let numCPUs = os.cpus().length;
numCPUs = numCPUs > 6 ? numCPUs - 4 : 4;

@Injectable()
export class AppClusterService {
  static clusterize(callback: Function): void {
    if (cluster.isPrimary) {
      console.log(`Primary server started on PID ${process.pid}`);
      
      // Fork workers equal to the number of CPUs
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      // If a worker dies, restart it (High Availability)
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
      });
    } else {
      console.log(`Cluster worker started on PID ${process.pid}`);
      // This is where the actual Nest application starts
      callback();
    }
  }
}