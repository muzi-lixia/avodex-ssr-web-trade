import { makeAutoObservable, observable } from "mobx";
import Storage from "utils/storage";
import StoreCurrency from "store/currency";
import { get_symbol, get_plate, get_symbolFeeRate, get_leverSymbol, get_etf_list, get_net_worth, get_symbolStList } from "api/v4/market";
// import { get_marketConfig } from "api/old/exapi/lever";
import { get_marketTips, get_searchMarketHot } from "api/old/app";
import { post_getEtfByTradeMarket } from "api/old/redemption";
import { get_fapiSymbolList } from "api/old/futures";
import { get_fapiAccountOpen, get_fapiCoins } from "api/v4/futures";

export interface SymbolFilterProps {
  filter: "PRICE" | "QUANTITY";
  max: string;
  min: string;
  tickSize: string;
}

export interface SymbolProps extends ObjAny {
  id: number; //市场id
  symbol: string; //市场名称
  isBlack: boolean; //是否黑名单交易对
  quantityPrecision: number; //卖方币市场精度
  pricePrecision: number; //买方币市场精度
  plates: number[]; //板块列表id
  state: string; //交易对状态[ONLINE=上线的;OFFLINE=下线的,DELISTED=退市]
  nextState: null | string; //下一个状态
  nextStateTime: null | number; //下一个状态时间
  displayLevel: string; //展示级别,[FULL=完全展示,SEARCH=搜索展示,DIRECT=直达展示,NONE=不展示]
  tradingEnabled: boolean; //是否启动交易(暂停交易)
  displayWeight: number; //展示权重，越大越靠前
  depthMergePrecision: number; //深度合并精度
  type: string; //类型 nft | normal
  filters?: SymbolFilterProps[]; //过滤器
}
type DisplayLevel = "FULL" | "SEARCH" | "DIRECT" | "NONE";

export interface LeverSymbolProps extends ObjAny {
  // marketName: string; //市场名称
  symbol: string; //市场名称
  maxLeverage: number; //最大杠杆倍数
  maxLoanAmountBuy: string; //买方币种最大可借
  maxLoanAmountSell: string; //卖方币种最大可借
  liquidationRate: string; //爆仓风险率，市场风险率
  tipsRate: string; //提醒系数，预警风险率
  dailyInterestRate: string; //日利率
}

export interface FuturesSymbolProps extends ObjAny {
  symbol: string; //交易对名称
}

export interface EtfConfigDataProps {
  id: number;
  multiple: number;
  dealPair: string;
}

interface EtfConfigProps {
  data: EtfConfigDataProps[];
}

interface TipsProps extends ObjAny {
  tipsType: number;
  content: string;
  link?: string;
}

interface PlateProps {
  id: string;
  plate: string;
}

export enum TypeEnum {
  spot = "SPOT", //现货
  lever = "LEVER", //杠杆
}

export interface IEtfDealPairItemProps {
  coinVol: number;
  dealPairName: string;
  name: string;
  high: number;
  low: number;
  moneyVol: number;
  multiple: number;
  price: number;
  rate: number;
}

interface FeeRateProps {
  takerFeeRate: number;
  makerFeeRate: number;
}

export interface EtfProps {
  symbol: string;
  maxLeverage: number;
  baseCurrency: string;
  direction: string;
  instruction: string;
  managementRate: string;
  initialNetWorth: string;
  latestNetWorth: string;
  logo: string;
}

interface SearchMarketHotProps {
  marketName: string;
  type: number; //1.现货 4.杠杆 8.全币种合约 10.币本位合约 11.U本位合约
}

interface StateProps {
  name: string;
  type: TypeEnum;
  tips: ObjT<TipsProps>;
  symbols: WithUndefined<SymbolProps[]>;
  leverConfigAry: WithUndefined<LeverSymbolProps[]>;
  etfConfig: WithUndefined<ObjT<EtfConfigProps>>;
  plateList: PlateProps[];
  netWorth: string;
  etfDealPairListData: IEtfDealPairItemProps[];
  isFuturesUsdtOpen: WithUndefined<boolean>;
  futuresUsdtTransferList: WithUndefined<string[]>;
  futuresUsdtConfigAry: WithUndefined<FuturesSymbolProps[]>;
  feeRate: ObjT<FeeRateProps>;
  etfList?: EtfProps[]; //etf交易对列表
  etfListBase?: EtfProps[]; //etf单个配置
  searchMarketHot: WithUndefined<SearchMarketHotProps[]>;
  symbolStList: number[];
}

let loading_getMarketConfig = false;
let TimeoutFun_loopGetMarketConfig, CancelFun_loopGetMarketConfig;

const market = makeAutoObservable(
  {
    name: "" as StateProps["name"], //当前市场名称
    type: TypeEnum.spot as StateProps["type"], //当前市场类型，spot=现货，lever=杠杆
    tips: {} as ObjT<TipsProps>, //所有市场风险提示信息
    symbols: undefined as StateProps["symbols"], //所有市场配置信息，数组
    leverConfigAry: undefined as StateProps["leverConfigAry"], //杠杆所有市场配置信息，数组
    etfConfig: undefined as StateProps["etfConfig"], //现货市场对应的etf市场对象
    plateList: [] as StateProps["plateList"], //板块列表
    netWorth: "" as StateProps["netWorth"], //etf当前市场，通证净值
    etfDealPairListData: [] as StateProps["etfDealPairListData"], //etf交易对数据
    isFuturesUsdtOpen: undefined as StateProps["isFuturesUsdtOpen"], //判断U本位合约是否开通
    futuresUsdtTransferList: undefined as StateProps["futuresUsdtTransferList"], //U本位合约可划转币种列表
    futuresUsdtConfigAry: undefined as StateProps["futuresUsdtConfigAry"], //U本位合约所有市场配置信息，数组
    feeRate: {} as StateProps["feeRate"], //缓存所有市场的费率
    etfList: undefined as StateProps["etfList"], //etf交易对列表，数组
    etfListBase: undefined as StateProps["etfListBase"], //etf单个配置，数组
    searchMarketHot: undefined as StateProps["searchMarketHot"], //热门搜索市场列表
    symbolStList: [] as StateProps["symbolStList"], //被st标签标记的交易对列表

    get config(): WithUndefined<ObjT<SymbolProps>> {
      if (!this.symbols) return;
      const doc: ObjT<SymbolProps> = {};
      this.symbols.map((obj: any) => (doc[obj.symbol] = obj));
      return doc;
    }, //所有市场配置信息，对象
    get currentConfig(): Partial<SymbolProps> {
      if (!this.name || !this.config) return {};
      return this.config[this.name] || {};
    }, //当前市场配置信息
    get leverConfigObj(): WithUndefined<ObjT<LeverSymbolProps>> {
      if (!this.leverConfigAry) return;
      const doc: ObjT<LeverSymbolProps> = {};
      this.leverConfigAry.map((obj: any) => (doc[obj.symbol] = obj));
      return doc;
    }, //杠杆所有市场配置信息，对象
    get currentLeverConfig(): Partial<LeverSymbolProps> {
      if (!this.leverConfigObj || !this.leverConfigObj[this.name]) return {};
      return this.leverConfigObj[this.name];
    }, //当前杠杆市场配置信息
    get isLever(): boolean {
      return this.type === TypeEnum.lever;
    }, //是否是杠杆市场
    get isEtf(): boolean {
      if (!this.name || !this.config) return false;
      const cfg = this.config[this.name];
      if (!cfg) return false;
      return this.isEtfSymbolFnNew(cfg.symbol);
    }, //当前市场是否是 etf 市场
    get isNft(): boolean {
      return this.currentConfig.type === "nft";
    }, //当前市场是否是 nft 市场
    get currentNftCoin(): string {
      if (!this.isNft) return "";
      if (!StoreCurrency.currencyObj) return "";
      const [baseCurrency, quoteCurrency] = this.name.split("_");
      if (StoreCurrency.currencyObj[baseCurrency] && StoreCurrency.currencyObj[baseCurrency].type === "NFT") return baseCurrency;
      if (StoreCurrency.currencyObj[quoteCurrency] && StoreCurrency.currencyObj[quoteCurrency].type === "NFT") return quoteCurrency;
      return "";
    }, //当前 nft 币种
    get etfConfigObj(): WithUndefined<ObjT<EtfProps>> {
      if (!this.etfList) return;
      const doc: ObjT<EtfProps> = {};
      this.etfList.map((item: any) => (doc[item.symbol] = item));
      return doc;
    }, //ETF所有市场配置信息，对象
    get searchMarketHotSpot(): string[] {
      if (!this.searchMarketHot) return [];
      const ary: string[] = [];
      this.searchMarketHot.map((obj) => {
        if ([1, 4].includes(obj.type) && !ary.includes(obj.marketName)) {
          //1.现货 4.杠杆 8.全币种合约 10.币本位合约 11.U本位合约
          ary.push(obj.marketName);
        }
      });
      return ary;
    }, //热门搜索市场列表-现货和杠杆

    updateState(payload: Partial<StateProps>) {
      for (const va in payload) {
        this[va] = payload[va];
      }
    },
    updateStateOnce(payload: Partial<StateProps>) {
      for (const va in payload) {
        if (!this[va]) this[va] = payload[va];
      }
    },
    formatName(symbol: string): string {
      // !symbol && (symbol = this.name);
      // return symbol.split("_").join("/").toUpperCase();

      return symbol
        .split("_")
        .map((coin) => StoreCurrency.getCurrencyDisplayName(coin))
        .join("/");
    }, //对市场名称进行格式化，btc_usdt -> BTC/USDT
    //
    getMarketConfig() {
      if (loading_getMarketConfig) return;
      loading_getMarketConfig = true;

      const { version, symbols } = Storage.get("symbols") || {};
      // this.symbols = symbols;

      get_symbol({
        params: {
          version,
        },
      })
        .then((data) => {
          if (data.symbols && data.version !== version) {
            console.log("【getSymbol update】", data);
            this.symbols = data.symbols;
            // this.symbols = data.symbols;
            Storage.set("symbols", data);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!this.symbols) this.symbols = symbols;
          // mock avo_usdt for local testing
          if (this.symbols && !this.symbols.find((s: any) => s.symbol === "avo_usdt")) {
            this.symbols = [
              ...this.symbols,
              {
                id: 99999,
                symbol: "avo_usdt",
                quantityPrecision: 2,
                pricePrecision: 4,
                plates: [],
                state: "OFFLINE",
                nextState: "ONLINE",
                nextStateTime: new Date("2026-07-01T00:00:00+08:00").getTime(),
                displayLevel: "FULL",
                tradingEnabled: true,
                displayWeight: 99999,
                depthMergePrecision: 4,
                type: "normal",
              },
            ];
          }
          loading_getMarketConfig = false;
        });
    }, //获取所有市场
    loopGetMarketConfig() {
      clearTimeout(TimeoutFun_loopGetMarketConfig);
      try {
        CancelFun_loopGetMarketConfig && CancelFun_loopGetMarketConfig();
      } catch (e) {
        CancelFun_loopGetMarketConfig = null;
      }

      const { version, symbols } = Storage.get("symbols") || {};

      get_symbol({
        params: {
          version,
        },
        cancelFun: (c) => (CancelFun_loopGetMarketConfig = c),
      })
        .then((data) => {
          if (data.symbols && data.version !== version) {
            console.log("【getSymbol update】", data);
            this.symbols = data.symbols;
            // this.symbols = data.symbols;
            Storage.set("symbols", data);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!this.symbols) this.symbols = symbols;
          // mock avo_usdt for local testing
          if (this.symbols && !this.symbols.find((s: any) => s.symbol === "avo_usdt")) {
            this.symbols = [
              ...this.symbols,
              {
                id: 99999,
                symbol: "avo_usdt",
                quantityPrecision: 2,
                pricePrecision: 4,
                plates: [],
                state: "OFFLINE",
                nextState: "ONLINE",
                nextStateTime: new Date("2026-07-01T00:00:00+08:00").getTime(),
                displayLevel: "FULL",
                tradingEnabled: true,
                displayWeight: 99999,
                depthMergePrecision: 4,
                type: "normal",
              },
            ];
          }
          CancelFun_loopGetMarketConfig = null;
          clearTimeout(TimeoutFun_loopGetMarketConfig);
          TimeoutFun_loopGetMarketConfig = setTimeout(() => {
            this.loopGetMarketConfig();
          }, 3e3);
        });
    }, //轮询获取所有市场
    getLeverMarketConfig(finallyFun?: () => void) {
      get_leverSymbol()
        .then((data: StateProps["leverConfigAry"]) => {
          this.leverConfigAry = data;
        })
        .finally(finallyFun);
    }, //获取杠杆所有市场
    getFapiSymbolList() {
      get_fapiSymbolList().then((data) => {
        this.futuresUsdtConfigAry = data;
      });
    }, //获取U本位合约市场列表
    getEtfByTradeMarket() {
      post_getEtfByTradeMarket({ data: { pairs: [] } }).then((data) => {
        const etfConfig = {};
        data.map(({ marketName, data }) => {
          etfConfig[marketName] = { data };
        });
        this.etfConfig = etfConfig;
      });
    }, //获取现货市场对应的etf所有市场
    getMarketTips() {
      get_marketTips().then((data) => {
        const obj = {};
        data.map((doc) => {
          obj[doc.marketId + ""] = doc;
        });
        this.tips = obj;
      });
    }, //获取市场风险提示信息
    getPlateList() {
      get_plate().then((data) => {
        this.plateList = data;
      });
    }, //获取板块列表
    isEtfSymbolFn(symbolCfg: SymbolProps) {
      if (symbolCfg.plates && symbolCfg.plates.includes(145)) return true;
      return false;
    }, //判断是否是etf市场
    isEtfSymbolFnNew(symbol: string) {
      const marketEtfConfig: string[] = [];
      this.etfList?.map((item) => {
        marketEtfConfig.push(item.symbol);
      });
      return marketEtfConfig.includes(symbol);
    }, //判断是否是etf市场(新)
    isMarketVisibleByDisplayLevel(displayLevel?: string, { allowSearch = true }: { allowSearch?: boolean } = {}): boolean {
      if (!displayLevel) return false;
      const level = displayLevel as DisplayLevel;
      if (allowSearch) return level === "FULL" || level === "SEARCH";
      return level === "FULL";
    }, //判断展示级别是否可见
    isMarketVisible(symbolCfg?: ObjAny | SymbolProps, { allowSearch = true }: { allowSearch?: boolean } = {}): boolean {
      if (!symbolCfg || symbolCfg.state === "DELISTED") return false;
      return this.isMarketVisibleByDisplayLevel(symbolCfg.displayLevel, { allowSearch });
    }, //判断市场是否可见（统一过滤 NONE/DELISTED）
    isMarketOpenFn(symbolCfg: ObjAny | SymbolProps, { server, local }): boolean {
      const { state, nextState, nextStateTime } = symbolCfg;
      if (state === "ONLINE") return true;
      if (state === "OFFLINE" && nextState === "ONLINE") {
        if (!nextStateTime || !server) return true;
        return server + (Date.now() - local) - nextStateTime > 0;
      }
      return true;
    }, //判断当前市场，是否已开盘的函数
    getFapiAccountOpen(finallyFun?: () => void) {
      if (this.isFuturesUsdtOpen) return finallyFun && finallyFun();
      get_fapiAccountOpen()
        .then((result) => {
          this.isFuturesUsdtOpen = result;
        })
        .finally(finallyFun);
    }, //判断U本位合约是否开通
    getFapiCoins(finallyFun?: () => void) {
      get_fapiCoins()
        .then((result) => {
          this.futuresUsdtTransferList = result;
        })
        .finally(finallyFun);
    }, //U本位合约可划转币种列表
    getSymbolFeeRate(name?) {
      const symbol = name || this.name;
      if (this.feeRate[symbol]) return;
      console.log("symbol====", symbol, this.name);
      get_symbolFeeRate({
        params: { symbol },
      }).then((result) => {
        const feeRate = { ...this.feeRate };
        feeRate[symbol] = result;
        this.feeRate = feeRate;
      });
    }, //获取交易对市场费率
    getEtfList(finallyFun?: () => void) {
      get_etf_list()
        .then((res) => {
          this.etfList = res;
        })
        .finally(finallyFun);
    }, // 获取etf交易对列表
    getEtfListBase(finallyFun?: () => void) {
      get_etf_list({ params: { baseCurrency: this.currentConfig.baseCurrency } })
        .then((res) => {
          this.etfListBase = res;
        })
        .finally(finallyFun);
    }, // 获取单个etf配置
    getEtfWorth(finallyFun?: () => void) {
      get_net_worth(this.currentConfig.id)
        .then((res) => {
          this.netWorth = res?.n;
        })
        .finally(finallyFun);
    }, // 获取
    getSearchMarketHot(finallyFun?: () => void) {
      if (this.searchMarketHot) return finallyFun && finallyFun();
      get_searchMarketHot()
        .then((data) => {
          this.searchMarketHot = data;
        })
        .finally(finallyFun);
    }, //获取热门搜索市场列表
    getSymbolStList(finallyFun?: () => void) {
      get_symbolStList()
        .then((data) => {
          this.symbolStList = data;
        })
        .finally(finallyFun);
    }, //获取被st标签标记的交易对列表
  },
  {},
  {
    autoBind: true,
    deep: false,
  }
);

export default market;
