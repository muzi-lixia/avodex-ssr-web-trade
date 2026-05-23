import { Request } from "@az/base";
import type { CustomAxiosRequestConfig } from "@az/base";
const { AzAxios } = Request;

export interface BotBalance {
  currency: string;
  available: string;
  frozen: string;
  total: string;
}

export function get_botBalances(config?: CustomAxiosRequestConfig): Promise<{ balances: BotBalance[] }> {
  return AzAxios.get("/api/bot/balances", config) as any;
}
