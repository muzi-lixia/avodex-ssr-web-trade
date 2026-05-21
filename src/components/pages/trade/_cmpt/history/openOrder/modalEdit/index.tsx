import React, { HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks, Util } from "@az/base";
const { useTranslation } = Hooks;
const { Big, moment } = Util;
import store from "store";
import { get_balances, get_leverBalance } from "api/v4/balance";
import { put_order } from "api/v4/order";

import { Drawer, Modal, ModalProps } from "antd";
import AppInputNumber from "components/app/input/number";
// import AzSvg from "components/az/svg";
import AzLoading from "@/components/az/loading";
import SvgClose from "assets/icon-svg/close2.svg";
import SvgIcon from "@az/SvgIcon";

import styles from "./index.module.scss";

import { OpenOrderExtendProps } from "@/components/pages/trade/_cmpt/history/openOrder";
import { ClsUpDownEnum } from "@/store/app";
import { BalancesProps, OpenOrderProps } from "@/store/balances";
import { TradeSideEnum } from "@/store/trade";
import { SymbolFilterProps } from "@/store/market";
import { AzInputNumberRefProps } from "@/components/az/input/number";

import useBalancesAvailable from "@/components/pages/trade/_hook/useBalancesAvailable";

interface Props extends ModalProps {
  doc: OpenOrderExtendProps;
  successCallback?: () => void;
  //
  open?: boolean;
  onCancel?: (e?: React.MouseEvent<HTMLElement>) => void;
}

const Main: React.FC<Props> = ({ doc, successCallback, open, onCancel, ...rest }) => {
  const t = useTranslation();
  // const {isLogin} = store.user;
  const { name, config, isLever } = store.market;
  const { isH5 } = store.app;
  const { tickers } = store.trade;
  const { getCurrencyDisplayName } = store.currency;

  const isBuy = useMemo(() => doc.side === TradeSideEnum.buy, [doc]);
  const latestPrice = useMemo(() => {
    const ticker = tickers.find((obj) => obj.s === doc.symbol);
    if (ticker && ticker.c) return ticker.c;
    return "";
  }, [doc, tickers]);
  const { balancesAvailable } = useBalancesAvailable(doc.side);
  const { coinQuantityUpperCase, coinPriceUpperCase } = useMemo(() => {
    const [quantity, price] = doc.symbol.split("_");
    return {
      coinQuantityUpperCase: getCurrencyDisplayName(quantity),
      coinPriceUpperCase: getCurrencyDisplayName(price),
    };
  }, [doc, getCurrencyDisplayName]);
  const { coinQuantityPrecisionMarket, coinPricePrecisionMarket, coinQuantityFilter } = useMemo(() => {
    const retObj: {
      coinQuantityPrecisionMarket: number;
      coinPricePrecisionMarket: number;
      coinQuantityFilter: WithUndefined<SymbolFilterProps>;
    } = {
      coinQuantityPrecisionMarket: 0,
      coinPricePrecisionMarket: 0,
      coinQuantityFilter: undefined,
    };

    if (config && config[doc.symbol]) {
      const currentConfig = config[doc.symbol];
      if (currentConfig.quantityPrecision && currentConfig.quantityPrecision >= 0) retObj.coinQuantityPrecisionMarket = currentConfig.quantityPrecision;
      if (currentConfig.pricePrecision && currentConfig.pricePrecision >= 0) retObj.coinPricePrecisionMarket = currentConfig.pricePrecision;
      if (currentConfig.filters) retObj.coinQuantityFilter = currentConfig.filters.find((obj) => obj.filter === "QUANTITY");
    }

    return retObj;
  }, [doc, config]);
  const stepQuantity = useMemo(() => {
    if (coinQuantityFilter) return coinQuantityFilter.tickSize;
  }, [coinQuantityFilter]);

  const [available, setAvailable] = useState<WithUndefined<string>>();

  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");

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

  const getMaxAmount = useCallback(
    (price) => {
      if (isBuy) {
        const priceNum = +price;
        if (!priceNum) return "0";
        return Big(doc.price || 0)
          .times(doc.origQty)
          .plus(available || 0)
          .div(price)
          .toFixed(coinQuantityPrecisionMarket);
      } else {
        return Big(doc.origQty)
          .plus(available || 0)
          .toFixed(coinQuantityPrecisionMarket);
      }
    },
    [doc, isBuy, available, coinQuantityPrecisionMarket]
  ); //获取最大买入卖出数量
  const maxAmount = useMemo(() => {
    return getMaxAmount(price);
  }, [getMaxAmount, price]); //最大买入卖出数量

  const handleInputPrice = useCallback((val) => {
    setPrice(val);
  }, []);
  const handleInputAmount = useCallback(
    (val, isAfterChange?) => {
      setAmount(val);

      if (isAfterChange && val !== getStepValue(val, stepQuantity)) {
        focusInputAmount();
      }
    },
    [focusInputAmount]
  );
  const handleBlurAmount = useCallback(() => {
    console.log("handleBlurAmount-----");
    if (isErrAmountStep) handleInputAmount(amountStep);
  }, [amountStep, isErrAmountStep, handleInputAmount]);
  const handleClickAll = useCallback(() => {
    handleInputAmount(maxAmount, true);
  }, [maxAmount, handleInputAmount]);

  const isErrPrice = useMemo(() => {
    return !price;
  }, [price]);
  const isErrAmount = useMemo(() => {
    if (!amount) return true;
    if (isErrAmountStep) return true;
    // return +amount > +maxAmount;
    return false;
  }, [amount, isErrAmountStep, maxAmount]);

  const isConfirmDisabled = useMemo(() => {
    return isErrPrice || isErrAmount;
  }, [isErrPrice, isErrAmount]);

  const handleConfirm = useCallback(() => {
    if (isConfirmDisabled) return;
    if (price == doc.price && amount == doc.origQty) return onCancel && onCancel();
    setLoading(true);

    put_order(doc.orderId, {
      data: {
        price,
        quantity: amount,
      },
      errorPop: true,
      successPop: true,
    })
      .then(() => {
        successCallback && successCallback();
        onCancel && onCancel();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [doc, isConfirmDisabled, price, amount, onCancel]);

  const apiReqBalance = useCallback(() => {
    setLoading(true);
    if (!isLever) {
      get_balances({
        params: {
          currencies: doc.symbol.replace("_", ","),
        },
      })
        .then((data) => {
          const currency = doc.symbol.split("_")[isBuy ? 1 : 0];
          const assets: BalancesProps[] = data.assets;
          const obj = assets.find((obj) => obj.currency === currency);
          if (obj && obj.availableAmount) setAvailable(obj.availableAmount);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      get_leverBalance({
        params: {
          symbol: doc.symbol,
        },
      })
        .then((data) => {
          const obj = data[isBuy ? "quote" : "base"];
          if (obj && obj.availableAmount) setAvailable(obj.availableAmount);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [doc, isLever, isBuy]);

  useEffect(() => {
    if (!open) return;
    setPrice(doc.price);
    setAmount(doc.origQty);
    if (doc.symbol !== name) {
      apiReqBalance();
    }

    return () => {
      console.log("useEffect = open");
      // setAvailable(undefined);
    };
  }, [open]);
  useEffect(() => {
    if (!open || doc.symbol !== name) return;
    setAvailable(balancesAvailable);
  }, [open, balancesAvailable]);

  const content = (
    <>
      <div className={styles.orderInfo}>
        <div>
          <div>
            <b>{doc._pair}</b>
            <span className={doc._sideCls}>{doc._side}</span>
          </div>
          <div></div>
        </div>

        <div>
          <div>{t("trade.lastPrice2")}</div>
          <div>{(latestPrice || "--") + " " + coinPriceUpperCase}</div>
        </div>
      </div>

      <div className={styles.form}>
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
          isErr={isErrAmount}
          point={coinQuantityPrecisionMarket}
          // isStepPoint={true}
          step={stepQuantity}
          onBlur={handleBlurAmount}
        />
        <div className={styles.errStep}>{isErrAmountStep && <div>{t("trade.valueStepInputTip", [amountStep, stepQuantity])}</div>}</div>
        {/*<div className={styles.info}>*/}
        {/*  <div>{t(isBuy ? "trade.maxNumBuy" : "trade.maxNumSell") + maxAmount + " " + coinQuantityUpperCase}</div>*/}
        {/*  <div>*/}
        {/*    <button className={cx("btnTxt", styles.atv)} disabled={loading} onClick={handleClickAll}>*/}
        {/*      {t("trade.all")}*/}
        {/*    </button>*/}
        {/*  </div>*/}
        {/*</div>*/}
      </div>

      {loading && <AzLoading />}
    </>
  );

  if (isH5) {
    return (
      <Drawer
        open={open}
        title={t("trade.orderModify")}
        placement="bottom"
        height="auto"
        closable={false}
        className={styles.drawer}
        extra={
          <button className={cx("btnTxt", "btnHover", styles.drawerClose)} onClick={(e) => !loading && onCancel && onCancel(e as any)}>
            <SvgIcon className={"svgIcon"} src={SvgClose} />
          </button>
        }
        onClose={(e) => !loading && onCancel && onCancel(e as any)}
      >
        <div className={styles.drawerBody}>
          {content}
          <div className={styles.drawerFooter}>
            <button className={cx("btnTxt", styles.drawerFooterCancel)} disabled={loading} onClick={(e) => !loading && onCancel && onCancel(e as any)}>
              {t("trade.cancel")}
            </button>
            <button className={cx("btnTxt", styles.drawerFooterConfirm)} disabled={loading || isConfirmDisabled} onClick={handleConfirm}>
              {t("confirm")}
            </button>
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Modal
      open={open}
      title={t("trade.orderModify")}
      width={440}
      centered
      className={styles.main}
      closeIcon={<SvgIcon className={"svgIcon"} src={SvgClose} />}
      onCancel={(e) => !loading && onCancel && onCancel(e)}
      okButtonProps={{ disabled: isConfirmDisabled }}
      onOk={handleConfirm}
      {...rest}
    >
      {content}
    </Modal>
  );
};

export default observer(Main);
// export default Main;
