import { Request } from "@az/base";
const { AzAxios4 } = Request;

const URL = "/";

//判断U本位合约是否开通
export function get_fapiAccountOpen(config?) {
  return AzAxios4.get(URL + `fapi/user/v1/compat/account/open`, config);
}

//U本位合约可划转币种列表
export function get_fapiCoins(config?) {
  return AzAxios4.get(URL + `fapi/user/v1/public/compat/coins`, config);
}

//U本位合约获取资产列表
export function get_fapiBalanceList(config?) {
  return AzAxios4.get(URL + `fapi/user/v1/compat/balance/list`, config);
}
