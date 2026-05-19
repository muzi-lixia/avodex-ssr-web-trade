import { useMemo } from "react";
import store from "store";

import { AccountEnum } from "store/balances";

const Main = () => {
  const { leverConfigAry, futuresUsdtTransferList } = store.market;
  const { currencies, currencyObj } = store.currency;

  const allAccCurrencyObj = useMemo(() => {
    const spot = currencies || [];
    const lever = (() => {
      if (!currencyObj || !leverConfigAry) return [];
      const aryTemp: string[] = [];
      const aryRet: { currency: string }[] = [];
      leverConfigAry.map((doc) => {
        const ary = doc.symbol.split("_");
        let coin;
        for (let i = 0; i < ary.length; i++) {
          coin = ary[i];
          if (!aryTemp.includes(coin) && currencyObj[coin]) {
            aryRet.push({ currency: coin });
            aryTemp.push(coin);
          }
        }
      });
      return aryRet;
    })();
    const futures_u = (() => {
      if (!currencyObj || !futuresUsdtTransferList) return [];
      const aryRet: { currency: string }[] = [];
      futuresUsdtTransferList.map((currency) => {
        const obj = currencyObj[currency];
        if (obj) {
          aryRet.push(obj);
        }
      });
      return aryRet;
    })();

    return {
      [AccountEnum.spot]: spot,
      [AccountEnum.lever]: lever,
      // [AccountEnum.finance]: spot,
      [AccountEnum.futures_u]: futures_u,
    };
  }, [currencies, currencyObj, leverConfigAry, futuresUsdtTransferList]);

  return allAccCurrencyObj;
};

export default Main;
