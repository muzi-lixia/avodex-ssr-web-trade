import React, { HTMLAttributes, useMemo, useState, useCallback, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/router";
import cx from "classnames";
import { Hooks, Util } from "@az/base";
const { useTranslation } = Hooks;
const { Big, moment } = Util;
import store from "store";
import { routerPush, upperCaseFirstLetter } from "utils/method";
import { get_trade } from "api/v4/order";

import { Tooltip } from "antd";
import useAxiosCancelFun from "hooks/useAxiosCancelFun";
import AzCopy from "components/az/copy";
import AzLoading from "components/az/loading";
import AzScrollBarY from "components/az/scroll/barY";
import AppDivNoData from "components/app/div/noData";
import WithPoint from "../../../_cmpt/withPoint";
import BlackTipTooltip from "../../../_cmpt/blackTipTooltip";

import styles from "./index.module.scss";

import { TradeSideEnum, TradeOrderStateEnum } from "store/trade";
import { OrderHistoryProps } from "../index";
import { OrderTradeProps, OrderTradeDeductEnum } from "../../../tradeHistory";

interface Props extends HTMLAttributes<HTMLDivElement> {
  doc: OrderHistoryProps;
  clsLi: string;
  disabled?: boolean;
  OrderStateMemo: any;
}

const Main: React.FC<Props> = ({ className, doc, clsLi, disabled, OrderStateMemo }) => {
  const router = useRouter();
  const t = useTranslation();
  // const { isLogin } = store.user;
  const { formatName, isLever, config } = store.market;
  const isBlack = useMemo(() => !!config?.[doc.symbol]?.isBlack, [config, doc.symbol]);

  const isNft = useMemo(() => doc.symbolType === "nft", [doc]);
  const getStateNode = useMemo(() => {
    // 已取消/已过期 且 数量大于0 的定性为部分成交
    const { state, executedQty } = doc;
    let cls;
    let lab = OrderStateMemo[state];
    if (state === TradeOrderStateEnum.FILLED) cls = "success";
    if (state === TradeOrderStateEnum.PARTIALLY_FILLED || ([TradeOrderStateEnum.CANCELED, TradeOrderStateEnum.EXPIRED].includes(state) && +executedQty > 0)) {
      cls = "warn";
      lab = OrderStateMemo[TradeOrderStateEnum.PARTIALLY_FILLED];
    }

    return <WithPoint status={cls}>{lab}</WithPoint>;
    // return (
    //   <span className={styles.state}>
    //     <i className={cls}></i>
    //     <span>{lab}</span>
    //   </span>
    // );
  }, [doc, OrderStateMemo]);
  const getFeeStr = useCallback((doc) => {
    const { fee, feeCurrency, orderSide, baseCurrency, quoteCurrency } = doc;

    const feeStr = Big(fee || 0).toFixedCy();

    if (feeCurrency) return feeStr + " " + store.currency.getCurrencyDisplayName(feeCurrency);

    return orderSide === TradeSideEnum.buy
      ? feeStr + " " + store.currency.getCurrencyDisplayName(baseCurrency)
      : feeStr + " " + store.currency.getCurrencyDisplayName(quoteCurrency);
  }, []);
  const getFeeTip = useCallback((doc) => {
    const { deductType, deductFee, couponAmount, couponCurrency, feeCurrency } = doc;
    if (deductType !== OrderTradeDeductEnum.COUPON) return "";
    if (feeCurrency === couponCurrency) return t("trade.deductLab", [deductFee + " " + store.currency.getCurrencyDisplayName(feeCurrency)]);
    const label =
      deductFee + " " + store.currency.getCurrencyDisplayName(feeCurrency) + " ≈ " + couponAmount + " " + store.currency.getCurrencyDisplayName(couponCurrency);
    return t("trade.deductLab", [label]);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OrderTradeProps[]>();

  const apiReqTradeArg = useMemo(() => {
    return {
      fn: get_trade,
      config: {
        params: {
          limit: 100,
          orderId: doc.orderId,
        },
      },
      success: ({ items }) => setItems(items),
      callback: () => setLoading(false),
    };
  }, [doc]);
  const apiReqTrade = useAxiosCancelFun(apiReqTradeArg);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    apiReqTrade();

    return () => {
      setLoading(false);
      setItems(undefined);
    };
  }, [isOpen]);
  useEffect(() => {
    if (!disabled) setIsOpen(false);
  }, [disabled]);

  return (
    <div className={cx(styles.main, className)}>
      <div className={cx(clsLi, styles.nav)} onClick={() => !disabled && setIsOpen(!isOpen)}>
        <div className={cx(styles.arrow, { [styles.arrowOpen]: isOpen })}>{moment(doc.time).formatMs()}</div>
        <div>
          <span className={styles.symbolWrap}>
            <button
              disabled={disabled}
              className={"btnTxt"}
              style={{ cursor: isBlack ? "text" : "" }}
              onClick={(e) => {
                e.stopPropagation();
                if (isBlack) return;
                routerPush(router, { symbol: doc.symbol, isLever });
              }}
            >
              {formatName(doc.symbol)}
            </button>
          </span>
        </div>
        <div>{t("trade." + doc.type.toLocaleLowerCase())}</div>
        <div className={doc.side === TradeSideEnum.buy ? "up-color" : "down-color"}>{t("trade." + doc.side.toLocaleLowerCase())}</div>
        <div>{doc.avgPrice ? Big(doc.avgPrice).toFixedCy() : "--"}</div>
        <div>{doc.type === "MARKET" ? "Market" : Big(doc.price || 0).toFixedCy()}</div>
        <div>{Big(doc.tradeBase || 0).toFixedCy()}</div>
        <div>{+doc.origQty ? Big(doc.origQty).toFixedCy() : "--"}</div>
        <div>{Big(doc.tradeQuote || 0).toFixedCy()}</div>
        <div>{getStateNode}</div>
      </div>
      <div className={styles.content} style={{ display: isOpen ? "block" : "none" }}>
        <div className={styles.subBar}>
          <div>
            <span>{t("trade.endTime")}:&nbsp;</span>
            <div>{moment(doc.updatedTime || doc.time).formatMs()}</div>
          </div>
          <div>
            <span>{t("trade.orderNumber")}:&nbsp;</span>
            <div>
              <span>{doc.orderId}</span>
              <AzCopy text={doc.orderId} />
            </div>
          </div>
        </div>

        <AzScrollBarY noWrap={store.app.rtl} className={styles.AzScrollBarY}>
          <div className={styles.subBody}>
            <div className={styles.subNav}>
              <div className={cx(clsLi, styles.subLi)}>
                <div>{t("trade.time")}</div>
                <div>{t("trade.price")}</div>
                <div>{t("trade.executed")}</div>
                <div>{t("trade.fee")}</div>
                {isNft && <div>{t("trade.softnoteSerial")}</div>}
                <div>{t("trade.makerTaker")}</div>
              </div>
            </div>

            {items && (
              <div className={styles.subContent}>
                {!items.length ? (
                  <AppDivNoData className={styles.noData} noIcon={true} />
                ) : (
                  items.map((subDoc) => {
                    const _fee = getFeeStr(subDoc);
                    const _feeTip = getFeeTip(subDoc);
                    return (
                      <div key={subDoc.tradeId} className={cx(clsLi, styles.subLi)}>
                        <div>{moment(subDoc.time).formatMs()}</div>
                        <div>{Big(subDoc.price || 0).toFixedCy()}</div>
                        <div>{Big(subDoc.quantity || 0).toFixedCy()}</div>
                        <div>
                          {!_feeTip ? (
                            _fee
                          ) : (
                            <Tooltip placement="topLeft" title={_feeTip}>
                              <span className={cx(styles.tipStr)}>{_fee}</span>
                            </Tooltip>
                          )}
                        </div>
                        {isNft && <div>{subDoc.nftId}</div>}
                        <div>{upperCaseFirstLetter(subDoc.takerMaker)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </AzScrollBarY>

        {loading && <AzLoading />}
      </div>
    </div>
  );
};

export default observer(Main);
// export default Main;
