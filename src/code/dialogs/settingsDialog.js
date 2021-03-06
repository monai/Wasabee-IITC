import { WDialog } from "../leafletClasses";
import wX from "../wX";
import { getSelectedOperation } from "../selectedOp";
import addButtons from "../addButtons";
import WasabeeMe from "../me";
import { GetWasabeeServer, SetWasabeeServer } from "../server";
import PromptDialog from "./promptDialog";
import { postToFirebase } from "../firebaseSupport";
import SkinDialog from "./skinDialog";

// This file documents the minimum requirements of a dialog in wasabee
const SettingsDialog = WDialog.extend({
  // not strictly necessary, but good style
  statics: {
    TYPE: "settings",
  },

  // every leaflet class ought to have an initialize,
  // inputs defined by leaflet, window.map is defined by IITC
  // options can extended by callers
  initialize: function (map = window.map, options) {
    // always define type, it is used by the parent classes
    this.type = SettingsDialog.TYPE;
    // call the parent classes initialize as well
    WDialog.prototype.initialize.call(this, map, options);
    postToFirebase({ id: "analytics", action: SettingsDialog.TYPE });
  },

  // WDialog is a leaflet L.Handler, which takes add/removeHooks
  addHooks: function () {
    // this pulls in the addHooks from the parent class
    WDialog.prototype.addHooks.call(this);
    const context = this;
    // magic context incantation to make "this" work...
    this._UIUpdateHook = () => {
      context.update();
    };
    window.addHook("wasabeeUIUpdate", this._UIUpdateHook);
    // put any per-open setup here
    // this is the call to actually do our work
    if (this._smallScreen) {
      this._displaySmallDialog();
    } else {
      this._displayDialog();
    }
  },

  removeHooks: function () {
    // put any post close teardown here
    window.removeHook("wasabeeUIUpdate", this._UIUpdateHook);
    WDialog.prototype.removeHooks.call(this);
  },

  update: function () {
    this._dialog.html(this._getContent());
    // TODO also update the title
  },

  _getContent: function () {
    // use leaflet's DOM object creation, not bare DOM or Jquery
    const container = L.DomUtil.create("div", "container");
    const langLabel = L.DomUtil.create("label", null, container);
    langLabel.textContent = wX("LANG");
    const langMenu = L.DomUtil.create("select", null, container);

    const current =
      localStorage[window.plugin.wasabee.static.constants.LANGUAGE_KEY];
    for (const l in window.plugin.wasabee.skin.strings) {
      const option = L.DomUtil.create("option", null, langMenu);
      option.value = l;
      option.textContent = l;
      if (l == current) option.selected = true;
    }
    L.DomEvent.on(langMenu, "change", (ev) => {
      L.DomEvent.stop(ev);
      localStorage[window.plugin.wasabee.static.constants.LANGUAGE_KEY] =
        langMenu.value;
      addButtons(getSelectedOperation());
      window.runHooks("wasabeeUIUpdate");
    });

    const sendLocTitle = L.DomUtil.create("label", null, container);
    sendLocTitle.textContent = wX("SEND LOCATION");
    sendLocTitle.htmlFor = "wasabee-setting-sendloc";
    const sendLocCheck = L.DomUtil.create("input", null, container);
    sendLocCheck.type = "checkbox";
    sendLocCheck.id = "wasabee-setting-sendloc";
    const c = window.plugin.wasabee.static.constants.SEND_LOCATION_KEY;
    const sl = localStorage[c];
    if (sl === "true") sendLocCheck.checked = true;
    L.DomEvent.on(sendLocCheck, "change", (ev) => {
      L.DomEvent.stop(ev);
      localStorage[c] = sendLocCheck.checked;
    });

    const expertTitle = L.DomUtil.create("label", null, container);
    expertTitle.textContent = "Expert Mode"; // wX("SEND LOCATION");
    expertTitle.htmlFor = "wasabee-setting-expert";
    const expertCheck = L.DomUtil.create("input", null, container);
    expertCheck.type = "checkbox";
    expertCheck.id = "wasabee-setting-expert";
    const exm = window.plugin.wasabee.static.constants.EXPERT_MODE_KEY;
    const ex = localStorage[exm];
    if (ex === "true") expertCheck.checked = true;
    L.DomEvent.on(expertCheck, "change", (ev) => {
      L.DomEvent.stop(ev);
      localStorage[exm] = expertCheck.checked;
    });

    const analyticsTitle = L.DomUtil.create("label", null, container);
    analyticsTitle.textContent = wX("SEND ANALYTICS");
    analyticsTitle.htmlFor = "wasabee-setting-analytics";
    const analyticsCheck = L.DomUtil.create("input", null, container);
    analyticsCheck.type = "checkbox";
    analyticsCheck.id = "wasabee-setting-analytics";
    if (
      localStorage[
        window.plugin.wasabee.static.constants.SEND_ANALYTICS_KEY
      ] === "true"
    )
      analyticsCheck.checked = true;
    L.DomEvent.on(analyticsCheck, "change", (ev) => {
      L.DomEvent.stop(ev);
      localStorage[window.plugin.wasabee.static.constants.SEND_ANALYTICS_KEY] =
        analyticsCheck.checked;
    });

    const urpTitle = L.DomUtil.create("label", null, container);
    urpTitle.textContent = "Multimax test point";
    const urpSelect = L.DomUtil.create("select", null, container);
    const urpKey =
      window.plugin.wasabee.static.constants.MULTIMAX_UNREACHABLE_KEY;
    let urp = localStorage[urpKey];
    if (!urp) {
      urp = '{"lat": -74.2,"lng:"-143.4}';
      localStorage[urpKey] = urp;
    }
    const pairs = [
      ["Antarctic West", '{"lat":-74.2,"lng":-143.4}'],
      ["Antarctic East", '{"lat":-74.2,"lng":30.0}'],
      ["Equatorial Atlantic", '{"lat":-2.66,"lng":-4.28}'],
      ["Arctic West", '{"lat":74.2,"lng":-143.4}'],
      ["Arctic East", '{"lat":78.5,"lng":143.4}'],
    ];
    for (const [k, v] of pairs) {
      const option = L.DomUtil.create("option", null, urpSelect);
      option.textContent = k;
      option.value = v;
      if (urp == v) option.selected = true;
    }
    L.DomEvent.on(urpSelect, "change", (ev) => {
      L.DomEvent.stop(ev);
      localStorage[urpKey] = urpSelect.value;
    });

    const autoLoadTitle = L.DomUtil.create("label", null, container);
    autoLoadTitle.textContent = wX("AUTOLOAD");
    autoLoadTitle.htmlFor = "wasabee-setting-autoload";
    const autoLoadCheck = L.DomUtil.create("input", null, container);
    autoLoadCheck.type = "checkbox";
    autoLoadCheck.id = "wasabee-setting-autoload";
    const alc = window.plugin.wasabee.static.constants.AUTO_LOAD_FAKED;
    const al = localStorage[alc];
    if (al === "true") autoLoadCheck.checked = true;
    L.DomEvent.on(autoLoadCheck, "change", (ev) => {
      L.DomEvent.stop(ev);
      localStorage[alc] = autoLoadCheck.checked;
    });

    const pdqTitle = L.DomUtil.create("label", null, container);
    pdqTitle.textContent = wX("AUTOLOAD_RATE");
    const pdqSelect = L.DomUtil.create("select", null, container);
    const pdqKey =
      window.plugin.wasabee.static.constants.PORTAL_DETAIL_RATE_KEY;
    let pdq = localStorage[pdqKey] || 1000;
    const pdqOpts = [1, 100, 250, 500, 750, 1000];
    for (const p of pdqOpts) {
      const option = L.DomUtil.create("option", null, pdqSelect);
      option.textContent = p;
      option.value = p;
      if (pdq == p) option.selected = true;
    }
    L.DomEvent.on(pdqSelect, "change", (ev) => {
      L.DomEvent.stop(ev);
      localStorage[pdqKey] = pdqSelect.value;
    });

    const serverInfo = L.DomUtil.create("button", "server", container);
    serverInfo.textContent = wX("WSERVER", GetWasabeeServer());
    serverInfo.href = "#";
    L.DomEvent.on(serverInfo, "click", (ev) => {
      L.DomEvent.stop(ev);
      this.setServer();
    });

    const trawlTitle = L.DomUtil.create("label", null, container);
    trawlTitle.textContent = "Trawl Skip Tiles";
    const trawlSelect = L.DomUtil.create("select", null, container);
    const tss = Number(
      localStorage[window.plugin.wasabee.static.constants.TRAWL_SKIP_STEPS]
    );
    let trawlCount = 0;
    while (trawlCount < 15) {
      const option = L.DomUtil.create("option", null, trawlSelect);
      option.textContent = trawlCount;
      option.value = trawlCount;
      if (tss == trawlCount) option.selected = true;
      trawlCount++;
    }
    L.DomEvent.on(trawlSelect, "change", (ev) => {
      L.DomEvent.stop(ev);
      localStorage[window.plugin.wasabee.static.constants.TRAWL_SKIP_STEPS] =
        trawlSelect.value;
    });

    const skinsButton = L.DomUtil.create("button", null, container);
    skinsButton.textContent = wX("SKINS_BUTTON");
    L.DomEvent.on(skinsButton, "click", (ev) => {
      L.DomEvent.stop(ev);
      const skinDialog = new SkinDialog(window.map);
      skinDialog.enable();
    });

    return container;
  },

  setServer: function () {
    const serverDialog = new PromptDialog(window.map);
    serverDialog.setup(wX("CHANGE_WAS_SERVER"), wX("NEW_WAS_SERVER"), () => {
      if (serverDialog.inputField.value) {
        SetWasabeeServer(serverDialog.inputField.value);
        WasabeeMe.purge();
      }
    });
    serverDialog.current = GetWasabeeServer();
    serverDialog.placeholder =
      window.plugin.wasabee.static.constants.SERVER_BASE_DEFAULT;
    serverDialog.enable();
  },

  // define our work in _displayDialog
  _displayDialog: function () {
    const container = this._getContent();

    const buttons = {};
    buttons[wX("OK")] = () => {
      this._dialog.dialog("close");
    };

    this._dialog = window.dialog({
      title: wX("SETTINGS"),
      html: container,
      width: "auto",
      dialogClass: "wasabee-dialog wasabee-dialog-settings",
      closeCallback: () => {
        this.disable();
        delete this._dialog;
      },
      id: window.plugin.wasabee.static.dialogNames.settings,
    });
    this._dialog.dialog("option", "buttons", buttons);
  },

  // small-screen versions go in _displaySmallDialog
  _displaySmallDialog: function () {
    // for this dialog, the small screen is the same as the normal
    this._displayDialog();
  },
});

// this line allows other files to import our dialog
export default SettingsDialog;
