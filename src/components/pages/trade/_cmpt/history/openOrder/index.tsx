import React, { HTMLAttributes, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
// import { useRouter } from "next/router";
import cx from "classnames";
import { Hooks, Util } from "@az/base";
const { useTranslation } = Hooks;
const { Big, moment } = Util;
import store from "store";
import SocketPrivate from "utils/socket/private";
// import { routerPush } from "utils/method";
import { delete_order, delete_openOrder } from "api/v4/order";

import { Dropdown, MenuProps } from "antd";
import AntdModalAlert from "components/antd/modal/alert";
import AntdModalAlertInfo from "@/components/antd/modal/alertInfo";
import AppDivNoData from "components/app/div/noData";
import AzSvg from "components/az/svg";
import AzLoading from "components/az/loading";
import AzScrollBarY from "components/az/scroll/barY";
import CMPT_btnPair from "../_cmpt/btnPair";
import H5 from "./h5";
import ModalEdit from "./modalEdit";

import styles from "./index.module.scss";

import { TradeSideEnum, TradeTypeEnum } from "store/trade";
import { OpenOrderProps } from "store/balances";

export interface OpenOrderExtendProps extends OpenOrderProps {
  _time: string;
  _pair: string;
  _type: string;
  _side: string;
  _sideCls: string;
  _price: string;
  _amount: string;
  _executed: string;
  _total: string;
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  isHideOtherPairs: boolean;
  setHideOtherPairs: (arg: boolean) => void;
  setOpenOrderCount: (arg: undefined | number) => void;
  clsUl: string;
  clsLi: string;
  clickStamp?: string; //点击戳
}

const Main: React.FC<Props> = ({ className, isHideOtherPairs, setHideOtherPairs, setOpenOrderCount, clsUl, clsLi, clickStamp }) => {
  // const router = useRouter();
  const t = useTranslation();
  const { isH5 } = store.app;
  const { openOrder, getOpenOrder } = store.balances;
  const { name, type, formatName, isLever } = store.market;

  const [side, setSide] = useState<"" | TradeSideEnum>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOrderId, setModalOrderId] = useState();

  const items = useMemo(() => {
    if (!openOrder) return;
    const ary: OpenOrderExtendProps[] = [];

    openOrder.map((doc) => {
      if (side && doc.side !== side) return;
      if (isHideOtherPairs && doc.symbol !== name) return;

      ary.push({
        ...doc,
        _time: moment(doc.time).formatMs(),
        _pair: formatName(doc.symbol),
        _type: t("trade." + doc.type.toLocaleLowerCase()),
        _side: t("trade." + doc.side.toLocaleLowerCase()),
        _sideCls: doc.side === TradeSideEnum.buy ? "up-color" : "down-color",
        _price: doc.type === TradeTypeEnum.market ? "Market" : Big(doc.price || 0).toFixedCy(),
        _amount: +doc.origQty > 0 ? Big(doc.origQty).toFixedCy() : "--",
        _executed: Big(doc.tradeBase || 0).toFixedCy(),
        _total: +doc.origQuoteQty > 0 ? Big(doc.origQuoteQty).toFixedCy() : "--",
      });
    });

    return ary;

    // return openOrder.filter((doc) => {
    //   if (side && doc.side !== side) return false;
    //   if (isHideOtherPairs && doc.symbol !== name) return false;
    //   return true;
    // });
  }, [name, openOrder, side, isHideOtherPairs]);
  const hasItem = useMemo(() => {
    return !!(items && items.length);
  }, [items]);
  useEffect(() => {
    if (!items) return setOpenOrderCount(undefined);
    setOpenOrderCount(items.length);
  }, [items]);

  const modalOrder = useMemo(() => {
    if (!modalOrderId || !items) return;
    return items.find((doc) => doc.orderId === modalOrderId);
  }, [modalOrderId, items]);

  const dropdownItemsSide: MenuProps["items"] = useMemo(() => {
    return [
      {
        key: "",
        label: <a onClick={() => setSide("")}>{t("trade.all")}</a>,
      },
      {
        key: TradeSideEnum.buy,
        label: <a onClick={() => setSide(TradeSideEnum.buy)}>{t("trade.buy")}</a>,
      },
      {
        key: TradeSideEnum.sell,
        label: <a onClick={() => setSide(TradeSideEnum.sell)}>{t("trade.sell")}</a>,
      },
    ];
  }, []);
  const dropdownLabelSide = useMemo(() => {
    if (side === TradeSideEnum.buy) return t("trade.buy");
    if (side === TradeSideEnum.sell) return t("trade.sell");
    return t("trade.direction");
  }, [side]);

  const [loading, setLoading] = useState(true);

  const refLoadAry = useRef<string[]>([]);
  const handleCancelOne = useCallback((orderId) => {
    if (refLoadAry.current.includes(orderId)) return;
    refLoadAry.current.push(orderId);
    delete_order({
      params: { orderId },
      errorPop: true,
      successPop: true,
    })
      .then(() => {
        !SocketPrivate.isReady && getOpenOrder();
      })
      .finally(() => {
        const index = refLoadAry.current.findIndex((str) => str === orderId);
        if (index >= 0) refLoadAry.current.splice(index, 1);
      });
  }, []);
  const handleCancelAll = useCallback(() => {
    if (loading) return;
    AntdModalAlertInfo({
      isConfirm: true,
      content: t("trade.confirmCancelAll"),
      onOk: () => {
        setLoading(true);
        const data: any = {
          bizType: type,
        };
        isHideOtherPairs && (data.symbol = name);
        side && (data.side = side);

        delete_openOrder({
          data,
          errorPop: true,
          successPop: true,
        })
          .then(() => {
            !SocketPrivate.isReady && getOpenOrder();
          })
          .finally(() => {
            setLoading(false);
          });
      },
    });

    /*
    AntdModalAlert.confirm({
      icon: true,
      content: (
        <div className={styles.alertModalContent}>
          <AzSvg icon={"alert2"} />
          <div>{t("trade.confirmCancelAll")}</div>
        </div>
      ),
      onOk: () => {
        setLoading(true);
        const data: any = {
          bizType: type,
        };
        isHideOtherPairs && (data.symbol = name);
        side && (data.side = side);

        delete_openOrder({
          data,
          errorPop: true,
          successPop: true,
        })
          .then(() => {
            !SocketPrivate.isReady && getOpenOrder();
          })
          .finally(() => {
            setLoading(false);
          });
      },
    });
     */
  }, [loading, isHideOtherPairs, name, type, side]);
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await store.balances.getOpenOrder();
    setLoading(false);
  }, []);
  const handleEidtSuccess = useCallback(() => {
    !SocketPrivate.isReady && handleRefresh();
  }, [handleRefresh]);

  const handleClickEdit = useCallback((doc) => {
    console.log("handleClickEdit");
    setModalOpen(true);
    setModalOrderId(doc.orderId);
  }, []);

  useEffect(() => {
    // console.log("Errrrrrrr----");
    setLoading(items !== undefined ? false : true);
  }, [items]);
  useEffect(() => {
    if (!clickStamp) return;
    // console.log("clickStamp-----");
    handleRefresh();
  }, [clickStamp]);

  return (
    <>
      {isH5 ? (
        <H5
          isHideOtherPairs={isHideOtherPairs}
          setHideOtherPairs={setHideOtherPairs}
          handleCancelAll={handleCancelAll}
          handleCancelOne={handleCancelOne}
          handleRefresh={handleRefresh}
          handleClickEdit={handleClickEdit}
          side={side}
          setSide={setSide}
          items={items}
          disabled={loading}
        />
      ) : (
        <AzScrollBarY noWrap={store.app.rtl} className={cx(styles.AzScrollBarY, className)} options={{}}>
          <div className={styles.main}>
            <div className={styles.nav}>
              <div className={cx(clsLi, styles.li)}>
                <div>{t("trade.time")}</div>
                <div>{t("trade.pair")}</div>
                <div>{t("trade.type")}</div>
                <div>
                  <Dropdown
                    disabled={loading}
                    placement={"bottomLeft"}
                    getPopupContainer={(triggerNode: HTMLElement) => triggerNode}
                    menu={{
                      items: dropdownItemsSide,
                      selectable: true,
                      selectedKeys: [side],
                    }}
                  >
                    <button className={"btnTxt btnDrop"}>
                      <span>{dropdownLabelSide}</span>
                    </button>
                  </Dropdown>
                </div>
                <div>{t("trade.price")}</div>
                <div>{t("trade.amount")}</div>
                <div>{t("trade.executed")}</div>
                <div>{t("trade.openOrderTotal")}</div>
                <div>
                  <button className={cx("btnTxt", styles.atv)} disabled={loading || !hasItem} onClick={handleCancelAll}>
                    {t("trade.cancelAll")}
                  </button>
                </div>
              </div>
            </div>
            {items && (
              <div className={cx(clsUl, styles.ul)}>
                {!items.length ? (
                  <AppDivNoData className={styles.noData} />
                ) : (
                  items.map((doc) => {
                    return (
                      <div key={doc.orderId} className={cx(clsLi, styles.li)}>
                        <div>{doc._time}</div>
                        <div>
                          <CMPT_btnPair disabled={loading} symbol={doc.symbol} />
                        </div>
                        <div>{doc._type}</div>
                        <div className={doc._sideCls}>{doc._side}</div>
                        <div>{doc._price}</div>
                        <div>{doc._amount}</div>
                        <div>{doc._executed}</div>
                        <div>{doc._total}</div>

                        <div>
                          <button
                            disabled={loading}
                            className={cx("btnTxt", styles.actionBtn)}
                            onClick={() => handleClickEdit(doc)}
                            style={{ marginInlineEnd: "15px" }}
                          >
                            <AzSvg icon="edit2" />
                          </button>
                          <button disabled={loading} className={cx("btnTxt", styles.actionBtn)} onClick={() => handleCancelOne(doc.orderId)}>
                            <AzSvg icon="delete" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </AzScrollBarY>
      )}
      {loading && <AzLoading />}
      {!!modalOrder && <ModalEdit doc={modalOrder} open={modalOpen} onCancel={() => setModalOpen(false)} successCallback={handleEidtSuccess} />}
    </>
  );
};

export default observer(Main);
// export default Main;
