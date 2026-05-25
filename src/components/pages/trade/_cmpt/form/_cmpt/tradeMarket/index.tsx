import React, { HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
// import { useRouter } from "next/router";
import { Hooks, Util } from "@az/base";
import store from "store";
import { $g } from "utils/statistics";
import { post_order } from "api/v4/order";
import Storage from "utils/storage";
import { Dropdown, MenuProps, Tooltip, Checkbox, Drawer } from "antd";
import AzSvg from "components/az/svg";
import ModalAlert from "components/antd/modal/alert";
import AppInputNumber from "components/app/input/number";
import useCoinMemo from "components/pages/trade/_hook/useCoinMemo";
import useBalancesAvailable from "components/pages/trade/_hook/useBalancesAvailable";
import useFeeEstimated from "@/components/pages/trade/_cmpt/form/_hook/useFeeEstimated";
import FeeEstimated from "@/components/pages/trade/_cmpt/form/_cmpt/feeEstimated";
import Option from "../option";
import Slider from "../slider";
import LoginOrRegister from "../loginOrRegister";
import SvgClose from "assets/icon-svg/close2.svg";
import SvgIcon from "@az/SvgIcon";

import styles from "./index.module.scss";

import { ClsUpDownEnum } from "store/app";
import { TradeSideEnum } from "store/trade";
import { AzInputNumberRefProps } from "@/components/az/input/number";
import useModalRiskTip from "@/components/app/modal/riskTip/useHook";

const { useTranslation } = Hooks;
const { getUrl, Big } = Util;

interface Props extends HTMLAttributes<HTMLDivElement> {
  tradeSide: TradeSideEnum;
  onSuccess?: () => void;
}

enum MarketTradeType { //市价交易类型
  total = "total", //成交额
  amount = "amount", //数量
}

const Main: React.FC<Props> = ({ className, tradeSide, onSuccess }) => {
  // const router = useRouter();
  const t = useTranslation();

  const { name, type, currentConfig } = store.market;
  // const { currencyQuantity, currencyPrice } = store.balances;
  // const { currencyObj } = store.currency;
  const { tradeRecentOnce, orderConfirm_market } = store.trade;
  const { isLogin } = store.user;
  const { isH5 } = store.app;

  const { coinQuantityUpperCase, coinPriceUpperCase, coinQuantityPrecisionMarket, coinPricePrecisionMarket, coinPricePrecisionCurrency, coinQuantityFilter } =
    useCoinMemo();
  const { balancesAvailable: balancesAvailableCanNegative, balancesAvailableLabel } = useBalancesAvailable(tradeSide);
  const balancesAvailable = useMemo(() => {
    const num = balancesAvailableCanNegative ? +balancesAvailableCanNegative : 0;
    if (!num || num < 0) return "0";
    return balancesAvailableCanNegative;
  }, [balancesAvailableCanNegative]);

  const isBuy = useMemo(() => tradeSide === TradeSideEnum.buy, [tradeSide]);
  const currency = useMemo(() => {
    const ary = name.split("_");
    return tradeSide === TradeSideEnum.buy ? ary[1] : ary[0];
  }, [tradeSide, name]); //当前交易币种
  const currencyGet = useMemo(() => {
    const ary = name.split("_");
    return isBuy ? ary[0] : ary[1];
  }, [isBuy, name]);

  const stepQuantity = useMemo(() => {
    if (coinQuantityFilter) return coinQuantityFilter.tickSize;
  }, [coinQuantityFilter]);

  // const cls = useMemo(() => {
  //   return tradeSide === TradeSideEnum.buy ? ClsUpDownEnum.up : ClsUpDownEnum.down;
  // }, [tradeSide]); //样式

  const [loading, setLoading] = useState(false);
  const [confirmDrawerOpen, setConfirmDrawerOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const [marketTradeType, setMarketTradeType] = useState<MarketTradeType>(tradeSide === TradeSideEnum.buy ? MarketTradeType.total : MarketTradeType.amount);
  const [inputValue, setInputValue] = useState("");
  const [isErrInputValue, setIsErrInputValue] = useState(false);

  const refInputAmount = useRef<AzInputNumberRefProps>(null);
  const timeoutAmount = useRef<number>();
  const focusInputAmount = useCallback(() => {
    timeoutAmount.current && clearTimeout(timeoutAmount.current);
    timeoutAmount.current = window.setTimeout(() => {
      if (refInputAmount.current) refInputAmount.current.focus();
    }, 0);
  }, []);

  const isTradeAmount = useMemo(() => marketTradeType === MarketTradeType.amount, [marketTradeType]);
  const getStepValue = useCallback((value, step) => {
    if (!value || !step || !+value || !+step) return value;
    const mod = Big(value).mod(step).toNumber();
    if (!mod) return value;
    if (+value < +step) return step + "";
    const decimal = ((value || "") + "").split(".")[1];
    const fixLen = decimal ? decimal.length : undefined;
    const newValue = Big(step)
      .times(Math.floor(+value / +step))
      .toFixed(fixLen);
    return newValue;
  }, []);
  const amountStep = useMemo(() => {
    if (!isTradeAmount) return "";
    return getStepValue(inputValue, stepQuantity);
  }, [isTradeAmount, inputValue, stepQuantity]);
  const isErrAmountStep = useMemo(() => {
    if (!isTradeAmount) return false;
    return inputValue !== amountStep;
  }, [isTradeAmount, inputValue, amountStep]);

  const dropdownItems: MenuProps["items"] = useMemo(() => {
    return [
      {
        key: MarketTradeType.total,
        label: (
          <div className={styles.dropTotal} onClick={() => setMarketTradeType(MarketTradeType.total)}>
            <span>{t("trade.totalVol")}</span>
            <Tooltip placement="top" title={isBuy ? t("trade.marketTotalTipBuy") : t("trade.marketTotalTipSell")}>
              <span>
                <AzSvg icon={"faq"} />
              </span>
            </Tooltip>
          </div>
        ),
      },
      {
        key: MarketTradeType.amount,
        label: <a onClick={() => setMarketTradeType(MarketTradeType.amount)}>{t("trade.amount")}</a>,
      },
    ];
  }, [isBuy]);

  const point = useMemo(() => {
    return marketTradeType === MarketTradeType.total ? coinPricePrecisionCurrency : coinQuantityPrecisionMarket;
  }, [marketTradeType, coinPricePrecisionCurrency, coinQuantityPrecisionMarket]);
  const maxInputValue = useMemo<string>(() => {
    if (isBuy) {
      if (marketTradeType === MarketTradeType.total) {
        return balancesAvailable || "";
      } else {
        if (!tradeRecentOnce) return "";
        return Big(balancesAvailable || 0)
          .div(tradeRecentOnce.p)
          .toFixed(point);
      }
    } else {
      if (marketTradeType === MarketTradeType.total) {
        if (!tradeRecentOnce) return "";

        let ba = "0";
        if (balancesAvailable) {
          if (+Big(balancesAvailable).toFixed(coinQuantityPrecisionMarket)) {
            ba = balancesAvailable;
          }
        }
        return Big(ba).times(tradeRecentOnce.p).toFixed(point);
      } else {
        return balancesAvailable || "";
      }
    }
    //后面根据最新成交价变更
    // return balancesAvailable || "";
  }, [balancesAvailable, tradeRecentOnce, isBuy, marketTradeType, point]);
  const inputValueConvert = useMemo(() => {
    if (isBuy) {
      if (marketTradeType === MarketTradeType.total) {
        return inputValue;
        // return Big(inputValue || 0)
        //   .toFixedMax(coinPricePrecisionMarket);
      } else {
        if (!tradeRecentOnce) return "";
        return Big(inputValue || 0)
          .times(tradeRecentOnce.p)
          .toFixedMax(coinPricePrecisionMarket);
      }
    } else {
      if (marketTradeType === MarketTradeType.total) {
        if (!tradeRecentOnce) return "";
        return Big(inputValue || 0)
          .div(tradeRecentOnce.p)
          .toFixedMax(coinQuantityPrecisionMarket);
      } else {
        return inputValue;
      }
    }
  }, [inputValue, tradeRecentOnce, isBuy, maxInputValue, coinPricePrecisionMarket, coinQuantityPrecisionMarket]);
  const isErrInputValueMemo = useMemo(() => {
    return isErrInputValue || +inputValue - +maxInputValue > 0 || isErrAmountStep;
  }, [isErrInputValue, inputValue, maxInputValue, isErrAmountStep]);

  const canBuyOrSell = useMemo(() => {
    const unit = " " + store.currency.getCurrencyDisplayName(currencyGet);
    if (!tradeRecentOnce) return "--" + unit;
    if (isBuy) {
      return (
        Big(balancesAvailable || 0)
          .div(tradeRecentOnce.p)
          .toFixed(coinQuantityPrecisionMarket) + unit
      );
    } else {
      return (
        Big(balancesAvailable || 0)
          .times(tradeRecentOnce.p)
          .toFixed(coinPricePrecisionCurrency) + unit
      );
    }
  }, [balancesAvailable, tradeRecentOnce, isBuy, currencyGet, coinPricePrecisionMarket, coinQuantityPrecisionMarket]);

  const handleInputValue = useCallback(
    (val, isAfterChange?) => {
      setInputValue(val);

      if (isTradeAmount && isAfterChange && val !== getStepValue(val, stepQuantity)) {
        focusInputAmount();
      }
    },
    [isTradeAmount, stepQuantity]
  );
  const handleSliderChange = useCallback(
    (val, slider, isAfterChange) => {
      let value = val;
      if (!+val && !slider) {
        value = "";
      }
      handleInputValue(value, isAfterChange);
    },
    [handleInputValue]
  );

  const handleBlurAmount = useCallback(() => {
    if (!isTradeAmount) return;
    if (isErrAmountStep) handleInputValue(amountStep);
  }, [isTradeAmount, amountStep, isErrAmountStep, handleInputValue]);

  const btnSubmitObj = useMemo(() => {
    const cls = tradeSide === TradeSideEnum.buy ? styles.btnSubmit_buy : styles.btnSubmit_sell;
    let lab = t("trade.login2Register");
    if (isLogin) {
      lab = t(tradeSide === TradeSideEnum.buy ? "trade.buy" : "trade.sell") + " " + coinQuantityUpperCase;
    }
    return {
      cls,
      lab,
    };
  }, [isLogin, tradeSide, coinQuantityUpperCase]);
  const btnSubmitDisabled = useMemo(() => {
    if (!isLogin) return false;
    if (loading || !currentConfig.tradingEnabled) return true;
    return false;
  }, [isLogin, loading, currentConfig]);
  const apiResPostOrder = useCallback(() => {
    if (loading) return;
    setLoading(true);
    const data = {
      symbol: name,
      side: tradeSide,
      type: "MARKET",
      timeInForce: "IOC",
      bizType: type,
      [tradeSide === TradeSideEnum.buy ? "quoteQty" : "quantity"]: inputValueConvert,
    };

    post_order({
      data,
      errorPop: true,
      successPop: true,
    })
      .then((data) => {
        console.log("success", data);
        onSuccess && onSuccess();
        $g(tradeSide === TradeSideEnum.buy ? "WEB_Trade_Buy_click" : "WEB_Trade_Sell_click");
      })
      .catch((data) => {
        console.log("error", data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loading, name, tradeSide, type, inputValueConvert]);

  const FeeEstimatedValue = useMemo(() => {
    if (isBuy) {
      if (isTradeAmount) {
        return inputValue;
      } else {
        if (tradeRecentOnce && tradeRecentOnce.p && !isNaN(+tradeRecentOnce.p) && inputValue !== "" && !isNaN(+inputValue)) {
          return +inputValue / +tradeRecentOnce.p;
        } else {
          return;
        }
      }
    } else {
      if (isTradeAmount) {
        if (tradeRecentOnce && tradeRecentOnce.p && !isNaN(+tradeRecentOnce.p) && inputValue !== "" && !isNaN(+inputValue)) {
          return +inputValue * +tradeRecentOnce.p;
        } else {
          return;
        }
      } else {
        return inputValue;
      }
    }
  }, [isBuy, isTradeAmount, inputValue, tradeRecentOnce]);
  const { feeAndCoin } = useFeeEstimated({
    value: FeeEstimatedValue,
    isMaker: false,
    isBuy,
  });

  const checkRiskTip = useModalRiskTip();
  const handleCloseConfirmDrawer = useCallback(() => {
    setConfirmDrawerOpen(false);
  }, []);
  const handleConfirmedSubmit = useCallback(() => {
    if (+inputValue - +maxInputValue > 0) return ModalAlert(t("trade.amountBigTip"));

    apiResPostOrder();
  }, [inputValue, maxInputValue, apiResPostOrder, t]);
  const handleDrawerConfirm = useCallback(() => {
    handleCloseConfirmDrawer();
    store.trade.updateState({ orderConfirm_market: !confirmChecked });
    Storage.set("orderConfirm_market", !confirmChecked);
    handleConfirmedSubmit();
  }, [confirmChecked, handleCloseConfirmDrawer, handleConfirmedSubmit]);
  const handleSubmit = useCallback(() => {
    if (btnSubmitDisabled || isErrAmountStep) return;
    if (!isLogin) {
      const query = "?backurl=" + encodeURIComponent(location.href);
      location.href = getUrl("/accounts/login" + query);
      return;
    }

    if (!+inputValue) return setIsErrInputValue(true);

    // checkRiskTip(start);
    start();

    function start() {
      if (!orderConfirm_market) return handleConfirmedSubmit();

      if (isH5) {
        setConfirmChecked(!orderConfirm_market);
        setConfirmDrawerOpen(true);
        return;
      }

      let checked = !orderConfirm_market;

      ModalAlert({
        title: t("trade.orderConfirm"),
        okText: t("confirm"),
        width: 450,
        closable: true,
        onOk: (close) => {
          close();
          store.trade.updateState({ orderConfirm_market: !checked });
          Storage.set("orderConfirm_market", !checked);
          handleConfirmedSubmit();
        },
        closeIcon: <SvgIcon className={"svgIcon"} src={SvgClose} />,
        content: (
          <div className={styles.orderConfirm}>
            <div>
              <span>{store.market.formatName(store.market.name)}</span>&nbsp;
              <span className={isBuy ? ClsUpDownEnum.up : ClsUpDownEnum.down}>{isBuy ? t("trade.buy") : t("trade.sell")}</span>
            </div>

            <div>
              <div>
                <div>{t("trade.type")}</div>
                <div>{t("trade.marketOrder")}</div>
              </div>
              <div>
                <div>{t("trade.orderPrice")}</div>
                <div>{t("trade.market")}</div>
              </div>
              {marketTradeType === MarketTradeType.total && (
                <div>
                  <div>{t("trade.totalVol")}</div>
                  <div>{inputValue + " " + coinPriceUpperCase}</div>
                </div>
              )}
              {marketTradeType === MarketTradeType.amount && (
                <div>
                  <div>{t("trade.amount")}</div>
                  <div>{inputValue + " " + coinQuantityUpperCase}</div>
                </div>
              )}
              <div>
                <div>{t("trade.estimatedFee")}</div>
                <div>{feeAndCoin}</div>
              </div>
            </div>

            <div>
              <Checkbox className={styles.orderConfirmCheckbox} defaultChecked={checked} onChange={(e) => (checked = e.target.checked)}>
                {t("trade.noAlertAndSetTip")}
              </Checkbox>
            </div>
          </div>
        ),
      });
    }
  }, [
    isLogin,
    btnSubmitDisabled,
    inputValue,
    maxInputValue,
    apiResPostOrder,
    orderConfirm_market,
    isBuy,
    marketTradeType,
    coinPriceUpperCase,
    coinQuantityUpperCase,
    feeAndCoin,
    checkRiskTip,
    isH5,
    handleConfirmedSubmit,
  ]);

  useEffect(() => {
    setInputValue("");
  }, [name, type, tradeSide, marketTradeType]);
  useEffect(() => {
    setMarketTradeType(tradeSide === TradeSideEnum.buy ? MarketTradeType.total : MarketTradeType.amount);
  }, [tradeSide]);
  useEffect(() => {
    setIsErrInputValue(false);
  }, [inputValue]);

  return (
    <div className={cx(styles.main, className)}>
      <div className={styles.nav}>
        <div>
          <span>{t("trade.avbl")}:</span>
          {/*<span className={cls}>{balancesAvailableLabel}</span>*/}
          <span>{balancesAvailableLabel}</span>
          <span>{store.currency.getCurrencyDisplayName(currency)}</span>
        </div>
        <Option tradeSide={tradeSide} currency={currency} />
      </div>

      <div className={styles.content}>
        <AppInputNumber
          className={styles.input}
          prefix={t("trade.price")}
          suffix={coinPriceUpperCase}
          disabled={true}
          disabledLabel={t("trade.market")}
          // noBtns={true}
        />
        <AppInputNumber
          ref={refInputAmount}
          className={styles.input}
          prefix={
            tradeRecentOnce ? (
              <Dropdown
                placement={"bottomLeft"}
                trigger={store.app.isH5 ? ["click"] : ["hover"]}
                menu={{
                  items: dropdownItems,
                  selectable: true,
                  selectedKeys: marketTradeType ? [marketTradeType] : [],
                }}
              >
                <button className={cx("btnTxt btnDrop")} onClick={(e) => e.preventDefault()}>
                  {marketTradeType === MarketTradeType.total ? t("trade.totalVol") : t("trade.amount")}
                </button>
              </Dropdown>
            ) : (
              <span>{marketTradeType === MarketTradeType.total ? t("trade.totalVol") : t("trade.amount")}</span>
            )
          }
          suffix={marketTradeType === MarketTradeType.total ? coinPriceUpperCase : coinQuantityUpperCase}
          value={inputValue}
          onInput={handleInputValue}
          disabled={loading}
          isErr={isErrInputValueMemo}
          point={point}
          isStepPoint={isTradeAmount ? false : true}
          step={isTradeAmount ? stepQuantity : undefined}
          onBlur={handleBlurAmount}
        />
        <div className={styles.errStep}>{isErrAmountStep && <div>{t("trade.valueStepInputTip", [amountStep, stepQuantity])}</div>}</div>

        <Slider className={styles.slider} value={inputValue} max={maxInputValue} point={point} disabled={loading} onChange={handleSliderChange} />

        <div className={styles.canBuyOrSell}>
          <div>{isBuy ? t("trade.canBuy") : t("trade.canSell")}</div>
          <div>{canBuyOrSell}</div>
        </div>

        <FeeEstimated>{feeAndCoin}</FeeEstimated>

        {isLogin ? (
          <button className={cx("btnTxt", styles.btnSubmit, btnSubmitObj.cls)} disabled={btnSubmitDisabled} onClick={handleSubmit}>
            {btnSubmitObj.lab}
          </button>
        ) : (
          <LoginOrRegister isBuy={isBuy} />
        )}
      </div>

      {isH5 && (
        <Drawer
          className={styles.orderConfirmDrawer}
          closable={false}
          title={t("trade.orderConfirm")}
          placement="bottom"
          height="auto"
          open={confirmDrawerOpen}
          onClose={handleCloseConfirmDrawer}
          extra={
            <button className={cx("btnTxt", "btnHover", styles.orderConfirmDrawerClose)} onClick={handleCloseConfirmDrawer}>
              <SvgIcon className={"svgIcon"} src={SvgClose} />
            </button>
          }
        >
          <div className={styles.orderConfirmDrawerBody}>
            <div className={cx(styles.orderConfirm, styles.orderConfirmDrawerContent)}>
              <div>
                <span>{store.market.formatName(store.market.name)}</span>
                <span className={isBuy ? ClsUpDownEnum.up : ClsUpDownEnum.down}>{isBuy ? t("trade.buy") : t("trade.sell")}</span>
              </div>

              <div>
                <div>
                  <div>{t("trade.type")}</div>
                  <div>{t("trade.marketOrder")}</div>
                </div>
                <div>
                  <div>{t("trade.orderPrice")}</div>
                  <div>{t("trade.market")}</div>
                </div>
                {marketTradeType === MarketTradeType.total && (
                  <div>
                    <div>{t("trade.totalVol")}</div>
                    <div>{inputValue + " " + coinPriceUpperCase}</div>
                  </div>
                )}
                {marketTradeType === MarketTradeType.amount && (
                  <div>
                    <div>{t("trade.amount")}</div>
                    <div>{inputValue + " " + coinQuantityUpperCase}</div>
                  </div>
                )}
                <div>
                  <div>{t("trade.estimatedFee")}</div>
                  <div>{feeAndCoin}</div>
                </div>
              </div>

              <div>
                <Checkbox className={styles.orderConfirmCheckbox} checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)}>
                  {t("trade.noAlertAndSetTip")}
                </Checkbox>
              </div>
            </div>

            <div className={styles.orderConfirmDrawerFooter}>
              <button className={cx("btnTxt")} onClick={handleDrawerConfirm}>
                {t("confirm")}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default observer(Main);
