import { makeAutoObservable, observable } from "mobx";
import { get_openOrder } from "api/v4/order";
// import { get_accountOverview } from "api/old/exapi/lever";
import { get_nftPosition, get_leverBalance } from "api/v4/balance";
import { TradeSideEnum, TradeTypeEnum, TradeOrderStateEnum } from "store/trade";
import { TypeEnum } from "store/market";
import StoreMarket from "store/market";

export const ConvertCurrencyAry = [
  { key: "usd", note: "$", maxPrecision: 2 },
  { key: "btc", note: "฿", maxPrecision: 8 },
  { key: "inr", note: "₹", maxPrecision: 2 },
  { key: "idr", note: "Rp", maxPrecision: 2 },
  { key: "cny", note: "￥", maxPrecision: 2 },
  { key: "krw", note: "€", maxPrecision: 0 },
] as const;

export type ConvertCurrencyType = typeof ConvertCurrencyAry[number]["key"];

export interface BalancesProps {
  currency: string; //币种
  currencyId?: number; //币种ID
  frozenAmount?: string; //冻结数量
  availableAmount: string; //可用数量
  totalAmount?: string; //总数量
  convertBtcAmount?: string; //总数量，折算BTC数量
  convertUsdtAmount?: string; //总数量，折算USDT数量
}

export interface BalancesLeverCurrencyProps {
  currency: string;
  currencyId: number;
  frozenAmount: string; //冻结
  availableAmount: string; //可用数量
  totalAmount: string; //总数量
  loanAmount: string; //借款数量
  capitalAmount: string; //本金数量
  interestAmount: string; //未还利息利息数量
  updatedTime: number; //更新时间，毫秒
}
export interface BalancesLeverProps {
  symbol: string;
  symbolId: number;
  btcNetAmount: string; //折算BTC净资产
  btcLoanAmount: string; //折算BTC净资产
  usdtNetAmount: string;
  usdtLoanAmount: string;
  base: BalancesLeverCurrencyProps; //卖方币，btc
  quote: BalancesLeverCurrencyProps; //买方币，usdt
}

export enum AccountEnum {
  spot = "SPOT",
  lever = "LEVER",
  futures_u = "FUTURES_U",
  finance = "FINANCE",
}

/*
interface LeverAccountOverviewCoinProps {
  tradeFreezeAmount: string;
  tradeAmount: string;
  hasLoanAmount: string; //已借
  interestAmount: string; //利息
}
interface LeverAccountOverviewProps {
  marketName: string;
  liquidationPrice: string; //爆仓价
  sellCoin: LeverAccountOverviewCoinProps;
  buyCoin: LeverAccountOverviewCoinProps;
}
 */

export interface OpenOrderProps {
  symbol: string;
  orderId: string; //订单号
  time: number;
  updatedTime: number;
  type: TradeTypeEnum; //交易类型
  side: TradeSideEnum; //交易方向
  price: string;
  origQty: string; //原始数量
  origQuoteQty: string; //原始金额
  tradeBase: string; //成交数量
}

export interface WsOrderProps {
  s: string; // symbol 交易对
  i: string; // orderId 订单号
  t: number; // time 发⽣时间
  ct: number; // createTime 下单时间
  tp: TradeTypeEnum; //type 类型 LIMIT/MARKET
  sd: TradeSideEnum; // side 方向 BUY/SELL
  p: string; //price 价格
  oq: string; //origQty 原始数量
  oqq: string; //origQuoteQty 原始金额
  eq: string; // executedQty 已执⾏数量
  //
  st: TradeOrderStateEnum; // state 状态
  bt: TypeEnum; //市场 SPOT/LEVER
  lq: string; // leavingQty 待执行数量
  ci: string; // clientOrderId 客户端订单号
  ap: string; // avg price 均价
  f: string; // fee 手续费
}

export interface WsBalanceProps {
  z: string; //bizType 业务类型[SPOT,LEVER]
  s: string; //symbol 交易市场
  c: string; //currency 币种
  b: string; //balance 全部现货资产
  f: string; //frozen 冻结资产
  a: string; //accountId 账号
  t: number; //time 发⽣时间
  i?: string; //interest，利息，杠杆
  p?: string; //capital，本金数量，杠杆
  l?: string; //loan，借款数量，杠杆
}

export enum NftStatusEnum {
  available = "AVAILABLE",
  frozen = "FROZEN",
}
export interface NftPositionProps {
  nftId: string; //序列号
  currencyId: number; //币种id
  currency: string; //币种名称，BTCsn
  amount: string; //数量
  createdTime: number; //创建时间戳
  status: NftStatusEnum; //状态, AVAILABLE, FROZEN
}

interface StateProps {
  convertCurrency: ConvertCurrencyType;
  currencyQuantity: WithUndefined<BalancesProps | BalancesLeverCurrencyProps | null>;
  currencyPrice: WithUndefined<BalancesProps | BalancesLeverCurrencyProps | null>;
  currentLeverBalance: WithUndefined<BalancesLeverProps>;
  // leverAccountOverview: WithUndefined<LeverAccountOverviewProps>;
  openOrder: WithUndefined<OpenOrderProps[] | null>;
  wsOrder: WithUndefined<WsOrderProps>;
  wsBalance: WithUndefined<WsBalanceProps>;
  nftPosition: WithUndefined<NftPositionProps[] | null>;
}

let CancelFun_getOpenOrder, CancelFun_getNftPosition, CancelFun_getCurrentLeverBalance;

const balances = makeAutoObservable(
  {
    convertCurrency: "usd" as StateProps["convertCurrency"], //折算货币
    currencyQuantity: undefined as StateProps["currencyQuantity"], //当前市场，用户数量币资产，null表示没有资产，undefined表示未赋值
    currencyPrice: undefined as StateProps["currencyPrice"], //当前市场，用户价格币资产，null表示没有资产，undefined表示未赋值
    currentLeverBalance: undefined as StateProps["currentLeverBalance"], //杠杆资产，当前市场
    // leverAccountOverview: undefined as StateProps["leverAccountOverview"], //杠杆资产概览，当前市场
    openOrder: undefined as StateProps["openOrder"], //现货或杠杆，当前委托，可能包含其他交易对，null表示没有资产，undefined表示未赋值
    wsOrder: undefined as StateProps["wsOrder"], //ws订单推送数据
    wsBalance: undefined as StateProps["wsBalance"], //ws余额推送数据
    nftPosition: undefined as StateProps["nftPosition"], //当前 nft 币种，资产持仓数据，null表示没有资产，undefined表示未赋值

    get convertCurrencyCfg() {
      return ConvertCurrencyAry.find((obj) => obj.key === this.convertCurrency);
    },

    updateState(payload: Partial<StateProps>) {
      for (let va in payload) {
        this[va] = payload[va];
      }
    },
    //
    // getAccountOverview(marketName: string) {
    //   get_accountOverview(marketName).then((data: StateProps["leverAccountOverview"]) => {
    //     this.leverAccountOverview = data;
    //   });
    // },

    getOpenOrder(config?) {
      try {
        CancelFun_getOpenOrder && CancelFun_getOpenOrder();
      } catch (e) {
        //empty
        CancelFun_getOpenOrder = null;
      }
      return get_openOrder({
        ...(config || {
          params: {
            bizType: StoreMarket.type,
          },
        }),
        cancelFun: (c) => (CancelFun_getOpenOrder = c),
      })
        .then((data) => {
          this.openOrder = data;
        })
        .catch(() => {
          this.openOrder = null;
        })
        .finally(() => {
          CancelFun_getOpenOrder = null;
        });
    },
    getNftPosition(config?) {
      try {
        CancelFun_getNftPosition && CancelFun_getNftPosition();
      } catch (e) {
        //empty
        CancelFun_getNftPosition = null;
      }
      if (!StoreMarket.currentNftCoin) return;
      const currency = StoreMarket.currentNftCoin;
      return get_nftPosition({
        ...(config || {
          params: {
            currency,
          },
        }),
        cancelFun: (c) => (CancelFun_getNftPosition = c),
      })
        .then((data) => {
          if (StoreMarket.currentNftCoin !== currency) return;
          this.nftPosition = data;
        })
        .catch(() => {
          this.nftPosition = null;
        })
        .finally(() => {
          CancelFun_getNftPosition = null;
        });
    },
    getCurrentLeverBalance(config?) {
      try {
        CancelFun_getCurrentLeverBalance && CancelFun_getCurrentLeverBalance();
      } catch (e) {
        //empty
        CancelFun_getCurrentLeverBalance = null;
      }
      return get_leverBalance({
        ...(config || {
          params: {
            symbol: StoreMarket.name,
          },
        }),
        cancelFun: (c) => (CancelFun_getCurrentLeverBalance = c),
      })
        .then((data: BalancesLeverProps) => {
          if (!StoreMarket.isLever || StoreMarket.name !== data.symbol) return;
          this.currentLeverBalance = data;
          !this.currencyQuantity && (this.currencyQuantity = data.base);
          !this.currencyPrice && (this.currencyPrice = data.quote);
        })
        .finally(() => {
          CancelFun_getCurrentLeverBalance = null;
        });
    }, //获取当前杠杆市场的资产
  },
  {},
  {
    autoBind: true,
    deep: false,
  }
);

export default balances;
