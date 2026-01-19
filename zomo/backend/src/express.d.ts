import { UserInterface } from "./interface";

declare global {
  namespace Express {
    export interface Request {
      tokenUser?: UserInterface;
      deviceKey?: string;
      deviceRefreshKey?: string;
      lang?: string;
    }
  }
}
