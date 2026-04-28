import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks, Util } from "@az/base";
import store from "store";
import { thousands } from "utils/method";
import { post_balanceTransfer } from "api/v4/fund";

import { Modal, ModalProps } from "antd";
import AzSvg from "components/az/svg";
import AzLoading from "components/az/loading";
import AppInputNumber from "components/app/input/number";
import DropdownAccount from "./dropdownAccount";
import DropdownCurrency, { DropdownCurrencyItemProps } from "./dropdownCurrency";
import Lever from "./lever";
import useApiReqBalances from "./useApiReqBalances";
import useAllAccCurrencyObj from "./useAllAccCurrencyObj";
import useHandleOpen from "./useHandleOpen";
import SvgClose from "assets/icon-svg/close2.svg";
import SvgIcon from "@az/SvgIcon";

import styles from "./index.module.scss";

import { AccountEnum, BalancesLeverCurrencyProps, BalancesProps } from "store/balances";

const { useTranslation } = Hooks;
const { Big } = Util;

export interface FormatBalancesProps extends BalancesProps {
  convertAmount: string; //可用资产折合
  convertAmountStr: string; //可用资产折合带千分位符号和单位
}

export interface FormatBalancesLeverCurrencyProps extends BalancesLeverCurrencyProps {
  convertAmount: string; //可用资产折合
  convertAmountStr: string; //可用资产折合带千分位符号和单位
}

export interface FormatBalancesLeverProps {
  symbol: string;
  symbolId: number;
  btcNetAmount: string;
  btcLoanAmount: string;
  usdtNetAmount: string;
  usdtLoanAmount: string;
  base: FormatBalancesLeverCurrencyProps;
  quote: FormatBalancesLeverCurrencyProps;
}

export interface AppModalTransferProps extends ModalProps {
  accountFrom?: AccountEnum;
  accountTo?: AccountEnum;
  currency?: string;
  leverSymbol?: string; //杠杆市场交易对
  successCallback?: () => void;
  //
  open?: boolean;
}

interface Props extends AppModalTransferProps {
  updateProps: (obj: Omit<AppModalTransferProps, "updateProps">) => void;
}

const AppModalTransfer: React.FC<Props> = ({ open, accountFrom, accountTo, currency = "usdt", leverSymbol, successCallback, updateProps, ...rest }) => {
  const t = useTranslation();
  const { isSubAcc } = store.user;
  const { isFuturesUsdtOpen, futuresUsdtTransferList, leverConfigAry } = store.market;
  const { currencyObj } = store.currency;
  const { convertCurrency } = store.balances;

  const apiReqBalances = useApiReqBalances();
  const allAccCurrencyObj = useAllAccCurrencyObj();

  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [accFrom, setAccFrom] = useState<AccountEnum>(); //从账户
  const [accTo, setAccTo] = useState<AccountEnum>(); //到账户
  const [accFromBalances, setAccFromBalances] = useState<FormatBalancesProps[] | FormatBalancesLeverProps[]>([]); //从账户，资产余额
  const [accToBalances, setAccToBalances] = useState<FormatBalancesProps[] | FormatBalancesLeverProps[]>([]); //到账户，资产余额
  const [coin, setCoin] = useState("usdt"); //操作币种
  const [leverMarketName, setLeverMarketName] = useState<string>(); //杠杆市场交易对
  const [amount, setAmount] = useState(""); //划转金额

  const skipFrom = useMemo(() => {
    return accTo ? [accTo] : [];
  }, [accTo]);
  const skipTo = useMemo(() => {
    return accFrom ? [accFrom] : [];
  }, [accFrom]);
  const hasFuturesU = useMemo(() => accFrom === AccountEnum.futures_u || accTo === AccountEnum.futures_u, [accFrom, accTo]);
  const alertUserOpenFutures = useMemo(() => {
    if (hasFuturesU && isFuturesUsdtOpen === false) return true;
    return false;
  }, [hasFuturesU, isFuturesUsdtOpen]);

  const hasLever = useMemo(() => accFrom === AccountEnum.lever || accTo === AccountEnum.lever, [accFrom, accTo]);
  const leverSymbolList = useMemo(() => {
    if (!hasLever || !accFrom || !accTo) return [];

    const currencyList = allAccCurrencyObj[accFrom === AccountEnum.lever ? accTo : accFrom];
    const balances = accFrom === AccountEnum.lever ? accFromBalances : accToBalances;

    type aryType = {
      symbol: string;
      desc: string;
    };
    const ary: aryType[] = [];

    (leverConfigAry || []).map((obj) => {
      const symbol = obj.symbol;
      const symbolBreak = symbol.split("_");
      const base = symbolBreak[0]; //卖方币
      const quote = symbolBreak[1]; //买方币

      const baseCurrency = currencyList.find((obj) => obj.currency === base);
      if (!baseCurrency) {
        if (!currencyList.find((obj) => obj.currency === quote)) return;
      }

      const balance = (balances as FormatBalancesLeverProps[]).find((obj) => obj.symbol === symbol);
      const baseAvailable = Big(balance ? balance.base.availableAmount : 0).toFixedMinCy(2);
      const quoteAvailable = Big(balance ? balance.quote.availableAmount : 0).toFixedMinCy(2);

      ary.push({
        symbol,
        desc: baseAvailable + "/" + quoteAvailable,
      });
    });

    return ary;
  }, [hasLever, accFrom, accTo, allAccCurrencyObj, accFromBalances, accToBalances, leverConfigAry]); //获取杠杆交易对列表
  const leverCurrencyList = useMemo(() => {
    if (!hasLever || !accFrom || !accTo || !leverSymbolList.length || !leverMarketName) return [];
    if (!leverSymbolList.find((obj) => obj.symbol === leverMarketName)) return [];

    const currencyList = allAccCurrencyObj[accFrom === AccountEnum.lever ? accTo : accFrom];

    const symbolBreak = leverMarketName.split("_");
    const base = symbolBreak[0]; //卖方币
    const quote = symbolBreak[1]; //买方币
    const baseCurrency = currencyList.find((obj) => obj.currency === base) || (currencyObj && currencyObj[base]) || {};
    const quoteCurrency = currencyList.find((obj) => obj.currency === quote) || (currencyObj && currencyObj[quote]) || {};
    let baseBalance, quoteBalance;
    if (accFrom === AccountEnum.lever) {
      const balance = (accFromBalances as FormatBalancesLeverProps[]).find((obj) => obj.symbol === leverMarketName);
      baseBalance = balance ? balance.base : {};
      quoteBalance = balance ? balance.quote : {};
    } else {
      baseBalance = (accFromBalances as FormatBalancesProps[]).find((obj) => obj.currency === base) || {};
      quoteBalance = (accFromBalances as FormatBalancesProps[]).find((obj) => obj.currency === quote) || {};
    }

    return [
      {
        key: base,
        fullName: baseCurrency.fullName,
        logo: baseCurrency.logo,
        availableAmount: baseBalance.availableAmount,
        convertAmount: baseBalance.convertAmount,
        convertAmountStr: baseBalance.convertAmountStr,
      },
      {
        key: quote,
        fullName: quoteCurrency.fullName,
        logo: quoteCurrency.logo,
        availableAmount: quoteBalance.availableAmount,
        convertAmount: quoteBalance.convertAmount,
        convertAmountStr: quoteBalance.convertAmountStr,
      },
    ];
  }, [hasLever, leverSymbolList, leverMarketName, accFrom, accTo, allAccCurrencyObj, currencyObj, accFromBalances]); //杠杆币种列表
  const getCurrencyList = useMemo(() => {
    if (hasLever || !accFrom || !accTo) return [];

    const listFrom = allAccCurrencyObj[accFrom];
    const listTo = allAccCurrencyObj[accTo];
    const list = (() => {
      const newArr: DropdownCurrencyItemProps[] = [];
      let currency, balance;
      for (let i = 0; i < listTo.length; i++) {
        for (let j = 0; j < listFrom.length; j++) {
          if (listFrom[j].currency === listTo[i].currency) {
            currency = listFrom[j];
            balance = (accFromBalances as FormatBalancesProps[]).find((obj) => obj.currency === currency.currency) || {
              availableAmount: "0",
              convertAmount: "0",
              convertAmountStr: "0.00 " + store.currency.getCurrencyDisplayName(convertCurrency),
            };

            newArr.push({
              key: currency.currency,
              fullName: currency.fullName,
              logo: currency.logo,
              availableAmount: balance.availableAmount,
              convertAmount: balance.convertAmount,
              convertAmountStr: balance.convertAmountStr,
            });
          }
        }
      }

      return newArr;
    })();

    list.sort((a, b) => {
      if (+(a.convertAmount || 0) - +(b.convertAmount || 0) > 0) return -1;
      if (+(a.convertAmount || 0) - +(b.convertAmount || 0) < 0) return 1;

      if (a.key < b.key) return -1;
      if (a.key > b.key) return 1;

      return 0;
    });

    return list;
  }, [hasLever, accFrom, accTo, allAccCurrencyObj, accFromBalances]); //获取币种列表，非杠杆情况下
  const point = useMemo(() => {
    const defaultValue = 8;
    if (!coin || !currencyObj || !currencyObj[coin]) return defaultValue;
    return currencyObj[coin].maxPrecision >= 0 ? currencyObj[coin].maxPrecision : defaultValue;
  }, [coin, currencyObj]);
  const accFromBalancesCanUse = useMemo<string>(() => {
    const defaultValue = "0";
    if (!coin || (hasLever && !leverMarketName)) return defaultValue;

    if (accFrom === AccountEnum.lever) {
      const balance = (accFromBalances as FormatBalancesLeverProps[]).find((obj) => obj.symbol === leverMarketName);
      if (!balance) return defaultValue;
      if (balance.base.currency == coin) return +balance.base.availableAmount >= 0 ? Big(balance.base.availableAmount || 0).toFixedMax(point) : defaultValue;
      return +balance.quote.availableAmount >= 0 ? Big(balance.quote.availableAmount || 0).toFixedMax(point) : defaultValue;
    }

    const balance = (accFromBalances as FormatBalancesProps[]).find((obj) => obj.currency === coin);
    if (!balance) return defaultValue;
    return +balance.availableAmount >= 0 ? Big(balance.availableAmount || 0).toFixedMax(point) : defaultValue;
  }, [point, coin, hasLever, leverMarketName, accFrom, accFromBalances]);
  const isConfirmDisabled = useMemo(() => {
    if (loading || !+amount || alertUserOpenFutures) return true;
    return false;
  }, [loading, amount, alertUserOpenFutures]);

  const handleOpen = useHandleOpen([
    accountFrom,
    accountTo,
    currency,
    leverSymbol,
    //
    allAccCurrencyObj,
    apiReqBalances,
    accFrom,
    accTo,
    //
    setAccFrom,
    setAccFromBalances,
    setAccTo,
    setAccToBalances,
    setCoin,
    setAmount,
    setLeverMarketName,
  ]);
  /*
  const handleOpen = useCallback(() => {
    const account = Object.values(AccountEnum).filter((acc) => {
      if (acc === AccountEnum.finance && isSubAcc) return false;
      return true;
    });
    const newFrom = accountFrom && account.includes(accountFrom) ? accountFrom : AccountEnum.spot;
    if (newFrom === accFrom) {
      apiReqBalances(accFrom, setAccFromBalances);
    } else {
      setAccFrom(newFrom);
    }

    // let newTo = accountTo && account.includes(accountTo) ? accountTo : isSubAcc ? AccountEnum.lever : AccountEnum.finance;
    let newTo = accountTo && account.includes(accountTo) ? accountTo : AccountEnum.lever;
    if (newTo === AccountEnum.futures_c) {
      if (!futuresUsdtTransferList || !futuresUsdtTransferList.includes(currency)) newTo = AccountEnum.futures_u;
    }
    if (newTo === AccountEnum.futures_u) {
      // if (!futuresCoinTransferList || !futuresCoinTransferList.includes(currency)) newTo = isSubAcc ? AccountEnum.lever : AccountEnum.finance;
      if (!futuresCoinTransferList || !futuresCoinTransferList.includes(currency)) newTo = AccountEnum.lever;
    }
    if (newTo === accTo && newTo === AccountEnum.lever) {
      apiReqBalances(accTo, setAccToBalances);
    } else {
      setAccTo(newTo);
    }

    setCoin(currency);
    leverSymbol && setLeverMarketName(leverSymbol);
    setAmount("");
  }, [isSubAcc, apiReqBalances, accountFrom, accFrom, accountTo, accTo, currency, leverSymbol]);
   */
  const handleSwitch = useCallback(() => {
    setAccFrom(accTo);
    setAccTo(accFrom);
  }, [accFrom, accTo]);
  const handleConfirm = useCallback(() => {
    if (isConfirmDisabled) return;
    setLoading(true);

    post_balanceTransfer({
      data: {
        bizId: Date.now(),
        from: accFrom,
        to: accTo,
        currency: coin,
        symbol: hasLever ? leverMarketName : undefined,
        amount,
      },
      errorPop: true,
      successPop: true,
    })
      .then(() => {
        successCallback && successCallback();
        updateProps({ open: false });
      })
      .catch(() => {
        //empty
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isConfirmDisabled, successCallback, updateProps, accFrom, accTo, coin, hasLever, leverMarketName, amount]);

  useEffect(() => {
    if (!open || !accFrom) return;
    apiReqBalances(accFrom, setAccFromBalances);
  }, [accFrom]);
  useEffect(() => {
    if (!open || !accTo) return;
    if (accTo === AccountEnum.lever) {
      apiReqBalances(accTo, setAccToBalances);
    } else {
      setAccToBalances([]);
    }
  }, [accTo]);
  useEffect(() => {
    setAmount("");
  }, [accFrom, accTo, coin, leverMarketName]);
  useEffect(() => {
    if (!open || !leverSymbolList.length) return;
    if (!leverSymbolList.find((obj) => obj.symbol === leverMarketName)) setLeverMarketName(leverSymbolList[0].symbol);
  }, [leverSymbolList]);
  useEffect(() => {
    if (!open) return;
    if (hasLever) {
      if (!leverMarketName) return;
      const ary = leverMarketName.split("_");
      if (hasFuturesU) {
        return setCoin(ary[1]);
      }
      if (ary.includes(coin)) return;
      setCoin(ary[0]);
    } else {
      if (!coin) {
        if (getCurrencyList.length) setCoin(getCurrencyList[0].key);
      } else {
        if (getCurrencyList.length && !getCurrencyList.find((obj) => obj.key === coin)) setCoin(getCurrencyList[0].key);
      }
    }
  }, [accFrom, accTo, leverMarketName, hasLever]);

  const init = useCallback(() => {
    //do something init
    setLoading(true);
    let index = 4;
    if (!store.currency.currencies) {
      store.currency.getCurrencies(finallyFun);
    } else {
      index--;
    }
    if (!store.market.leverConfigAry) {
      store.market.getLeverMarketConfig(finallyFun);
    } else {
      index--;
    }
    if (!store.market.isFuturesUsdtOpen) {
      store.market.getFapiAccountOpen(finallyFun);
    } else {
      index--;
    }
    if (!store.market.futuresUsdtTransferList) {
      store.market.getFapiCoins(finallyFun);
    } else {
      index--;
    }

    function finallyFun() {
      index--;
      if (index > 0) return;
      setLoading(false);
      setIsFirstOpen(false);
    }
  }, []);
  useEffect(() => {
    if (isFirstOpen) return;
    handleOpen();
  }, [isFirstOpen]);
  useEffect(() => {
    if (open) {
      isFirstOpen ? init() : handleOpen();
    } else {
      //...
    }
  }, [open]);

  return (
    <Modal
      open={open}
      title={t("trade.transfer")}
      width={440}
      centered
      className={styles.main}
      closeIcon={<SvgIcon className={"svgIcon"} src={SvgClose} />}
      onCancel={() => !loading && updateProps({ open: false })}
      okButtonProps={{ disabled: isConfirmDisabled }}
      onOk={handleConfirm}
      {...rest}
    >
      {!isFirstOpen && (
        <>
          <p className={styles.info}>{t("trade.innerTransferNoFee")}</p>

          <div className={styles.account}>
            <div>
              <span>{t("trade.from")}</span>
              {accFrom && <DropdownAccount disabled={loading} value={accFrom} skip={skipFrom} onChange={(val) => setAccFrom(val)} />}
            </div>
            <button disabled={loading} className={cx("btnTxt btnHover")} onClick={handleSwitch}>
              <AzSvg icon={"transfer"} />
            </button>
            <div>
              <span>{t("trade.to")}</span>
              {accTo && <DropdownAccount disabled={loading} value={accTo} skip={skipTo} onChange={(val) => setAccTo(val)} />}
            </div>
          </div>

          {alertUserOpenFutures && <div className={cx(styles.errOpenTips)}>{t("trade.plsOpenFuturesFirst")}</div>}

          {hasLever ? (
            <Lever
              leverMarketName={leverMarketName}
              setLeverMarketName={setLeverMarketName}
              coin={coin}
              setCoin={setCoin}
              hasFuturesU={hasFuturesU}
              leverSymbolList={leverSymbolList}
              leverCurrencyList={leverCurrencyList}
            />
          ) : (
            <div className={styles.currency}>
              <div>{t("trade.coin")}</div>
              <DropdownCurrency disabled={loading} value={coin} onChange={setCoin} items={getCurrencyList} />
            </div>
          )}

          <div className={styles.amount}>
            <div>
              <span>{t("trade.amount")}</span>
              <div>
                <span>{thousands(accFromBalancesCanUse)}</span>
                <small>{t("trade.available")}</small>
              </div>
            </div>
            <AppInputNumber
              className={styles.inputNumber}
              disabled={loading}
              value={amount}
              onInput={setAmount}
              noBtns={true}
              max={+accFromBalancesCanUse}
              point={point}
              suffix={
                <button disabled={loading} className={cx("btnTxt", styles.btnAll)} onClick={() => setAmount(accFromBalancesCanUse)}>
                  {t("trade.all")}
                </button>
              }
            />
          </div>
        </>
      )}

      {loading && <AzLoading />}
    </Modal>
  );
};

export default observer(AppModalTransfer);
// export default Main;
