import { WDialog } from "../leafletClasses";
import WasabeeMarker from "../marker";
import WasabeeAnchor from "../anchor";
import WasabeeMe from "../me";
import { teamPromise, targetPromise } from "../server";
import wX from "../wX";
import { postToFirebase } from "../firebaseSupport";

const SendTargetDialog = WDialog.extend({
  statics: {
    TYPE: "sendTargetDialog",
  },

  initialize: function (map = window.map, options) {
    this.type = SendTargetDialog.TYPE;
    WDialog.prototype.initialize.call(this, map, options);
    postToFirebase({ id: "analytics", action: SendTargetDialog.TYPE });
  },

  addHooks: function () {
    if (!this._map) return;
    WDialog.prototype.addHooks.call(this);
    this._displayDialog();
  },

  removeHooks: function () {
    WDialog.prototype.removeHooks.call(this);
  },

  _displayDialog: function () {
    const buttons = {};
    buttons[wX("OK")] = () => {
      this._dialog.dialog("close");
    };

    this._dialog = window.dialog({
      title: this._name,
      html: this._html,
      width: "auto",
      dialogClass: "wasabee-dialog wasabee-dialog-sendtarget",
      closeCallback: () => {
        this.disable();
        delete this._dialog;
      },
      id: window.plugin.wasabee.static.dialogNames.assign,
    });
    this._dialog.dialog("option", "buttons", buttons);
  },

  setup: async function (target, operation) {
    this._operation = operation;
    this._dialog = null;
    this._target = target;
    this._html = L.DomUtil.create("div", null);
    const divtitle = L.DomUtil.create("div", "desc", this._html);
    const menu = await this._getAgentMenu(target.assignedTo);
    this._name = wX("SEND TARGET AGENT");

    if (target instanceof WasabeeMarker) {
      const portal = operation.getPortal(target.portalId);
      this._type = "Marker";
      divtitle.appendChild(portal.displayFormat(this._smallScreen));
      const t = L.DomUtil.create("label", null);
      t.textContent = wX("SEND TARGET AGENT");
      menu.prepend(t);
    }

    if (target instanceof WasabeeAnchor) {
      const portal = operation.getPortal(target.portalId);
      this._type = "Anchor";
      divtitle.appendChild(portal.displayFormat(this._smallScreen));
      const t = L.DomUtil.create("label", null);
      t.textContent = wX("SEND TARGET AGENT");
      menu.prepend(t);
    }

    this._html.appendChild(menu);
  },

  _buildContent: function () {
    const content = L.DomUtil.create("div");
    if (typeof this._label == "string") {
      content.textContent = this._label;
    } else {
      content.appendChild(this._label);
    }
    return content;
  },

  _getAgentMenu: async function (current) {
    const container = L.DomUtil.create("div", "wasabee-agent-menu");
    const menu = L.DomUtil.create("select", null, container);
    let option = menu.appendChild(L.DomUtil.create("option", null));
    option.value = "";
    option.textContent = wX("UNASSIGNED");
    const alreadyAdded = new Array();

    menu.addEventListener("change", async (ev) => {
      L.DomEvent.stop(ev);
      const portal = this._operation.getPortal(this._target.portalId);
      try {
        await targetPromise(menu.value, portal);
        this._dialog.dialog("close");
        alert(wX("TARGET SENT"));
      } catch (e) {
        console.log(e);
      }
    });

    const me = await WasabeeMe.waitGet();
    for (const t of this._operation.teamlist) {
      if (me.teamEnabled(t.teamid) == false) continue;
      try {
        // allow teams to be 5 minutes cached
        const tt = await teamPromise(t.teamid, 300);
        for (const a of tt.agents) {
          if (!alreadyAdded.includes(a.id) && a.state === true) {
            alreadyAdded.push(a.id);
            option = L.DomUtil.create("option");
            option.value = a.id;
            option.textContent = a.name;
            if (a.id == current) option.selected = true;
            menu.appendChild(option);
          }
        }
      } catch (e) {
        console.log(e);
      }
    }

    return container;
  },
});

export default SendTargetDialog;