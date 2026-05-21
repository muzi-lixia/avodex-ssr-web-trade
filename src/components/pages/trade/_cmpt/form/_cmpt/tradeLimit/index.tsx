import React, { HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
// import { useRouter } from "next/router";
import { Hooks, Util } from "@az/base";
import store from "store";
import { $g } from "utils/statistics";
import { post_order } from "api/v4/order";
import Storage from "utils/storage";
import { Checkbox, Drawer } from "antd";
// import AzSvg from "components/az/svg";
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
const { Big, getUrl } = Util;

interface Props extends HTMLAttributes<HTMLDivElement> {
  tradeSide: TradeSideEnum;
  onSuccess?: () => void;
}

const Main: React.FC<Props> = ({ className, tradeSide, onSuccess }) => {
  const t = useTranslation();

  const { name, type, currentConfig } = store.market;
  const { tradeRecent, tradeRecentOnce, orderConfirm_limit } = store.trade;
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
    return isBuy ? ary[1] : ary[0];
  }, [isBuy, name]); //当前交易币种
  const currencyGet = useMemo(() => {
    const ary = name.split("_");
    return isBuy ? ary[0] : ary[1];
  }, [isBuy, name]);

  const stepQuantity = useMemo(() => {
    if (coinQuantityFilter) return coinQuantityFilter.tickSize;
  }, [coinQuantityFilter]);

  // const cls = useMemo(() => {
  //   return isBuy ? ClsUpDownEnum.up : ClsUpDownEnum.down;
  // }, [isBuy]); //样式

  const [loading, setLoading] = useState(false);
  const [confirmDrawerOpen, setConfirmDrawerOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState(""); //成交额

  const [isErrPrice, setIsErrPrice] = useState(false);
  const [isErrAmount, setIsErrAmount] = useState(false);

  const refInputAmount = useRef<AzInputNumberRefProps>(null);
  const timeoutAmount = useRef<number>();
  const focusInputAmount = useCallback(() => {
    timeoutAmount.current && clearTimeout(timeoutAmount.current);
    timeoutAmount.current = window.setTimeout(() => {
      if (refInputAmount.current) refInputAmount.current.focus();
    }, 0);
  }, []);

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
    return getStepValue(amount, stepQuantity);
  }, [amount, stepQuantity]);
  const isErrAmountStep = useMemo(() => amount !== amountStep, [amount, amountStep]);

  const canBuyOrSell = useMemo(() => {
    const unit = " " + store.currency.getCurrencyDisplayName(currencyGet);
    if (!price || !+price) return "--" + unit;
    if (isBuy) {
      return (
        Big(balancesAvailable || 0)
          .div(price)
          .toFixed(coinQuantityPrecisionMarket) + unit
      );
    } else {
      return (
        Big(balancesAvailable || 0)
          .times(price)
          .toFixed(coinPricePrecisionCurrency) + unit
      );
    }
  }, [balancesAvailable, price, isBuy, currencyGet, coinPricePrecisionCurrency, coinQuantityPrecisionMarket]);

  const handleInputPrice = useCallback(
    (val) => {
      setPrice(val);
      if (!val) return setTotal("");
      if (amount) {
        setTotal(
          Big(val || 0)
            .times(amount)
            .toFixed(coinPricePrecisionCurrency)
        );
      }
    },
    [amount, coinPricePrecisionCurrency]
  );
  const handleInputAmount = useCallback(
    (val, isAfterChange?) => {
      setAmount(val);
      if (!val) return setTotal("");
      if (price) {
        setTotal(
          Big(val || 0)
            .times(price)
            .toFixed(coinPricePrecisionCurrency, isBuy ? 3 : 0) //产品vivian需求，买入时计算值向上舍入
        );
      }

      if (isAfterChange && val !== getStepValue(val, stepQuantity)) {
        focusInputAmount();
      }
    },
    [price, coinPricePrecisionCurrency, isBuy, stepQuantity]
  );
  const handleInputTotal = useCallback(
    (val, isAfterChange?) => {
      setTotal(val);

      if (price) {
        if (val) {
          const newAmount = Big(val).div(price).toFixed(coinQuantityPrecisionMarket);
          // setAmount(getStepValue(newAmount, stepQuantity));
          setAmount(newAmount);

          if (isAfterChange && newAmount !== getStepValue(newAmount, stepQuantity)) {
            focusInputAmount();
          }
        } else {
          setAmount("");
        }
      } else {
        if (amount) {
          if (val) {
            setPrice(Big(val).div(amount).toFixed(coinPricePrecisionMarket));
          }
        }
      }
    },
    [price, amount, coinPricePrecisionMarket, coinQuantityPrecisionMarket, stepQuantity]
  );
  const handleSliderChange = useCallback(
    (val, slider, isAfterChange) => {
      console.log("handleSliderChange", { val, slider, isAfterChange });
      let value = val;
      if (!+val && !slider) {
        value = "";
      }

      if (isBuy) {
        handleInputTotal(value, isAfterChange);
      } else {
        handleInputAmount(value, isAfterChange);
      }
    },
    [isBuy, handleInputTotal, handleInputAmount]
  );

  const handleBlurAmount = useCallback(() => {
    console.log("handleBlurAmount-----");
    if (isErrAmountStep) handleInputAmount(amountStep);
  }, [amountStep, isErrAmountStep, handleInputAmount]);
  const handleBlurTotal = useCallback(() => {
    console.log("handleBlurTotal-----");
    if (isErrAmountStep) focusInputAmount();
  }, [isErrAmountStep]);

  const getMaxAmount = useCallback(
    (price) => {
      if (isBuy) {
        const priceNum = +price;
        if (!priceNum) return "0";
        return Big(balancesAvailable || 0)
          .div(price)
          .toFixed(coinQuantityPrecisionMarket);
      } else {
        return Big(balancesAvailable || 0).toFixed(coinQuantityPrecisionMarket);
      }
    },
    [isBuy, balancesAvailable, coinQuantityPrecisionMarket]
  ); //获取最大买入卖出数量

  const maxAmount = useMemo(() => {
    return getMaxAmount(price);
  }, [getMaxAmount, price]); //最大买入卖出数量
  const isErrAmountMemo = useMemo(() => {
    return !!(isErrAmount || (price && +amount - +maxAmount > 0) || isErrAmountStep);
  }, [isErrAmount, price, amount, maxAmount, isErrAmountStep]);
  const sliderValue = useMemo(() => {
    if (isBuy) {
      return total;
    } else {
      return amount;
    }
  }, [isBuy, total, amount]); //滑块值
  const sliderPoint = useMemo(() => {
    return isBuy ? coinPricePrecisionCurrency : coinQuantityPrecisionMarket;
  }, [isBuy, coinPricePrecisionCurrency, coinQuantityPrecisionMarket]); //滑块最大值

  const btnSubmitObj = useMemo(() => {
    const cls = isBuy ? styles.btnSubmit_buy : styles.btnSubmit_sell;
    let lab = t("trade.login2Register");
    if (isLogin) {
      lab = t(isBuy ? "trade.buy" : "trade.sell") + " " + coinQuantityUpperCase;
    }
    return {
      cls,
      lab,
    };
  }, [isLogin, isBuy, coinQuantityUpperCase]);
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
      type: "LIMIT",
      timeInForce: "GTC",
      bizType: type,
      price: price,
      quantity: amount,
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
  }, [loading, name, tradeSide, type, price, amount]);

  const FeeEstimatedValue = useMemo(() => {
    if (isBuy) return amount;
    if (!price || !amount || isNaN(+price) || isNaN(+amount)) return "";
    return Big(price).times(amount).toFixed();
  }, [isBuy, price, amount]);
  const { feeAndCoin } = useFeeEstimated({
    value: FeeEstimatedValue,
    isMaker: true,
    isBuy,
  });

  const checkRiskTip = useModalRiskTip();
  const handleCloseConfirmDrawer = useCallback(() => {
    setConfirmDrawerOpen(false);
  }, []);
  const handleConfirmedSubmit = useCallback(() => {
    if (+amount - +maxAmount > 0) return ModalAlert(t("trade.amountBigTip"));

    //交易提示：最新成交价5%
    if (tradeRecent && tradeRecent.p) {
      const ts = 60 * 60 * 1000;
      const obj = Storage.get("formOrder5TipTsObj");
      const formOrder5TipTsObj: any = obj && typeof obj == "object" ? obj : {};
      let checked = false;
      if (isBuy) {
        const attr = store.market.type + "_" + TradeSideEnum.buy;
        const tsLimit = Date.now() - (formOrder5TipTsObj[attr] || 0) > ts;
        if (+price - +tradeRecent.p * 1.05 > 0 && tsLimit) {
          return ModalAlert.confirm({
            content: (
              <div className={styles.order5Tips}>
                <div>{t("trade.tradeAlertBuy")}</div>
                <Checkbox className={styles.order5TipsCheckbox} onChange={(e) => (checked = e.target.checked)}>
                  {t("trade.hourNoTips")}
                </Checkbox>
              </div>
            ),
            onOk: (clsoe) => {
              clsoe();
              apiResPostOrder();
              if (checked) {
                formOrder5TipTsObj[attr] = Date.now();
                Storage.set("formOrder5TipTsObj", formOrder5TipTsObj);
              }
            },
          });
        }
      } else {
        const attr = store.market.type + "_" + TradeSideEnum.sell;
        const tsLimit = Date.now() - (formOrder5TipTsObj[attr] || 0) > ts;
        if (+price - +tradeRecent.p * 0.95 < 0 && tsLimit) {
          return ModalAlert.confirm({
            content: (
              <div className={styles.order5Tips}>
                <div>{t("trade.tradeAlertSell")}</div>
                <Checkbox className={styles.order5TipsCheckbox} onChange={(e) => (checked = e.target.checked)}>
                  {t("trade.hourNoTips")}
                </Checkbox>
              </div>
            ),
            onOk: (clsoe) => {
              clsoe();
              apiResPostOrder();
              if (checked) {
                formOrder5TipTsObj[attr] = Date.now();
                Storage.set("formOrder5TipTsObj", formOrder5TipTsObj);
              }
            },
          });
        }
      }
    }

    apiResPostOrder();
  }, [amount, maxAmount, t, tradeRecent, isBuy, price, apiResPostOrder]);
  const handleDrawerConfirm = useCallback(() => {
    handleCloseConfirmDrawer();
    store.trade.updateState({ orderConfirm_limit: !confirmChecked });
    Storage.set("orderConfirm_limit", !confirmChecked);
    handleConfirmedSubmit();
  }, [confirmChecked, handleCloseConfirmDrawer, handleConfirmedSubmit]);
  const handleSubmit = useCallback(() => {
    if (btnSubmitDisabled || isErrAmountMemo) return;
    if (!isLogin) {
      const query = "?backurl=" + encodeURIComponent(location.href);
      location.href = getUrl("/accounts/login" + query);
      return;
    }

    if (!+price) return setIsErrPrice(true);
    if (!+amount) return setIsErrAmount(true);

    // checkRiskTip(start);
    start();

    function start() {
      if (!orderConfirm_limit) return handleConfirmedSubmit();

      if (isH5) {
        setConfirmChecked(!orderConfirm_limit);
        setConfirmDrawerOpen(true);
        return;
      }

      let checked = !orderConfirm_limit;

      ModalAlert({
        title: t("trade.orderConfirm"),
        okText: t("confirm"),
        width: 450,
        closable: true,
        onOk: (close) => {
          close();
          store.trade.updateState({ orderConfirm_limit: !checked });
          Storage.set("orderConfirm_limit", !checked);
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
                <div>{t("trade.limitOrder")}</div>
              </div>
              <div>
                <div>{t("trade.orderPrice")}</div>
                <div>{price + " " + coinPriceUpperCase}</div>
              </div>
              <div>
                <div>{t("trade.amount")}</div>
                <div>{amount + " " + coinQuantityUpperCase}</div>
              </div>
              <div>
                <div>{t("trade.totalVol")}</div>
                <div>{total + " " + coinPriceUpperCase}</div>
              </div>
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
    price,
    amount,
    maxAmount,
    isBuy,
    tradeRecent,
    apiResPostOrder,
    orderConfirm_limit,
    coinPriceUpperCase,
    coinQuantityUpperCase,
    total,
    isErrAmountMemo,
    feeAndCoin,
    checkRiskTip,
    isH5,
    handleConfirmedSubmit,
  ]);

  useEffect(() => {
    // console.log("tradeRecentOnce change", tradeRecentOnce);
    setPrice("");
    setAmount("");
    setTotal("");

    if (tradeRecentOnce) {
      const price = Big(tradeRecentOnce.p || 0).toFixed(coinPricePrecisionMarket);
      setPrice(price);
      if (tradeRecentOnce.isClick) {
        const amount = tradeRecentOnce.total || tradeRecentOnce.q;
        const amountNum = Math.min(+amount, +getMaxAmount(price));
        const newAmount = getStepValue(amountNum, stepQuantity);
        setAmount(Big(newAmount).toFixed(coinQuantityPrecisionMarket));
        setTotal(Big(price).times(amountNum).toFixed(coinPricePrecisionCurrency));
      }
    }
  }, [tradeRecentOnce, type, tradeSide]);
  useEffect(() => {
    setIsErrPrice(false);
  }, [price]);
  useEffect(() => {
    setIsErrAmount(false);
  }, [amount]);

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
          value={price}
          onInput={handleInputPrice}
          disabled={loading}
          isErr={isErrPrice}
          point={coinPricePrecisionMarket}
          isStepPoint={true}
        />
        <AppInputNumber
          ref={refInputAmount}
          className={styles.input}
          prefix={t("trade.amount")}
          suffix={coinQuantityUpperCase}
          value={amount}
          onInput={handleInputAmount}
          disabled={loading}
          isErr={isErrAmountMemo}
          point={coinQuantityPrecisionMarket}
          // isStepPoint={true}
          step={stepQuantity}
          onBlur={handleBlurAmount}
        />
        <div className={styles.errStep}>{isErrAmountStep && <div>{t("trade.valueStepInputTip", [amountStep, stepQuantity])}</div>}</div>

        <Slider className={styles.slider} value={sliderValue} max={balancesAvailable} point={sliderPoint} disabled={loading} onChange={handleSliderChange} />

        <AppInputNumber
          className={styles.input}
          prefix={t("trade.totalVol")}
          suffix={coinPriceUpperCase}
          value={total}
          onInput={handleInputTotal}
          disabled={loading}
          // noBtns={true}
          point={coinPricePrecisionCurrency}
          isStepPoint={true}
          onBlur={handleBlurTotal}
        />

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
                  <div>{t("trade.limitOrder")}</div>
                </div>
                <div>
                  <div>{t("trade.orderPrice")}</div>
                  <div>{price + " " + coinPriceUpperCase}</div>
                </div>
                <div>
                  <div>{t("trade.amount")}</div>
                  <div>{amount + " " + coinQuantityUpperCase}</div>
                </div>
                <div>
                  <div>{t("trade.totalVol")}</div>
                  <div>{total + " " + coinPriceUpperCase}</div>
                </div>
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
