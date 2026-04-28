import React, { HTMLAttributes, useMemo } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
import store from "store";
import { thousands } from "utils/method";

import AppDropdown, { AppDropdownItemProps } from "components/app/dropdown";

import styles from "./index.module.scss";

import defaultIcon from "assets/img/icon404.png";
// const defaultIcon = require("assets/img/icon404.png");

interface LeverSymbolListProps {
  symbol: string;
  desc: string;
}

interface LeverCurrencyListProps {
  key: string;
  fullName?: string;
  logo?: string;
  availableAmount: string;
  convertAmount: string;
  convertAmountStr: string;
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  leverMarketName?: string;
  setLeverMarketName: (arg: string) => void;
  coin: string;
  setCoin: (arg: string) => void;
  hasFuturesU: boolean;
  leverSymbolList: LeverSymbolListProps[];
  leverCurrencyList: LeverCurrencyListProps[];
}

const Main: React.FC<Props> = ({
  className,
  leverMarketName,
  setLeverMarketName,
  coin,
  setCoin,
  hasFuturesU,
  leverSymbolList,
  leverCurrencyList,
}) => {
  const t = useTranslation();
  const { formatName } = store.market;
  const { getCurrencyDisplayName } = store.currency;

  const itemsSymbol = useMemo(() => {
    const ary: AppDropdownItemProps[] = [];

    leverSymbolList.map((obj) => {
      ary.push({
        key: obj.symbol,
        label: (
          <div className={cx(styles.li, { [styles.liAtv]: obj.symbol === leverMarketName })}>
            <div>{formatName(obj.symbol)}</div>
            <small>{obj.desc}</small>
          </div>
        ),
      });
    });

    return ary;
  }, [leverSymbolList, leverMarketName]);
  const atvItemSymbol = useMemo(() => {
    if (leverMarketName === undefined || !leverSymbolList || !leverSymbolList.length) return;
    return leverSymbolList.find((obj) => obj.symbol === leverMarketName);
  }, [leverSymbolList, leverMarketName]);

  return (
    <div className={cx(styles.main, className)}>
      <p>{t("trade.pairs")}</p>
      <AppDropdown
        value={leverMarketName}
        items={itemsSymbol}
        triggerLabel={
          atvItemSymbol ? (
            <span className={cx(styles.trigger)}>{formatName(atvItemSymbol.symbol)}</span>
          ) : (
            <span className={styles.noData}>{t("trade.noData")}</span>
          )
        }
        onChange={setLeverMarketName}
        itemHeight={50}
      />
      <p>{t("trade.coin")}</p>
      <div className={styles.currencyDiv}>
        {leverCurrencyList.map((doc, index) => {
          return (
            <button
              disabled={!!(hasFuturesU && !index)}
              key={doc.key}
              onClick={() => setCoin(doc.key)}
              className={cx("btnTxt", { [styles.btnAtv]: coin === doc.key })}
            >
              {/*eslint-disable-next-line  @next/next/no-img-element*/}
              <img src={doc.logo || defaultIcon} alt={"coin logo"} />
              <div>
                <div>
                  <b>{getCurrencyDisplayName(doc.key)}</b>
                  <small>{doc.fullName || ""}</small>
                </div>
                <b>{!!+doc.availableAmount ? thousands(doc.availableAmount) : "0.00"}</b>
                {!!+doc.availableAmount && <p>{doc.convertAmountStr}</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default observer(Main);
// export default Main;
