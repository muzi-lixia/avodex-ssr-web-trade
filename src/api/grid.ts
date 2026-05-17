import { Request } from "@az/base";
import store from "store";

const { AzAxios } = Request;
const BASE = "/grid/api/v1";

const withUid = () => {
  const uid = store.user.userInfo?.userIdStr;
  return uid ? { headers: { "X-User-Id": uid } } : {};
};

export interface SmartParamsRes {
  symbol: string;
  lower_price: string;
  upper_price: string;
  grid_count: number;
  current_price: string;
  bandwidth_pct: string;
  volatility_pct: string;
  algorithm: string;
  reasoning: string;
  sample_count: number;
}

export interface ProfitPreviewRes {
  per_grid_profit_pct: string;
  min_investment_usdt: string;
  fee_rate: string;
  grid_step: string;
}

export interface BalanceRes {
  asset: string;
  total_available: string;
  in_grid_pool: string;
  in_main_account: string;
  locked_in_running_bots: string;
  user_id: number;
}

export interface CreateBotReq {
  symbol: string;
  name: string;
  lower_price: string;
  upper_price: string;
  grid_count: number;
  investment_usdt: string;
}

export interface CreateBotRes {
  bot_id: string;
  status: string;
  symbol: string;
  grid_count: number;
  investment_usdt: string;
  open_price: string;
  message: string;
}

export interface BotListItem {
  bot_id: string;
  name: string;
  symbol: string;
  status: string;
  lower_price: string;
  upper_price: string;
  grid_count: number;
  init_investment: string;
  total_investment: string;
  locked_usdt: string;
  locked_base: string;
  realized_pnl_usdt: string;
  reinvest_enabled: boolean;
  open_price_usdt: string;
  cycle: number;
  created_at_ms: number;
  updated_at_ms: number;
  closed_at_ms?: number;
  close_reason?: string;
}

export interface BotListRes {
  list: BotListItem[];
  next_cursor: number;
  count: number;
}

export const post_smartParams = (body: { symbol: string; investment_usdt: string }) => AzAxios.post(`${BASE}/smart-params`, body) as Promise<SmartParamsRes>;

export const post_profitPreview = (body: { symbol: string; lower_price: string; upper_price: string; grid_count: number }) =>
  AzAxios.post(`${BASE}/profit-preview`, body) as Promise<ProfitPreviewRes>;

export const get_balance = (asset = "USDT") => AzAxios.get(`${BASE}/account/balance`, { params: { asset }, ...withUid() }) as Promise<BalanceRes>;

export const post_deposit = (body: { asset: string; amount: string }) => AzAxios.post(`${BASE}/balance/deposit`, body, withUid());

export const post_withdrawToMain = (body: { asset: string; amount: string }) => AzAxios.post(`${BASE}/balance/withdraw-to-main`, body, withUid());

export const post_createBot = (body: CreateBotReq) => AzAxios.post(`${BASE}/bots`, body, withUid()) as Promise<CreateBotRes>;

export const get_bots = (params?: { status?: string; limit?: number; cursor?: number }) =>
  AzAxios.get(`${BASE}/bots`, { params, ...withUid() }) as Promise<BotListRes>;

export const get_botsHistory = (params?: { limit?: number; cursor?: number }) =>
  AzAxios.get(`${BASE}/bots/history`, { params, ...withUid() }) as Promise<BotListRes>;

export const get_botOverview = (botId: string) => AzAxios.get(`${BASE}/bots/${botId}/overview`, withUid());

export const get_botHoldingDetail = (botId: string) => AzAxios.get(`${BASE}/bots/${botId}/holding-detail`, withUid());

export const get_botGridOrders = (botId: string) => AzAxios.get(`${BASE}/bots/${botId}/grid-orders`, withUid());

export const get_botParams = (botId: string) => AzAxios.get(`${BASE}/bots/${botId}/params`, withUid());

export const get_botTrades = (botId: string) => AzAxios.get(`${BASE}/bots/${botId}/trades`, withUid());

export const patch_botName = (botId: string, body: { name: string }) => AzAxios.patch(`${BASE}/bots/${botId}/name`, body, withUid());

export const post_botPause = (botId: string) => AzAxios.post(`${BASE}/bots/${botId}/pause`, undefined, withUid());

export const delete_bot = (botId: string, body?: { settlement_mode?: "auto_sell" | "keep_base"; slippage_bps?: number }) =>
  AzAxios({ method: "delete", url: `${BASE}/bots/${botId}`, data: body, ...withUid() });

export const post_botRangePreview = (botId: string, body: { lower_price: string; upper_price: string; grid_count: number }) =>
  AzAxios.post(`${BASE}/bots/${botId}/range/preview`, body, withUid());

export const post_botRangeApply = (botId: string, body: { lower_price: string; upper_price: string; grid_count: number }) =>
  AzAxios.post(`${BASE}/bots/${botId}/range/apply`, body, withUid());

export const post_botProfitWithdraw = (botId: string, body: { amount_usdt?: string }) => AzAxios.post(`${BASE}/bots/${botId}/profit/withdraw`, body, withUid());

export const post_botTpsl = (
  botId: string,
  body: {
    kind: "tp" | "sl";
    trigger_type: "price" | "amount" | "rate";
    trigger_value: string;
    settle_currency: "usdt" | "base_plus_usdt";
    delay_enabled?: boolean;
    delay_seconds?: number;
  }
) => AzAxios.post(`${BASE}/bots/${botId}/tpsl`, body, withUid());

export const post_botAddInvestment = (botId: string, body: { amount_usdt: string }) => AzAxios.post(`${BASE}/bots/${botId}/add-investment`, body, withUid());

export const get_health = () => AzAxios.get("/grid/health");
