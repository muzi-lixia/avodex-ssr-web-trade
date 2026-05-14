import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import BotList from "./BotList";
import CreateForm from "./CreateForm";
import styles from "./index.module.scss";

type ViewState = "list" | "create";

const Main: React.FC = () => {
  const [view, setView] = useState<ViewState>("list");

  return (
    <div className={styles.main}>
      {view === "list" && <BotList onSelectGrid={() => setView("create")} />}
      {view === "create" && <CreateForm onBack={() => setView("list")} />}
    </div>
  );
};

export default observer(Main);
