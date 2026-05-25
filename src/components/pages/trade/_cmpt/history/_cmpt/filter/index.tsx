import React, { HTMLAttributes, useCallback, useState } from "react";
// import { observer } from "mobx-react-lite";
import cx from "classnames";
import { Hooks } from "@az/base";
const { useTranslation } = Hooks;
// import store from "store";

import { Drawer } from "antd";
import AzSvg from "@/components/az/svg";

import styles from "./index.module.scss";

interface Props extends HTMLAttributes<HTMLDivElement> {
  onOpen?: () => void;
  onClose?: () => void;
  onReset?: () => void;
  onSearch?: () => void;
}

const Main: React.FC<Props> = ({ children, onOpen, onClose, onReset, onSearch }) => {
  const t = useTranslation();
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => {
    onOpen && onOpen();
    setOpen(true);
  }, [onOpen]);
  const handleClose = useCallback(() => {
    setOpen(false);
    onClose && onClose();
  }, [onClose]);

  return (
    <>
      <button className={cx("btnTxt", "btnHover")} onClick={handleOpen}>
        <AzSvg icon="filter" />
      </button>

      <Drawer
        className={styles.drawer}
        closable={false}
        title={t("trade.filter")}
        placement="bottom"
        open={open}
        onClose={handleClose}
        extra={
          <button className={cx("btnTxt", "btnHover")} onClick={handleClose}>
            <AzSvg icon={`close`} />
          </button>
        }
      >
        <div className={styles.content}>{children}</div>

        <div className={styles.foot}>
          <button
            className={cx("btnTxt")}
            onClick={() => {
              handleClose();
              onReset && onReset();
            }}
          >
            {t("trade.reset")}
          </button>
          <button
            className={cx("btnTxt")}
            onClick={() => {
              handleClose();
              onSearch && onSearch();
            }}
          >
            {t("trade.search")}
          </button>
        </div>
      </Drawer>
    </>
  );
};

// export default observer(Main);
export default Main;
