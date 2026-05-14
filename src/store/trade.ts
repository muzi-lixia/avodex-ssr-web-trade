import { makeAutoObservable, observable } from "mobx";
import Storage from "utils/storage";
import { get_ticker24h } from "api/v4/market";
import { AppModalTransferProps } from "@az/Transfer";
import { AppModalBorrowRepayProps } from "components/app/modal/borrowRepay";
import { AppModalSubscribeRedeemProps } from "components/app/modal/subscribeRedeem";
import { AppModalRiskTipProps } from "components/app/modal/riskTip";
import StoreMarket from "store/market";

export enum TradeSideEnum { //交易方向
  sell = "SELL",
  buy = "BUY",
}

export enum TradeTypeEnum { //交易类型
  limit = "LIMIT",
  market = "MARKET",
  stopLimit = "ENTRUST_PROFIT",
  trailingStop = "ENTRUST_TRACK",
}

export enum TradePanelEnum { //右侧面板顶层 Tab：现货 / AI 智能交易
  spot = "SPOT",
  aiTrading = "AI_TRADING",
}

export enum TradeOrderStateEnum { //交易订单状态
  NEW = "NEW", //新建 -  资金冻结成功之后的状态，此时还未提交到撮合。
  PLACED = "PLACED", //已委托 - 订单成功的挂在了订单簿上
  PARTIALLY_FILLED = "PARTIALLY_FILLED", //部分成交
  //----------   以下状态为撮合后状态，也有 部分成交 状态  -------------
  FILLED = "FILLED", //完全成交
  CANCELED = "CANCELED", //用户撤单
  REJECTED = "REJECTED", //拒单 - 订单到撮合后，由于一些原因被撮合拒绝。
  //---------- 以下状态废弃 ----------
  EXPIRED = "EXPIRED", //过期(time_in_force撤单或溢价撤单)
}

export enum LayoutAdvancedActiveKeyEnum {
  order = "order", //委托信息
  trade = "trade", //最新成交
}

export enum LayoutH5ActiveKeyEnum {
  chart = "chart", //图表
  order = "order", //委托信息
  trade = "trade", //最新成交
}

//全部市场行情
export interface TickerProps {
  s: string; //市场名称, btc_usdt
  c?: string; //当前价格, 100.000
  cr?: string; //涨跌幅 0.0582 -> 5.8%
  cv?: string; //价格变动值
  h?: string; //24H最高价 25891.63
  l?: string; //24H最低价 24188.76
  q?: string; //24H成交数量 btc
  v?: string; //24H成交金额 usdt
}

//最新成交价
export interface TradeRecentProps {
  b: boolean; //是否是买入
  i: number; //交易ID(用于精确排序)
  p: string; //成交价
  q: string; //成交量
  t: number; //成交时间毫秒
  v: string; //成交额
  s: string; //市场名称, btc_usdt
}

interface TradeRecentOnceProps extends ObjAny {
  p: string; //成交价
  q: string; //成交量
  total?: string; //累计
  isClick?: boolean; //是否是点击
}

//export type DepthAryProps = Array<Array<string>>; //["27024.70", "3.270777", "100", "300493111417952192"] 价格，数量，累计，nft序列号?
export type DepthAryItemProps = [
  string, //价格，"27024.70"
  string, //数量，"3.270777"
  {
    totalAmount: string; //累计数量，未精度控制
    value: string; //价格*数量，未精度控制，最终产品要求精度固定6位
    totalValue: string; //累计(价格*数量)，未精度控制，最终产品要求精度固定6位
    nft?: string; //nft序列号，"300493111417952192"
  }
];
export type DepthAryProps = Array<DepthAryItemProps>;

// interface LeverWsLiquidationRateProps extends ObjAny {
//   marketName: string; //市场名称
//   liquidationRate: string; //爆仓风险率
// }

export interface SearchHistoryItemProps {
  symbol: string;
  isLever?: boolean;
  tag?: string;
}

interface StateProps {
  tickers: TickerProps[];
  tradeRecent: WithUndefined<TradeRecentProps | null>;
  tradeRecentOnce: WithUndefined<TradeRecentOnceProps | null>;
  depthAsks: WithUndefined<DepthAryProps>;
  depthBids: WithUndefined<DepthAryProps>;
  isMaintainTip: boolean;
  // leverWsLiquidationRate: WithUndefined<LeverWsLiquidationRateProps>;
  //
  modalTransfer: WithUndefined<AppModalTransferProps>;
  modalBorrowRepay: WithUndefined<AppModalBorrowRepayProps>;
  modalSubscribeRedeem: WithUndefined<AppModalSubscribeRedeemProps>;
  modalRiskTip: WithUndefined<AppModalRiskTipProps>;
  //
  layoutAdvancedActiveKey: LayoutAdvancedActiveKeyEnum;
  layoutH5ActiveKey: LayoutH5ActiveKeyEnum;
  //
  orderConfirm_limit: boolean;
  orderConfirm_market: boolean;
  orderConfirm_stopLimit: boolean;
  orderConfirm_trailingStop: boolean;
  //
  searchHistory: SearchHistoryItemProps[];
  isDepthShowTotalPrice: boolean;
}

let loading_getTicker24h = false;
let callback_getTicker24h: any[] = [];

const trade = makeAutoObservable(
  {
    tickers: [] as StateProps["tickers"], //全部市场行情
    tradeRecent: undefined as StateProps["tradeRecent"], //最新成交价，实时变动，null表示没有最新成交，undefined表示未赋值
    tradeRecentOnce: undefined as StateProps["tradeRecentOnce"], //最新成交价，首次变动，null表示没有最新成交，undefined表示未赋值
    depthAsks: undefined as StateProps["depthAsks"], //卖盘，从大到小排序，undefined表示初始化未赋值
    depthBids: undefined as StateProps["depthBids"], //买盘，从大到小排序，undefined表示初始化未赋值
    isMaintainTip: false as StateProps["isMaintainTip"], //是否有维护提示语
    // leverWsLiquidationRate: undefined as StateProps["leverWsLiquidationRate"], //杠杆市场ws爆仓风险率
    //modal
    modalTransfer: undefined as StateProps["modalTransfer"], //划转对话框
    modalBorrowRepay: undefined as StateProps["modalBorrowRepay"], //借款还款对话框
    modalSubscribeRedeem: undefined as StateProps["modalSubscribeRedeem"], //申购赎回对话框
    modalRiskTip: undefined as StateProps["modalRiskTip"], //风险提示对话框
    //layout布局参数
    layoutAdvancedActiveKey: LayoutAdvancedActiveKeyEnum.order as StateProps["layoutAdvancedActiveKey"], //专业版视图激活的tab
    layoutH5ActiveKey: LayoutH5ActiveKeyEnum.chart as StateProps["layoutH5ActiveKey"], //H5视图激活的tab
    //下单确认
    orderConfirm_limit: true as StateProps["orderConfirm_limit"], //限价单确认对话框
    orderConfirm_market: true as StateProps["orderConfirm_market"], //市价单确认对话框
    orderConfirm_stopLimit: true as StateProps["orderConfirm_stopLimit"], //止盈止损确认对话框
    orderConfirm_trailingStop: true as StateProps["orderConfirm_trailingStop"], //跟踪委托确认对话框
    //搜索历史
    searchHistory: [] as StateProps["searchHistory"], //搜索历史
    isDepthShowTotalPrice: false as StateProps["isDepthShowTotalPrice"], //盘口深度是否显示累计价格

    updateState(payload: Partial<StateProps>) {
      for (const va in payload) {
        this[va] = payload[va];
      }
    },
    //
    getTicker24h(finallyFun?: () => void) {
      if (loading_getTicker24h) {
        finallyFun && callback_getTicker24h.push(finallyFun);
        return;
      }
      loading_getTicker24h = true;
      finallyFun && callback_getTicker24h.push(finallyFun);
      let resData: TickerProps[] = [];
      get_ticker24h()
        .then((data) => (resData = data))
        .finally(() => {
          let ary: TickerProps[] = [];
          if (StoreMarket.config) {
            const resObj = resData.reduce((obj, item) => {
              obj[item.s] = item;
              return obj;
            }, {});
            let doc: TickerProps;
            for (const va in StoreMarket.config) {
              // doc = resData.find((obj) => obj.s === va) || { s: va };
              doc = resObj[va] || { s: va };
              ary.push(doc);
            }
          } else {
            ary = resData;
          }
          this.tickers = ary;

          loading_getTicker24h = false;
          callback_getTicker24h.forEach((fun) => fun());
          callback_getTicker24h = [];
        });
    }, //获取全部市场24h行情
    initOrderConfirm() {
      this.orderConfirm_limit = (() => {
        const orderConfirm_limit = Storage.get("orderConfirm_limit");
        return orderConfirm_limit !== false;
      })();
      this.orderConfirm_market = (() => {
        const orderConfirm_market = Storage.get("orderConfirm_market");
        return orderConfirm_market !== false;
      })();
      this.orderConfirm_stopLimit = (() => {
        const orderConfirm_stopLimit = Storage.get("orderConfirm_stopLimit");
        return orderConfirm_stopLimit !== false;
      })();
      this.orderConfirm_trailingStop = (() => {
        const orderConfirm_trailingStop = Storage.get("orderConfirm_trailingStop");
        return orderConfirm_trailingStop !== false;
      })();
    },
    initSearchHistory() {
      if (this.searchHistory.length) return;
      const ary = Storage.get("searchHistory");
      if (!ary || !ary.length) return;
      this.searchHistory = ary;
    },
    setSearchHistory(doc?: SearchHistoryItemProps) {
      const ary = doc
        ? (() => {
            const searchHistory = [...this.searchHistory];
            const index = searchHistory.findIndex((obj) => obj.symbol === doc.symbol && obj.isLever == doc.isLever);
            if (index >= 0) {
              searchHistory.splice(index, 1);
            }
            return [doc, ...searchHistory].slice(0, 10);
          })()
        : [];
      this.searchHistory = ary;
      Storage.set("searchHistory", ary);
    },
  },
  {},
  {
    autoBind: true,
    deep: false,
  }
);

export default trade;
