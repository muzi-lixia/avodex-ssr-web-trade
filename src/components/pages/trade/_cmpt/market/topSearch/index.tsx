import React, { HTMLAttributes, useCallback, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
import store from "store";
import { routerPush } from "@/utils/method";
// import { get_searchMarketHot } from "api/old/exapi/app";

import AzLoading from "@/components/az/loading";
import AppDivNoData from "@/components/app/div/noData";

import CMPT_Main from "./main";

import styles from "./index.module.scss";
import AzSvg from "@/components/az/svg";
import { useRouter } from "next/router";

interface Props extends HTMLAttributes<HTMLDivElement> {
  visible: boolean;
  setSearchInputFocus: () => void;
  isShowVolume: boolean;
}

const Main: React.FC<Props> = ({ className, visible, setSearchInputFocus, isShowVolume }) => {
  const t = useTranslation();
  const router = useRouter();

  const { formatName, searchMarketHot, searchMarketHotSpot, getSearchMarketHot } = store.market;
  const { searchHistory, initSearchHistory, setSearchHistory } = store.trade;
  const { config } = store.market;

  const [loading, setLoading] = useState(true);
  // const [records, setRecords] = useState<string[]>([]);

  const handleClickHistoryBtn = useCallback((doc) => {
    routerPush(router, doc);
  }, []);

  useEffect(() => {
    searchMarketHot && setLoading(false);
  }, [searchMarketHot]);
  useEffect(() => {
    visible && getSearchMarketHot();
    /*
    get_searchMarketHot()
      .then((data) => {
        const ary: string[] = [];
        data.map((obj) => {
          if ([1, 4].includes(obj.type) && !ary.includes(obj.marketName)) {
            //1.现货 4.杠杆 8.全币种合约 10.币本位合约 11.U本位合约
            ary.push(obj.marketName);
          }
        });
        setRecords(ary);
      })
      .finally(() => {
        setLoading(false);
      });
      */
  }, [visible]);

  useEffect(() => {
    initSearchHistory();
  }, []);

  const visibleSearchHistory = useMemo(() => {
    if (!config) return [];
    return searchHistory.filter((doc) => {
      const symbolCfg = config[doc.symbol];
      return store.market.isMarketVisible(symbolCfg, { allowSearch: true });
    });
  }, [searchHistory, config]);

  return (
    <div className={cx(styles.main, className, { [styles.hide]: !visible })} onMouseDown={setSearchInputFocus} onTouchStart={setSearchInputFocus}>
      {!!visibleSearchHistory.length && (
        <>
          <div className={styles.nav}>
            <div>{t("trade.searchHistory")}</div>
            <button className={"btnTxt"} onClick={() => setSearchHistory()}>
              <AzSvg icon={"delete"} />
            </button>
          </div>
          <div className={styles.history}>
            {visibleSearchHistory.map((doc) => {
              return (
                <button key={doc.symbol + (doc.tag || "")} className={"btnTxt"} onClick={() => handleClickHistoryBtn(doc)}>
                  <span>{formatName(doc.symbol)}</span>
                  {doc.tag && <span>{doc.tag}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className={styles.nav}>{t("trade.topSearch")}</div>
      <div className={styles.content}>
        {loading && <AzLoading className={styles.loading} />}
        {!loading && !searchMarketHotSpot.length && <AppDivNoData />}
        {visible && !loading && !!searchMarketHotSpot.length && <CMPT_Main records={searchMarketHotSpot} isShowVolume={isShowVolume} />}
      </div>
    </div>
  );
};

export default observer(Main);
// export default Main;
