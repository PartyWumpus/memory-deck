import {
  ButtonItem,
  definePlugin,
  DialogButton,
  PanelSection,
  PanelSectionRow,
  Router,
  ServerAPI,
  DropdownItem,
  staticClasses,

  gamepadDialogClasses,
  joinClassNames,
  SteamSpinner
} from "decky-frontend-lib";

import React, { VFC, useState, useEffect } from "react";

import { FaMagic } from "react-icons/fa";

import { NumpadInput } from "./components/NumpadInput";
import { playSound } from "./util";

//Process type with Name and Process ID properties
interface Process {
  name: string;
  pid: number;
}

//api variable as ServerAPI type defaulting to null
let api: ServerAPI | null = null;

const FieldWithSeparator = joinClassNames(gamepadDialogClasses.Field, gamepadDialogClasses.WithBottomSeparatorStandard);

// MATCH_ANY = 0                # for snapshot
// # following: compare with a given value
// MATCH_EQUAL_TO = 1
// MATCH_NOTEQUAL_TO = 2
// MATCH_GREATER_THAN = 3
// MATCH_LESS_THAN = 4
// MATCH_RANGE = 5
// # following: compare with the old value
// MATCH_UPDATE = 6
// MATCH_NOT_CHANGED = 7
// MATCH_CHANGED = 8
// MATCH_INCREASED = 9
// MATCH_DECREASED = 10
// # following: compare with both given value and old value
// MATCH_INCREASED_BY = 11
// MATCH_DECREASED_BY = 12

const MatchTypes = [
  { value: 1, label: "==" },
  { value: 2, label: "!=" },
  { value: 3, label: ">" },
  { value: 4, label: "<" },
  // { value: 5, label: "Range" }, -- Not Yet Implemented
  // { value: 6, label: "Update" }, -- Not Supported
  { value: 7, label: "Not Changed" },
  { value: 8, label: "Changed" },

  { value: 9, label: "Increased" },
  { value: 10, label: "Decreased" },

  { value: 11, label: "Increased By" },
  { value: 12, label: "Decreased By" },


  { value: 0, label: "Any" }, //Not overly useful, so it's last

]

interface Result {
  first_byte_in_child: string;
  address: string;
  value: number;
  match_info: number;
  number_of_bytes: number;
  variabel_bytes: number[]
}

const Content: VFC<{ serverAPI: ServerAPI }> = ({ }) => {
  const [processList, setProcessList] = useState<Process[]>([]);

  const [searchValue, setSearchValue] = useState<string>("0");

  const [selectedMode, setSelectedMode] = useState<number>(1);

  const [selectedProcess, setSelectedProcess] = useState<Process>();

  const [numberOfMatches, setNumberOfMatches] = useState<number>(0);
  const [scanProgress, setScanProgress] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);

  const [newValue, setNewValue] = useState<string>("0");

  const [results, setResults] = useState<any[]>([]);

  const [step, setStep] = useState<number>(1);

  // When selectedProcess is updated, send the process ID to the server
  useEffect(() => {
    if (selectedProcess) {
      api?.callPluginMethod("attach", { pid: selectedProcess.pid, name: selectedProcess.name });
    }
  }, [selectedProcess]);

  const loadProcessList = async () => {
    const result = await api!.callPluginMethod("get_processes", {});

    if (result.success && result.result) {
      setProcessList(result.result as Process[]);
    }
  }

  const loadExistingProcess = async () => {
    const result = await api!.callPluginMethod("get_attached_process", {});

    if (result.success) {
      if (result.result) {
        setSelectedProcess(result.result as Process);
      }
    }
  }

  const search = async () => {
    setLoading(true)
    const result = await api!.callPluginMethod("search_regions", { match_type: selectedMode, value: searchValue });

    if (result.success) {
      setNumberOfMatches(result.result as number);

      if (result.result <= 10) {
        await loadResults();
      }
    }

    setLoading(false)
  }

  const reset = async () => {
    const result = await api!.callPluginMethod("reset_scanmem", {});

    if (result.success) {
      setNumberOfMatches(0);
      setResults([]);
    }
  }

  const loadResults = async () => {
    setLoading(true)
    const result = await api!.callPluginMethod("get_match_list", {});

    if (result.success) {
      setResults(result.result as Result[]);
    }

    setLoading(false)
  }

  const setValue = async (address: string) => {
    playSound("https://steamloopback.host/sounds/deck_ui_default_activation.wav");
    const result = await api!.callPluginMethod("set_value", { address: address, value: newValue });
  }

  // Load the process list when the plugin is loaded
  useEffect(() => {
    loadProcessList();
    loadExistingProcess();
  }, []);

  const ProcessSelection = (
    <PanelSection title="Process Selection">
      <PanelSectionRow>
        {/* Button that calls `loadProcessList` function */}
        <ButtonItem
          layout="below"
          onClick={(e) => {
            console.log("Clicked!");
            loadProcessList();
          }}
        >
          Reload Process List
        </ButtonItem>
      </PanelSectionRow>

      {/* If we have at least one element in processList */}
      {/* {processList.length > 0 && ( */}
      {/* Row for each process in processList */}
      <React.Fragment>
        {processList.map((process) => (
          <PanelSectionRow>
            <ButtonItem
              onClick={() => setSelectedProcess(process)}
              layout="below"
            >
              {process?.name}
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </React.Fragment>
      {/* )} */}

    </PanelSection>
  );

  const ProcessInfo = (
    <PanelSection title="Process Info">
      <PanelSectionRow>
        <div className={FieldWithSeparator}>
          <div className={gamepadDialogClasses.FieldLabelRow}>
            <div className={gamepadDialogClasses.FieldLabel} style={{ "maxWidth": "25%", "wordBreak": "break-all" }}>
              Name
            </div>
            <div className={gamepadDialogClasses.FieldChildren} style={{ "maxWidth": "75%", "width": "100%", "wordBreak": "break-all", "textAlign": "end" }}>
              {selectedProcess?.name}
            </div>
          </div>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div className={FieldWithSeparator}>
          <div className={gamepadDialogClasses.FieldLabelRow}>
            <div className={gamepadDialogClasses.FieldLabel} style={{ "maxWidth": "25%", "wordBreak": "break-all" }}>
              PID
            </div>
            <div className={gamepadDialogClasses.FieldChildren} style={{ "maxWidth": "75%", "width": "100%", "wordBreak": "break-all", "textAlign": "end" }}>
              {selectedProcess?.pid}
            </div>
          </div>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => setSelectedProcess(undefined)}>
          Choose Another Process
        </ButtonItem>
      </PanelSectionRow>
      {/* If there are more than 0 matches */}
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => reset()}>
          Reset Search
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );

  const Search = (
    <PanelSection title="Search">
      <NumpadInput label="Search Value" value={searchValue} onChange={(e) => setSearchValue(e)} />

      <PanelSectionRow>
        <DropdownItem
          label="Search Type"
          description="What type of search to make."
          menuLabel="Search Type"
          rgOptions={MatchTypes.map((o) => ({
            data: o.value,
            label: o.label
          }))}

          selectedOption={
            selectedMode
          }

          onChange={(newVal: { data: number; label: string }) => {
            setSelectedMode(newVal.data);
          }}
        />
      </PanelSectionRow>

      <PanelSectionRow>
        {/* Show Button if not loading */}
        {!loading && (
          <ButtonItem layout="below" onClick={() => { search() }}>
            Search
          </ButtonItem>
        )}
        {/* Otherwise, show spinner */}
        {loading && (
          <SteamSpinner />
        )}
      </PanelSectionRow>
    </PanelSection>
  )

  const Stats = (
    <PanelSection title="Stats">
      <PanelSectionRow>
        <div className={FieldWithSeparator}>
          <div className={gamepadDialogClasses.FieldLabelRow}>
            <div className={gamepadDialogClasses.FieldLabel} style={{ "maxWidth": "35%", "wordBreak": "break-all" }}>
              Number of Matches
            </div>
            <div className={gamepadDialogClasses.FieldChildren} style={{ "maxWidth": "65%", "width": "100%", "wordBreak": "break-all", "textAlign": "end" }}>
              {numberOfMatches}
            </div>
          </div>
        </div>
      </PanelSectionRow>
    </PanelSection>
  )

  const Results = (
    <PanelSection title="Results">
      {/* For every result, show a row with the address, value and a button to set */}
      {results.map((result) => (
        <React.Fragment>
          <PanelSectionRow>
            <div className={FieldWithSeparator}>
              <div className={gamepadDialogClasses.FieldLabelRow}>
                <div className={gamepadDialogClasses.FieldLabel} style={{ "maxWidth": "50%", "wordBreak": "break-all" }}>
                  {result.address}
                </div>
                <div className={gamepadDialogClasses.FieldChildren} style={{ "maxWidth": "50%", "width": "100%", "wordBreak": "break-all", "textAlign": "end" }}>
                  {result.value}
                </div>
              </div>
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => { setValue(result.address) }}>
              Change
            </ButtonItem>
          </PanelSectionRow>
        </React.Fragment>
      ))}
    </PanelSection>
  )

  const Change = (
    <PanelSection>
      <NumpadInput label="Change Value" value={newValue} onChange={(e) => setNewValue(e)} />
    </PanelSection>
  )

  return (
    <React.Fragment>
      {/* If there is a selected process */}
      {selectedProcess && ProcessInfo}
      {selectedProcess && Search}
      {selectedProcess && Stats}

      {/* If there are fewer than 10 results */}
      {selectedProcess && numberOfMatches > 0 && numberOfMatches < 10 && Change}
      {selectedProcess && numberOfMatches > 0 && numberOfMatches < 10 && Results}


      {/* If there is no selected process */}
      {!selectedProcess && ProcessSelection}
    </React.Fragment>
  );
};

const DeckyPluginRouterTest: VFC = () => {
  return (
    <div style={{ marginTop: "50px", color: "white" }}>
      Hello World!
      <DialogButton onClick={() => Router.NavigateToStore()}>
        Go to Store
      </DialogButton>
    </div>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  api = serverApi;

  serverApi.routerHook.addRoute("/decky-plugin-test", DeckyPluginRouterTest, {
    exact: true,
  });

  return {
    title: <div className={staticClasses.Title}>Decky Memory Scanner</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <FaMagic />,
    alwaysRender: true,
    onDismount() {
      serverApi.routerHook.removeRoute("/decky-plugin-test");
    },
  };
});
