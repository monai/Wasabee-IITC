import { WDialog } from "../leafletClasses";
import Sortable from "../../lib/sortable";
import WasabeeTeam from "../team";
import wX from "../wX";
import { postToFirebase } from "../firebaseSupport";

const TeamMembershipList = WDialog.extend({
  statics: {
    TYPE: "teamMembershipList",
  },

  initialize: function (map = window.map, options) {
    this.type = TeamMembershipList.TYPE;
    WDialog.prototype.initialize.call(this, map, options);
    postToFirebase({ id: "analytics", action: TeamMembershipList.TYPE });
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
    // sometimes we are too quick, try again
    if (!this._team) this._team = window.plugin.wasabee.teams.get(this._teamID);

    const buttons = {};
    buttons[wX("OK")] = () => {
      this._dialog.dialog("close");
    };

    this._dialog = window.dialog({
      title: this._team.name,
      html: this._table.table,
      width: "auto",
      dialogClass: "wasabee-dialog wasabee-dialog-teamlist",
      closeCallback: () => {
        this.disable();
        delete this._dialog;
      },
      id: window.plugin.wasabee.static.dialogNames.linkList,
    });
    this._dialog.dialog("option", "buttons", buttons);
  },

  setup: async function (teamID) {
    this._teamID = teamID;

    try {
      this._team = await WasabeeTeam.waitGet(teamID, 2);
    } catch (e) {
      console.error(e);
      alert(e.toString());
      return;
    }
    if (!this._team.name) {
      alert(wX("NOT_LOADED"));
    }

    this._table = new Sortable();
    this._table.fields = [
      {
        name: wX("AGENT"),
        value: (agent) => agent.name,
        sort: (a, b) => a.localeCompare(b),
        format: (cell, value, agent) => cell.appendChild(agent.formatDisplay()),
      },
      {
        name: wX("SQUAD"),
        value: (agent) => agent.squad,
        sort: (a, b) => a.localeCompare(b),
        // , format: (cell, value) => (cell.textContent = value)
      },
      {
        name: "Sharing Location",
        value: (agent) => agent.state,
        sort: (a, b) => a.localeCompare(b),
        format: (cell, value) => {
          if (value) cell.textContent = "✅";
        },
      },
      {
        name: "Sharing W-D Keys",
        value: (agent) => agent.ShareWD,
        sort: (a, b) => a.localeCompare(b),
        format: (cell, value) => {
          if (value) cell.textContent = "✅";
        },
      },
    ];
    this._table.sortBy = 0;
    this._table.items = this._team.agents;
  },
});

export default TeamMembershipList;
