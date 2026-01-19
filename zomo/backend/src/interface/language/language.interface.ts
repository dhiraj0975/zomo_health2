export interface LanguageInterface {
  id: number;
  title: string;
  native: string;
  alias: string;
  status: number; 
  weight: number; 
  created: Date | null; 
  updated: Date | null; 
}