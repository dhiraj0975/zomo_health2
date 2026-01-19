export interface ClientDetails {
  client_ip: string | null;
  client_type: string | null;
  client_name: string | null;
  client_version: string | null;
  os_name: string | null;
  os_version: string | null;
}

export interface UserJwtDetails {
  id: number;
  roleId: number;
  userLoginId: number;
}
