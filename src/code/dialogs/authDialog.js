import { Feature } from "../leafletDrawImports";
import { SendAccessTokenAsync, GetWasabeeServer, mePromise } from "../server";
import PromptDialog from "./promptDialog";
import store from "../../lib/store";
import WasabeeMe from "../me";
import { getSelectedOperation } from "./selectedOp";

const AuthDialog = Feature.extend({
  statics: {
    TYPE: "authDialog"
  },

  initialize: function(map, options) {
    if (!map) map = window.map;
    this.type = AuthDialog.TYPE;
    Feature.prototype.initialize.call(this, map, options);
  },

  addHooks: function() {
    if (!this._map) return;
    Feature.prototype.addHooks.call(this);
    this._operation = getSelectedOperation();
    this._displayDialog();
  },

  removeHooks: function() {
    Feature.prototype.removeHooks.call(this);
  },

  _displayDialog: function() {
    const content = document.createElement("div");
    const title = content.appendChild(document.createElement("div"));
    title.className = "desc";
    title.innerHTML =
      "In order to use the server functionality, you must log in.<br/>";
    const buttonSet = content.appendChild(document.createElement("div"));
    buttonSet.className = "temp-op-dialog";

    const gsapiButton = buttonSet.appendChild(document.createElement("a"));
    gsapiButton.innerHTML = "Log In (gsapi)";
    gsapiButton.addEventListener("click", () => this.gsapiAuth(this), false);

    if (!L.Browser.android) { // webview cannot work on android IITC-M
    const webviewButton = buttonSet.appendChild(document.createElement("a"));
    webviewButton.innerHTML = "Log In (webview)";
    webviewButton.addEventListener(
      "click",
      () => window.open(GetWasabeeServer()),
      false
    );
    }

    const changeServerButton = buttonSet.appendChild(
      document.createElement("a")
    );
    changeServerButton.innerHTML = "Change Server";
    changeServerButton.addEventListener("click", () => {
      const serverDialog = new PromptDialog();
      serverDialog.setup("Change Wasabee Server", "New Waasbee Server", () => {
        if (serverDialog.inputField.value) {
          store.set(
            window.plugin.Wasabee.Constants.SERVER_BASE_KEY,
            serverDialog.inputField.value
          );
          store.remove(window.plugin.Wasabee.Constants.AGENT_INFO_KEY);
        }
      });
      serverDialog.current = GetWasabeeServer();
      serverDialog.placeholder = "https://server.wasabee.rocks/";
      serverDialog.enable();
    });

    this._dialog = window.dialog({
      title: "Authentication Required",
      width: "auto",
      height: "auto",
      html: content,
      dialogClass: "wasabee-dialog-mustauth",
      closeCallback: async () => {
        const selectedOperation = getSelectedOperation();
        const me = await WasabeeMe.get(); // check one more time, free if logged in -- for webview
        me.store();
        window.runHooks("wasabeeUIUpdate", selectedOperation);
      },
      id: window.plugin.Wasabee.static.dialogNames.mustauth
    });
  },

  gsapiAuth: thisthing => {
    window.gapi.auth2.authorize(
      {
        // prompt: L.Browser.android ? "none" : "select_account", // "consent",
        prompt: "none",
        client_id: window.plugin.Wasabee.Constants.OAUTH_CLIENT_ID,
        scope: "email profile openid",
        response_type: "id_token permission"
	// these only make things worse, do not use:
        // immediate: false
        // cookie_policy: "https://server.waabee.rocks"
      },
      response => {
        if (response.error) {
          thisthing._dialog.dialog("close");
          const err = `error from authorize: ${response.error}: ${response.error_subtype}`;
          alert(err);
          return;
        }
        SendAccessTokenAsync(response.access_token).then(
          async () => {
            // could be const me = WasabeeMe.get();
            // but do this by hand to 'await' it
            const me = await mePromise();
	    me.store();
            // store.set(window.plugin.Wasabee.Constants.AGENT_INFO_KEY, JSON.stringify(me));
            thisthing._dialog.dialog("close");
          },
          reject => {
            alert(`send access token failed: $(reject)`);
          }
        );
      }
    );
  }
});

export default AuthDialog;
