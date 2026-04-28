import { useCallback } from "react";
import store from "store";
import { get_balances, get_leverBalances } from "api/v4/balance";
import { get_fapiBalanceList } from "api/v4/futures";
import { get_balanceBalances } from "api/v4/financial";

import usePriceCurrencyConvertCb from "hooks/usePriceCurrencyConvertCb";
import { AccountEnum, BalancesLeverProps, BalancesProps } from "store/balances";
import { FormatBalancesLeverCurrencyProps, FormatBalancesLeverProps, FormatBalancesProps } from "./index";

const Main = () => {
  const { isFuturesUsdtOpen } = store.market;

  const priceCurrencyConvertCb = usePriceCurrencyConvertCb();

  return useCallback(
    (acc: AccountEnum, setAccBalances) => {
      setAccBalances([]);

      if (acc === AccountEnum.spot) {
        get_balances().then((data) => setAccBalances(spotAssetsConvert(data)));
      } else if (acc === AccountEnum.lever) {
        get_leverBalances().then((data) => setAccBalances(leverAssetsConvert(data)));
      } else if (acc === AccountEnum.finance) {
        get_balanceBalances().then((data) => setAccBalances(spotAssetsConvert(data)));
      } else if (acc === AccountEnum.futures_u) {
        isFuturesUsdtOpen && get_fapiBalanceList().then((data) => setAccBalances(futuresConvert(data)));
      }

      function spotAssetsConvert(data) {
        if (!data.assets) return [];
        const ary: FormatBalancesProps[] = [];
        (data.assets as BalancesProps[]).map((obj) => {
          const { currency, availableAmount } = obj;
          ary.push({
            ...obj,
            convertAmount: priceCurrencyConvertCb({ value: availableAmount, coin: currency, thousands: false, unit: false }),
            convertAmountStr: priceCurrencyConvertCb({ value: availableAmount, coin: currency, thousands: true, unit: true }),
          });
        });
        return ary;
      }
      function leverAssetsConvert(data) {
        if (!data.assets) return [];
        const ary: FormatBalancesLeverProps[] = [];
        (data.assets as BalancesLeverProps[]).map((obj) => {
          const { base, quote } = obj;

          const baseFormat: FormatBalancesLeverCurrencyProps = {
            ...base,
            convertAmount: priceCurrencyConvertCb({ value: base.availableAmount, coin: base.currency, thousands: false, unit: false }),
            convertAmountStr: priceCurrencyConvertCb({ value: base.availableAmount, coin: base.currency, thousands: true, unit: true }),
          };
          const quoteFormat: FormatBalancesLeverCurrencyProps = {
            ...quote,
            convertAmount: priceCurrencyConvertCb({ value: quote.availableAmount, coin: quote.currency, thousands: false, unit: false }),
            convertAmountStr: priceCurrencyConvertCb({ value: quote.availableAmount, coin: quote.currency, thousands: true, unit: true }),
          };

          ary.push({
            ...obj,
            base: baseFormat,
            quote: quoteFormat,
          });
        });
        return ary;
      }
      function futuresConvert(dataAry) {
        const ary: FormatBalancesProps[] = [];
        dataAry &&
          dataAry.map((obj) => {
            const { coin, amount } = obj;
            ary.push({
              currency: coin,
              availableAmount: amount,
              convertAmount: priceCurrencyConvertCb({ value: amount, coin, thousands: false, unit: false }),
              convertAmountStr: priceCurrencyConvertCb({ value: amount, coin, thousands: true, unit: true }),
            });
          });
        return ary;
      }
    },
    [priceCurrencyConvertCb, isFuturesUsdtOpen]
  );
};

export default Main;
