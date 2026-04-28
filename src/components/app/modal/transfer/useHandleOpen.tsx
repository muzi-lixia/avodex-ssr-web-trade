import { useCallback } from "react";
import store from "store";
import { message } from "antd";
import { Hooks } from "@az/base";

import { AccountEnum } from "store/balances";

const { useTranslation } = Hooks;

interface OutputProps {
  accountFrom: AccountEnum;
  accountTo: AccountEnum;
  currency: string;
  currencySwitch?: string;
}

const Main = ([
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
]) => {
  const t = useTranslation();

  return useCallback(() => {
    const parseObj = (() => {
      if (accountFrom && accountTo) return handleFromFixedAndToFixed({ accountFrom, accountTo, currency });
      if (accountFrom && !accountTo) return handleFromFixedAndToAuto({ accountFrom, currency });
      if (!accountFrom && accountTo) return handleFromAutoAndToFixed({ accountTo, currency });
      return handleFromAutoAndToAuto({ currency });
    })();

    const coin = parseObj.currencySwitch || parseObj.currency;
    if (parseObj.currencySwitch) message.info(t("trade.transferNoneAndSwitchTip", [coin.toUpperCase()]));
    setCoin(coin);

    if (parseObj.accountFrom === accFrom) {
      apiReqBalances(accFrom, setAccFromBalances);
    } else {
      setAccFrom(parseObj.accountFrom);
    }

    if (parseObj.accountTo === accTo && parseObj.accountTo === AccountEnum.lever) {
      apiReqBalances(accTo, setAccToBalances);
    } else {
      setAccTo(parseObj.accountTo);
    }

    leverSymbol && setLeverMarketName(leverSymbol);
    setAmount("");

    function handleFromFixedAndToFixed({ accountFrom, accountTo, currency, currencySwitch }: OutputProps): OutputProps {
      /**
       * 从账户和到账户，都固定
       * 1、判断两个账户之间币种列表是否都有该输入币种
       * 2、如果有成功返回
       * 3、否则，切换输入币种为 usdt 再试一下
       * 4、如果没有，就空着
       */
      const fromCurrencyList = allAccCurrencyObj[accountFrom];
      const toCurrencyList = allAccCurrencyObj[accountTo];
      const coin = currencySwitch || currency;

      if (fromCurrencyList.find((obj) => obj.currency === coin) && toCurrencyList.find((obj) => obj.currency === coin)) {
        return { accountFrom, accountTo, currency, currencySwitch };
      }

      if (currencySwitch) return { accountFrom, accountTo, currency };

      return handleFromFixedAndToFixed({
        accountFrom,
        accountTo,
        currency,
        currencySwitch: "usdt",
      });
    }

    interface HandleFromFixedAndToAutoProps {
      accountFrom: AccountEnum;
      currency: string;
      currencySwitch?: string;
    }
    function handleFromFixedAndToAuto({ accountFrom, currency, currencySwitch }: HandleFromFixedAndToAutoProps): OutputProps {
      /**
       * 从账户固定，到账户自动
       * A. 如果输入币种不属于从账户，
       *  1、切换输入币种为 usdt，再试一下
       *  2、如果还不属于，就空着；否则进入 B 步骤
       * B. 如果输入币种属于从账户
       *  1、按优先级设置到账户，直到两账户交集内有该输入币种
       *  2、如果交集内没有输入币种，切换输入币种为 usdt 再试一下
       *  3、如果再没有，就空着，到账户显示优先级第一个
       *  4、如果有，则结束；如果切换了币种，则提示
       */
      const fromCurrencyList = allAccCurrencyObj[accountFrom];
      const accountToAry = getDefaultAccount(accountFrom);
      const coin = currencySwitch || currency;

      if (!fromCurrencyList.find((obj) => obj.currency === coin)) {
        if (currencySwitch) return { accountFrom, accountTo: accountToAry[0], currency };
        return handleFromFixedAndToAuto({ accountFrom, currency, currencySwitch: "usdt" });
      }

      let accountTo: AccountEnum;
      for (let i = 0; i < accountToAry.length; i++) {
        accountTo = accountToAry[i];
        if (allAccCurrencyObj[accountTo].find((obj) => obj.currency === coin)) return { accountFrom, accountTo, currency, currencySwitch };
      }

      if (currencySwitch) return { accountFrom, accountTo: accountToAry[0], currency };

      return handleFromFixedAndToAuto({ accountFrom, currency, currencySwitch: "usdt" });
    }

    interface HandleFromAutoAndToFixedProps {
      accountTo: AccountEnum;
      currency: string;
      currencySwitch?: string;
    }
    function handleFromAutoAndToFixed({ accountTo, currency, currencySwitch }: HandleFromAutoAndToFixedProps): OutputProps {
      /**
       * 从账户自动，到账户固定
       * A. 如果输入币种不属于到账户，
       *  1、切换输入币种为 usdt，再试一下
       *  2、如果还不属于，就空着；否则进入 B 步骤
       * B. 如果输入币种属于到账户
       *  1、按优先级设置从账户，直到两账户交集内有该输入币种
       *  2、如果交集内没有输入币种，切换输入币种为 usdt 再试一下
       *  3、如果再没有，就空着，从账户显示优先级第一个
       *  4、如果有，则结束；如果切换了币种，则提示
       */
      const toCurrencyList = allAccCurrencyObj[accountTo];
      const accountFromAry = getDefaultAccount(accountTo);
      const coin = currencySwitch || currency;

      if (!toCurrencyList.find((obj) => obj.currency === coin)) {
        if (currencySwitch) return { accountFrom: accountFromAry[0], accountTo, currency };
        return handleFromAutoAndToFixed({ accountTo, currency, currencySwitch: "usdt" });
      }

      let accountFrom: AccountEnum;
      for (let i = 0; i < accountFromAry.length; i++) {
        accountFrom = accountFromAry[i];
        if (allAccCurrencyObj[accountFrom].find((obj) => obj.currency === coin)) return { accountFrom, accountTo, currency, currencySwitch };
      }

      if (currencySwitch) return { accountFrom: accountFromAry[0], accountTo, currency };

      return handleFromAutoAndToFixed({ accountTo, currency, currencySwitch: "usdt" });
    }

    function handleFromAutoAndToAuto({ currency }): OutputProps {
      /**
       * 从账户自动，到账户自动
       * 1、设置从账户为现货账户，走 handleFromFixedAndToAuto 流程
       */

      return handleFromFixedAndToAuto({
        accountFrom: AccountEnum.spot,
        currency,
      });
    }

    function getDefaultAccount(skip) {
      const account = [AccountEnum.spot];
      if (store.market.isFuturesUsdtOpen) account.push(AccountEnum.futures_u);
      account.push(AccountEnum.lever);
      if (!store.market.isFuturesUsdtOpen) account.push(AccountEnum.futures_u);
      return account.filter((acc) => acc !== skip);
    }
  }, [accountFrom, accountTo, currency, leverSymbol, allAccCurrencyObj, apiReqBalances, accFrom, accTo]);
};

export default Main;
